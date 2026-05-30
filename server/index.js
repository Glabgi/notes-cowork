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
const closedRooms = new Set(); // tombstone: slugs of deleted rooms that must not be silently resurrected

const EMPTY_TTL_MS = 60_000; // grace before an empty room is deleted

// Schedule deletion of an empty room after EMPTY_TTL_MS, re-checking it is
// still empty at fire time. Stores the timer handle on the room so it can be
// cleared when someone rejoins within the grace window.
function scheduleRoomCleanup(slug) {
  const room = rooms.get(slug);
  if (!room) return;
  if (room.cleanupTimer) clearTimeout(room.cleanupTimer);
  room.emptyAt = Date.now();
  room.cleanupTimer = setTimeout(() => {
    const r = rooms.get(slug);
    if (r && r.participants.length === 0) {
      rooms.delete(slug);
      closedRooms.add(slug); // tombstone so it cannot be silently resurrected
      if (timers.has(slug)) {
        clearInterval(timers.get(slug));
        timers.delete(slug);
      }
    }
  }, EMPTY_TTL_MS);
}

// Cancel a pending cleanup (someone rejoined within the grace window).
function cancelRoomCleanup(room) {
  if (room && room.cleanupTimer) {
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
  }
}

function getOrCreateRoom(slug, config) {
  if (!rooms.has(slug)) {
    rooms.set(slug, {
      id: slug,
      slug,
      name: (config && config.name) || slug,
      isPrivate: !!(config && config.isPrivate),
      isPublic:  !!(config && config.isPublic),
      password:  (config && config.password) || null,
      maxParticipants: (config && config.maxParticipants) || 50,
      ownerId: (config && config.ownerId) || null,
      participants: [],
      kickedUsers: new Set(), // userIds kicked from this room (cannot rejoin)
      cleanupTimer: null,
      messages: [],
      gamePairs: {}, // key: sorted "userA|userB" → { chess: 'a'|'b', ttt: 'a'|'b', battleship: 'a'|'b' } last-starter
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

  socket.on('room:join', ({ slug, participant, roomConfig, password }, ack) => {
    const existed = rooms.has(slug);

    // Is this the owner-config (create) path? The client sends roomConfig that
    // names this joiner as the owner only on the create/owner-reconnect path.
    const isOwnerConfigJoin = !!(roomConfig && (roomConfig.ownerId === participant.id || !roomConfig.ownerId));

    // Guard against resurrecting closed rooms and against plain joiners
    // creating rooms that don't exist. Only the original creator/owner sending
    // owner-config may (re)create a brand-new room.
    if (!existed && !isOwnerConfigJoin) {
      if (typeof ack === 'function') ack({ ok: false, error: 'room_closed' });
      socket.emit('room:join-error', { reason: 'room_closed' });
      return;
    }
    if (closedRooms.has(slug) && !isOwnerConfigJoin) {
      if (typeof ack === 'function') ack({ ok: false, error: 'room_closed' });
      socket.emit('room:join-error', { reason: 'room_closed' });
      return;
    }

    // Legitimate (re)creation by the owner clears any tombstone.
    if (isOwnerConfigJoin) closedRooms.delete(slug);

    const room = getOrCreateRoom(slug, roomConfig);

    // Reject users who were kicked from this room
    if (room.kickedUsers && room.kickedUsers.has(participant.id)) {
      if (typeof ack === 'function') ack({ ok: false, error: 'kicked' });
      socket.emit('room:join-error', { reason: 'kicked' });
      return;
    }

    // First-joiner becomes owner; their config is applied
    if (!existed && roomConfig) {
      room.ownerId = participant.id;
      participant.isOwner = true;
    }

    // Owner config re-apply on reconnect/recreate.
    // The room may get recreated after a server restart, or the owner may
    // briefly drop and rejoin. If THIS joiner brought a config AND they are
    // (or can claim) the owner, re-apply visibility settings so the room's
    // public/private flags are restored. Conditions:
    //   - the room has no owner yet (race-condition / fresh recreate), OR
    //   - this joiner is already the recorded owner, OR
    //   - the config itself names this joiner as the owner.
    // This guarantees the client re-sending config on every reconnect restores
    // the public flag and keeps the room listed.
    if (roomConfig && (!room.ownerId || room.ownerId === participant.id || roomConfig.ownerId === participant.id)) {
      room.ownerId = participant.id;
      room.name = roomConfig.name || room.name;
      room.isPrivate = !!roomConfig.isPrivate;
      room.isPublic = !!roomConfig.isPublic;
      room.password = roomConfig.password ?? room.password;
      room.maxParticipants = roomConfig.maxParticipants || room.maxParticipants;
      participant.isOwner = true;
    }

    // Password check for private rooms (runs AFTER owner-config-apply so the
    // owner can never be locked out of their own room)
    if (room.isPrivate && room.ownerId !== participant.id) {
      if (!room.password || room.password !== password) {
        if (typeof ack === 'function') ack({ ok: false, error: 'invalid_password' });
        socket.emit('room:join-error', { reason: 'invalid_password' });
        return;
      }
    }

    // Remove old connection for same user if any
    room.participants = room.participants.filter(p => p.id !== participant.id);

    const fullParticipant = { ...participant, socketId: socket.id, isOwner: participant.id === room.ownerId };
    room.participants.push(fullParticipant);

    currentRoom = slug;
    currentUserId = participant.id;

    // Activity / grace tracking: mark active and clear any "emptied" marker so
    // a (re)join keeps the room visible in the public list.
    room.lastActive = Date.now();
    room.emptyAt = null;
    cancelRoomCleanup(room);

    socket.join(slug);

    if (typeof ack === 'function') ack({ ok: true });

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
      if (room.participants.length === 0) scheduleRoomCleanup(roomSlug);
    }
    socket.leave(roomSlug);
    currentRoom = null;
  });

  socket.on('room:update-status', ({ roomId, status, currentTask }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.find(p => p.id === currentUserId);
    if (participant) {
      room.lastActive = Date.now();
      participant.status = status;
      if (currentTask !== undefined) participant.currentTask = currentTask;
      io.to(roomId).emit('room:participant-updated', participant);
    }
  });

  // Owner: transfer ownership to another participant
  socket.on('room:transfer-owner', ({ roomId, targetUserId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    // Only the current owner may transfer
    if (room.ownerId !== currentUserId) return;
    // Target must be a participant
    const target = room.participants.find(p => p.id === targetUserId);
    if (!target) return;

    room.ownerId = targetUserId;
    room.participants.forEach(p => { p.isOwner = p.id === room.ownerId; });

    io.to(roomId).emit('room:state', { ...room, participants: room.participants });
  });

  // Owner: kick a participant from the room
  socket.on('room:kick', ({ roomId, targetUserId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    // Only the current owner may kick
    if (room.ownerId !== currentUserId) return;
    // Cannot kick the owner
    if (targetUserId === room.ownerId) return;

    const target = room.participants.find(p => p.id === targetUserId);
    if (!target) return;
    const targetSocketId = target.socketId;

    if (!room.kickedUsers) room.kickedUsers = new Set();
    room.kickedUsers.add(targetUserId);

    room.participants = room.participants.filter(p => p.id !== targetUserId);

    // Existing event other clients already handle
    io.to(roomId).emit('room:participant-left', targetUserId);

    // Notify only the kicked socket and make it leave the room (no full disconnect)
    if (targetSocketId) {
      io.to(targetSocketId).emit('room:kicked', { roomId });
      io.sockets.sockets.get(targetSocketId)?.leave(roomId);
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

    room.lastActive = Date.now();
    room.messages.push(message);
    if (room.messages.length > 200) room.messages = room.messages.slice(-200);

    io.to(roomId).emit('chat:message', message);
  });

  socket.on('chat:delete', ({ roomId, messageId }) => {
    const room = rooms.get(roomId);
    if (!room || !currentUserId) return;
    const idx = room.messages.findIndex(m => m.id === messageId);
    if (idx === -1) return;
    // Only author may delete their own message
    if (room.messages[idx].userId !== currentUserId) return;
    room.messages.splice(idx, 1);
    io.to(roomId).emit('chat:deleted', { messageId });
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
  socket.on('game:invite', (invite, ack) => {
    console.log('[game:invite] from=%s to=%s game=%s room=%s', currentUserId, invite?.toUserId, invite?.gameType, invite?.roomId);
    const room = rooms.get(invite.roomId);
    if (!room) {
      if (typeof ack === 'function') ack({ ok: false, error: 'room_not_found' });
      return;
    }
    const fromP = room.participants.find(p => p.id === currentUserId);
    if (!fromP) {
      if (typeof ack === 'function') ack({ ok: false, error: 'sender_not_in_room' });
      return;
    }
    const fullInvite = {
      ...invite,
      id: uuidv4(),
      fromUserId: currentUserId,
      fromUserName: fromP.name,
      fromUserAvatarId: fromP.avatarId,
      createdAt: Date.now(),
    };
    if (invite.toUserId) {
      const target = room.participants.find(p => p.id === invite.toUserId);
      if (!target) {
        console.log('[game:invite] target user not in room', invite.toUserId);
        if (typeof ack === 'function') ack({ ok: false, error: 'recipient_not_in_room' });
        return;
      }
      if (!target.socketId) {
        console.log('[game:invite] target has no socketId', invite.toUserId);
        if (typeof ack === 'function') ack({ ok: false, error: 'recipient_offline' });
        return;
      }
      // Check the socket is still connected
      const targetSocket = io.sockets.sockets.get(target.socketId);
      if (!targetSocket || !targetSocket.connected) {
        console.log('[game:invite] target socket not connected', target.socketId);
        if (typeof ack === 'function') ack({ ok: false, error: 'recipient_offline' });
        return;
      }
      targetSocket.emit('game:invite', fullInvite);
      console.log('[game:invite] delivered to socket=%s', target.socketId);
      if (typeof ack === 'function') ack({ ok: true });
    } else {
      socket.to(invite.roomId).emit('game:invite', fullInvite);
      if (typeof ack === 'function') ack({ ok: true });
    }
  });

  socket.on('game:decline', ({ inviteId, fromUserId, roomId }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const target = room.participants.find(p => p.id === fromUserId);
    if (target?.socketId) {
      io.to(target.socketId).emit('game:declined', { inviteId, byUserId: currentUserId });
    }
  });

  // Helper: determine starter side based on previous pair history
  function pickStarter(room, userA, userB, gameType) {
    const key = [userA, userB].sort().join('|');
    if (!room.gamePairs[key]) room.gamePairs[key] = {};
    const last = room.gamePairs[key][gameType];
    let starter;
    if (!last) {
      starter = [userA, userB].sort()[0]; // deterministic first time
    } else {
      // Alternate
      starter = last === userA ? userB : userA;
    }
    room.gamePairs[key][gameType] = starter;
    return starter;
  }

  socket.on('game:accept', ({ inviteId, roomId, fromUserId, gameType }) => {
    const room = rooms.get(roomId);
    if (!room) return;
    const userA = fromUserId;          // inviter
    const userB = currentUserId;       // accepter
    const gameId = uuidv4();

    if (gameType === 'chess') {
      const starter = pickStarter(room, userA, userB, 'chess');
      const game = {
        id: gameId, roomId, type: 'chess',
        white: starter,                          // white moves first
        black: starter === userA ? userB : userA,
        fen: new Chess().fen(),
        turn: 'w',
        status: 'active',
        createdAt: Date.now(),
      };
      games.set(gameId, game);
    } else if (gameType === 'tictactoe') {
      const starter = pickStarter(room, userA, userB, 'tictactoe');
      const game = {
        id: gameId, roomId, type: 'tictactoe',
        playerX: starter,
        playerO: starter === userA ? userB : userA,
        board: Array(9).fill(null),
        currentTurn: 'X',
        xScore: 0, oScore: 0,
        status: 'playing', winner: null,
        createdAt: Date.now(),
      };
      games.set(gameId, game);
    } else if (gameType === 'battleship') {
      const starter = pickStarter(room, userA, userB, 'battleship');
      const game = {
        id: gameId, roomId, type: 'battleship',
        player1: { id: userA, ships: [], board: Array(100).fill('empty'), ready: false },
        player2: { id: userB, ships: [], board: Array(100).fill('empty'), ready: false },
        currentTurn: starter,
        status: 'setup', winner: null,
        createdAt: Date.now(),
      };
      games.set(gameId, game);
    }

    // Both players join a game-specific room and get start event
    const inviterSocket = room.participants.find(p => p.id === userA)?.socketId;
    const accepterSocket = socket.id;
    if (inviterSocket) io.sockets.sockets.get(inviterSocket)?.join('game:' + gameId);
    socket.join('game:' + gameId);
    io.to('game:' + gameId).emit('game:start', { gameType, gameId, game: games.get(gameId) });
  });

  // Chess
  socket.on('chess:move', ({ gameId, move }) => {
    const game = games.get(gameId);
    if (!game || game.type !== 'chess') return;
    // Only the player whose turn it is may move
    const expectedUser = game.turn === 'w' ? game.white : game.black;
    if (expectedUser !== currentUserId) return;

    try {
      const chess = new Chess(game.fen);
      const result = chess.move(move);
      if (!result) return;

      game.fen = chess.fen();
      game.pgn = chess.pgn();
      game.turn = chess.turn();
      game.lastMove = { from: result.from, to: result.to };

      if (chess.isCheckmate())      { game.status = 'checkmate'; game.winner = result.color === 'w' ? game.white : game.black; }
      else if (chess.isStalemate()) { game.status = 'stalemate'; }
      else if (chess.isDraw())      { game.status = 'draw'; }
      else if (chess.isCheck())     { game.status = 'check'; }
      else                          { game.status = 'active'; }

      io.to('game:' + gameId).emit('chess:update', game);
    } catch (e) {
      console.error('Chess move error:', e);
    }
  });

  // Chess: rematch (alternates colors)
  socket.on('chess:rematch', ({ gameId }) => {
    const game = games.get(gameId);
    if (!game || game.type !== 'chess') return;
    // Swap colors
    const oldWhite = game.white;
    game.white = game.black;
    game.black = oldWhite;
    game.fen = new Chess().fen();
    game.turn = 'w';
    game.status = 'active';
    game.lastMove = null;
    game.winner = null;
    io.to('game:' + gameId).emit('chess:update', game);
  });

  // TicTacToe
  socket.on('tictactoe:move', ({ gameId, cell }) => {
    const game = games.get(gameId);
    if (!game || game.type !== 'tictactoe') return;
    if (game.status === 'finished') return;
    if (typeof cell !== 'number' || cell < 0 || cell > 8) return;
    if (game.board[cell] !== null) return;
    // Validate: only the player whose turn it is may move
    const expectedUser = game.currentTurn === 'X' ? game.playerX : game.playerO;
    if (expectedUser !== currentUserId) return;

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

    io.to('game:' + gameId).emit('tictactoe:update', game);
  });

  // TicTacToe: rematch — swap sides
  socket.on('tictactoe:rematch', ({ gameId }) => {
    const game = games.get(gameId);
    if (!game || game.type !== 'tictactoe') return;
    const oldX = game.playerX;
    game.playerX = game.playerO;
    game.playerO = oldX;
    game.board = Array(9).fill(null);
    game.currentTurn = 'X';
    game.winner = null;
    game.status = 'playing';
    io.to('game:' + gameId).emit('tictactoe:update', game);
  });

  // Battleship — strip private opponent ship positions before broadcasting
  function publicBattleshipView(game, viewerId) {
    const cloneSide = (side, isMe) => ({
      id: side.id,
      ready: side.ready,
      board: side.board,
      shipsLeft: side.ships.filter(s => !s.sunk).length,
      // Only show ship positions to their owner; opponents see only board cells
      ships: isMe ? side.ships : side.ships.filter(s => s.sunk),
    });
    return {
      id: game.id,
      roomId: game.roomId,
      type: 'battleship',
      status: game.status,
      currentTurn: game.currentTurn,
      winner: game.winner,
      me:       cloneSide(game.player1.id === viewerId ? game.player1 : game.player2, true),
      opponent: cloneSide(game.player1.id === viewerId ? game.player2 : game.player1, false),
    };
  }

  function broadcastBattleship(game) {
    const room = rooms.get(game.roomId);
    if (!room) return;
    [game.player1, game.player2].forEach(side => {
      const p = room.participants.find(pp => pp.id === side.id);
      if (p?.socketId) {
        io.to(p.socketId).emit('battleship:update', publicBattleshipView(game, side.id));
      }
    });
  }

  socket.on('battleship:ready', ({ gameId, ships }) => {
    const game = games.get(gameId);
    if (!game || game.type !== 'battleship') return;
    if (game.player1.id !== currentUserId && game.player2.id !== currentUserId) return;

    const side = game.player1.id === currentUserId ? game.player1 : game.player2;
    side.ships = ships;
    side.ready = true;
    // Mark ship cells on private board for owner reference
    side.board = Array(100).fill('empty');
    ships.forEach(s => s.positions.forEach(p => { side.board[p] = 'ship'; }));

    if (game.player1.ready && game.player2.ready) {
      game.status = 'active';
    }

    broadcastBattleship(game);
  });

  socket.on('battleship:shoot', ({ gameId, cell }) => {
    const game = games.get(gameId);
    if (!game || game.type !== 'battleship') return;
    if (game.currentTurn !== currentUserId) return;
    if (game.status !== 'active') return;

    const opponent = game.player1.id === currentUserId ? game.player2 : game.player1;
    if (opponent.board[cell] === 'hit' || opponent.board[cell] === 'miss' || opponent.board[cell] === 'sunk') return;

    const isHit = opponent.ships.some(ship => ship.positions.includes(cell));

    if (isHit) {
      opponent.board[cell] = 'hit';
      opponent.ships.forEach(ship => {
        if (ship.positions.includes(cell)) {
          ship.hits.push(cell);
          if (ship.hits.length === ship.size) {
            ship.sunk = true;
            ship.positions.forEach(pos => { opponent.board[pos] = 'sunk'; });
          }
        }
      });

      if (opponent.ships.every(s => s.sunk)) {
        game.status = 'finished';
        game.winner = currentUserId;
      }
    } else {
      opponent.board[cell] = 'miss';
      game.currentTurn = opponent.id; // switch turn
    }

    broadcastBattleship(game);
  });

  // Battleship: rematch — fresh boards, alternate first turn
  socket.on('battleship:rematch', ({ gameId }) => {
    const game = games.get(gameId);
    if (!game || game.type !== 'battleship') return;
    game.player1.ships = [];
    game.player1.ready = false;
    game.player1.board = Array(100).fill('empty');
    game.player2.ships = [];
    game.player2.ready = false;
    game.player2.board = Array(100).fill('empty');
    game.status = 'setup';
    game.winner = null;
    // Alternate first turn
    game.currentTurn = game.currentTurn === game.player1.id ? game.player2.id : game.player1.id;
    broadcastBattleship(game);
  });

  socket.on('disconnect', () => {
    if (currentRoom && currentUserId) {
      const room = rooms.get(currentRoom);
      if (room) {
        room.participants = room.participants.filter(p => p.id !== currentUserId);
        socket.to(currentRoom).emit('room:participant-left', currentUserId);

        // Cleanup empty rooms after a short grace window. The /rooms list keeps
        // the room visible during the grace so a brief owner drop doesn't strip
        // it from the public list; if still empty at fire time it is deleted
        // and tombstoned.
        if (room.participants.length === 0) {
          scheduleRoomCleanup(currentRoom);
        }
      }
    }
  });
});

app.get('/health', (_, res) => res.json({ status: 'ok', rooms: rooms.size }));

// REST: list active rooms (for homepage) — only public ones
app.get('/rooms', (_, res) => {
  const GRACE_MS = EMPTY_TTL_MS;
  const now = Date.now();
  const active = Array.from(rooms.values())
    .filter(r =>
      !closedRooms.has(r.slug) &&
      r.isPublic !== false && !r.isPrivate &&
      (r.participants.length > 0 || (r.emptyAt && now - r.emptyAt < GRACE_MS))
    )
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

// REST: check room info (visibility / privacy) before joining
app.get('/rooms/:slug', (req, res) => {
  const room = rooms.get(req.params.slug);
  if (!room) return res.json({ exists: false });
  res.json({
    exists: true,
    name: room.name,
    isPrivate: !!room.isPrivate,
    isPublic: !!room.isPublic,
    participantCount: room.participants.length,
  });
});

// Render/Heroku/Railway inject PORT; fall back to SOCKET_PORT then 3001 for local dev
const PORT = process.env.PORT || process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.io server running on port ${PORT}`);
});
