'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Calendar, Settings, BarChart3, ArrowLeft, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { signOut, isSupabaseConfigured } from '@/lib/supabase';
import { getAvatarSvg } from '@/lib/avatars';

interface Props {
  title?: string;
  showBack?: boolean;
  showSchedule?: boolean;
  showDashboard?: boolean;
  rightExtra?: React.ReactNode;
}

/**
 * Unified top bar.
 * - Logo always present (links to /).
 * - Private feature buttons (Schedule, Dashboard, Settings) are hidden
 *   for anonymous visitors when Supabase is configured — they only see "Войти".
 * - When Supabase is NOT configured, everything is open (dev/no-auth mode).
 */
export default function AppHeader({
  title,
  showBack = false,
  showSchedule = true,
  showDashboard = true,
  rightExtra,
}: Props) {
  const router = useRouter();
  const { user, profile, configured, loading } = useAuth();

  // Auth gate: if Supabase IS configured but user is not signed in, hide
  // personal feature buttons (Schedule, Dashboard, Settings).
  const isAnonymous = configured && !user && !loading;

  return (
    <header className="h-14 bg-[var(--bg-card)]/95 backdrop-blur-sm border-b border-[var(--border)] flex items-center px-3 sm:px-4 gap-2 sticky top-0 z-30">
      {/* Back button */}
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
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="w-9 h-9 bg-gradient-to-br from-[var(--accent)] to-[#1D4ED8] rounded-[10px] flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_rgba(37,99,235,0.25)] group-hover:scale-105 transition-transform">
          <span className="text-white text-[9px] font-black leading-none tracking-tight">ICEF</span>
        </div>
        <div className="hidden sm:flex flex-col leading-none">
          <span className="font-bold text-[var(--text-primary)] text-sm">Notes Cowork</span>
          <span className="text-[10px] text-[var(--text-muted)] font-medium tracking-wide">I.C-E.F Notes project</span>
        </div>
      </Link>

      {/* Optional page title */}
      {title && (
        <>
          <div className="hidden md:block w-px h-5 bg-[var(--border)]" />
          <h1 className="font-bold text-[var(--text-primary)] text-sm hidden md:block">{title}</h1>
        </>
      )}

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-1.5">
        {rightExtra}

        {/* Personal feature buttons — hidden when anonymous */}
        {!isAnonymous && (
          <>
            {showSchedule && (
              <button
                onClick={() => router.push('/schedule')}
                className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors"
              >
                <Calendar size={13} />
                <span className="hidden sm:inline">Расписание</span>
              </button>
            )}
            {showDashboard && (
              <button
                onClick={() => router.push('/dashboard')}
                className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors"
              >
                <BarChart3 size={13} />
                <span className="hidden sm:inline">Прогресс</span>
              </button>
            )}
            <button
              onClick={() => router.push('/settings')}
              className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)] transition-colors"
              title="Настройки"
            >
              <Settings size={13} />
              <span className="hidden sm:inline">Настройки</span>
            </button>
          </>
        )}

        {/* Auth pill — primary CTA when anonymous */}
        {configured && (
          user ? (
            <button
              onClick={async () => { if (confirm('Выйти из аккаунта?')) { await signOut(); router.refresh(); } }}
              className="h-9 px-2 inline-flex items-center gap-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] hover:border-[var(--border-strong)] transition-colors"
              title={profile?.username || 'Профиль'}
            >
              <div className="w-6 h-6 rounded-full overflow-hidden"
                dangerouslySetInnerHTML={{ __html: getAvatarSvg(profile?.avatar_id || 'fox', 24) }} />
              <span className="text-xs font-medium text-[var(--text-secondary)] hidden md:inline max-w-[80px] truncate">
                {profile?.username || 'Профиль'}
              </span>
              <LogOut size={12} className="text-[var(--text-muted)]" />
            </button>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="h-9 px-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-[10px] transition-colors shadow-[0_2px_6px_rgba(37,99,235,0.25)]"
            >
              <LogIn size={13} />
              Войти
            </button>
          )
        )}
      </div>
    </header>
  );
}
