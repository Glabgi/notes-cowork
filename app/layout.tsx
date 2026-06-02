import type { Metadata } from 'next';
import './globals.css';
import ThemeProvider from '@/components/ThemeProvider';
import { AuthProvider } from '@/components/AuthProvider';

export const metadata: Metadata = {
  title: 'ICF Notes — учимся вместе',
  description: 'Тихая комната для совместной учёбы и работы: помодоро-таймер, расписание, голос и атмосферные звуки для фокуса.',
  keywords: 'icf notes, coworking, pomodoro, focus, study together',
  openGraph: {
    title: 'ICF Notes',
    description: 'Учимся и работаем вместе, в тишине и фокусе',
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
