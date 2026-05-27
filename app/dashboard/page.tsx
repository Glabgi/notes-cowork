'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '@/store/taskStore';
import { useTimerStore } from '@/store/timerStore';
import { useRouter } from 'next/navigation';
import { formatDuration } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import { getUserStats, getUserSessions } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import {
  ArrowLeft, Settings, Calendar, Check, Timer, Clock, CheckCircle2, Flame,
  Rocket, Dumbbell, Award, Crown, Anchor, Handshake, Sparkles, BarChart3,
  Briefcase, GraduationCap, Home, Palette, FolderOpen, ListChecks, Trophy,
  Tag, Castle,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import AuthGate from '@/components/AuthGate';

type AchievementMeta = {
  id: string;
  Icon: React.ElementType;
  title: string;
  desc: string;
  unlock: (pomodoros: number, completedTasks: number) => boolean;
};

const ACHIEVEMENTS: AchievementMeta[] = [
  { id: 'first_pom',    Icon: Timer,     title: 'Первая помидорка', desc: 'Завершить 1 сессию',     unlock: (p) => p >= 1 },
  { id: 'five_pom',     Icon: Flame,     title: 'Разогрев',         desc: '5 помидорок',            unlock: (p) => p >= 5 },
  { id: 'ten_pom',      Icon: Dumbbell,  title: 'Марафонец',        desc: '10 помидорок',           unlock: (p) => p >= 10 },
  { id: 'twenty_pom',   Icon: Rocket,    title: 'Машина',           desc: '20 помидорок',           unlock: (p) => p >= 20 },
  { id: 'five_tasks',   Icon: CheckCircle2, title: 'Чеклистер',     desc: '5 задач выполнено',      unlock: (_, t) => t >= 5 },
  { id: 'twenty_tasks', Icon: Award,     title: 'Продуктивный',     desc: '20 задач выполнено',     unlock: (_, t) => t >= 20 },
  { id: 'chess',        Icon: Crown,     title: 'Шахматист',        desc: 'Сыграть в шахматы',      unlock: () => false },
  { id: 'admiral',      Icon: Anchor,    title: 'Адмирал',          desc: 'Победить в морском бое', unlock: () => false },
  { id: 'team',         Icon: Handshake, title: 'Командный игрок',  desc: 'Провести 10ч с командой', unlock: () => false },
];

function StatCard({ Icon, label, value, sub, delay = 0 }: { Icon: React.ElementType; label: string; value: string | number; sub?: string; delay?: number }) {
  return (
    <div
      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:border-[var(--border-accent)] hover:shadow-[0_4px_16px_rgba(15,23,42,0.08)] transition-all duration-150"
      style={{ animation: `fadeSlideIn 0.4s ease-out ${delay}s both` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-medium">{label}</p>
          <p className="text-3xl font-black text-[var(--accent)] mt-1 tabular-nums">{value}</p>
          {sub && <p className="text-xs text-[var(--text-muted)] mt-1">{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-light)] flex items-center justify-center flex-shrink-0">
          <Icon size={18} className="text-[var(--accent)]" />
        </div>
      </div>
    </div>
  );
}

function MiniBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-1.5 flex-1">
      <span className="text-[10px] text-[var(--text-muted)] tabular-nums font-medium">{value || ''}</span>
      <div className="w-full flex-1 bg-[#F1F5F9] rounded-[4px] overflow-hidden flex items-end" style={{ minHeight: 48 }}>
        <div
          className="w-full rounded-t-[4px]"
          style={{
            backgroundColor: color,
            height: `${pct}%`,
            minHeight: value > 0 ? 4 : 0,
            transition: 'height 0.6s ease-out',
          }}
        />
      </div>
      <span className="text-[10px] text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

const TAG_META: Record<string, { label: string; Icon: React.ElementType; color: string; pill: string }> = {
  work:     { label: 'Работа',     Icon: Briefcase,     color: '#2563EB', pill: 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--border-accent)]' },
  study:    { label: 'Учёба',      Icon: GraduationCap, color: '#16A34A', pill: 'bg-[#F0FDF4] text-[#16A34A] border-[#BBF7D0]' },
  personal: { label: 'Личное',     Icon: Home,          color: '#EA580C', pill: 'bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]' },
  creative: { label: 'Творчество', Icon: Palette,       color: '#9333EA', pill: 'bg-[#FDF4FF] text-[#9333EA] border-[#E9D5FF]' },
  other:    { label: 'Другое',     Icon: FolderOpen,    color: '#64748B', pill: 'bg-[#F1F5F9] text-[var(--text-secondary)] border-[var(--border)]' },
};

const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

export default function DashboardPage() {
  const router = useRouter();
  const { tasks } = useTaskStore();
  const { pomodoroCount: localPomodoros, settings } = useTimerStore();
  const { user, profile } = useAuth();

  // Server-side stats (only when signed in)
  const [serverStats, setServerStats] = useState<{ date: string; focus_minutes: number; pomodoro_count: number; tasks_completed: number }[]>([]);
  useEffect(() => {
    if (!user) return;
    getUserStats(user.id, 30).then(setServerStats);
  }, [user]);

  const serverPomodoros = serverStats.reduce((a, d) => a + (d.pomodoro_count || 0), 0);
  const serverFocusMin  = serverStats.reduce((a, d) => a + (d.focus_minutes || 0), 0);

  // Prefer server values when signed in, else local
  const pomodoroCount = user ? serverPomodoros : localPomodoros;
  const completedTasks = useMemo(() => tasks.filter(t => t.completed), [tasks]);
  const activeTasks    = useMemo(() => tasks.filter(t => !t.completed), [tasks]);
  const totalFocusMin  = user ? serverFocusMin : localPomodoros * settings.focusDuration;

  const tagStats = useMemo(() => {
    const counts: Record<string, number> = {};
    completedTasks.forEach(t => { counts[t.tag] = (counts[t.tag] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [completedTasks]);

  const favTag = tagStats[0]?.[0];

  const weekData = useMemo(() => {
    const days: { label: string; pomodoros: number; tasks: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayOfWeek = (d.getDay() + 6) % 7;
      const dateStr = d.toISOString().split('T')[0];
      const isToday = i === 0;

      let pomodoros = 0;
      let tasksToday = 0;
      if (user) {
        const stat = serverStats.find(s => s.date === dateStr);
        pomodoros = stat?.pomodoro_count || 0;
        tasksToday = stat?.tasks_completed || 0;
      } else {
        // Local-only fallback: just current day from store, zero for past
        pomodoros = isToday ? localPomodoros : 0;
        tasksToday = isToday
          ? completedTasks.filter(t => t.completedAt && new Date(t.completedAt).toDateString() === d.toDateString()).length
          : 0;
      }
      days.push({ label: DAYS_SHORT[dayOfWeek], pomodoros, tasks: tasksToday });
    }
    return days;
  }, [user, serverStats, localPomodoros, completedTasks]);

  const maxPom = Math.max(...weekData.map(d => d.pomodoros), 1);
  const streak = pomodoroCount > 0 ? Math.min(pomodoroCount, 7) : 0;
  const unlockedCount = ACHIEVEMENTS.filter(a => a.unlock(pomodoroCount, completedTasks.length)).length;

  return (
    <AuthGate pageName="Мой прогресс">
    <div className="min-h-screen bg-[var(--bg-page)]">
      <AppHeader title="Мой прогресс" showBack showDashboard={false} />

      <div className="max-w-3xl mx-auto px-6 sm:px-8 py-6 space-y-5">
        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard Icon={Timer}        label="Помидорок" value={pomodoroCount}                sub="всего завершено" delay={0} />
          <StatCard Icon={Clock}        label="В фокусе"  value={formatDuration(totalFocusMin)}                        delay={0.06} />
          <StatCard Icon={CheckCircle2} label="Задач"     value={completedTasks.length}        sub="выполнено"       delay={0.12} />
          <StatCard Icon={Flame}        label="Стрик"     value={`${streak} дн.`}              sub="дней подряд"     delay={0.18} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Weekly bar chart */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4 text-sm flex items-center gap-2">
              <Timer size={13} className="text-[var(--accent)]" /> Помидорки · 7 дней
            </h3>
            <div className="flex items-end gap-1.5 h-28">
              {weekData.map((d, i) => (
                <MiniBar key={i} value={d.pomodoros} max={maxPom} color="#2563EB" label={d.label} />
              ))}
            </div>
          </div>

          {/* Tag distribution */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4 text-sm flex items-center gap-2">
              <Tag size={13} className="text-[var(--accent)]" /> Категории задач
            </h3>
            {tagStats.length > 0 ? (
              <div className="space-y-2.5">
                {tagStats.slice(0, 5).map(([tag, count]) => {
                  const meta = TAG_META[tag] || TAG_META.other;
                  const pct = Math.round((count / completedTasks.length) * 100);
                  return (
                    <div key={tag}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-[var(--text-secondary)] inline-flex items-center gap-1.5">
                          <meta.Icon size={11} /> {meta.label}
                        </span>
                        <span className="text-[var(--text-muted)] tabular-nums">{count} · {pct}%</span>
                      </div>
                      <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: meta.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-20 text-[var(--text-muted)] text-sm">
                <Sparkles size={20} className="mb-1.5" />
                Начни выполнять задачи!
              </div>
            )}
            {favTag && (
              <p className="text-xs text-[var(--text-muted)] mt-3 inline-flex items-center gap-1">
                Любимая категория: <span className="text-[var(--text-secondary)] font-medium inline-flex items-center gap-1">
                  {(() => { const M = TAG_META[favTag] || TAG_META.other; return <><M.Icon size={11} />{M.label}</>; })()}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Completed tasks */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)] text-sm flex items-center gap-2">
              <CheckCircle2 size={13} className="text-[var(--accent)]" /> Последние выполненные
            </h3>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] border border-[var(--border)] px-2 py-0.5 rounded-full">{completedTasks.length} всего</span>
          </div>
          {completedTasks.length > 0 ? (
            <div>
              {completedTasks.slice(0, 10).map((task, i) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 py-2.5 border-b border-[#F1F5F9] last:border-0 group"
                  style={{ animation: `fadeSlideIn 0.3s ease-out ${i * 0.04}s both` }}
                >
                  <div className="w-4 h-4 rounded-full bg-[#DCFCE7] border border-[#86EFAC] flex items-center justify-center flex-shrink-0">
                    <Check size={8} className="text-[#16A34A]" strokeWidth={3} />
                  </div>
                  <span className="flex-1 text-sm text-[var(--text-muted)] line-through truncate">{task.title}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {task.pomodoroCount > 0 && (
                      <span className="text-xs text-[var(--text-muted)] inline-flex items-center gap-0.5">
                        <Timer size={10} />×{task.pomodoroCount}
                      </span>
                    )}
                    {task.completedAt && (
                      <span className="text-[10px] text-[#CBD5E1] hidden group-hover:block">
                        {new Date(task.completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium hidden sm:inline-block', TAG_META[task.tag]?.pill || TAG_META.other.pill)}>
                      {task.tag}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
                <ListChecks size={20} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Нет выполненных задач</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Начни с добавления задачи в комнате</p>
            </div>
          )}
        </div>

        {/* Active tasks */}
        {activeTasks.length > 0 && (
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
            <h3 className="font-semibold text-[var(--text-primary)] mb-4 text-sm flex items-center gap-2">
              <ListChecks size={13} className="text-[var(--accent)]" /> В работе ({activeTasks.length})
            </h3>
            <div className="space-y-2">
              {activeTasks.slice(0, 5).map(task => (
                <div key={task.id} className="flex items-center gap-3 text-sm">
                  <div className="w-4 h-4 rounded-full border-2 border-[var(--border-strong)] flex-shrink-0" />
                  <span className="flex-1 truncate text-[var(--text-primary)]">{task.title}</span>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0', TAG_META[task.tag]?.pill || TAG_META.other.pill)}>
                    {task.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-[var(--text-primary)] text-sm flex items-center gap-2">
              <Trophy size={13} className="text-[var(--accent)]" /> Достижения
            </h3>
            <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-subtle)] border border-[var(--border)] px-2 py-0.5 rounded-full">{unlockedCount}/{ACHIEVEMENTS.length}</span>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {ACHIEVEMENTS.map(ach => {
              const unlocked = ach.unlock(pomodoroCount, completedTasks.length);
              const Icon = ach.Icon;
              return (
                <motion.div
                  key={ach.id}
                  whileHover={unlocked ? { scale: 1.03 } : {}}
                  className={cn(
                    'p-3 rounded-[16px] border text-center transition-all',
                    unlocked
                      ? 'bg-[var(--accent-light)] border-[var(--border-accent)] shadow-[0_2px_8px_rgba(37,99,235,0.08)]'
                      : 'bg-[var(--bg-subtle)] border-[#F1F5F9] opacity-50 grayscale'
                  )}
                >
                  <div className="w-10 h-10 mx-auto mb-1.5 rounded-[10px] bg-white border border-[var(--border)] flex items-center justify-center">
                    <Icon size={18} className={unlocked ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
                  </div>
                  <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{ach.title}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 leading-tight">{ach.desc}</p>
                  {unlocked && (
                    <p className="text-[10px] text-[var(--accent)] mt-1.5 font-semibold inline-flex items-center gap-0.5 justify-center">
                      <Sparkles size={9} /> Получено
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
    </AuthGate>
  );
}
