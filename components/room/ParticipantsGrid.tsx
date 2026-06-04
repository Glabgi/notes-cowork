'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { useRoomStore } from '@/store/roomStore';
import ParticipantCard from './ParticipantCard';

export default function ParticipantsGrid() {
  const { room, currentUser } = useRoomStore();

  if (!room) return null;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:overflow-y-auto">
      <div className="mb-5">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          Участники · {room.participants.length}
        </h2>
      </div>

      <motion.div
        className="flex flex-wrap gap-3 content-start"
        layout
      >
        <AnimatePresence>
          {room.participants.map((participant) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              isMe={participant.id === currentUser?.id}
            />
          ))}
        </AnimatePresence>

        {room.participants.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full flex flex-col items-center justify-center py-20"
          >
            <div className="w-16 h-16 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-center mb-4">
              <Users size={28} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-base font-medium text-[var(--text-secondary)]">Пока никого нет</p>
            <p className="text-sm text-[var(--text-muted)] mt-1">Поделитесь ссылкой, чтобы пригласить друзей</p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
