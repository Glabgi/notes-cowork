const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const { Chess } = require('chess.js');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
});

// In-memory state (replace with Redis for production)
const rooms = new Map(); // slug -> room
const games = new Map(); // gameId -> game
const timers = new Map(); // roomId -> timer interval

function getOrCreateRoom(slug) {
  if (!rooms.has(slug)) {
    rooms.set(slug, {
      id: slug,
      slug,
      name: slug,
      participants: [],
      messages: [],
      timerMode: 'group',
      createdAt: Date.now(),
      timer: {
        phase: 'focus',
        isRunning: false,
        timeLeft: 25 * 60,
        totalTime: 25 * 60,
        pomodoroCount: 0,
        settings: {
          focusDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          longBreakInterval: 4,
          autoStart: false,
          sound: 'bell',
        },
      },
    });
  }
  return rooms.get(slug);
}

function getNextPhase(phase, pomodoroCount, settings) {
  if (phase === 'focus') {
    const newCount = pomodoroCount + 1;
    if (newCount % settings.longBreakInterval === 0) return 'longBreak';
    return 'shortBreak';
  }
  return 'focus';
}

function getPhaseDuration(phase, settings) {
  switch (phase) {
    case 'focus': return settings.focusDuration * 60;
    case 'shortBreak': return settings.shortBreakDuration * 60;
    case 'longBreak': return settings.longBreakDuration * 60;
    default: return settings.focusDuration * 60;
  }
}

function startTimer(roomSlug) {
  if (timers.has(roomSlug)) {
    clearInterval(timers.get(roomSlug));
  }

  const interval = setInterval(() => {
    const room = rooms.get(roomSlug);
    if (!room || !room.timer.isRunning) {
      clearInterval(interval);
      timers.delete(roomSlug);
      return;
    }

    room.timer.timeLeft--;
    io.to(roomSlug).emit('timer:tick', room.timer.timeLeft);

    if (room.timer.timeLeft <= 0) {
      clearInterval(interval);
      timers.delete(roomSlug);

      // Auto advance phase
      const { phase, pomodoroCount, settings } = room.timer;
      const nextPhase = getNextPhase(phase, pomodoroCount, settings);
      const newCount = phase === 'focus' ? pomodoroCount + 1 : pomodoroCount;

      room.timer = {
        ...room.timer,
        phase: nextPhase,
        timeLeft: getPhaseDuration(nextPhase, settings),
        totalTime: getPhaseDuration(nextPhase, settings),
        pomodoroCount: newCount,
        isRunning: settings.autoStart,
      };

      io.to(roomSlug).emit('timer:state', room.timer);

      if (settings.autoStart) {
        startTimer(roomSlug);
      }
    }
  }, 1000);

  timers.set(roomSlug, interval);
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  let currentRoom = null;
  let currentUserId = null;

  socket.on('room:join', ({ slug, participant }) => {
    const room = getOrCreateRoom(slug);

    // Remove old connection for same user if any
    room.participants = room.participants.filter(p => p.id !== participant.id);

    const fullParticipant = { ...participant, socketId: socket.id };
    room.participants.push(fullParticipant);

    currentRoom = slug;
    currentUserId = participant.id;

    socket.join(slug);

    // Send current state
    socket.emit('room:state', {
      ...room,
      participants: room.participants,
    });
    socket.emit('timer:state', room.timer);

    // Send recent messages
    const recentMessages = room.messages.slice(-50);
    recentMessages.forEach(msg => socket.emit('chat:message', msg));

    // Notify others
    socket.to(slug).emit('room:participant-joined', fullParticipant);
  });

  socket.on('room:leave', (roomSlug) => {
    if (!roomSlug) return;
    const room = rooms.get(roomSlug);
    if (room) {
      room.participants = room.participants.filter(p => p.id !== currentUserId);
      socket.to(roomSlug).emit('room:participant-left', currentUserId);
    }
    socket.leave(roomSlug);
    currentRoom = null;
  });

  socket.on('room:update-status', ({ roomId, status, currentTask }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.find(p => p.id === currentUserId);
    if (participant) {
      participant.status = status;
      if (currentTask !== undefined) participant.currentTask = currentTask;
      io.to(roomId).emit('room:participant-updated', participant);
    }
  });

  socket.on('chat:send', ({ roomId, content }) => {
    const room = rooms.get(roomId);
    if (!room || !currentUserId) return;

    const participant = room.participants.find(p => p.id === currentUserId);
    if (!participant) return;

    const message = {
      id: uuidv4(),
      roomId,
      userId: currentUserId,
      userName: participant.name,
      userAvatarId: participant.avatarId,
      content,
      reactions: [],
      createdAt: Date.now(),
    };

    room.messages.push(message);
    if (room.messages.length > 200) room.messages = room.messages.slice(-200);

    io.to(roomId).emit('chat:message', message);
  });

  socket.on('chat:react', ({ roomId, messageId, emoji }) => {
    const room = rooms.get(roomId);
    if (!room || !currentUserId) return;

    const message = room.messages.find(m => m.id === messageId);
    if (!message) return;

    let reaction = message.reactions.find(r => r.emoji === emoji);
    if (!reaction) {
      reaction = { emoji, count: 0, users: [] };
      message.reactions.push(reaction);
    }

    const userIdx = reaction.users.indexOf(currentUserId);
    if (userIdx === -1) {
      reaction.users.push(currentUserId);
      reaction.count++;
    } else {
      reaction.users.splice(userIdx, 1);
      reaction.count--;
      if (reaction.count === 0) {
        message.reactions = message.reactions.filter(r => r.emoji !== emoji);
      }
    }

    io.to(roomId).emit('chat:reaction', { messageId, reaction });
  });

  // Timer events
  socket.on('timer:start', ({ roomId, settings }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    if (settings) room.timer.settings = settings;
    room.timer.isRunning = true;
    if (!room.timer.timeLeft || room.timer.timeLeft <= 0) {
      room.timer.timeLeft = getPhaseDuration(room.timer.phase, room.timer.settings);
      room.timer.totalTime = room.timer.timeLeft;
    }

    startTimer(roomId);
    io.to(roomId).emit('timer:state', room.timer);
  });

  socket.on('timer:pause', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.timer.isRunning = false;
    if (timers.has(roomId)) {
      clearInterval(timers.get(roomId));
      timers.delete(roomId);
    }
    io.to(roomId).emit('timer:state', room.timer);
  });

  socket.on('timer:reset', (roomId) => {
    const room = rooms.get(roomId);
    if (!room) return;
    room.timer.isRunning = false;
    room.timer.timeLeft = getPhaseDuration(room.timer.phase, room.timer.settings);
    room.timer.totalTime = room.timer.timeLeft;
    if (timers.has(roomId)) {
      clearInterval(timers.get(roomId));
      timers.delete(roomId);
    }
    io.to(roomId).emit('timer:state', room.timer);
  });

  // Game events
  socket.on('game:invite', (invite) => {
    const fullInvite = { ...invite, id: uuidv4(), createdAt: Date.now() };
    if (invite.toUserId) {
      const room = rooms.get(invite.roomId);
      if (room) {
        const target = room.participants.find(p => p.id === invite.toUserId);
        if (target?.socketId) {
          io.to(target.socketId).emit('game:invite', fullInvite);
        }
      }
    } else {
      socket.to(invite.roomId).emit('game:invite', fullInvite);
    }
  });

  socket.on('game:accept', ({ inviteId, roomId }) => {
    // Game creation would happen here
    // For now, emit a start event
    const gameId = uuidv4();
    socket.to(roomId).emit('game:start', { gameType: 'tictactoe', gameId });
  });

  // Chess
  socket.on('chess:move', ({ gameId, move }) => {
    const game = games.get(gameId);
    if (!game) return;

    try {
      const chess = new Chess(game.fen);
      const result = chess.move(move);
      if (!result) return;

      game.fen = chess.fen();
      game.pgn = chess.pgn();
      game.turn = chess.turn();

      if (chess.isCheckmate()) game.status = 'checkmate';
      else if (chess.isDraw()) game.status = 'draw';

      io.to(game.roomId).emit('chess:update', game);
    } catch (e) {
      console.error('Chess move error:', e);
    }
  });

  // TicTacToe
  socket.on('tictactoe:move', ({ gameId, cell }) => {
    const game = games.get(gameId);
    if (!game) return;
    if (game.board[cell] !== null) return;

    const symbol = game.currentTurn;
    game.board[cell] = symbol;

    // Check winner
    const lines = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6],
    ];

    for (const [a,b,c] of lines) {
      if (game.board[a] && game.board[a] === game.board[b] && game.board[b] === game.board[c]) {
        game.winner = symbol;
        game.status = 'finished';
        if (symbol === 'X') game.xScore++;
        else game.oScore++;
        break;
      }
    }

    if (!game.winner && game.board.every(c => c !== null)) {
      game.winner = 'draw';
      game.status = 'finished';
    }

    if (!game.winner) {
      game.currentTurn = symbol === 'X' ? 'O' : 'X';
    }

    io.to(game.roomId).emit('tictactoe:update', game);
  });

  // Battleship
  socket.on('battleship:ready', ({ gameId, ships }) => {
    const game = games.get(gameId);
    if (!game) return;

    if (game.player1.id === currentUserId) {
      game.player1.ships = ships;
      game.player1.ready = true;
    } else {
      game.player2.ships = ships;
      game.player2.ready = true;
    }

    if (game.player1.ready && game.player2.ready) {
      game.status = 'active';
    }

    io.to(game.roomId).emit('battleship:update', game);
  });

  socket.on('battleship:shoot', ({ gameId, cell }) => {
    const game = games.get(gameId);
    if (!game || game.currentTurn !== currentUserId) return;

    const opponent = game.player1.id === currentUserId ? game.player2 : game.player1;
    const isHit = opponent.ships.some(ship => ship.positions.includes(cell));

    if (isHit) {
      opponent.board[cell] = 'hit';
      // Check if ship is sunk
      opponent.ships.forEach(ship => {
        if (ship.positions.includes(cell)) {
          ship.hits.push(cell);
          if (ship.hits.length === ship.size) {
            ship.sunk = true;
            ship.positions.forEach(pos => { opponent.board[pos] = 'sunk'; });
          }
        }
      });

      // Check win condition
      if (opponent.ships.every(s => s.sunk)) {
        game.status = 'finished';
        game.winner = currentUserId;
      }
    } else {
      opponent.board[cell] = 'miss';
      // Switch turn
      game.currentTurn = opponent.id;
    }

    io.to(game.roomId).emit('battleship:update', game);
  });

  socket.on('disconnect', () => {
    if (currentRoom && currentUserId) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.participants = room.participants.filter(p => p.id !== currentUserId);
        socket.to(currentRoom).emit('room:participant-left', currentUserId);

        // Cleanup empty rooms after delay
        if (room.participants.length === 0) {
          setTimeout(() => {
            const r = rooms.get(currentRoom);
            if (r && r.participants.length === 0) {
              rooms.delete(currentRoom);
              if (timers.has(currentRoom)) {
                clearInterval(timers.get(currentRoom));
                timers.delete(currentRoom);
              }
            }
          }, 24 * 60 * 60 * 1000); // 24 hours
        }
      }
    }
  });
});

app.get('/health', (_, res) => res.json({ status: 'ok', rooms: rooms.size }));

// REST: list active rooms (for homepage)
app.get('/rooms', (_, res) => {
  const active = Array.from(rooms.values())
    .filter(r => r.participants.length > 0)
    .map(r => ({
      slug: r.slug,
      name: r.name,
      participantCount: r.participants.length,
      participants: r.participants.slice(0, 4).map(p => ({ id: p.id, avatarId: p.avatarId })),
      createdAt: r.createdAt || Date.now(),
    }))
    .slice(0, 20);
  res.json(active);
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.io server running on port ${PORT}`);
});
