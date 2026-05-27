'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  ArrowLeft, Bell, Palette, Volume2, User, Check, Settings as SettingsIcon,
  Coffee, TreePine, Wind, VolumeX, AlertTriangle, BarChart3, Calendar, Home,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import AuthGate from '@/components/AuthGate';
import { useSettingsStore } from '@/store/settingsStore';
import { AVATARS, getAvatarSvg } from '@/lib/avatars';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
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
      className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[20px] p-5 space-y-4 shadow-[var(--shadow-sm)]"
      style={{ animation: `fadeSlideIn 0.35s ease-out ${delay}s both` }}
    >
      <div className="flex items-center gap-2 pb-1 border-b border-[var(--border)]">
        <div className="w-7 h-7 rounded-[8px] bg-[var(--accent-light)] flex items-center justify-center">
          <Icon size={14} className="text-[var(--accent)]" />
        </div>
        <h2 className="font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle, disabled = false }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) onToggle(); }}
      disabled={disabled}
      aria-pressed={on}
      className={cn('relative w-11 h-6 rounded-full transition-colors duration-150 flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        on ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
      )}
    >
      <span className={cn('absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-150 shadow-sm',
        on ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const s = useSettingsStore();
  const [notifBlocked, setNotifBlocked] = useState(false);

  // Pull initial name/avatar from vc_user on first load (so settings shows current session identity)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vc_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.name && !s.userName) s.setUserName(u.name);
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

  const togglePush = () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      alert('Уведомления не поддерживаются в этом браузере');
      return;
    }
    // Currently ON → just flip OFF (no permission needed)
    if (s.pushNotifications) {
      s.setPushNotifications(false);
      return;
    }
    const current = window.Notification.permission;
    if (current === 'denied') {
      setNotifBlocked(true);
      alert('Уведомления заблокированы в настройках браузера. Откройте настройки сайта → Уведомления → Разрешить, затем перезагрузите страницу.');
      return;
    }
    if (current === 'granted') {
      s.setPushNotifications(true);
      // Test notification so user sees it worked
      try { new Notification('Уведомления включены ✓', { body: 'Вы получите сигнал при окончании таймера' }); } catch {}
      return;
    }
    // 'default' — request permission. Must be called synchronously from click for some browsers.
    window.Notification.requestPermission().then(perm => {
      s.setPushNotifications(perm === 'granted');
      setNotifBlocked(perm === 'denied');
      if (perm === 'granted') {
        try { new Notification('Уведомления включены ✓', { body: 'Вы получите сигнал при окончании таймера' }); } catch {}
      } else if (perm === 'denied') {
        alert('Вы отклонили разрешение. Включить можно через настройки браузера для этого сайта.');
      }
    }).catch(() => {
      alert('Не удалось запросить разрешение на уведомления');
    });
  };

  return (
    <AuthGate pageName="Настройки">
    <div className="min-h-screen bg-[var(--bg-page)]">
      <AppHeader title="Настройки" showBack />

      <div className="max-w-xl mx-auto px-6 sm:px-8 py-4 space-y-4 pb-12">

        {/* Profile */}
        <Section icon={User} title="Профиль" delay={0}>
          <Input
            label="Имя пользователя"
            value={s.userName}
            onChange={e => s.setUserName(e.target.value)}
            placeholder="Как вас зовут?"
          />
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
                      ? 'border-[var(--accent)] bg-[var(--accent-light)] shadow-[0_0_0_3px_rgba(37,99,235,0.15)]'
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
              {THEMES.map(t => (
                <button
                  key={t.id}
                  onClick={() => s.setTheme(t.id)}
                  className={cn(
                    'p-3 rounded-[14px] border-2 transition-all duration-150 text-left',
                    s.theme === t.id
                      ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)]'
                  )}
                >
                  {t.preview}
                  <p className={cn(
                    'text-xs font-semibold mt-2 flex items-center gap-1',
                    s.theme === t.id ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                  )}>
                    {s.theme === t.id && <Check size={11} strokeWidth={3} />}{t.label}
                  </p>
                </button>
              ))}
            </div>
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
                className="w-full accent-[#2563EB]"
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
            <Toggle
              on={s.pushNotifications}
              onToggle={togglePush}
              disabled={notifBlocked}
            />
          </div>
          {notifBlocked && (
            <div className="text-xs text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-[10px] px-3 py-2.5 flex items-start gap-2">
              <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Уведомления заблокированы браузером</p>
                <p className="mt-0.5">Кликните иконку 🔒/🔔 слева от URL → разрешите уведомления → обновите страницу.</p>
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
