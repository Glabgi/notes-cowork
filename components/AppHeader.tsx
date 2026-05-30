'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Settings, BarChart3, ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { signOut, isSupabaseConfigured } from '@/lib/supabase';
import { localLogout } from '@/lib/localAuth';
import { getAvatarSvg } from '@/lib/avatars';
import IcefLogo from '@/components/IcefLogo';

interface Props {
  title?: string;
  showBack?: boolean;
  showSchedule?: boolean;
  showDashboard?: boolean;
  rightExtra?: React.ReactNode;
}

export default function AppHeader({
  title,
  showBack = false,
  showSchedule = true,
  showDashboard = true,
  rightExtra,
}: Props) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  // Auth is always available (Supabase or local). Anonymous = not logged in.
  const isAnonymous = !user && !loading;

  const handleLogout = async () => {
    if (!confirm('Выйти из аккаунта?')) return;
    if (isSupabaseConfigured) { await signOut(); }
    else { localLogout(); window.dispatchEvent(new Event('vc-auth-changed')); }
    router.push('/');
  };

  const btn = 'h-9 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] glass-subtle rounded-[12px] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors';

  return (
    <header className="sticky top-3 z-30 mx-3 sm:mx-4 mt-3 h-14 glass rounded-[20px] shadow-md flex items-center px-3 sm:px-4 gap-2">
      {showBack && (
        <button
          onClick={() => router.back()}
          className="h-9 w-9 inline-flex items-center justify-center text-[var(--text-secondary)] glass-subtle rounded-[12px] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
          title="Назад"
        >
          <ArrowLeft size={14} />
        </button>
      )}

      {/* Logo — always */}
      <Link href="/" className="flex items-center group rounded-[12px] px-1.5 py-0.5 bg-accent-grad/10 hover:bg-accent-grad/20 transition-colors">
        <IcefLogo />
      </Link>

      {title && (
        <>
          <div className="hidden md:block w-px h-5 bg-[var(--border)] ml-1" />
          <h1 className="font-bold text-[var(--text-primary)] text-sm hidden md:block">{title}</h1>
        </>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        {rightExtra}

        {/* Personal feature buttons — only for logged-in users */}
        {!isAnonymous && (
          <>
            {showSchedule && (
              <button onClick={() => router.push('/schedule')} className={btn}>
                <Calendar size={13} />
                <span className="hidden sm:inline">Расписание</span>
              </button>
            )}
            {showDashboard && (
              <button onClick={() => router.push('/dashboard')} className={btn}>
                <BarChart3 size={13} />
                <span className="hidden sm:inline">Прогресс</span>
              </button>
            )}
            <button onClick={() => router.push('/settings')} className={btn} title="Настройки">
              <Settings size={13} />
              <span className="hidden sm:inline">Настройки</span>
            </button>
            <button onClick={handleLogout} className="h-9 px-2 inline-flex items-center gap-1.5 glass-subtle rounded-[12px] hover:bg-[var(--bg-hover)] transition-colors" title={profile?.username || 'Профиль'}>
              <div className="w-6 h-6 rounded-full overflow-hidden"
                dangerouslySetInnerHTML={{ __html: getAvatarSvg(profile?.avatar_id || 'fox', 24) }} />
              <span className="text-xs font-medium text-[var(--text-secondary)] hidden md:inline max-w-[80px] truncate">
                {profile?.username || 'Профиль'}
              </span>
              <LogOut size={12} className="text-[var(--text-muted)]" />
            </button>
          </>
        )}

        {/* Anonymous → single prominent Login CTA */}
        {isAnonymous && (
          <button
            onClick={() => router.push('/login')}
            className="h-9 px-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-accent-grad rounded-[12px] transition-all hover:shadow-glow"
          >
            <LogIn size={13} /> Войти
          </button>
        )}
      </div>
    </header>
  );
}
