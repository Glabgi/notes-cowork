'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus, ArrowRight, AlertTriangle } from 'lucide-react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { signUp, isSupabaseConfigured } from '@/lib/supabase';
import { AVATARS, getAvatarSvg } from '@/lib/avatars';
import { cn } from '@/lib/utils';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [avatarId, setAvatarId] = useState('fox');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(''); setInfo('');
    if (!isSupabaseConfigured) {
      setErr('Supabase не настроен. Заполните переменные окружения и примените schema.sql.');
      return;
    }
    if (password.length < 6) { setErr('Пароль минимум 6 символов'); return; }
    if (!username.trim()) { setErr('Введите имя'); return; }
    setLoading(true);
    const { data, error } = await signUp({ email: email.trim(), password, username: username.trim(), avatarId });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    if (data.session) {
      router.push('/dashboard');
    } else {
      setInfo('Проверьте email для подтверждения регистрации.');
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
            <p className="text-[var(--text-muted)] text-sm mt-1">Сохраняйте прогресс и достижения</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Input label="Имя" value={username} onChange={e => setUsername(e.target.value)} placeholder="Как вас зовут?" required />
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            <Input label="Пароль" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Минимум 6 символов" required />

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Аватар</label>
              <div className="grid grid-cols-5 gap-1.5">
                {AVATARS.map(a => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAvatarId(a.id)}
                    className={cn(
                      'p-1.5 rounded-[12px] border-2 transition-all duration-150',
                      avatarId === a.id
                        ? 'border-[var(--accent)] bg-[var(--accent-light)] shadow-[0_0_0_3px_rgba(37,99,235,0.15)]'
                        : 'border-transparent bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]'
                    )}
                  >
                    <div className="w-8 h-8 rounded-[8px] overflow-hidden" dangerouslySetInnerHTML={{ __html: getAvatarSvg(a.id, 32) }} />
                  </button>
                ))}
              </div>
            </div>

            {err && (
              <p className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" /> <span>{err}</span>
              </p>
            )}
            {info && (
              <p className="text-sm text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0] rounded-[10px] px-3 py-2">
                {info}
              </p>
            )}

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
