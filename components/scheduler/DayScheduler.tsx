'use client';

import { useState } from 'react';
import {
  Plus, Trash2, ChevronLeft, ChevronRight, LayoutTemplate,
  Clock, Timer, Calendar, Briefcase, GraduationCap, Leaf,
} from 'lucide-react';
import { useScheduleStore } from '@/store/scheduleStore';
import type { ScheduleBlock, ActivityType } from '@/types';
import { getActivityColor, getActivityLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ActivityIcon } from '@/lib/icons';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

const HOURS = Array.from({ length: 19 }, (_, i) => i + 6); // 6:00 to 24:00
const HOUR_HEIGHT = 56;

const ACTIVITY_TYPES: { type: ActivityType; label: string }[] = [
  { type: 'work',       label: 'Работа / учёба' },
  { type: 'reading',    label: 'Чтение' },
  { type: 'creative',   label: 'Творчество / хобби' },
  { type: 'exercise',   label: 'Движение / спорт' },
  { type: 'gaming',     label: 'Игровой перерыв' },
  { type: 'meditation', label: 'Медитация / отдых' },
  { type: 'meeting',    label: 'Созвон / встреча' },
];

function AddBlockModal({ onAdd, onClose }: { onAdd: (b: Omit<ScheduleBlock, 'id' | 'color'>) => void; onClose: () => void }) {
  const [type, setType] = useState<ActivityType>('work');
  const [title, setTitle] = useState('');
  const [startHour, setStartHour] = useState(9);
  const [duration, setDuration] = useState(60);
  const [pomodoros, setPomodoros] = useState<number | undefined>(undefined);

  const submit = () => {
    onAdd({ type, title: title || ACTIVITY_TYPES.find(a => a.type === type)!.label, startHour, duration, pomodoroCount: pomodoros });
    onClose();
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <label className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2 block font-medium">Тип активности</label>
        <div className="grid grid-cols-1 gap-1">
          {ACTIVITY_TYPES.map(a => {
            const Icon = ActivityIcon[a.type] || ActivityIcon.other;
            return (
              <button
                key={a.type}
                onClick={() => setType(a.type)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-[10px] text-sm transition-colors text-left border',
                  type === a.type
                    ? 'bg-[var(--accent-light)] border-[var(--border-accent)] text-[var(--accent)] font-medium'
                    : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                )}
              >
                <Icon size={15} className="flex-shrink-0" />
                {a.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="text-xs text-[var(--text-muted)] mb-1.5 block font-medium">Название (необязательно)</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Например: Курс по React"
          className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[#94A3B8] focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[#DBEAFE]/50 transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1.5 block font-medium">Начало</label>
          <select
            value={startHour}
            onChange={e => setStartHour(+e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            {HOURS.map(h => <option key={h} value={h}>{h}:00</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1.5 block font-medium">Длительность</label>
          <select
            value={duration}
            onChange={e => setDuration(+e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
          >
            {[15,20,30,45,60,90,120,180].map(d => <option key={d} value={d}>{d < 60 ? `${d}м` : `${d/60}ч`}</option>)}
          </select>
        </div>
      </div>

      {type === 'work' && (
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1.5 block font-medium">Помидорок (необязательно)</label>
          <div className="flex gap-2">
            {[1,2,3,4,5,6].map(n => (
              <button
                key={n}
                onClick={() => setPomodoros(pomodoros === n ? undefined : n)}
                className={cn(
                  'w-9 h-9 rounded-[8px] text-sm font-semibold border transition-all duration-150',
                  pomodoros === n
                    ? 'bg-[#F0FDF4] border-[#86EFAC] text-[#16A34A]'
                    : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <Button variant="ghost" className="flex-1" onClick={onClose}>Отмена</Button>
        <Button className="flex-1" onClick={submit}>Добавить</Button>
      </div>
    </div>
  );
}

function BlockItem({ block, onDelete }: { block: ScheduleBlock; onDelete: () => void }) {
  const topPx = (block.startHour - 6) * HOUR_HEIGHT;
  const heightPx = Math.max((block.duration / 60) * HOUR_HEIGHT, 28);

  return (
    <div
      className="absolute left-0 right-0 mx-1 rounded-[10px] overflow-hidden group cursor-default"
      style={{
        top: topPx,
        height: heightPx,
        backgroundColor: block.color + '18',
        borderLeft: `3px solid ${block.color}`,
        animation: 'fadeSlideIn 0.25s ease-out',
      }}
    >
      <div className="px-2 py-1 h-full flex flex-col justify-start">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {(() => {
                const Icon = ActivityIcon[block.type] || ActivityIcon.other;
                return <Icon size={11} className="text-[var(--text-secondary)] flex-shrink-0" />;
              })()}
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight">
                {block.title}
              </p>
            </div>
            {heightPx > 36 && (
              <p className="text-[10px] text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                {block.startHour}:00 · {block.duration < 60 ? `${block.duration}м` : `${block.duration/60}ч`}
                {block.pomodoroCount ? (
                  <span className="inline-flex items-center gap-0.5 ml-1">
                    <Timer size={9} />×{block.pomodoroCount}
                  </span>
                ) : null}
              </p>
            )}
          </div>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#FEE2E2] rounded-[4px] transition-all flex-shrink-0"
          >
            <Trash2 size={10} className="text-[#EF4444]" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DayScheduler() {
  const { blocks, addBlock, deleteBlock, loadTemplate, clearDay, selectedDate, setSelectedDate } = useScheduleStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const [now] = useState(() => new Date());
  const todayStr = now.toISOString().split('T')[0];
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const isToday = selectedDate === todayStr;

  const navigateDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatDate = (str: string) => {
    const d = new Date(str);
    return d.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const totalFocusMin = blocks.filter(b => b.type === 'work').reduce((a, b) => a + b.duration, 0);
  const totalPomodoros = blocks.filter(b => b.pomodoroCount).reduce((a, b) => a + (b.pomodoroCount || 0), 0);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)]">
      {/* Toolbar */}
      <div className="px-4 py-3 border-b border-[var(--border)] space-y-3 flex-shrink-0 bg-[var(--bg-subtle)]">
        {/* Date nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate(-1)}
            className="p-1.5 hover:bg-[var(--bg-hover)] rounded-[8px] transition-colors"
          >
            <ChevronLeft size={16} className="text-[var(--text-muted)]" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">{formatDate(selectedDate)}</p>
            {isToday && <p className="text-xs text-[var(--accent)] font-medium">Сегодня</p>}
          </div>
          <button
            onClick={() => navigateDate(1)}
            className="p-1.5 hover:bg-[var(--bg-hover)] rounded-[8px] transition-colors"
          >
            <ChevronRight size={16} className="text-[var(--text-muted)]" />
          </button>
        </div>

        {/* Summary + actions */}
        <div className="flex items-center gap-2">
          {totalFocusMin > 0 && (
            <div className="flex gap-3 text-xs text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1">
                <Clock size={11} /> {totalFocusMin < 60 ? `${totalFocusMin}м` : `${(totalFocusMin/60).toFixed(1)}ч`}
              </span>
              {totalPomodoros > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Timer size={11} /> {totalPomodoros}
                </span>
              )}
            </div>
          )}
          <div className="flex gap-1.5 ml-auto">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-[8px] border transition-colors duration-150',
                showTemplates
                  ? 'bg-[var(--accent-light)] border-[var(--border-accent)] text-[var(--accent)]'
                  : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
              )}
            >
              <LayoutTemplate size={12} /> Шаблон
            </button>
            {blocks.length > 0 && (
              <button
                onClick={clearDay}
                className="px-2.5 py-1.5 text-xs rounded-[8px] bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] hover:text-[#EF4444] hover:border-[#FCA5A5] transition-colors duration-150"
              >
                Очистить
              </button>
            )}
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-[8px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors duration-150"
            >
              <Plus size={12} /> Добавить
            </button>
          </div>
        </div>

        {/* Templates */}
        {showTemplates && (
          <div className="flex gap-2" style={{ animation: 'fadeSlideIn 0.2s ease-out' }}>
            {([
              ['work',  'Рабочий', Briefcase],
              ['study', 'Учебный', GraduationCap],
              ['light', 'Лёгкий',  Leaf],
            ] as const).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => { loadTemplate(id); setShowTemplates(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs rounded-[8px] bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors duration-150"
              >
                <Icon size={12} /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="flex">
          {/* Hours column */}
          <div className="w-12 flex-shrink-0">
            {HOURS.map(h => (
              <div key={h} style={{ height: HOUR_HEIGHT }} className="flex items-start justify-end pr-2 pt-0.5">
                <span className="text-[10px] text-[#CBD5E1] tabular-nums font-medium">{h}:00</span>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex-1 relative border-l border-[#F1F5F9]">
            {HOURS.map(h => (
              <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-[#F1F5F9] relative">
                <div className="absolute left-0 right-0 top-1/2 border-b border-[#F8FAFF] border-dashed" />
              </div>
            ))}

            {/* Current time indicator */}
            {isToday && currentHour >= 6 && currentHour <= 24 && (
              <div
                className="absolute left-0 right-0 flex items-center z-10 pointer-events-none"
                style={{ top: (currentHour - 6) * HOUR_HEIGHT }}
              >
                <div className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0 -ml-1" />
                <div className="flex-1 border-t border-[#EF4444]/50" />
              </div>
            )}

            {/* Blocks */}
            <div className="absolute inset-0">
              {blocks.map(block => (
                <BlockItem key={block.id} block={block} onDelete={() => deleteBlock(block.id)} />
              ))}
            </div>
          </div>
        </div>

        {blocks.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] border border-[var(--border)] flex items-center justify-center mx-auto mb-3">
                <Calendar size={20} className="text-[var(--text-muted)]" />
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">День пуст</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Добавьте активности или выберите шаблон</p>
            </div>
          </div>
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Добавить активность" size="sm">
        <AddBlockModal onAdd={addBlock} onClose={() => setShowAdd(false)} />
      </Modal>
    </div>
  );
}
