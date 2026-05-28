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

  const btn = 'h-9 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors';

  return (
    <header className="h-14 bg-[var(--bg-card)]/95 backdrop-blur-sm border-b border-[var(--border)] flex items-center px-3 sm:px-4 gap-2 sticky top-0 z-30">
      {showBack && (
        <button
          onClick={() => router.back()}
          className="h-9 w-9 inline-flex items-center justify-center text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors"
          title="Назад"
        >
          <ArrowLeft size={14} />
        </button>
      )}

      {/* Logo — always */}
      <Link href="/" className="flex items-center group">
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
            <button onClick={handleLogout} className="h-9 px-2 inline-flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] hover:border-[var(--border-strong)] transition-colors" title={profile?.username || 'Профиль'}>
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
            className="h-9 px-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-[10px] transition-colors shadow-[0_2px_6px_rgba(37,99,235,0.25)]"
          >
            <LogIn size={13} /> Войти
          </button>
        )}
      </div>
    </header>
  );
}
