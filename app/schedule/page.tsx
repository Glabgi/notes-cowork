'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';
import DayScheduler from '@/components/scheduler/DayScheduler';
import Button from '@/components/ui/Button';

export default function SchedulePage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      <header className="h-14 bg-[var(--bg-card)]/95 backdrop-blur-sm border-b border-[var(--border)] flex items-center px-4 gap-3 flex-shrink-0">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={15} /> Назад
        </Button>
        <h1 className="font-bold text-[var(--text-primary)] flex items-center gap-2"><Calendar size={16} className="text-[var(--accent)]" /> Планировщик дня</h1>
      </header>
      <div className="flex-1 overflow-hidden relative">
        <DayScheduler />
      </div>
    </div>
  );
}
