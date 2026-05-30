'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Проект использует одну Discord-like тёмную палитру.
 * Класс `dark` ставится на <html> для совместимости с любыми
 * dark:-утилитами Tailwind. Тема жёстко зафиксирована на `dark`.
 */
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light');
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
    // Keep the persisted preference truthful — the app is dark-only.
    if (useSettingsStore.getState().theme !== 'dark') {
      useSettingsStore.getState().setTheme('dark');
    }
  }, []);

  return <>{children}</>;
}
