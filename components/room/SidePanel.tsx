'use client';

import { useState } from 'react';
import { Users, MessageSquare, CheckSquare, Settings, Gamepad2, Crown, Timer, Volume2, UserX, Share2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ChatPanel from './ChatPanel';
import { useRoomStore } from '@/store/roomStore';
import { getSocket } from '@/lib/socket';
import { useVoiceStore } from '@/store/voiceStore';
import Avatar from '@/components/ui/Avatar';
import { getStatusLabel, getStatusColor, copyToClipboard } from '@/lib/utils';
import { cn } from '@/lib/utils';
import TaskPanel from '@/components/tasks/TaskPanel';
import GameZone, { GameSelector } from '@/components/games/GameZone';
import VoicePanel from '@/components/voice/VoicePanel';

type Tab = 'participants' | 'chat' | 'tasks' | 'games' | 'voice';

export default function SidePanel() {
  const [tab, setTab] = useState<Tab>('chat');
  const { room, currentUser } = useRoomStore();
  const voiceCount = useVoiceStore(s => s.inVoice ? Object.keys(s.peers).length + 1 : 0);
  const router = useRouter();

  const tabs: { id: Tab; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: 'voice',        icon: Volume2,       label: 'Голос',  badge: voiceCount || undefined },
    { id: 'chat',         icon: MessageSquare, label: 'Чат' },
    { id: 'participants', icon: Users,         label: 'Люди',   badge: room?.participants.length },
    { id: 'tasks',        icon: CheckSquare,   label: 'Задачи' },
    { id: 'games',        icon: Gamepad2,      label: 'Игры' },
  ];

  return (
    <>
      <div className="w-72 flex-shrink-0 glass-subtle border-l border-[var(--border)] flex flex-col h-full overflow-hidden lg:rounded-[20px] lg:border lg:shadow-lg">
        {/* Tab bar — frosted pill row */}
        <div className="flex items-center gap-1 p-2 border-b border-[var(--divider)] flex-shrink-0">
          {tabs.map(({ id, icon: Icon, label, badge }) => {
            const active = tab === id;
            return (
            <button
              key={id}
              onClick={() => setTab(id)}
              title={label}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2 rounded-[12px] text-[11px] font-semibold transition-all relative',
                active
                  ? 'bg-[var(--accent-light)] text-[var(--accent)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
              )}
            >
              <Icon size={16} className={cn(active && id === 'voice' && 'text-[var(--status-online)]')} />
              <span>{label}</span>
              {active && <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-accent-grad" />}
              {badge != null && badge > 0 && (
                <span className="absolute top-1 right-2 bg-[var(--danger)] text-white text-[9px] min-w-[14px] h-[14px] px-1 rounded-full flex items-center justify-center font-bold">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
            );
          })}

          {/* Settings shortcut */}
          <button
            onClick={() => router.push('/settings')}
            title="Настройки"
            className="px-2 py-2 rounded-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <Settings size={15} />
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {tab === 'participants' && (
            <div className="h-full overflow-y-auto p-3 space-y-0.5">
              {(() => {
                const iAmOwner = currentUser?.isOwner === true || (currentUser?.id != null && currentUser?.id === room?.ownerId);
                return room?.participants.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-2.5 py-2.5 rounded-[16px] hover:bg-[var(--bg-hover)] transition-colors group"
                >
                  <Avatar id={p.avatarId} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate flex items-center gap-1">
                      <span className="truncate">{p.name}</span>
                      {p.id === currentUser?.id && <span className="text-xs text-[var(--accent)]">(вы)</span>}
                      {p.isOwner && <Crown size={11} className="text-[var(--status-break)] flex-shrink-0" />}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{getStatusLabel(p.status)}</p>
                    {p.currentTask && (
                      <span className="inline-flex items-center gap-1 mt-1 max-w-full px-2 py-0.5 rounded-full bg-[var(--accent-light)] text-[var(--accent)] text-[10px] font-medium truncate">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] flex-shrink-0" />
                        <span className="truncate">{p.currentTask}</span>
                      </span>
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
                        className="p-1.5 rounded-[10px] text-[var(--status-break)] hover:bg-[rgba(245,158,11,0.15)] transition-colors"
                      >
                        <Crown size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm('Удалить участника?')) return;
                          getSocket().emit('room:kick', { roomId: room?.slug, targetUserId: p.id });
                        }}
                        title="Удалить участника"
                        className="p-1.5 rounded-[10px] text-[var(--danger)] hover:bg-[rgba(239,68,68,0.15)] transition-colors"
                      >
                        <UserX size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className={cn('w-2.5 h-2.5 rounded-full', getStatusColor(p.status))} />
                    {p.pomodoroCount > 0 && (
                      <span className="text-[10px] text-[var(--text-muted)] inline-flex items-center gap-0.5">
                        <Timer size={9} />{p.pomodoroCount}
                      </span>
                    )}
                  </div>
                </div>
                ));
              })()}
              {(!room?.participants.length) && (
                <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] gap-3 px-4">
                  <div className="w-14 h-14 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
                    <Users size={26} className="text-[var(--accent)]" />
                  </div>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">Пока никого</p>
                  <button
                    onClick={async () => {
                      const url = typeof window !== 'undefined' && room?.slug
                        ? `${window.location.origin}/room/${room.slug}` : '';
                      if (url) await copyToClipboard(url);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-grad text-white text-xs font-semibold shadow-glow hover-lift transition-all"
                  >
                    <Share2 size={14} /> Поделиться ссылкой
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === 'voice' && <VoicePanel />}
          {tab === 'chat'  && <ChatPanel />}
          {tab === 'tasks' && <TaskPanel />}
          {tab === 'games' && (
            <div className="h-full overflow-y-auto">
              <GameSelector />
            </div>
          )}
        </div>
      </div>

      {/* Game modal — lives here, not as floating button */}
      <GameZone />
    </>
  );
}
