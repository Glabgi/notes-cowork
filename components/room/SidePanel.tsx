'use client';

import { useState } from 'react';
import { Users, MessageSquare, CheckSquare, Settings, Gamepad2, Crown, Timer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ChatPanel from './ChatPanel';
import { useRoomStore } from '@/store/roomStore';
import Avatar from '@/components/ui/Avatar';
import { getStatusLabel, getStatusColor } from '@/lib/utils';
import { cn } from '@/lib/utils';
import TaskPanel from '@/components/tasks/TaskPanel';
import GameZone, { GameSelector } from '@/components/games/GameZone';

type Tab = 'participants' | 'chat' | 'tasks' | 'games';

export default function SidePanel() {
  const [tab, setTab] = useState<Tab>('chat');
  const { room, currentUser } = useRoomStore();
  const router = useRouter();

  const tabs: { id: Tab; icon: React.ElementType; label: string; badge?: number }[] = [
    { id: 'participants', icon: Users,         label: 'Люди',   badge: room?.participants.length },
    { id: 'chat',         icon: MessageSquare, label: 'Чат' },
    { id: 'tasks',        icon: CheckSquare,   label: 'Задачи' },
    { id: 'games',        icon: Gamepad2,      label: 'Игры' },
  ];

  return (
    <>
      <div className="w-72 flex-shrink-0 bg-[var(--bg-card)] border-l border-[var(--border)] flex flex-col">
        {/* Tab bar */}
        <div className="flex border-b border-[var(--border)] flex-shrink-0">
          {tabs.map(({ id, icon: Icon, label, badge }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors relative',
                tab === id
                  ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border-b-2 border-transparent'
              )}
            >
              <Icon size={15} />
              <span>{label}</span>
              {badge != null && badge > 0 && (
                <span className="absolute top-1.5 right-1 bg-[var(--accent)] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </button>
          ))}

          {/* Settings shortcut */}
          <button
            onClick={() => router.push('/settings')}
            className="px-2.5 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors border-b-2 border-transparent"
          >
            <Settings size={14} />
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {tab === 'participants' && (
            <div className="h-full overflow-y-auto p-3 space-y-0.5">
              {room?.participants.map(p => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-[10px] hover:bg-[var(--bg-hover)] transition-colors group"
                >
                  <Avatar id={p.avatarId} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate flex items-center gap-1">
                      <span className="truncate">{p.name}</span>
                      {p.id === currentUser?.id && <span className="text-xs text-[var(--accent)]">(вы)</span>}
                      {p.isOwner && <Crown size={11} className="text-[#D97706] flex-shrink-0" />}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{getStatusLabel(p.status)}</p>
                    {p.currentTask && (
                      <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent)] mr-1 align-middle" />
                        {p.currentTask}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className={cn('w-2 h-2 rounded-full', getStatusColor(p.status))} />
                    {p.pomodoroCount > 0 && (
                      <span className="text-[10px] text-[var(--text-muted)] inline-flex items-center gap-0.5">
                        <Timer size={9} />{p.pomodoroCount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {(!room?.participants.length) && (
                <div className="flex flex-col items-center justify-center h-40 text-[var(--text-muted)]">
                  <Users size={28} className="mb-2" />
                  <p className="text-sm">Пока никого</p>
                </div>
              )}
            </div>
          )}

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
