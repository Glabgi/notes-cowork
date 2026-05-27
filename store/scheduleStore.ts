import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { ScheduleBlock, ActivityType } from '@/types';
import { getActivityColor } from '@/lib/utils';

interface ScheduleStore {
  blocks: ScheduleBlock[];
  selectedDate: string; // ISO date string YYYY-MM-DD

  setSelectedDate: (date: string) => void;
  addBlock: (block: Omit<ScheduleBlock, 'id' | 'color'>) => void;
  updateBlock: (id: string, updates: Partial<ScheduleBlock>) => void;
  deleteBlock: (id: string) => void;
  moveBlock: (id: string, newStartHour: number) => void;
  loadTemplate: (template: 'work' | 'study' | 'light') => void;
  clearDay: () => void;
}

const TEMPLATES: Record<string, Omit<ScheduleBlock, 'id' | 'color'>[]> = {
  work: [
    { type: 'work', title: 'Утренняя сессия', startHour: 9, duration: 120, pomodoroCount: 4 },
    { type: 'meditation', title: 'Разминка', startHour: 11, duration: 15 },
    { type: 'work', title: 'Дневная сессия', startHour: 12, duration: 90, pomodoroCount: 3 },
    { type: 'reading', title: 'Обед + чтение', startHour: 13, duration: 60 },
    { type: 'work', title: 'Вечерняя сессия', startHour: 15, duration: 120, pomodoroCount: 4 },
    { type: 'exercise', title: 'Спорт', startHour: 18, duration: 60 },
  ],
  study: [
    { type: 'work', title: 'Теория', startHour: 9, duration: 90, pomodoroCount: 3 },
    { type: 'gaming', title: 'Перерыв', startHour: 10, duration: 30 },
    { type: 'work', title: 'Практика', startHour: 11, duration: 120, pomodoroCount: 4 },
    { type: 'reading', title: 'Чтение', startHour: 14, duration: 60 },
    { type: 'work', title: 'Повторение', startHour: 16, duration: 90, pomodoroCount: 3 },
    { type: 'meditation', title: 'Отдых', startHour: 19, duration: 30 },
  ],
  light: [
    { type: 'meditation', title: 'Медитация', startHour: 9, duration: 20 },
    { type: 'reading', title: 'Чтение', startHour: 10, duration: 60 },
    { type: 'creative', title: 'Творчество', startHour: 14, duration: 90 },
    { type: 'exercise', title: 'Прогулка', startHour: 17, duration: 45 },
    { type: 'gaming', title: 'Игры', startHour: 20, duration: 60 },
  ],
};

export const useScheduleStore = create<ScheduleStore>()(
  persist(
    immer((set) => ({
      blocks: [],
      selectedDate: new Date().toISOString().split('T')[0],

      setSelectedDate: (date) => set((s) => { s.selectedDate = date; }),

      addBlock: (block) => set((s) => {
        s.blocks.push({ ...block, id: uuidv4(), color: getActivityColor(block.type) });
      }),

      updateBlock: (id, updates) => set((s) => {
        const idx = s.blocks.findIndex(b => b.id === id);
        if (idx !== -1) Object.assign(s.blocks[idx], updates);
      }),

      deleteBlock: (id) => set((s) => { s.blocks = s.blocks.filter(b => b.id !== id); }),

      moveBlock: (id, newStartHour) => set((s) => {
        const b = s.blocks.find(b => b.id === id);
        if (b) b.startHour = Math.max(6, Math.min(23, newStartHour));
      }),

      loadTemplate: (template) => set((s) => {
        s.blocks = TEMPLATES[template].map(b => ({
          ...b, id: uuidv4(), color: getActivityColor(b.type),
        }));
      }),

      clearDay: () => set((s) => { s.blocks = []; }),
    })),
    { name: 'schedule-store' }
  )
);
