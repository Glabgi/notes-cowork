'use client';

import { motion } from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import type { Participant } from '@/types';
import Avatar from '@/components/ui/Avatar';
import { getStatusLabel, formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Timer, Clock } from 'lucide-react';
import { useVoiceStore } from '@/store/voiceStore';

/* Live webcam tile — binds a MediaStream to a <video>. Own preview is mirrored + muted. */
function VideoTile({ stream, mirror, className }: { stream: MediaStream; mirror?: boolean; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className={cn('w-full h-full object-cover', mirror && 'scale-x-[-1]', className)}
    />
  );
}

interface ParticipantCardProps {
  participant: Participant;
  isMe?: boolean;
}

function getStatusDotColor(status: string) {
  switch (status) {
    case 'focus':  return 'bg-[var(--accent)]';
    case 'break':  return 'bg-[#4cc2a8]';
    default:       return 'bg-[var(--status-away)]';
  }
}

export default function ParticipantCard({ participant, isMe }: ParticipantCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const camStream = useVoiceStore((s) => s.cameraStreams[participant.id]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        'relative w-[150px] bg-[var(--bg-card)] border rounded-[16px] p-4 cursor-pointer group transition-all duration-150',
        'hover:border-[var(--accent)] hover:shadow-md hover:-translate-y-0.5',
        isMe ? 'border-[var(--accent)] bg-[var(--accent-light)]' : 'border-[var(--border)]',
      )}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Status dot */}
      <div className={cn('absolute top-3 right-3 w-3 h-3 rounded-full border-2 border-[var(--bg-card)]', getStatusDotColor(participant.status))} />

      <div className="flex flex-col items-center gap-3">
        {camStream ? (
          <div className="relative w-full aspect-[4/3] rounded-[10px] overflow-hidden bg-black ring-1 ring-[var(--border)]">
            <VideoTile stream={camStream} mirror={isMe} />
          </div>
        ) : (
          <Avatar id={participant.avatarId} size={56} showRing status={participant.status} />
        )}

        <div className="text-center min-w-0 w-full">
          <p className="font-semibold text-[var(--text-primary)] text-sm truncate">
            {participant.name}
            {isMe && <span className="ml-1 text-xs text-[var(--accent)] font-medium">(вы)</span>}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{getStatusLabel(participant.status)}</p>
        </div>

        {participant.currentTask && (
          <div className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[8px] px-2.5 py-1.5 w-full flex items-start gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0 mt-1" />
            <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">{participant.currentTask}</p>
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
          className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-10 w-52 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-[12px] p-4 shadow-lg text-xs"
        >
          <p className="font-semibold text-[var(--text-primary)] mb-2">{participant.name}</p>
          <div className="space-y-1 text-[var(--text-secondary)]">
            <p className="flex items-center gap-1.5"><Timer size={11} /> Помидорок: {participant.pomodoroCount}</p>
            <p className="flex items-center gap-1.5"><Clock size={11} /> Фокус: {formatDuration(participant.focusMinutes)}</p>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[var(--border)]" />
        </motion.div>
      )}
    </motion.div>
  );
}
