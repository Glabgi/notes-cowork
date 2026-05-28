'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, ArrowRight, AlertTriangle } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { signUp, isSupabaseConfigured } from '@/lib/supabase';
import { localRegister } from '@/lib/localAuth';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    const u = username.trim();
    if (u.length < 3 || !/^[a-zA-Z0-9_.-]+$/.test(u)) {
      setErr('Логин: минимум 3 символа, только латиница, цифры, . _ -'); return;
    }
    if (password.length < 6) { setErr('Пароль минимум 6 символов'); return; }
    if (password !== password2) { setErr('Пароли не совпадают'); return; }
    setLoading(true);
    if (isSupabaseConfigured) {
      const { data, error } = await signUp({ username: u, password });
      setLoading(false);
      if (error) {
        setErr(error.message?.toLowerCase().includes('registered') ? 'Этот логин уже занят' : error.message);
        return;
      }
      if (data?.session) router.push('/'); else router.push('/login');
    } else {
      const res = await localRegister(u, password);
      setLoading(false);
      if (!res.ok) { setErr(res.error || 'Ошибка регистрации'); return; }
      window.dispatchEvent(new Event('vc-auth-changed'));
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[28px] p-8 shadow-[0_8px_32px_rgba(15,23,42,0.10)]">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-[var(--accent-light)] rounded-[16px] flex items-center justify-center mx-auto mb-4">
              <UserPlus size={24} className="text-[var(--accent)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Регистрация</h2>
            <p className="text-[var(--text-muted)] text-sm mt-1">Только логин и пароль</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Input label="Логин" value={username} onChange={e => setUsername(e.target.value)} placeholder="например: albert" autoComplete="username" required autoFocus />
            <Input label="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="минимум 6 символов" autoComplete="new-password" required />
            <Input label="Повторите пароль" type="password" value={password2} onChange={e => setPassword2(e.target.value)} placeholder="ещё раз" autoComplete="new-password" required />

            {err && (
              <p className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> <span>{err}</span>
              </p>
            )}

            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
              Сброс пароля не предусмотрен — сохраните его. Персональные данные не собираются.
            </p>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Создать аккаунт <ArrowRight size={16} />
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--text-muted)] mt-5">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-[var(--accent)] hover:underline font-medium">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
