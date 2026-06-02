'use client';
import { useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore(s => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    const t = theme === 'light' ? 'light' : 'dark';
    root.classList.remove('light', 'dark');
    root.classList.add(t);
    root.style.colorScheme = t;
  }, [theme]);
  return <>{children}</>;
}
