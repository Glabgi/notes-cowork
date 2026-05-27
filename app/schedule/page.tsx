'use client';

import DayScheduler from '@/components/scheduler/DayScheduler';
import AppHeader from '@/components/AppHeader';

export default function SchedulePage() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col">
      <AppHeader title="Планировщик дня" showSchedule={false} />
      <div className="flex-1 overflow-hidden relative">
        <DayScheduler />
      </div>
    </div>
  );
}
