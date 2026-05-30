'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Anchor, Dice5, ArrowRight, Trophy, Skull, X as XIcon, Hourglass } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import { getSocket } from '@/lib/socket';
import type { BattleshipGame, BattleshipPlayer, Ship, BattleshipCell } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { useRoomStore } from '@/store/roomStore';
import { useGameStore } from '@/store/gameStore';

const SHIPS_CONFIG = [
  { size: 4, count: 1 },
  { size: 3, count: 2 },
  { size: 2, count: 3 },
  { size: 1, count: 4 },
];

const COL_LABELS = ['А','Б','В','Г','Д','Е','Ж','З','И','К'];
const ROW_LABELS = ['1','2','3','4','5','6','7','8','9','10'];

function createEmptyBoard(): BattleshipCell[] {
  return Array(100).fill('empty');
}

function getShipCells(pos: number, size: number, horizontal: boolean): number[] {
  const cells = [];
  for (let i = 0; i < size; i++) {
    cells.push(horizontal ? pos + i : pos + i * 10);
  }
  return cells;
}

function canPlaceShip(board: BattleshipCell[], cells: number[], horizontal: boolean, size: number): boolean {
  for (const cell of cells) {
    if (cell >= 100) return false;
    const row = Math.floor(cell / 10);
    const col = cell % 10;
    if (horizontal && col + size > 10) return false;
    if (!horizontal) {
      const startRow = Math.floor(cells[0] / 10);
      if (startRow + size > 10) return false;
    }
    if (board[cell] === 'ship') return false;
    const neighbors = [-11,-10,-9,-1,1,9,10,11];
    for (const n of neighbors) {
      const nc = cell + n;
      if (nc >= 0 && nc < 100 && board[nc] === 'ship') return false;
    }
  }
  return true;
}

function randomPlacement(): Ship[] {
  const board = createEmptyBoard();
  const ships: Ship[] = [];
  for (const { size, count } of SHIPS_CONFIG) {
    for (let i = 0; i < count; i++) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 200) {
        attempts++;
        const horizontal = Math.random() > 0.5;
        const pos = Math.floor(Math.random() * 100);
        const cells = getShipCells(pos, size, horizontal);
        if (canPlaceShip(board, cells, horizontal, size)) {
          cells.forEach(c => { board[c] = 'ship'; });
          ships.push({ id: uuidv4(), size, positions: cells, hits: [], sunk: false });
          placed = true;
        }
      }
    }
  }
  return ships;
}

function applyShipsToBoard(ships: Ship[]): BattleshipCell[] {
  const board = createEmptyBoard();
  ships.forEach(ship => {
    ship.positions.forEach(pos => {
      board[pos] = ship.sunk ? 'sunk' : ship.hits.includes(pos) ? 'hit' : 'ship';
    });
  });
  return board;
}

function Grid({
  board,
  showShips = false,
  interactive = false,
  onShoot,
}: {
  board: BattleshipCell[];
  showShips?: boolean;
  interactive?: boolean;
  onShoot?: (i: number) => void;
}) {
  return (
    <div className="inline-block">
      {/* Column labels */}
      <div className="flex ml-[22px]">
        {COL_LABELS.map(l => (
          <div key={l} className="w-7 text-center text-[9px] text-[#94A3B8] font-medium leading-none mb-0.5">{l}</div>
        ))}
      </div>
      {/* Rows */}
      {ROW_LABELS.map((rowLabel, ri) => (
        <div key={ri} className="flex items-center">
          <div className="w-5 text-right text-[9px] text-[#94A3B8] font-medium pr-1 flex-shrink-0">{rowLabel}</div>
          {board.slice(ri * 10, ri * 10 + 10).map((cell, fi) => {
            const i = ri * 10 + fi;
            const canClick = interactive && cell === 'empty';
            return (
              <motion.div
                key={fi}
                whileTap={canClick ? { scale: 0.9 } : {}}
                onClick={() => canClick && onShoot?.(i)}
                className={cn(
                  'w-7 h-7 flex-shrink-0 border flex items-center justify-center text-[11px] font-bold transition-all duration-100',
                  ri === 0 && fi === 0 && 'rounded-tl-[4px]',
                  ri === 0 && fi === 9 && 'rounded-tr-[4px]',
                  ri === 9 && fi === 0 && 'rounded-bl-[4px]',
                  ri === 9 && fi === 9 && 'rounded-br-[4px]',
                  cell === 'empty' && !canClick && 'border-[#E2E8F0] bg-[#F8FAFF]',
                  cell === 'empty' && canClick && 'border-[#E2E8F0] bg-[#F8FAFF] hover:bg-[#DBEAFE] hover:border-[#93C5FD] cursor-pointer',
                  cell === 'ship' && !showShips && 'border-[#E2E8F0] bg-[#F8FAFF]',
                  cell === 'ship' && showShips && 'border-[#93C5FD] bg-[#DBEAFE]',
                  cell === 'hit' && 'border-[#FCA5A5] bg-[#FEE2E2]',
                  cell === 'miss' && 'border-[#CBD5E1] bg-[#F1F5F9]',
                  cell === 'sunk' && 'border-[#EF4444] bg-[#FEE2E2]',
                )}
              >
                {cell === 'hit' && <XIcon size={12} className="text-[#DC2626]" strokeWidth={3} />}
                {cell === 'miss' && <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] inline-block" />}
                {cell === 'sunk' && <XIcon size={12} className="text-[#DC2626]" strokeWidth={3} />}
                {cell === 'ship' && showShips && <span className="w-3 h-3 rounded-[2px] bg-[#2563EB]/60 inline-block" />}
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface BattleshipProps {
  vsBot?: boolean;
  gameId?: string | null;
}

export default function Battleship({ vsBot: vsBotProp, gameId }: BattleshipProps = {}) {
  const { currentUser } = useRoomStore();
  const { battleshipGame, setBattleshipGame } = useGameStore();
  const [setupShips, setSetupShips] = useState<Ship[]>([]);
  const [phase, setPhase] = useState<'setup' | 'playing' | 'result'>('setup');
  const [myBoard, setMyBoard] = useState<BattleshipCell[]>(createEmptyBoard());
  const [opponentBoard, setOpponentBoard] = useState<BattleshipCell[]>(createEmptyBoard());
  const [opponentShips, setOpponentShips] = useState<Ship[]>([]);
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [winner, setWinner] = useState<'me' | 'opponent' | null>(null);
  // Tracks who got the first shot last game — alternates next game
  const lastFirstRef = useRef<'me' | 'opponent'>('opponent');
  const isMultiplayer = !!gameId && !vsBotProp;
  const myShipsRef = useRef<Ship[]>([]);

  // Multiplayer: subscribe to server updates
  useEffect(() => {
    if (!isMultiplayer) return;
    const socket: any = getSocket();
    const onUpdate = (g: any) => {
      // Server sends per-viewer view: { me, opponent, currentTurn, status, winner }
      setMyBoard(g.me.board);
      setOpponentBoard(g.opponent.board);
      const myTurn = g.currentTurn === currentUser?.id;
      setIsMyTurn(myTurn);
      if (g.status === 'setup') setPhase('setup');
      else if (g.status === 'active') setPhase('playing');
      else if (g.status === 'finished') {
        setPhase('result');
        setWinner(g.winner === currentUser?.id ? 'me' : 'opponent');
      }
      setBattleshipGame(g);
    };
    socket.off('battleship:update');
    socket.on('battleship:update', onUpdate);
    return () => { socket.off('battleship:update', onUpdate); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMultiplayer, currentUser]);

  const handleRandomPlace = () => {
    const ships = randomPlacement();
    setSetupShips(ships);
    setMyBoard(applyShipsToBoard(ships));
  };

  const startGame = () => {
    const ships = setupShips.length > 0 ? setupShips : randomPlacement();
    if (setupShips.length === 0) setMyBoard(applyShipsToBoard(ships));
    setSetupShips(ships);
    myShipsRef.current = ships;

    if (isMultiplayer && gameId) {
      // Multiplayer: send ready to server; opponent must also send their ships
      (getSocket() as any).emit('battleship:ready', { gameId, ships });
      // UI stays in setup until both sides ready (server transitions phase via update)
      return;
    }

    const oppShips = randomPlacement();
    setOpponentShips(oppShips);
    setOpponentBoard(createEmptyBoard());
    setPhase('playing');
    // Alternate first move each new game
    const meStartsThisTime = lastFirstRef.current === 'opponent';
    lastFirstRef.current = meStartsThisTime ? 'me' : 'opponent';
    setIsMyTurn(meStartsThisTime);
    if (!meStartsThisTime) {
      setTimeout(() => botShoot(ships), 700);
    }
    setWinner(null);
  };

  const shoot = (cell: number) => {
    if (!isMyTurn || phase !== 'playing') return;
    if (opponentBoard[cell] !== 'empty') return;

    if (isMultiplayer && gameId) {
      // Multiplayer: server resolves the shot and broadcasts the new boards
      (getSocket() as any).emit('battleship:shoot', { gameId, cell });
      return;
    }

    const newBoard = [...opponentBoard];
    const newShips = opponentShips.map(s => ({ ...s, hits: [...s.hits] }));
    const hitShip = newShips.find(s => s.positions.includes(cell));
    let isHit = false;

    if (hitShip) {
      hitShip.hits.push(cell);
      isHit = true;
      if (hitShip.hits.length === hitShip.size) {
        hitShip.sunk = true;
        hitShip.positions.forEach(p => { newBoard[p] = 'sunk'; });
      } else {
        newBoard[cell] = 'hit';
      }
    } else {
      newBoard[cell] = 'miss';
    }

    setOpponentBoard(newBoard);
    setOpponentShips(newShips);

    if (newShips.every(s => s.sunk)) {
      setWinner('me');
      setPhase('result');
      return;
    }

    if (!isHit) {
      setIsMyTurn(false);
      setTimeout(() => botShoot(setupShips), 800);
    }
  };

  const botShoot = useCallback((ships: Ship[]) => {
    const myB = applyShipsToBoard(ships);
    const available = myB.map((c, i) => (c === 'ship' || c === 'empty') ? i : -1).filter(i => i >= 0);
    if (available.length === 0) { setIsMyTurn(true); return; }

    const target = available[Math.floor(Math.random() * available.length)];
    const newMyShips = ships.map(s => ({ ...s, hits: [...s.hits] }));
    const hitShip = newMyShips.find(s => s.positions.includes(target));
    let isHit = false;

    if (hitShip) {
      hitShip.hits.push(target);
      isHit = true;
      if (hitShip.hits.length === hitShip.size) {
        hitShip.sunk = true;
      }
    }

    setSetupShips(newMyShips);
    setMyBoard(applyShipsToBoard(newMyShips));

    if (newMyShips.every(s => s.sunk)) {
      setWinner('opponent');
      setPhase('result');
      return;
    }

    if (isHit) {
      setTimeout(() => botShoot(newMyShips), 600);
    } else {
      setIsMyTurn(true);
    }
  }, []);

  const reset = () => {
    if (isMultiplayer && gameId) {
      (getSocket() as any).emit('battleship:rematch', { gameId });
      return;
    }
    setSetupShips([]);
    setMyBoard(createEmptyBoard());
    setOpponentBoard(createEmptyBoard());
    setPhase('setup');
    setWinner(null);
    setIsMyTurn(true);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 max-h-[80vh] overflow-y-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-[10px] bg-[#EFF6FF] flex items-center justify-center"><Anchor size={18} className="text-[#2563EB]" /></div>
        <div>
          <h2 className="font-bold text-[#0F172A] text-base leading-tight">Морской бой</h2>
          <p className="text-xs text-[#94A3B8]">
            {phase === 'setup'
              ? (isMultiplayer && (battleshipGame as any)?.me?.ready ? 'Ожидаем готовности соперника...' : 'Расставьте корабли')
              : phase === 'result' ? 'Игра окончена'
              : isMyTurn ? 'Ваш ход — стреляйте!'
              : (isMultiplayer ? 'Ход соперника...' : 'Бот думает...')}
          </p>
        </div>
      </div>

      {/* Setup */}
      {phase === 'setup' && (
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-3 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-medium text-[#475569] mb-2 text-center">Ваше поле</p>
            <Grid board={myBoard} showShips />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleRandomPlace}><Dice5 size={14} /> Случайно</Button>
            <Button onClick={startGame}>Начать игру <ArrowRight size={14} /></Button>
          </div>
        </div>
      )}

      {/* Playing */}
      {phase === 'playing' && (
        <div className="flex flex-col gap-4 items-center">
          {/* Turn indicator */}
          <div className={cn(
            'px-4 py-1.5 rounded-full text-xs font-semibold border',
            isMyTurn
              ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]'
              : 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
          )}>
            {isMyTurn ? (
              <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" /> Ваш ход</span>
            ) : (
              <span className="inline-flex items-center gap-1.5"><Hourglass size={12} /> {isMultiplayer ? 'Ход соперника…' : 'Бот думает…'}</span>
            )}
          </div>

          <div className="flex flex-row flex-wrap gap-5 items-start justify-center w-full max-w-full overflow-x-auto">
            {/* My board */}
            <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-3 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-medium text-[#475569] mb-2 text-center">Ваш флот</p>
              <Grid board={myBoard} showShips />
            </div>

            {/* Opponent board */}
            <div className="bg-white border border-[#E2E8F0] rounded-[16px] p-3 shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
              <p className="text-xs font-medium text-[#475569] mb-2 text-center">Флот противника</p>
              <Grid board={opponentBoard} interactive={isMyTurn} onShoot={shoot} />
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-[10px] text-[#64748B]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-[2px] border border-[#FCA5A5] bg-[#FEE2E2] flex items-center justify-center">
                <XIcon size={8} className="text-[#DC2626]" strokeWidth={3} />
              </div>
              Попадание
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-[2px] border border-[#CBD5E1] bg-[#F1F5F9] flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-[#94A3B8]" />
              </div>
              Мимо
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-[2px] border border-[#93C5FD] bg-[#DBEAFE]" />
              Корабль
            </div>
          </div>
        </div>
      )}

      {/* Result */}
      {phase === 'result' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 py-4"
        >
          <div className={cn(
            'w-20 h-20 rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(15,23,42,0.10)]',
            winner === 'me' ? 'bg-[#DCFCE7]' : 'bg-[#FEE2E2]'
          )}>
            {winner === 'me'
              ? <Trophy size={36} className="text-[#15803D]" />
              : <Skull size={36} className="text-[#DC2626]" />}
          </div>
          <div className="text-center">
            <h3 className={cn(
              'text-xl font-bold',
              winner === 'me' ? 'text-[#15803D]' : 'text-[#DC2626]'
            )}>
              {winner === 'me' ? 'Победа!' : 'Поражение'}
            </h3>
            <p className="text-sm text-[#94A3B8] mt-1">
              {winner === 'me' ? 'Вы потопили весь флот противника' : (isMultiplayer ? 'Соперник потопил ваш флот' : 'Бот потопил ваш флот')}
            </p>
          </div>
          <Button onClick={reset}>Новая игра</Button>
        </motion.div>
      )}
    </div>
  );
}
