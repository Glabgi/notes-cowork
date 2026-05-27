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

/* ─── Auth Badge ────────────────────────────────────────────────────── */
function AuthBadge() {
  const router = useRouter();
  const { user, profile, loading, configured } = useAuth();
  if (!configured) return null;
  if (loading) return <div className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] animate-pulse" />;
  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
        <LogIn size={14} />
        <span className="hidden sm:inline">Войти</span>
      </Button>
    );
  }
  return (
    <button
      onClick={async () => { if (confirm('Выйти из аккаунта?')) { await signOut(); router.refresh(); } }}
      className="flex items-center gap-2 px-2 py-1 rounded-[10px] hover:bg-[var(--bg-hover)] transition-colors"
      title={profile?.username || user.email || 'Профиль'}
    >
      <div className="w-7 h-7 rounded-full overflow-hidden border border-[var(--border)]"
        dangerouslySetInnerHTML={{ __html: getAvatarSvgHeader(profile?.avatar_id || 'fox', 28) }} />
      <span className="text-xs font-medium text-[var(--text-secondary)] hidden sm:inline max-w-[100px] truncate">
        {profile?.username || user.email}
      </span>
    </button>
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
          <p className="text-sm text-[#DC2626] bg-[#FEF2F2] border border-[#FECACA] rounded-[10px] px-3 py-2 flex items-center gap-2">
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
      className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-[16px] p-4 hover:border-[var(--border-accent)] hover:shadow-[var(--shadow-md)] cursor-pointer transition-all duration-150 text-left group"
    >
      {/* Row 1: name + participant count */}
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-[var(--text-primary)] truncate text-sm group-hover:text-[var(--accent)] transition-colors">
          {room.name}
        </p>
        <span className="flex-shrink-0 text-xs bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--border-accent)] px-2 py-0.5 rounded-full font-medium">
          {room.participantCount} уч.
        </span>
      </div>

      {/* Row 2: slug + online indicator */}
      <div className="flex items-center justify-between mt-1">
        <p className="font-mono text-xs text-[var(--text-muted)]">#{room.slug}</p>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
          <span className="text-[10px] text-[#16A34A] font-medium">онлайн</span>
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
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[16px] p-4 animate-pulse">
      <div className="flex items-center justify-between gap-2">
        <div className="h-4 bg-[var(--bg-subtle)] rounded-full w-32" />
        <div className="h-5 bg-[var(--bg-subtle)] rounded-full w-14" />
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="h-3 bg-[var(--bg-subtle)] rounded-full w-20" />
        <div className="h-3 bg-[var(--bg-subtle)] rounded-full w-12" />
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
        const res = await fetch('/api/rooms/active');
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setRooms(data);
      } catch {
        // Merge recent rooms from localStorage as fallback
        try {
          const recent: { slug: string; name: string }[] = JSON.parse(localStorage.getItem('vc_recent_rooms') || '[]');
          if (!cancelled) {
            setRooms(recent.slice(0, 5).map(r => ({
              slug: r.slug,
              name: r.name,
              participantCount: 0,
              participants: [],
            })));
          }
        } catch {}
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
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
      <main className="max-w-2xl mx-auto px-6 sm:px-8 py-8 space-y-6">

        {/* Create card */}
        <button
          onClick={() => setShowCreate(true)}
          className="w-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-[20px] p-6 cursor-pointer text-white transition-colors duration-150 shadow-[0_4px_20px_rgba(37,99,235,0.3)] text-left group"
        >
          <div className="text-3xl opacity-80 mb-2 group-hover:opacity-100 transition-opacity">
            <Plus size={32} strokeWidth={2.5} />
          </div>
          <p className="font-bold text-xl">Создать сессию</p>
          <p className="text-white/70 text-sm mt-1">Поделись ссылкой — друзья подключатся сразу</p>
        </button>

        {/* Quick join */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[16px] p-4">
          <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Быстрый вход</p>
          <div className="flex gap-2">
            <input
              value={joinInput}
              onChange={e => setJoinInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="Ссылка или код комнаты..."
              className="flex-1 bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[10px] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[#DBEAFE]/50 transition-all"
            />
            <Button size="sm" onClick={handleJoin} disabled={!joinInput.trim()}>
              Войти <ArrowRight size={14} />
            </Button>
          </div>
        </div>

        {/* Active sessions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[var(--text-primary)] font-semibold text-base">Активные сессии</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              Обновить
            </button>
          </div>
          <ActiveRoomsList />
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-center gap-4 text-xs text-[var(--text-muted)] pt-2">
          <button onClick={() => router.push('/dashboard')} className="hover:text-[var(--accent)] transition-colors">
            Мой прогресс
          </button>
          <span>·</span>
          <button onClick={() => router.push('/settings')} className="hover:text-[var(--accent)] transition-colors">
            Настройки
          </button>
          <span>·</span>
          <span className="opacity-60">I.C-E.F Notes</span>
        </div>
      </main>

      <CreateRoomModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
