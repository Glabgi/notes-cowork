import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Task, TaskTag } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface TaskStore {
  tasks: Task[];
  userId: string | null;

  setUserId: (id: string) => void;
  addTask: (title: string, tag?: TaskTag) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTask: (id: string) => void;
  togglePublic: (id: string) => void;
  incrementPomodoro: (id: string) => void;
  reorderTasks: (fromIndex: number, toIndex: number) => void;
  getActiveTasks: () => Task[];
  getCompletedTasks: () => Task[];
  getPublicTasks: () => Task[];
}

export const useTaskStore = create<TaskStore>()(
  persist(
    immer((set, get) => ({
      tasks: [],
      userId: null,

      setUserId: (id) => set((state) => { state.userId = id; }),

      addTask: (title, tag = 'work') => {
        const task: Task = {
          id: uuidv4(),
          userId: get().userId || 'anonymous',
          title,
          completed: false,
          isPublic: false,
          tag,
          pomodoroCount: 0,
          createdAt: Date.now(),
          order: get().tasks.length,
        };
        set((state) => { state.tasks.push(task); });
        return task;
      },

      updateTask: (id, updates) =>
        set((state) => {
          const idx = state.tasks.findIndex(t => t.id === id);
          if (idx !== -1) {
            Object.assign(state.tasks[idx], updates);
          }
        }),

      deleteTask: (id) =>
        set((state) => {
          state.tasks = state.tasks.filter(t => t.id !== id);
        }),

      toggleTask: (id) =>
        set((state) => {
          const task = state.tasks.find(t => t.id === id);
          if (task) {
            task.completed = !task.completed;
            task.completedAt = task.completed ? Date.now() : undefined;
          }
        }),

      togglePublic: (id) =>
        set((state) => {
          const task = state.tasks.find(t => t.id === id);
          if (task) task.isPublic = !task.isPublic;
        }),

      incrementPomodoro: (id) =>
        set((state) => {
          const task = state.tasks.find(t => t.id === id);
          if (task) task.pomodoroCount++;
        }),

      reorderTasks: (fromIndex, toIndex) =>
        set((state) => {
          const active = state.tasks.filter(t => !t.completed);
          const completed = state.tasks.filter(t => t.completed);
          const [moved] = active.splice(fromIndex, 1);
          active.splice(toIndex, 0, moved);
          active.forEach((t, i) => { t.order = i; });
          state.tasks = [...active, ...completed];
        }),

      getActiveTasks: () => get().tasks.filter(t => !t.completed).sort((a, b) => a.order - b.order),
      getCompletedTasks: () => get().tasks.filter(t => t.completed).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0)),
      getPublicTasks: () => get().tasks.filter(t => t.isPublic && !t.completed),
    })),
    {
      name: 'task-store',
    }
  )
);
