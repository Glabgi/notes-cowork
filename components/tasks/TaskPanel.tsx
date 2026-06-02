'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Eye, EyeOff, Trash2, Check, Tag, Briefcase, GraduationCap,
  Home, Palette, FolderOpen, Timer,
} from 'lucide-react';
import { useTaskStore } from '@/store/taskStore';
import type { Task, TaskTag } from '@/types';
import { getTagColor } from '@/lib/utils';
import { cn } from '@/lib/utils';

const TAG_OPTIONS: { value: TaskTag; label: string; color: string }[] = [
  { value: 'work',     label: 'Работа',    color: 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--border-accent)]' },
  { value: 'study',    label: 'Учёба',     color: 'bg-[#eef3ee] text-[#4a8a78] border-[#cfe3d6]' },
  { value: 'personal', label: 'Личное',    color: 'bg-[#fbf4ea] text-[#c4784a] border-[#ecd6c0]' },
  { value: 'creative', label: 'Творчество',color: 'bg-[#faf7f1] text-[#b5734e] border-[#ecd6c0]' },
  { value: 'other',    label: 'Другое',    color: 'bg-[#f0ece4] text-[var(--text-secondary)] border-[var(--border)]' },
];

const TAG_ICONS: Record<TaskTag, React.ElementType> = {
  work: Briefcase, study: GraduationCap, personal: Home, creative: Palette, other: FolderOpen,
};

export default function TaskPanel() {
  const [newTask, setNewTask] = useState('');
  const [selectedTag, setSelectedTag] = useState<TaskTag>('work');
  const [showTagPicker, setShowTagPicker] = useState(false);
  const { getActiveTasks, getCompletedTasks, addTask, toggleTask, deleteTask, togglePublic } = useTaskStore();

  const activeTasks = getActiveTasks();
  const completedTasks = getCompletedTasks().slice(0, 10);

  const handleAdd = () => {
    if (!newTask.trim()) return;
    addTask(newTask.trim(), selectedTag);
    setNewTask('');
  };

  const currentTagOption = TAG_OPTIONS.find(t => t.value === selectedTag);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)]">
        <h3 className="font-semibold text-[var(--text-primary)] text-sm">Задачи</h3>
        <p className="text-xs text-[var(--text-muted)]">{activeTasks.length} активных</p>
      </div>

      {/* Add task */}
      <div className="p-3 border-b border-[var(--border)] space-y-2">
        <div className="flex gap-1.5">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Новая задача..."
            className="flex-1 min-w-0 bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[#b0a090] focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[#f1e3d4]/50 transition-all"
          />
          <button
            onClick={() => setShowTagPicker(!showTagPicker)}
            title="Выбрать тег"
            className={cn(
              'p-2 shrink-0 rounded-[10px] border transition-colors duration-150',
              showTagPicker
                ? 'bg-[var(--accent-light)] border-[var(--border-accent)] text-[var(--accent)]'
                : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text-secondary)]'
            )}
          >
            <Tag size={14} />
          </button>
          <button
            onClick={handleAdd}
            disabled={!newTask.trim()}
            className="p-2 shrink-0 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 rounded-[10px] transition-colors duration-150"
          >
            <Plus size={16} className="text-white" />
          </button>
        </div>

        {/* Selected tag display */}
        {!showTagPicker && (
          <div className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
            currentTagOption?.color
          )}>
            {(() => { const Icon = TAG_ICONS[selectedTag] || FolderOpen; return <Icon size={11} />; })()}
            <span>{currentTagOption?.label}</span>
          </div>
        )}

        {showTagPicker && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-1.5 flex-wrap"
          >
            {TAG_OPTIONS.map(t => (
              <button
                key={t.value}
                onClick={() => { setSelectedTag(t.value); setShowTagPicker(false); }}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150',
                  selectedTag === t.value
                    ? t.color + ' shadow-[0_1px_3px_rgba(15,23,42,0.06)]'
                    : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                )}
              >
                {(() => { const Icon = TAG_ICONS[t.value] || FolderOpen; return <Icon size={11} />; })()}
                <span>{t.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Tasks list — notebook ruled paper */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1 lined-paper">
        <AnimatePresence>
          {activeTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={toggleTask}
              onDelete={deleteTask}
              onTogglePublic={togglePublic}
            />
          ))}
        </AnimatePresence>

        {activeTasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-10"
          >
            <div className="w-12 h-12 rounded-full bg-[var(--accent-light)] flex items-center justify-center mx-auto mb-3">
              <Check size={20} className="text-[var(--accent)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Все задачи выполнены!</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Добавьте новую задачу выше</p>
          </motion.div>
        )}

        {completedTasks.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-muted)] mb-2 font-semibold uppercase tracking-wider">Выполнено</p>
            <AnimatePresence>
              {completedTasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onToggle={toggleTask}
                  onDelete={deleteTask}
                  onTogglePublic={togglePublic}
                  completed
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskItem({
  task,
  onToggle,
  onDelete,
  onTogglePublic,
  completed,
}: {
  task: Task;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onTogglePublic: (id: string) => void;
  completed?: boolean;
}) {
  const tagOption = TAG_OPTIONS.find(t => t.value === task.tag);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
      className={cn(
        'flex items-center gap-2 px-2 py-2 rounded-[10px] group hover:bg-[var(--bg-hover)] transition-colors duration-150',
        completed && 'opacity-50'
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task.id)}
        className={cn(
          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150',
          completed
            ? 'bg-[#4cc2a8] border-[#4cc2a8]'
            : 'border-[var(--border-strong)] hover:border-[var(--accent)] hover:bg-[var(--accent-light)]'
        )}
      >
        {completed && <Check size={10} className="text-white" />}
      </button>

      {/* Title */}
      <span className={cn(
        'flex-1 text-sm truncate leading-relaxed',
        completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'
      )}>
        {task.title}
      </span>

      {/* Tag pill */}
      {(() => {
        const TagIcon = TAG_ICONS[task.tag] || FolderOpen;
        return (
          <span className={cn(
            'inline-flex items-center justify-center flex-shrink-0 w-5 h-5 rounded-full border',
            tagOption?.color || 'bg-[#f0ece4] text-[var(--text-secondary)] border-[var(--border)]'
          )}>
            <TagIcon size={10} />
          </span>
        );
      })()}

      {/* Pomodoros */}
      {task.pomodoroCount > 0 && (
        <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 inline-flex items-center gap-0.5">
          <Timer size={9} />{task.pomodoroCount}
        </span>
      )}

      {/* Actions */}
      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <button
          onClick={() => onTogglePublic(task.id)}
          title={task.isPublic ? 'Скрыть' : 'Показать всем'}
          className={cn(
            'p-1 rounded-[6px] transition-colors duration-150',
            task.isPublic
              ? 'text-[var(--accent)] bg-[var(--accent-light)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[#f0ece4]'
          )}
        >
          {task.isPublic ? <Eye size={11} /> : <EyeOff size={11} />}
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 rounded-[6px] text-[var(--text-muted)] hover:text-[#d06a5e] hover:bg-[#f3e0dc] transition-colors duration-150"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </motion.div>
  );
}
