'use client';

import DayScheduler from '@/components/scheduler/DayScheduler';
import AppHeader from '@/components/AppHeader';
import AuthGate from '@/components/AuthGate';

export default function SchedulePage() {
  return (
    <AuthGate pageName="Планировщик дня">
      <div className="min-h-screen flex flex-col">
        <AppHeader title="Планировщик дня" showBack showSchedule={false} />
        <div className="flex-1 overflow-hidden relative">
          <DayScheduler />
        </div>
      </div>
    </AuthGate>
  );
}
