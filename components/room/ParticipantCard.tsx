'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Participant } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { getStatusLabel, formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Timer, Clock, Gamepad2 } from 'lucide-react';

interface ParticipantCardProps {
  participant: Participant;
  isMe?: boolean;
  speaking?: boolean;
  onInviteGame?: (userId: string) => void;
}

function getStatusDotColor(status: string) {
  switch (status) {
    case 'focus':  return 'bg-[var(--status-online)]';
    case 'break':  return 'bg-[var(--status-break)]';
    case 'gaming': return 'bg-[var(--status-gaming)]';
    case 'dnd':    return 'bg-[var(--status-dnd)]';
    default:       return 'bg-[var(--status-away)]';
  }
}

export default function ParticipantCard({ participant, isMe, speaking, onInviteGame }: ParticipantCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'glass relative rounded-[20px] p-4 cursor-pointer group transition-all duration-200 hover-lift',
        'hover:border-[var(--accent)]',
        isMe && 'glow-accent',
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Status dot */}
      <div className={cn('absolute top-3 right-3 w-3 h-3 rounded-full border-2 border-white/80', getStatusDotColor(participant.status))} />

      <div className="flex flex-col items-center gap-3">
        <div className={cn('rounded-full', speaking && 'animate-speaking')}>
          <Avatar id={participant.avatarId} size={56} showRing status={participant.status} />
        </div>

        <div className="text-center min-w-0 w-full">
          <p className="font-semibold text-[var(--text-primary)] text-sm truncate">
            {participant.name}
            {isMe && <span className="ml-1 text-xs text-[var(--accent)] font-medium">(вы)</span>}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{getStatusLabel(participant.status)}</p>
        </div>

        {participant.currentTask && (
          <div className="bg-[var(--accent-light)] rounded-full px-3 py-1.5 w-full flex items-center justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
            <p className="text-xs text-[var(--accent)] font-medium line-clamp-1 leading-relaxed">{participant.currentTask}</p>
          </div>
        )}

        {/* Pomodoro count */}
        {participant.pomodoroCount > 0 && (
          <div className="flex items-center gap-1 text-[var(--text-muted)]">
            <Timer size={11} />
            <span className="text-[10px] font-medium">{participant.pomodoroCount}</span>
            {Array.from({ length: Math.min(participant.pomodoroCount, 4) }).map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] opacity-50" />
            ))}
            {participant.pomodoroCount > 4 && (
              <span className="text-[10px]">+{participant.pomodoroCount - 4}</span>
            )}
          </div>
        )}
      </div>

      {/* Hover tooltip */}
      {showTooltip && !isMe && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-elevated absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 w-52 rounded-[16px] p-4 text-xs"
        >
          <p className="font-semibold text-[var(--text-primary)] mb-2">{participant.name}</p>
          <div className="space-y-1 text-[var(--text-secondary)]">
            <p className="flex items-center gap-1.5"><Timer size={11} /> Помидорок: {participant.pomodoroCount}</p>
            <p className="flex items-center gap-1.5"><Clock size={11} /> Фокус: {formatDuration(participant.focusMinutes)}</p>
          </div>
          {onInviteGame && participant.status === 'break' && (
            <button
              onClick={() => onInviteGame(participant.id)}
              className="mt-2.5 w-full py-1.5 flex items-center justify-center gap-1.5 bg-[var(--accent-light)] hover:bg-[var(--accent)] hover:text-white border border-[var(--accent)] text-[var(--accent)] rounded-[8px] transition-colors duration-150 font-medium text-xs"
            >
              <Gamepad2 size={12} /> Сыграть
            </button>
          )}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[var(--border)]" />
        </motion.div>
      )}
    </motion.div>
  );
}
