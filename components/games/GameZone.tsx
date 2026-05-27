'use client';

import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import Modal from '@/components/ui/Modal';
import TicTacToe from './TicTacToe';
import Battleship from './Battleship';
import type { GameType } from '@/types';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Crown, X as XIcon, Anchor, ArrowLeft } from 'lucide-react';

const Chess = dynamic(() => import('./Chess'), { ssr: false });

export const GAMES: { id: GameType; name: string; Icon: React.ElementType; desc: string }[] = [
  { id: 'chess',      name: 'Шахматы',         Icon: Crown,  desc: 'Классические шахматы против бота или друга' },
  { id: 'tictactoe',  name: 'Крестики-нолики', Icon: XIcon,  desc: 'Быстрые партии, счёт серии, minimax-бот' },
  { id: 'battleship', name: 'Морской бой',     Icon: Anchor, desc: 'Расставь флот и топи противника!' },
];

export function GameSelector() {
  const { setGameOpen, setActiveGame } = useGameStore();

  const handleSelect = (type: GameType) => {
    setActiveGame({ type, id: 'local' });
    setGameOpen(true);
  };

  return (
    <div className="p-3 space-y-2">
      <p className="text-xs text-[var(--text-muted)] px-1">Выберите игру для перерыва</p>
      {GAMES.map(game => (
        <button
          key={game.id}
          onClick={() => handleSelect(game.id)}
          className="w-full flex items-center gap-3 p-3 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[14px] text-left transition-all duration-150 group"
        >
          <div className="w-10 h-10 rounded-[10px] bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--border-accent)] transition-colors">
            <game.Icon size={18} className="text-[var(--accent)]" />
          </div>
          <div>
            <p className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{game.name}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{game.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

export default function GameZone() {
  const { isGameOpen, setGameOpen, activeGame, setActiveGame } = useGameStore();
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);

  const handleClose = () => {
    setGameOpen(false);
    setSelectedGame(null);
    setActiveGame(null);
  };

  // Open to specific game when activeGame is set from GameSelector
  const currentGame = selectedGame || activeGame?.type || null;

  return (
    <Modal
      open={isGameOpen}
      onClose={handleClose}
      title={currentGame
        ? GAMES.find(g => g.id === currentGame)?.name || 'Игра'
        : 'Игровая зона'
      }
      size={currentGame === 'chess' ? 'full' : 'lg'}
    >
      {!currentGame ? (
        <div className="p-6">
          <p className="text-[var(--text-muted)] text-sm mb-5">Выберите игру для перерыва</p>
          <div className="grid grid-cols-1 gap-3">
            {GAMES.map(game => (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game.id)}
                className="flex items-center gap-4 p-4 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border-2 border-[var(--border)] hover:border-[var(--border-accent)] rounded-[16px] text-left transition-all duration-150 group"
              >
                <div className="w-12 h-12 rounded-[12px] bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--border-accent)] transition-colors">
                  <game.Icon size={22} className="text-[var(--accent)]" />
                </div>
                <div>
                  <p className="font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">{game.name}</p>
                  <p className="text-sm text-[var(--text-muted)] mt-0.5">{game.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <div className="px-4 pb-1 pt-1">
            <button
              onClick={() => { setSelectedGame(null); setActiveGame(null); }}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Назад к играм
            </button>
          </div>
          {currentGame === 'tictactoe'  && <TicTacToe />}
          {currentGame === 'battleship' && <Battleship />}
          {currentGame === 'chess'      && <Chess />}
        </div>
      )}
    </Modal>
  );
}
