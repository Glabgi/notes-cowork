import type { Metadata } from 'next';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'Notes Cowork — Вместе продуктивнее',
  description: 'Совместная удалённая работа и учёба с помодоро-таймером, расписанием, чатом и мини-играми. Часть I.C-E.F Notes.',
  keywords: 'coworking, pomodoro, productivity, remote work, notes cowork, i.c-e.f',
  openGraph: {
    title: 'Notes Cowork',
    description: 'Совместная работа и учёба онлайн',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
