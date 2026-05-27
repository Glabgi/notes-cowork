'use client';

import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { getSocket } from '@/lib/socket';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import TicTacToe from './TicTacToe';
import Battleship from './Battleship';
import type { GameType } from '@/types';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import { Crown, X as XIcon, Anchor, ArrowLeft, Bot, Users, Send, Clock } from 'lucide-react';

const Chess = dynamic(() => import('./Chess'), { ssr: false });

export const GAMES: { id: GameType; name: string; Icon: React.ElementType; desc: string }[] = [
  { id: 'chess',      name: 'Шахматы',         Icon: Crown,  desc: 'Классические шахматы. Стороны чередуются каждую партию.' },
  { id: 'tictactoe',  name: 'Крестики-нолики', Icon: XIcon,  desc: 'Быстрые партии. X и O меняются местами.' },
  { id: 'battleship', name: 'Морской бой',     Icon: Anchor, desc: 'Расставь флот. Первый ход чередуется.' },
];

type Mode = 'bot' | 'friend' | null;

/* ─── Inline mini selector for the right SidePanel ─────────────────────── */
export function GameSelector() {
  const { setGameOpen, setActiveGame } = useGameStore();
  return (
    <div className="p-3 space-y-2">
      <p className="text-xs text-[var(--text-muted)] px-1">Выберите игру</p>
      {GAMES.map(game => (
        <button
          key={game.id}
          onClick={() => { setActiveGame({ type: game.id, id: 'local' }); setGameOpen(true); }}
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

/* ─── Outgoing invite waiting screen ──────────────────────────────────── */
function WaitingForInvite({ toUser, onCancel }: { toUser: { name: string; avatarId: string }; onCancel: () => void }) {
  return (
    <div className="p-8 flex flex-col items-center gap-4 text-center">
      <div className="relative">
        <Avatar id={toUser.avatarId} size={64} />
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--accent)] border-2 border-[var(--bg-card)] flex items-center justify-center">
          <Clock size={11} className="text-white animate-pulse" />
        </div>
      </div>
      <div>
        <p className="font-semibold text-[var(--text-primary)]">Ожидание ответа</p>
        <p className="text-sm text-[var(--text-muted)] mt-1">Приглашение отправлено <strong>{toUser.name}</strong></p>
      </div>
      <Button variant="ghost" onClick={onCancel}>Отменить</Button>
    </div>
  );
}

/* ─── Main GameZone Modal ─────────────────────────────────────────────── */
export default function GameZone() {
  const { isGameOpen, setGameOpen, activeGame, setActiveGame } = useGameStore();
  const { room, currentUser } = useRoomStore();
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [waitingFor, setWaitingFor] = useState<{ name: string; avatarId: string } | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);

  const currentGame = selectedGame || activeGame?.type || null;
  const otherParticipants = (room?.participants || []).filter(p => p.id !== currentUser?.id);

  // Listen for game start (when friend accepts) or invite declined
  useEffect(() => {
    const s: any = getSocket();
    const onStart = ({ gameType, gameId }: { gameType: GameType; gameId: string }) => {
      setActiveGameId(gameId);
      setSelectedGame(gameType);
      setMode('friend');
      setWaitingFor(null);
      setGameOpen(true);
    };
    const onDeclined = () => {
      setWaitingFor(null);
      setMode(null);
      alert('Игрок отклонил приглашение');
    };
    s.off('game:start');
    s.off('game:declined');
    s.on('game:start', onStart);
    s.on('game:declined', onDeclined);
    return () => {
      s.off('game:start', onStart);
      s.off('game:declined', onDeclined);
    };
  }, [setGameOpen]);

  const handleClose = () => {
    setGameOpen(false);
    setSelectedGame(null);
    setActiveGame(null);
    setMode(null);
    setWaitingFor(null);
    setActiveGameId(null);
  };

  const goBack = () => {
    if (mode) { setMode(null); setWaitingFor(null); return; }
    setSelectedGame(null);
    setActiveGame(null);
  };

  const handleInvite = (toUser: { id: string; name: string; avatarId: string }) => {
    if (!room || !currentUser || !selectedGame) return;
    (getSocket() as any).emit('game:invite', {
      roomId: room.slug,
      toUserId: toUser.id,
      gameType: selectedGame,
    });
    setWaitingFor({ name: toUser.name, avatarId: toUser.avatarId });
  };

  return (
    <Modal
      open={isGameOpen}
      onClose={handleClose}
      title={
        currentGame
          ? GAMES.find(g => g.id === currentGame)?.name || 'Игра'
          : 'Игровая зона'
      }
      size={currentGame === 'chess' ? 'full' : 'lg'}
    >
      {/* Step 1: Pick game type */}
      {!currentGame && (
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
      )}

      {/* Step 2: Pick mode (bot or friend) — only when game picked and mode not set */}
      {currentGame && !mode && (
        <div className="p-6 space-y-4">
          <button
            onClick={goBack}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={12} /> Назад к играм
          </button>
          <p className="text-[var(--text-muted)] text-sm">Выберите режим игры</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode('bot')}
              className="flex flex-col items-center gap-3 p-5 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border-2 border-[var(--border)] hover:border-[var(--border-accent)] rounded-[16px] transition-all group"
            >
              <div className="w-14 h-14 rounded-[14px] bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Bot size={26} className="text-[#16A34A]" />
              </div>
              <div className="text-center">
                <p className="font-bold text-[var(--text-primary)]">Против бота</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Сыграть сразу, в одиночку</p>
              </div>
            </button>
            <button
              onClick={() => setMode('friend')}
              disabled={otherParticipants.length === 0}
              className="flex flex-col items-center gap-3 p-5 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border-2 border-[var(--border)] hover:border-[var(--border-accent)] rounded-[16px] transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="w-14 h-14 rounded-[14px] bg-[var(--accent-light)] border border-[var(--border-accent)] flex items-center justify-center group-hover:scale-105 transition-transform">
                <Users size={26} className="text-[var(--accent)]" />
              </div>
              <div className="text-center">
                <p className="font-bold text-[var(--text-primary)]">Пригласить друга</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {otherParticipants.length > 0
                    ? `В комнате ${otherParticipants.length} ${otherParticipants.length === 1 ? 'участник' : 'участников'}`
                    : 'Никого в комнате'}
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Step 3a: Pick friend to invite */}
      {currentGame && mode === 'friend' && !waitingFor && !activeGameId && (
        <div className="p-6 space-y-3">
          <button
            onClick={goBack}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1 mb-2"
          >
            <ArrowLeft size={12} /> Выбрать режим
          </button>
          <p className="text-sm font-medium text-[var(--text-primary)]">Кого пригласить?</p>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {otherParticipants.map(p => (
              <button
                key={p.id}
                onClick={() => handleInvite({ id: p.id, name: p.name, avatarId: p.avatarId })}
                className="w-full flex items-center gap-3 p-3 bg-[var(--bg-card)] hover:bg-[var(--accent-light)] border border-[var(--border)] hover:border-[var(--border-accent)] rounded-[12px] transition-colors text-left group"
              >
                <Avatar id={p.avatarId} size={36} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--text-primary)] truncate text-sm">{p.name}</p>
                  <p className="text-xs text-[var(--text-muted)] capitalize">{p.status}</p>
                </div>
                <Send size={14} className="text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3b: Waiting for response */}
      {waitingFor && <WaitingForInvite toUser={waitingFor} onCancel={() => { setWaitingFor(null); setMode(null); }} />}

      {/* Step 4: Active game */}
      {currentGame && mode && !waitingFor && (mode === 'bot' || activeGameId) && (
        <div>
          <div className="px-4 pb-1 pt-1">
            <button
              onClick={goBack}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Назад
            </button>
          </div>
          {currentGame === 'tictactoe'  && <TicTacToe vsBot={mode === 'bot'} gameId={activeGameId} />}
          {currentGame === 'battleship' && <Battleship />}
          {currentGame === 'chess'      && <Chess />}
        </div>
      )}
    </Modal>
  );
}
