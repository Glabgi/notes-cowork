'use client';

import { useState } from 'react';
import { Users, CheckSquare, Settings, Crown, Timer, Music, Mic, MicOff, UserX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRoomStore } from '@/store/roomStore';
import { getSocket } from '@/lib/socket';
import { useVoiceStore } from '@/store/voiceStore';
import Avatar from '@/components/ui/Avatar';
import { getStatusLabel, getStatusColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import TaskPanel from '@/components/tasks/TaskPanel';
import MusicPanel from './MusicPanel';

type Tab = 'music' | 'participants' | 'tasks';

export default function SidePanel() {
  const [tab, setTab] = useState<Tab>('participants');
  const { room, currentUser } = useRoomStore();
  const voice = useVoiceStore();
  const router = useRouter();

  const tabs: { id: Tab; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: 'music',        icon: Music,       label: 'Музыка' },
    { id: 'participants', icon: Users,       label: 'Люди',   badge: room?.participants.length },
    { id: 'tasks',        icon: CheckSquare, label: 'Задачи' },
  ];

  return (
    <div className="w-full lg:w-72 flex-shrink-0 bg-[var(--bg-card)] border-t lg:border-t-0 lg:border-l border-[var(--border)] flex flex-col h-full overflow-hidden lg:rounded-[12px] lg:border lg:shadow-md">
      {/* Tab bar */}
      <div className="flex items-center gap-0.5 p-1.5 border-b border-[var(--border)] bg-[var(--bg-subtle)] flex-shrink-0">
        {tabs.map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            title={label}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-[6px] text-[10px] font-medium transition-all relative',
              tab === id
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]/60'
            )}
          >
            <Icon size={15} />
            <span>{label}</span>
            {badge != null && badge > 0 && (
              <span className="absolute top-0.5 right-1 bg-[var(--accent)] text-white text-[9px] min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center font-bold">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
          </button>
        ))}

        {/* Settings shortcut */}
        <button
          onClick={() => router.push('/settings')}
          title="Настройки"
          className="px-2 py-1.5 rounded-[6px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
        >
          <Settings size={14} />
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'music' && <MusicPanel />}
        {tab === 'tasks' && <TaskPanel />}
        {tab === 'participants' && (
          <div className="h-full overflow-y-auto p-3 space-y-0.5">
            {(() => {
              const iAmOwner = currentUser?.isOwner === true || (currentUser?.id != null && currentUser?.id === room?.ownerId);
              return room?.participants.map(p => {
                const inVoice = p.id === currentUser?.id ? voice.inVoice : !!voice.peers[p.id];
                const speaking = voice.activeSpeakerId === p.id;
                const muted = p.id === currentUser?.id ? voice.micMuted : voice.peers[p.id]?.muted;
                return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-[10px] hover:bg-[var(--bg-hover)] transition-colors group"
                >
                  <div className={cn(
                    'rounded-full relative flex-shrink-0',
                    speaking && 'ring-2 ring-[var(--status-online)] ring-offset-2 ring-offset-[var(--bg-card)]'
                  )}>
                    <Avatar id={p.avatarId} size={32} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate flex items-center gap-1">
                      <span className="truncate">{p.name}</span>
                      {p.id === currentUser?.id && <span className="text-xs text-[var(--accent)]">(вы)</span>}
                      {p.isOwner && <Crown size={11} className="text-[var(--status-break)] flex-shrink-0" />}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{getStatusLabel(p.status)}</p>
                    {p.currentTask && (
                      <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mr-1 align-middle" />
                        {p.currentTask}
                      </p>
                    )}
                  </div>
                  {iAmOwner && p.id !== currentUser?.id && (
                    <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          if (!confirm('Передать права главы?')) return;
                          getSocket().emit('room:transfer-owner', { roomId: room?.slug, targetUserId: p.id });
                        }}
                        title="Передать права главы"
                        className="p-1.5 rounded-[8px] text-[var(--status-break)] hover:bg-[rgba(196,120,74,0.15)] transition-colors"
                      >
                        <Crown size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm('Удалить участника?')) return;
                          getSocket().emit('room:kick', { roomId: room?.slug, targetUserId: p.id });
                        }}
                        title="Удалить участника"
                        className="p-1.5 rounded-[8px] text-[var(--danger)] hover:bg-[rgba(196,85,90,0.15)] transition-colors"
                      >
                        <UserX size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1">
                      {inVoice && (
                        muted
                          ? <MicOff size={12} className="text-[var(--danger)]" />
                          : <Mic size={12} className={cn(speaking ? 'text-[var(--status-online)] animate-pulse-dot' : 'text-[var(--status-online)] opacity-70')} />
                      )}
                      <div className={cn('w-2 h-2 rounded-full', getStatusColor(p.status))} />
                    </div>
                    {p.pomodoroCount > 0 && (
                      <span className="text-[10px] text-[var(--text-muted)] inline-flex items-center gap-0.5">
                        <Timer size={9} />{p.pomodoroCount}
                      </span>
                    )}
                  </div>
                </div>
                );
              });
            })()}
            {(!room?.participants.length) && (
              <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)]">
                <Users size={28} className="mb-2" />
                <p className="text-sm">Пока никого</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
