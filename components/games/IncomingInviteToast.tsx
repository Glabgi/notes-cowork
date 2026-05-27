'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Crown, X as XIcon, Anchor, Bell, Check, X } from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { getSocket } from '@/lib/socket';
import Avatar from '@/components/ui/Avatar';

const GAME_LABEL: Record<string, { name: string; Icon: React.ElementType }> = {
  chess:      { name: 'Шахматы',         Icon: Crown },
  tictactoe:  { name: 'Крестики-нолики', Icon: XIcon },
  battleship: { name: 'Морской бой',     Icon: Anchor },
};

/**
 * Floating toast in bottom-right that shows incoming game invites.
 * Multiple invites stack. Accept/Decline emit through socket.
 */
export default function IncomingInviteToast() {
  const { pendingInvites, removeInvite, setGameOpen, setActiveGame } = useGameStore();
  const { room } = useRoomStore();

  // Browser notification (if granted) for each new invite
  useEffect(() => {
    if (pendingInvites.length === 0) return;
    const latest = pendingInvites[pendingInvites.length - 1];
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Приглашение в игру', {
          body: `${(latest as any).fromUserName || 'Игрок'} зовёт сыграть в ${GAME_LABEL[(latest as any).gameType]?.name || 'игру'}`,
        });
      } catch {}
    }
  }, [pendingInvites]);

  const accept = (invite: any) => {
    if (!room) return;
    (getSocket() as any).emit('game:accept', {
      inviteId: invite.id,
      roomId: room.slug,
      fromUserId: invite.fromUserId,
      gameType: invite.gameType,
    });
    removeInvite(invite.id);
    // Open game zone - server will emit game:start with gameId
    setGameOpen(true);
    setActiveGame({ type: invite.gameType, id: invite.id });
  };

  const decline = (invite: any) => {
    if (!room) return;
    (getSocket() as any).emit('game:decline', {
      inviteId: invite.id,
      fromUserId: invite.fromUserId,
      roomId: room.slug,
    });
    removeInvite(invite.id);
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {pendingInvites.map((invite: any) => {
          const meta = GAME_LABEL[invite.gameType] || GAME_LABEL.tictactoe;
          const Icon = meta.Icon;
          return (
            <motion.div
              key={invite.id}
              initial={{ opacity: 0, y: 30, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              className="pointer-events-auto bg-[var(--bg-card)] border border-[var(--border-accent)] rounded-[16px] shadow-[0_8px_28px_rgba(15,23,42,0.18)] p-4 w-80"
            >
              <div className="flex items-start gap-3">
                {invite.fromUserAvatarId
                  ? <Avatar id={invite.fromUserAvatarId} size={40} />
                  : <div className="w-10 h-10 bg-[var(--accent-light)] rounded-full flex items-center justify-center"><Bell size={18} className="text-[var(--accent)]" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--text-primary)]">
                    {invite.fromUserName || 'Игрок'}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 inline-flex items-center gap-1">
                    приглашает в <Icon size={11} /> <span className="font-medium text-[var(--text-secondary)]">{meta.name}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => accept(invite)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-[10px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors"
                >
                  <Check size={14} /> Принять
                </button>
                <button
                  onClick={() => decline(invite)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-[10px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border)] transition-colors"
                >
                  <X size={14} /> Отклонить
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
