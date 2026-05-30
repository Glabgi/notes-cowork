'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Проект использует одну светлую палитру «матовое стекло».
 * Класс `light` ставится на <html>; тема жёстко зафиксирована на `light`.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    root.style.colorScheme = 'light';
    // Keep the persisted preference truthful — the app is light-only.
    if (useSettingsStore.getState().theme !== 'light') {
      useSettingsStore.getState().setTheme('light');
    }
  }, []);

  return <>{children}</>;
}
