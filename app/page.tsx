'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { generateSlug } from '@/lib/utils';
import { AVATARS, getAvatarSvg } from '@/lib/avatars';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import { Settings, Calendar, Plus, ArrowRight, AlertTriangle, Home, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { signOut, isSupabaseConfigured } from '@/lib/supabase';
import { getAvatarSvg as getAvatarSvgHeader } from '@/lib/avatars';
import AppHeader from '@/components/AppHeader';

/* ─── Types ─────────────────────────────────────────────────────────── */
interface ActiveRoom {
  slug: string;
  name: string;
  participantCount: number;
  participants: { id: string; avatarId: string }[];
}

/* ─── Footer (gated) ─────────────────────────────────────────────────── */
function HomeFooterLinks({ router }: { router: any }) {
  const { user } = useAuth();
  const isAnonymous = !user;
  if (isAnonymous) {
    return (
      <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] pt-2">
        <span className="opacity-60">I.C-E.F Notes project</span>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-muted)] pt-2">
      <button onClick={() => router.push('/dashboard')} className="hover:text-[var(--accent)] transition-colors">Мой прогресс</button>
      <span>·</span>
      <button onClick={() => router.push('/settings')} className="hover:text-[var(--accent)] transition-colors">Настройки</button>
      <span>·</span>
      <span className="opacity-60">I.C-E.F Notes</span>
    </div>
  );
}


/* ─── Create Room Modal ─────────────────────────────────────────────── */
function CreateRoomModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState('fox');
  const [roomName, setRoomName] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [password, setPassword] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill from localStorage
  useEffect(() => {
    if (!open) return;
    try {
      const s = localStorage.getItem('vc_user');
      if (s) { const u = JSON.parse(s); if (u.name) setName(u.name); if (u.avatarId) setAvatarId(u.avatarId); }
    } catch {}
  }, [open]);

  const isPrivate = visibility === 'private';

  const handleCreate = () => {
    if (!name.trim()) { setError('Введите ваше имя'); return; }
    if (!roomName.trim()) { setError('Введите название комнаты'); return; }
    if (isPrivate && !password.trim()) { setError('Для приватной сессии задайте пароль'); return; }
    setLoading(true);
    const slug = generateSlug();
    const userId = uuidv4();
    localStorage.setItem('vc_user', JSON.stringify({ id: userId, name: name.trim(), avatarId }));
    localStorage.setItem('vc_create_room', JSON.stringify({
      slug, name: roomName.trim(),
      isPrivate, isPublic: !isPrivate,
      password: isPrivate ? password.trim() : null,
      maxParticipants,
    }));
    if (isPrivate) {
      // Save the password so creator doesn't get prompted
      try { sessionStorage.setItem('vc_room_pw_' + slug, password.trim()); } catch {}
    }
    // Save to recent rooms
    try {
      const recent = JSON.parse(localStorage.getItem('vc_recent_rooms') || '[]');
      recent.unshift({ slug, name: roomName.trim(), visitedAt: Date.now() });
      localStorage.setItem('vc_recent_rooms', JSON.stringify(recent.slice(0, 10)));
    } catch {}
    router.push(`/room/${slug}`);
  };

  return (
    <Modal open={open} onClose={onClose} title="Создать сессию" size="sm">
      <div className="p-6 space-y-4">
        <Input
          label="Ваше имя"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          placeholder="Как вас зовут?"
          autoFocus
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />

        <Input
          label="Название комнаты"
          value={roomName}
          onChange={e => { setRoomName(e.target.value); setError(''); }}
          placeholder="Например: Продуктивный вечер"
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />

        {/* Avatar picker */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Аватар</label>
          <div className="grid grid-cols-5 gap-1.5">
            {AVATARS.map(a => (
              <button
                key={a.id}
                onClick={() => setAvatarId(a.id)}
                className={cn(
                  'p-1.5 rounded-[10px] border-2 transition-all duration-150',
                  avatarId === a.id
                    ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                    : 'border-transparent bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]'
                )}
              >
                <div className="w-8 h-8 rounded-[6px] overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: getAvatarSvg(a.id, 32) }} />
              </button>
            ))}
          </div>
        </div>

        {/* Visibility radio */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Доступ</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={cn(
                'flex flex-col items-start gap-1 p-3 rounded-[12px] border-2 transition-all duration-150 text-left',
                visibility === 'public'
                  ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                  : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)]'
              )}
            >
              <div className="flex items-center gap-1.5">
                <Home size={13} className={visibility === 'public' ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'} />
                <span className={cn('text-sm font-semibold', visibility === 'public' ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]')}>Публичная</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] leading-tight">Видна на главной, открыта всем</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={cn(
                'flex flex-col items-start gap-1 p-3 rounded-[12px] border-2 transition-all duration-150 text-left',
                visibility === 'private'
                  ? 'border-[var(--accent)] bg-[var(--accent-light)]'
                  : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-strong)]'
              )}
            >
              <div className="flex items-center gap-1.5">
                <Settings size={13} className={visibility === 'private' ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'} />
                <span className={cn('text-sm font-semibold', visibility === 'private' ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]')}>Приватная</span>
              </div>
              <span className="text-[10px] text-[var(--text-muted)] leading-tight">Только по коду + пароль</span>
            </button>
          </div>
        </div>

        {/* Password field — only for private */}
        {isPrivate && (
          <Input
            label="Пароль сессии"
            value={password}
            type="password"
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="Минимум 4 символа"
          />
        )}

        {/* Max participants */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--text-secondary)] flex-1">Максимум участников</span>
          <select
            value={maxParticipants}
            onChange={e => setMaxParticipants(+e.target.value)}
            className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[8px] px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none"
          >
            {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        {error && (
          <p className="text-sm text-[var(--danger)] bg-[rgba(242,63,67,0.1)] border border-[rgba(242,63,67,0.35)] rounded-[10px] px-3 py-2 flex items-center gap-2">
            <AlertTriangle size={14} className="flex-shrink-0" /> {error}
          </p>
        )}

        <Button className="w-full" size="lg" loading={loading} onClick={handleCreate}>
          Создать и войти <ArrowRight size={14} />
        </Button>
      </div>
    </Modal>
  );
}

/* ─── Room Card ─────────────────────────────────────────────────────── */
function RoomCard({ room }: { room: ActiveRoom }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(`/room/${room.slug}`)}
      className="w-full surface surface-hover hover-lift rounded-[14px] p-4 cursor-pointer text-left group"
    >
      {/* Row 1: name + participant count */}
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-[var(--text-primary)] truncate text-sm group-hover:text-white transition-colors">
          {room.name}
        </p>
        <span className="flex-shrink-0 text-[11px] bg-[var(--accent-light)] text-[var(--text-link)] border border-[var(--accent)]/25 px-2 py-0.5 rounded-full font-medium tnum">
          {room.participantCount} уч.
        </span>
      </div>

      {/* Row 2: slug + online indicator */}
      <div className="flex items-center justify-between mt-1.5">
        <p className="font-mono text-xs text-[var(--text-muted)]">#{room.slug}</p>
        <div className="flex items-center gap-1.5">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-[var(--status-online)] animate-pulse-dot" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-[var(--status-online)]" />
          </span>
          <span className="text-[10px] text-[var(--status-online)] font-medium">онлайн</span>
        </div>
      </div>

      {/* Row 3: participant avatars */}
      {room.participants.length > 0 && (
        <div className="flex items-center mt-2 gap-0.5">
          <div className="flex -space-x-2">
            {room.participants.slice(0, 4).map((p, i) => (
              <div key={p.id}
                className="w-6 h-6 rounded-full border-2 border-[var(--bg-card)] overflow-hidden"
                style={{ zIndex: 10 - i }}
                dangerouslySetInnerHTML={{ __html: getAvatarSvg(p.avatarId, 24) }}
              />
            ))}
          </div>
          {room.participantCount > 4 && (
            <span className="text-[10px] text-[var(--text-muted)] ml-2">
              +{room.participantCount - 4}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

/* ─── Skeleton Card ─────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="surface rounded-[14px] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="h-4 skeleton rounded-full w-32" />
        <div className="h-5 skeleton rounded-full w-14" />
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="h-3 skeleton rounded-full w-20" />
        <div className="h-3 skeleton rounded-full w-12" />
      </div>
    </div>
  );
}

/* ─── Active Rooms List ─────────────────────────────────────────────── */
function ActiveRoomsList() {
  const [rooms, setRooms] = useState<ActiveRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/rooms/active', { cache: 'no-store' });
        if (!res.ok) throw new Error();
        const data = await res.json();
        // Only show real PUBLIC rooms from the server. No localStorage fallback —
        // that previously surfaced the user's own private rooms by mistake.
        if (!cancelled) setRooms(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setRooms([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    // Auto-refresh every 15s so newly created public sessions appear automatically
    const interval = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => <SkeletonCard key={i} />)}
    </div>
  );

  if (rooms.length === 0) return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] border-dashed rounded-[16px] p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center mx-auto mb-2">
        <Home size={20} className="text-[var(--text-muted)]" />
      </div>
      <p className="text-sm font-medium text-[var(--text-secondary)]">Нет активных сессий</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">Создай первую — друзья подключатся по ссылке</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {rooms.map(room => <RoomCard key={room.slug} room={room} />)}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────── */
export default function HomePage() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [joinInput, setJoinInput] = useState('');

  const handleJoin = () => {
    if (!joinInput.trim()) return;
    let slug = joinInput.trim();
    if (slug.includes('/room/')) slug = slug.split('/room/')[1].split('?')[0];
    // Save recent
    try {
      const recent = JSON.parse(localStorage.getItem('vc_recent_rooms') || '[]');
      if (!recent.find((r: any) => r.slug === slug)) {
        recent.unshift({ slug, name: slug, visitedAt: Date.now() });
        localStorage.setItem('vc_recent_rooms', JSON.stringify(recent.slice(0, 10)));
      }
    } catch {}
    router.push(`/room/${slug}`);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <AppHeader showDashboard={true} />

      {/* Body */}
      <main className="max-w-2xl mx-auto px-6 sm:px-8 py-10 space-y-8">

        {/* Hero */}
        <div className="text-center pt-4 pb-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-card)] border border-[var(--border)] rounded-full px-3 py-1 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-online)]" />
            Совместная работа в реальном времени
          </span>
          <h1 className="gradient-text text-4xl sm:text-5xl font-bold tracking-tightest leading-[1.05]">
            Работайте вместе.<br/>В одном пространстве.
          </h1>
          <p className="text-[var(--text-secondary)] text-base mt-4 max-w-md mx-auto text-balance">
            Голос, экран, задачи и фокус-таймер — создайте сессию и пригласите команду по ссылке.
          </p>
        </div>

        {/* Create card */}
        <button
          onClick={() => setShowCreate(true)}
          className="relative w-full overflow-hidden rounded-[18px] p-[1px] cursor-pointer text-left group active:scale-[0.99] transition-transform duration-150"
          style={{ background: 'linear-gradient(135deg, rgba(110,121,232,0.6), rgba(139,92,246,0.35))' }}
        >
          <div className="rounded-[17px] p-6 bg-[var(--bg-card)] group-hover:bg-[var(--bg-hover)] transition-colors duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[12px] bg-accent-grad flex items-center justify-center shadow-glow flex-shrink-0">
                <Plus size={24} strokeWidth={2.5} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-xl text-[var(--text-primary)] flex items-center gap-2">
                  Создать сессию
                  <ArrowRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--text-link)] group-hover:translate-x-0.5 transition-all" />
                </p>
                <p className="text-[var(--text-secondary)] text-sm mt-1">Поделитесь ссылкой — участники подключатся сразу</p>
              </div>
            </div>
          </div>
        </button>

        {/* Quick join */}
        <div className="surface rounded-[14px] p-4">
          <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Быстрый вход</p>
          <div className="flex gap-2">
            <input
              value={joinInput}
              onChange={e => setJoinInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="Вставьте ссылку или код комнаты…"
              className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-[8px] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25 transition-all"
            />
            <Button size="md" onClick={handleJoin} disabled={!joinInput.trim()}>
              Войти <ArrowRight size={14} />
            </Button>
          </div>
        </div>

        {/* Active sessions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[var(--text-primary)] font-semibold text-base tracking-tight">Активные сессии</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-link)] transition-colors"
            >
              Обновить
            </button>
          </div>
          <ActiveRoomsList />
        </div>

        {/* Footer links — gated for anonymous */}
        <HomeFooterLinks router={router} />
      </main>

      <CreateRoomModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
