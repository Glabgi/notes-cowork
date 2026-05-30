'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn, ArrowRight, AlertTriangle } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { signIn, isSupabaseConfigured } from '@/lib/supabase';
import { localLogin, syncVcUser } from '@/lib/localAuth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!username.trim() || !password.trim()) { setErr('Введите логин и пароль'); return; }
    setLoading(true);
    if (isSupabaseConfigured) {
      const { error } = await signIn(username.trim(), password);
      setLoading(false);
      if (error) { setErr('Неверный логин или пароль'); return; }
      syncVcUser(username.trim());
    } else {
      const res = await localLogin(username, password);
      setLoading(false);
      if (!res.ok) { setErr(res.error || 'Ошибка входа'); return; }
      syncVcUser(username.trim());
      window.dispatchEvent(new Event('vc-auth-changed'));
    }
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-slide-in">
        <div className="glass-elevated rounded-[28px] p-8 shadow-lg">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-accent-grad rounded-[16px] flex items-center justify-center mx-auto mb-4 shadow-glow">
              <LogIn size={24} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-ink-primary">Вход в Notes Cowork</h2>
            <p className="text-ink-muted text-sm mt-1">Только логин и пароль — никаких данных</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            <Input label="Логин" value={username} onChange={e => setUsername(e.target.value)} placeholder="Ваш логин" autoFocus required autoComplete="username" />
            <Input label="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoComplete="current-password" />

            {err && (
              <p className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> <span>{err}</span>
              </p>
            )}

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Войти <ArrowRight size={16} />
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--text-muted)] mt-5">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-[var(--accent)] hover:underline font-medium">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
