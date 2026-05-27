'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoomStore } from '@/store/roomStore';
import { useGameStore } from '@/store/gameStore';
import { getSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { Users, Bot, Handshake, Trophy } from 'lucide-react';
import type { TicTacToeGame, TicTacToeCell } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const WINNING_LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
];

function findWinningLine(board: TicTacToeCell[]): number[] | null {
  for (const line of WINNING_LINES) {
    const [a,b,c] = line;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return line;
  }
  return null;
}

function minimax(board: TicTacToeCell[], isMax: boolean): number {
  const winner = findWinningLine(board);
  if (winner) return isMax ? -10 : 10;
  if (board.every(c => c !== null)) return 0;

  if (isMax) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        best = Math.max(best, minimax(board, false));
        board[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        best = Math.min(best, minimax(board, true));
        board[i] = null;
      }
    }
    return best;
  }
}

function getBestMove(board: TicTacToeCell[]): number {
  let bestVal = -Infinity;
  let bestMove = -1;
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O';
      const val = minimax(board, false);
      board[i] = null;
      if (val > bestVal) { bestVal = val; bestMove = i; }
    }
  }
  return bestMove;
}

interface TicTacToeProps {
  vsBot?: boolean;       // when set, skip the mode picker and auto-start vs bot
  gameId?: string | null; // multiplayer game id (server-driven)
}

export default function TicTacToe({ vsBot: vsBotProp, gameId }: TicTacToeProps = {}) {
  const { room, currentUser } = useRoomStore();
  const { tictactoeGame, setTicTacToeGame } = useGameStore();
  const [localGame, setLocalGame] = useState<TicTacToeGame | null>(null);
  const [vsBot, setVsBot] = useState(!!vsBotProp);
  // Tracks who started the last finished game — for alternating sides on rematch
  const lastStarterRef = useRef<'me' | 'them'>('me');

  const game = tictactoeGame || localGame;

  useEffect(() => {
    const socket = getSocket();
    socket.on('tictactoe:update', (g) => { setTicTacToeGame(g); });
    return () => { socket.off('tictactoe:update'); };
  }, []);

  // Auto-start vs bot when GameZone passes vsBot prop
  useEffect(() => {
    if (vsBotProp && !game) startNewGame(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vsBotProp]);

  const startNewGame = (bot = false) => {
    // Alternating sides: previous game's starter becomes the other side
    const meStartsThisTime = lastStarterRef.current === 'them';
    lastStarterRef.current = meStartsThisTime ? 'me' : 'them';
    const newGame: TicTacToeGame = {
      id: uuidv4(),
      roomId: room?.slug || 'local',
      xPlayerId: meStartsThisTime ? (currentUser?.id || 'player1') : (bot ? 'bot' : 'player2'),
      oPlayerId: meStartsThisTime ? (bot ? 'bot' : 'player2') : (currentUser?.id || 'player1'),
      board: Array(9).fill(null),
      currentTurn: 'X',
      winner: null,
      xScore: game?.xScore || 0,
      oScore: game?.oScore || 0,
      mode: 'classic',
      status: 'active',
    };
    setVsBot(bot);
    setLocalGame(newGame);
    setTicTacToeGame(newGame);
  };

  const handleCellClick = (idx: number) => {
    if (!game || game.status !== 'active') return;
    if (game.board[idx]) return;
    const isMyTurn = game.currentTurn === 'X'
      ? game.xPlayerId === (currentUser?.id || 'player1')
      : game.oPlayerId === (currentUser?.id || 'player1');
    if (!isMyTurn && !vsBot) return;

    const newBoard = [...game.board];
    newBoard[idx] = game.currentTurn;

    const winLine = findWinningLine(newBoard);
    let winner: TicTacToeGame['winner'] = null;
    let status: TicTacToeGame['status'] = 'active';

    if (winLine) {
      winner = game.currentTurn;
      status = 'finished';
    } else if (newBoard.every(c => c !== null)) {
      winner = 'draw';
      status = 'finished';
    }

    const updated: TicTacToeGame = {
      ...game,
      board: newBoard,
      currentTurn: game.currentTurn === 'X' ? 'O' : 'X',
      winner,
      status,
      xScore: winner === 'X' ? game.xScore + 1 : game.xScore,
      oScore: winner === 'O' ? game.oScore + 1 : game.oScore,
    };

    setLocalGame(updated);
    setTicTacToeGame(updated);

    if (vsBot && status === 'active' && updated.currentTurn === 'O') {
      setTimeout(() => {
        const botBoard = [...newBoard];
        const botMove = getBestMove(botBoard);
        if (botMove === -1) return;
        botBoard[botMove] = 'O';

        const botWinLine = findWinningLine(botBoard);
        let botWinner: TicTacToeGame['winner'] = null;
        let botStatus: TicTacToeGame['status'] = 'active';

        if (botWinLine) { botWinner = 'O'; botStatus = 'finished'; }
        else if (botBoard.every(c => c !== null)) { botWinner = 'draw'; botStatus = 'finished'; }

        const botUpdated: TicTacToeGame = {
          ...updated,
          board: botBoard,
          currentTurn: 'X',
          winner: botWinner,
          status: botStatus,
          oScore: botWinner === 'O' ? updated.oScore + 1 : updated.oScore,
        };
        setLocalGame(botUpdated);
        setTicTacToeGame(botUpdated);
      }, 400);
    }

    if (room && !vsBot) {
      getSocket().emit('tictactoe:move', { gameId: game.id, cell: idx });
    }
  };

  const winLine = game ? findWinningLine(game.board) : null;

  if (!game) {
    return (
      <div className="flex flex-col items-center gap-6 p-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-4xl font-black text-[#2563EB]">×</span>
            <span className="text-4xl font-black text-[#94A3B8]">/</span>
            <span className="text-4xl font-black text-[#E11D48]">○</span>
          </div>
          <h2 className="text-xl font-bold text-[#0F172A]">Крестики-Нолики</h2>
          <p className="text-sm text-[#94A3B8] mt-1">Выберите режим игры</p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => startNewGame(false)}
            className="w-full bg-white border-2 border-[#E2E8F0] hover:border-[#BFDBFE] hover:bg-[#F8FAFF] rounded-[16px] px-5 py-4 flex items-center gap-4 transition-all duration-150 group"
          >
            <div className="w-10 h-10 rounded-[10px] bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
              <Users size={18} className="text-[#2563EB]" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-[#0F172A] text-sm group-hover:text-[#2563EB] transition-colors">Против игрока</p>
              <p className="text-xs text-[#94A3B8]">Два игрока, один экран</p>
            </div>
          </button>

          <button
            onClick={() => startNewGame(true)}
            className="w-full bg-white border-2 border-[#E2E8F0] hover:border-[#BFDBFE] hover:bg-[#F8FAFF] rounded-[16px] px-5 py-4 flex items-center gap-4 transition-all duration-150 group"
          >
            <div className="w-10 h-10 rounded-[10px] bg-[#F0FDF4] flex items-center justify-center flex-shrink-0">
              <Bot size={18} className="text-[#16A34A]" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-[#0F172A] text-sm group-hover:text-[#2563EB] transition-colors">Против бота</p>
              <p className="text-xs text-[#94A3B8]">Minimax — непобедим!</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 p-5">
      {/* Score board */}
      <div className="flex items-center gap-3 bg-[#F8FAFF] border border-[#E2E8F0] rounded-[16px] px-5 py-3">
        <div className="text-center min-w-[56px]">
          <div className="text-2xl font-black text-[#2563EB]">{game.xScore}</div>
          <div className="text-xs text-[#64748B] font-medium mt-0.5">× {vsBot ? 'Вы' : 'X'}</div>
        </div>
        <div className="w-px h-8 bg-[#E2E8F0]" />
        <div className="text-center min-w-[40px]">
          <div className="text-sm text-[#94A3B8] font-medium">VS</div>
        </div>
        <div className="w-px h-8 bg-[#E2E8F0]" />
        <div className="text-center min-w-[56px]">
          <div className="text-2xl font-black text-[#E11D48]">{game.oScore}</div>
          <div className="text-xs text-[#64748B] font-medium mt-0.5">○ {vsBot ? 'Бот' : 'O'}</div>
        </div>
      </div>

      {/* Status */}
      <AnimatePresence mode="wait">
        {game.status === 'finished' ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-semibold border',
              game.winner === 'draw'
                ? 'bg-[#F1F5F9] border-[#E2E8F0] text-[#475569]'
                : game.winner === 'X'
                  ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]'
                  : 'bg-[#FFF1F2] border-[#FECDD3] text-[#E11D48]'
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {game.winner === 'draw' ? (
                <><Handshake size={14} /> Ничья!</>
              ) : game.winner === 'X' ? (
                <><Trophy size={14} /> {vsBot ? 'Вы победили!' : 'Победил X!'}</>
              ) : (
                <><Trophy size={14} /> {vsBot ? 'Бот победил!' : 'Победил O!'}</>
              )}
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="turn"
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium border',
              game.currentTurn === 'X'
                ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]'
                : 'bg-[#FFF1F2] border-[#FECDD3] text-[#E11D48]'
            )}
          >
            Ход: <span className="font-bold">{game.currentTurn === 'X' ? (vsBot ? 'Вы (×)' : '× X') : (vsBot ? 'Бот (○)' : '○ O')}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Board */}
      <div className="grid grid-cols-3 gap-2">
        {game.board.map((cell, idx) => {
          const isWinCell = winLine?.includes(idx);
          return (
            <motion.button
              key={idx}
              whileTap={!cell ? { scale: 0.95 } : {}}
              onClick={() => handleCellClick(idx)}
              className={cn(
                'w-24 h-24 rounded-[16px] border-2 flex items-center justify-center transition-all duration-150',
                !cell && game.status === 'active' && 'hover:bg-[#F8FAFF] hover:border-[#CBD5E1] cursor-pointer',
                cell ? 'cursor-default' : 'cursor-pointer',
                isWinCell
                  ? 'border-[#16A34A] bg-[#DCFCE7] scale-105 shadow-[0_4px_16px_rgba(22,163,74,0.15)]'
                  : cell === 'X'
                    ? 'border-[#BFDBFE] bg-[#EFF6FF]'
                    : cell === 'O'
                      ? 'border-[#FECDD3] bg-[#FFF1F2]'
                      : 'border-[#E2E8F0] bg-white'
              )}
            >
              <AnimatePresence>
                {cell && (
                  <motion.span
                    initial={{ scale: 0, rotate: -15 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={cn(
                      'font-black text-5xl leading-none select-none',
                      isWinCell
                        ? 'text-[#16A34A]'
                        : cell === 'X'
                          ? 'text-[#2563EB]'
                          : 'text-[#E11D48]'
                    )}
                  >
                    {cell === 'X' ? '×' : '○'}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 w-full max-w-[304px]">
        <Button className="flex-1" onClick={() => startNewGame(vsBot)}>Реванш</Button>
        <Button variant="ghost" onClick={() => { setLocalGame(null); setTicTacToeGame(null); }}>
          Выйти
        </Button>
      </div>
    </div>
  );
}
