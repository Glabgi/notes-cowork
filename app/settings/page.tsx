'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Bell, Palette, Volume2, User, Check, Settings as SettingsIcon,
  Coffee, TreePine, Wind, VolumeX, AlertTriangle, BarChart3, Calendar, Home,
} from 'lucide-react';
import { getLocalSession } from '@/lib/localAuth';
import AppHeader from '@/components/AppHeader';
import AuthGate from '@/components/AuthGate';
import { useSettingsStore } from '@/store/settingsStore';
import { AVATARS, getAvatarSvg } from '@/lib/avatars';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toggle from '@/components/ui/Toggle';
import { cn } from '@/lib/utils';

type AmbientSound = 'cafe' | 'forest' | 'white-noise' | 'none';

const AMBIENT_SOUNDS: { id: AmbientSound; label: string; Icon: React.ElementType }[] = [
  { id: 'cafe',        label: 'Кафе',       Icon: Coffee },
  { id: 'forest',      label: 'Лес',        Icon: TreePine },
  { id: 'white-noise', label: 'Белый шум',  Icon: Wind },
  { id: 'none',        label: 'Тишина',     Icon: VolumeX },
];

const THEMES = [
  {
    id: 'light' as const,
    label: 'Светлая',
    preview: (
      <div className="w-full h-10 rounded-[6px] overflow-hidden flex flex-col">
        <div className="h-3 bg-white border-b border-slate-200 flex items-center px-1.5 gap-1">
          <div className="w-5 h-1 bg-blue-400 rounded-full" />
          <div className="w-3 h-1 bg-slate-200 rounded-full" />
        </div>
        <div className="flex-1 bg-slate-100 px-1.5 py-1 flex gap-1">
          <div className="w-6 h-full bg-white rounded-[3px]" />
          <div className="flex-1 bg-white rounded-[3px]" />
        </div>
      </div>
    ),
  },
  {
    id: 'dark' as const,
    label: 'Тёмная',
    preview: (
      <div className="w-full h-10 rounded-[6px] overflow-hidden flex flex-col">
        <div className="h-3 bg-slate-800 border-b border-slate-700 flex items-center px-1.5 gap-1">
          <div className="w-5 h-1 bg-blue-500 rounded-full" />
          <div className="w-3 h-1 bg-slate-600 rounded-full" />
        </div>
        <div className="flex-1 bg-slate-900 px-1.5 py-1 flex gap-1">
          <div className="w-6 h-full bg-slate-800 rounded-[3px]" />
          <div className="flex-1 bg-slate-800 rounded-[3px]" />
        </div>
      </div>
    ),
  },
];

function Section({ icon: Icon, title, children, delay = 0 }: {
  icon: React.ElementType; title: string; children: React.ReactNode; delay?: number
}) {
  return (
    <div
      className="glass rounded-xl p-5 space-y-4 shadow-sm"
      style={{ animation: `fadeSlideIn 0.35s ease-out ${delay}s both` }}
    >
      <div className="flex items-center gap-2 pb-1 border-b border-[var(--divider)]">
        <div className="w-7 h-7 rounded-[8px] bg-accent-grad flex items-center justify-center">
          <Icon size={14} className="text-white" />
        </div>
        <h2 className="font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const s = useSettingsStore();
  const [notifBlocked, setNotifBlocked] = useState(false);
  // Registration login is the locked nickname. If a local account session exists,
  // the username cannot be edited from settings.
  const [lockedUsername, setLockedUsername] = useState<string | null>(null);

  // Pull initial name/avatar from vc_user on first load (so settings shows current session identity)
  useEffect(() => {
    const session = getLocalSession();
    if (session) {
      setLockedUsername(session.username);
      // The locked login always wins over any previously stored display name.
      s.setUserName(session.username);
    }
    try {
      const stored = localStorage.getItem('vc_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.name && !s.userName && !session) s.setUserName(u.name);
        if (u.avatarId && s.avatarId === 'fox') s.setAvatarId(u.avatarId);
      }
    } catch {}
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifBlocked(window.Notification.permission === 'denied');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync name + avatar to vc_user (so room joins reflect changes immediately)
  useEffect(() => {
    if (!s.userName) return;
    try {
      const stored = localStorage.getItem('vc_user');
      const u = stored ? JSON.parse(stored) : {};
      const updated = { ...u, name: s.userName, avatarId: s.avatarId };
      if (!updated.id) {
        // Generate stable id if missing (anonymous flow)
        updated.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      }
      localStorage.setItem('vc_user', JSON.stringify(updated));
    } catch {}
  }, [s.userName, s.avatarId]);

  // The toggle is a pure preference that ALWAYS flips instantly. Turning it on
  // additionally requests browser permission in the background (best-effort) —
  // but the toggle state never depends on the permission result, so it can
  // never get "stuck".
  const togglePush = () => {
    const next = !s.pushNotifications;
    s.setPushNotifications(next);   // flip immediately — always works
    if (next && typeof window !== 'undefined' && 'Notification' in window) {
      const perm = window.Notification.permission;
      if (perm === 'default') {
        window.Notification.requestPermission().then(p => {
          setNotifBlocked(p === 'denied');
          if (p === 'granted') { try { new Notification('Уведомления включены', { body: 'Сигнал при окончании таймера' }); } catch {} }
        }).catch(() => {});
      } else if (perm === 'granted') {
        try { new Notification('Уведомления включены', { body: 'Сигнал при окончании таймера' }); } catch {}
      } else if (perm === 'denied') {
        setNotifBlocked(true);
      }
    }
  };

  return (
    <AuthGate pageName="Настройки">
    <div className="min-h-screen">
      <AppHeader title="Настройки" showBack />

      <div className="max-w-xl mx-auto px-6 sm:px-8 py-4 space-y-4 pb-12">

        {/* Profile */}
        <Section icon={User} title="Профиль" delay={0}>
          {lockedUsername ? (
            <Input
              label="Имя пользователя"
              value={lockedUsername}
              readOnly
              disabled
              hint="Логин выбран при регистрации и не может быть изменён."
              className="cursor-not-allowed opacity-70"
            />
          ) : (
            <Input
              label="Имя пользователя"
              value={s.userName}
              onChange={e => s.setUserName(e.target.value)}
              placeholder="Как вас зовут?"
            />
          )}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Аватар</label>
            <div className="grid grid-cols-5 gap-2">
              {AVATARS.map(a => (
                <button
                  key={a.id}
                  onClick={() => s.setAvatarId(a.id)}
                  title={a.label}
                  className={cn(
                    'p-1.5 rounded-[12px] border-2 transition-all duration-150 relative',
                    s.avatarId === a.id
                      ? 'border-[var(--accent)] bg-[var(--accent-light)] shadow-[0_0_0_3px_rgba(109,75,255,0.18)]'
                      : 'border-transparent bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]'
                  )}
                >
                  <div className="w-10 h-10 rounded-[8px] overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: getAvatarSvg(a.id, 40) }} />
                  {s.avatarId === a.id && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--accent)] rounded-full flex items-center justify-center">
                      <Check size={8} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Часовой пояс</label>
            <div className="px-3 py-2.5 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[10px] text-sm text-[var(--text-muted)] font-mono">
              {s.timezone}
            </div>
          </div>
        </Section>

        {/* Appearance */}
        <Section icon={Palette} title="Оформление" delay={0.07}>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-3">Тема</label>
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map(t => {
                // The app now ships a single light frosted-glass palette.
                // Light is permanently active; the dark option is shown but locked.
                const isLight = t.id === 'light';
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!isLight}
                    aria-disabled={!isLight}
                    onClick={() => { if (isLight) s.setTheme('light'); }}
                    className={cn(
                      'p-3 rounded-[14px] border-2 transition-all duration-150 text-left',
                      isLight
                        ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                        : 'border-[var(--border)] bg-[var(--bg-subtle)] opacity-50 cursor-not-allowed'
                    )}
                  >
                    {t.preview}
                    <p className={cn(
                      'text-xs font-semibold mt-2 flex items-center gap-1',
                      isLight ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
                    )}>
                      {isLight && <Check size={11} strokeWidth={3} />}{t.label}
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Приложение использует светлую тему. Тёмная тема пока недоступна.
            </p>
          </div>
        </Section>

        {/* Sound */}
        <Section icon={Volume2} title="Звуки" delay={0.14}>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Фоновые звуки</label>
            <div className="grid grid-cols-2 gap-2">
              {AMBIENT_SOUNDS.map(sound => (
                <button
                  key={sound.id}
                  onClick={() => s.setAmbientSound(sound.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-[12px] text-sm border transition-all duration-150',
                    s.ambientSound === sound.id
                      ? 'bg-[var(--accent-light)] border-[var(--accent)] text-[var(--accent)] font-medium'
                      : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
                  )}
                >
                  <sound.Icon size={15} className="flex-shrink-0" />
                  <span>{sound.label}</span>
                </button>
              ))}
            </div>
          </div>
          {s.ambientSound !== 'none' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-[var(--text-secondary)]">Громкость</label>
                <span className="text-xs text-[var(--text-muted)] tabular-nums">{Math.round(s.ambientVolume * 100)}%</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.05}
                value={s.ambientVolume}
                onChange={e => s.setAmbientVolume(+e.target.value)}
                className="w-full accent-[#6D4BFF]"
              />
            </div>
          )}
        </Section>

        {/* Notifications */}
        <Section icon={Bell} title="Уведомления" delay={0.21}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Push-уведомления</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">При окончании фазы таймера</p>
            </div>
            <Toggle on={s.pushNotifications} onToggle={togglePush} />
          </div>
          {notifBlocked && s.pushNotifications && (
            <div className="text-xs text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] px-3 py-2.5 flex items-start gap-2">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Системные уведомления заблокированы браузером</p>
                <p className="mt-0.5">Настройка включена, но чтобы видеть всплывающие уведомления — разрешите их в браузере (иконка слева от адреса) и обновите страницу.</p>
              </div>
            </div>
          )}
        </Section>

        {/* Footer */}
        <div className="flex gap-4 text-xs text-[var(--text-muted)] justify-center pt-2">
          <button onClick={() => router.push('/dashboard')} className="hover:text-[var(--text-secondary)] transition-colors inline-flex items-center gap-1"><BarChart3 size={11} /> Прогресс</button>
          <span>·</span>
          <button onClick={() => router.push('/schedule')} className="hover:text-[var(--text-secondary)] transition-colors inline-flex items-center gap-1"><Calendar size={11} /> Расписание</button>
          <span>·</span>
          <button onClick={() => router.push('/')} className="hover:text-[var(--text-secondary)] transition-colors inline-flex items-center gap-1"><Home size={11} /> Главная</button>
        </div>
      </div>
    </div>
    </AuthGate>
  );
}
