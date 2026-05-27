'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface Props {
  children: React.ReactNode;
  /** When true, anonymous users see a friendly login wall instead of being redirected. */
  softWall?: boolean;
  pageName?: string;
}

/**
 * Guards a page so only signed-in users see content.
 * If Supabase is NOT configured, this is a no-op (everything is open).
 */
export default function AuthGate({ children, softWall = true, pageName }: Props) {
  const router = useRouter();
  const { user, loading, configured } = useAuth();

  useEffect(() => {
    if (!configured || loading) return;
    if (!user && !softWall) router.replace('/login');
  }, [user, loading, configured, softWall, router]);

  // No auth backend → open
  if (!configured) return <>{children}</>;
  // Loading session → blank to avoid flicker
  if (loading) return null;
  // Signed in → show content
  if (user) return <>{children}</>;

  // Anonymous + softWall → show login wall
  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[24px] p-8 max-w-md w-full shadow-[0_8px_32px_rgba(15,23,42,0.10)] space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 bg-[var(--accent-light)] rounded-[14px] flex items-center justify-center mx-auto mb-3">
            <Lock size={24} className="text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Только для зарегистрированных</h2>
          <p className="text-sm text-[var(--text-muted)] mt-2 leading-relaxed">
            {pageName ? `${pageName} ` : 'Этот раздел '}доступен только после входа.
            <br />Зарегистрируйтесь — нужны только логин и пароль.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push('/login')}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-[12px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold transition-colors"
          >
            <LogIn size={15} /> Войти
          </button>
          <Link
            href="/register"
            className="w-full inline-flex items-center justify-center px-4 py-3 rounded-[12px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] font-medium text-sm border border-[var(--border)] transition-colors"
          >
            Создать аккаунт
          </Link>
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft size={12} /> На главную
          </Link>
        </div>
      </div>
    </div>
  );
}
