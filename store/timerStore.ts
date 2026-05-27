import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TimerState, TimerSettings, TimerPhase } from '@/types';

interface TimerStore extends TimerState {
  isPersonal: boolean;
  setPersonal: (personal: boolean) => void;
  setRunning: (running: boolean) => void;
  setTimeLeft: (time: number) => void;
  setPhase: (phase: TimerPhase) => void;
  updateSettings: (settings: Partial<TimerSettings>) => void;
  incrementPomodoro: () => void;
  nextPhase: () => void;
  reset: () => void;
  tick: () => void;
}

const DEFAULT_SETTINGS: TimerSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStart: false,
  sound: 'bell',
};

function getPhaseDuration(phase: TimerPhase, settings: TimerSettings): number {
  switch (phase) {
    case 'focus': return settings.focusDuration * 60;
    case 'shortBreak': return settings.shortBreakDuration * 60;
    case 'longBreak': return settings.longBreakDuration * 60;
  }
}

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      phase: 'focus',
      isRunning: false,
      timeLeft: DEFAULT_SETTINGS.focusDuration * 60,
      totalTime: DEFAULT_SETTINGS.focusDuration * 60,
      pomodoroCount: 0,
      settings: DEFAULT_SETTINGS,
      isPersonal: true,

      setPersonal: (personal) => set({ isPersonal: personal }),
      setRunning: (running) => set({ isRunning: running }),
      setTimeLeft: (time) => set({ timeLeft: time }),
      setPhase: (phase) => {
        const { settings } = get();
        const duration = getPhaseDuration(phase, settings);
        set({ phase, timeLeft: duration, totalTime: duration, isRunning: false });
      },

      updateSettings: (newSettings) =>
        set((state) => {
          const settings = { ...state.settings, ...newSettings };
          const duration = getPhaseDuration(state.phase, settings);
          return { settings, timeLeft: duration, totalTime: duration };
        }),

      incrementPomodoro: () =>
        set((state) => ({ pomodoroCount: state.pomodoroCount + 1 })),

      nextPhase: () => {
        const { phase, pomodoroCount, settings } = get();
        let nextPhase: TimerPhase;

        if (phase === 'focus') {
          const newCount = pomodoroCount + 1;
          if (newCount % settings.longBreakInterval === 0) {
            nextPhase = 'longBreak';
          } else {
            nextPhase = 'shortBreak';
          }
        } else {
          nextPhase = 'focus';
        }

        const duration = getPhaseDuration(nextPhase, settings);
        set({
          phase: nextPhase,
          timeLeft: duration,
          totalTime: duration,
          isRunning: settings.autoStart,
          pomodoroCount: phase === 'focus' ? pomodoroCount + 1 : pomodoroCount,
        });
      },

      tick: () =>
        set((state) => {
          if (state.timeLeft <= 0) return state;
          return { timeLeft: state.timeLeft - 1 };
        }),

      reset: () => {
        const { phase, settings } = get();
        const duration = getPhaseDuration(phase, settings);
        set({ timeLeft: duration, totalTime: duration, isRunning: false });
      },
    }),
    {
      name: 'timer-store',
      partialize: (state) => ({ settings: state.settings, isPersonal: state.isPersonal }),
    }
  )
);
