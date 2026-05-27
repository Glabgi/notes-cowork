import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';
type AmbientSound = 'cafe' | 'forest' | 'white-noise' | 'none';

interface SettingsStore {
  theme: Theme;
  ambientSound: AmbientSound;
  ambientVolume: number;
  pushNotifications: boolean;
  userName: string;
  avatarId: string;
  timezone: string;

  setTheme: (theme: Theme) => void;
  setAmbientSound: (sound: AmbientSound) => void;
  setAmbientVolume: (volume: number) => void;
  setPushNotifications: (enabled: boolean) => void;
  setUserName: (name: string) => void;
  setAvatarId: (id: string) => void;
  setTimezone: (tz: string) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'light',
      ambientSound: 'none',
      ambientVolume: 0.3,
      pushNotifications: false,
      userName: '',
      avatarId: 'fox',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,

      setTheme: (theme) => set({ theme }),
      setAmbientSound: (ambientSound) => set({ ambientSound }),
      setAmbientVolume: (ambientVolume) => set({ ambientVolume }),
      setPushNotifications: (pushNotifications) => set({ pushNotifications }),
      setUserName: (userName) => set({ userName }),
      setAvatarId: (avatarId) => set({ avatarId }),
      setTimezone: (timezone) => set({ timezone }),
    }),
    { name: 'settings-store' }
  )
);
