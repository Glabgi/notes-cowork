'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { connectSocket, getSocket, disconnectSocket } from '@/lib/socket';
import { useRoomStore } from '@/store/roomStore';
import { useVoiceStore } from '@/store/voiceStore';
import { joinVoice, leaveVoice } from '@/lib/voice';
import { useScheduleStore } from '@/store/scheduleStore';
import { useSettingsStore } from '@/store/settingsStore';
import type { Participant, Room } from '@/types';
import { AVATARS, getAvatarSvg } from '@/lib/avatars';
import { isFaceId, decodeFace } from '@/lib/faceAvatar';
import Avatar from '@/components/ui/Avatar';
import AvatarBuilder from '@/components/avatar/AvatarBuilder';
import RoomHeader from '@/components/room/RoomHeader';
import ParticipantsGrid from '@/components/room/ParticipantsGrid';
import SidePanel from '@/components/room/SidePanel';
import WallClock from '@/components/timer/WallClock';
import ScreenShareTile from '@/components/voice/ScreenShareTile';
import { cn } from '@/lib/utils';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import {
  WifiOff, Zap, Coffee, Ghost, BarChart2, Calendar,
  ChevronRight, Volume2, VolumeX, Wind, TreePine, Waves,
  ArrowRight, ArrowLeft, Settings, Pencil, Sparkles,
} from 'lucide-react';

// Per-status icon animation — the icon itself comes alive when the status is active.
const STATUS_ICON_ANIM: Record<string, { animate: any; transition: any }> = {
  // lightning flicker
  focus: { animate: { opacity: [1, 0.35, 1, 0.7, 1], scale: [1, 1.14, 1] }, transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } },
  // coffee gently steaming / rocking
  break: { animate: { y: [0, -2, 0], rotate: [0, -5, 0] }, transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' } },
  // ghost floating
  away:  { animate: { y: [0, -2.5, 0], opacity: [1, 0.5, 1] }, transition: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } },
};
import { ActivityIcon } from '@/lib/icons';
import { getSocket as gs } from '@/lib/socket';
import { getAmbientEngine } from '@/lib/ambientAudio';

/* ─── Mini Schedule (horizontal scroll with live now-line) ───────────────── */
const HOUR_PX = 90; // 90px per hour in mini schedule
function MiniSchedule() {
  const router = useRouter();
  const { blocks } = useScheduleStore();
  const trackRef = useRef<HTMLDivElement>(null);

  // Tick every 30s for live position
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(i);
  }, []);

  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const currentLabel = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

  // Sort and constrain blocks to 6:00-24:00 view
  const todayBlocks = [...blocks].sort((a, b) => a.startHour - b.startHour);
  const HOURS = Array.from({ length: 19 }, (_, i) => i + 6); // 6..24

  // Auto-scroll to current hour on mount and when tick changes (gently)
  useEffect(() => {
    const el = trackRef.current; if (!el) return;
    const x = (currentHour - 6) * HOUR_PX - 60;
    el.scrollTo({ left: Math.max(0, x), behavior: 'smooth' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const formatHour = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
  };

  return (
    <div className="border border-[var(--border)] rounded-[14px] overflow-hidden bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col">
      <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-[var(--bg-subtle)] to-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[7px] bg-[var(--accent-light)] flex items-center justify-center">
            <Calendar size={12} className="text-[var(--accent)]" />
          </div>
          <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-[0.08em]">Расписание</span>
          <span className="text-[10px] text-[var(--accent)] font-mono font-semibold tabular-nums">{currentLabel}</span>
        </div>
        <button
          onClick={() => router.push('/schedule')}
          className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] font-medium transition-colors inline-flex items-center gap-1"
        >
          <Calendar size={10} /> Изменить
        </button>
      </div>

      <div ref={trackRef} className="relative overflow-x-auto overflow-y-hidden">
        <div className="relative" style={{ width: HOURS.length * HOUR_PX, height: 72 }}>
          {/* Hour grid */}
          {HOURS.map((h, i) => (
            <div
              key={h}
              className="absolute top-0 bottom-0 border-l border-[var(--border)]/60"
              style={{ left: i * HOUR_PX }}
            >
              <span className="absolute top-1 left-1 text-[10px] text-[var(--text-muted)] tabular-nums font-mono">
                {h.toString().padStart(2,'0')}:00
              </span>
            </div>
          ))}

          {/* Blocks */}
          {todayBlocks.map(block => {
            const leftPx = (block.startHour - 6) * HOUR_PX;
            const widthPx = (block.duration / 60) * HOUR_PX;
            const Icon = ActivityIcon[block.type] || ActivityIcon.other;
            const endHour = block.startHour + block.duration / 60;
            const isNow = block.startHour <= currentHour && endHour > currentHour;
            return (
              <div
                key={block.id}
                className={cn(
                  'absolute top-7 bottom-1 rounded-[8px] px-2 py-1 flex items-center gap-1.5 overflow-hidden border',
                  isNow ? 'ring-2 ring-[var(--accent)]/50' : ''
                )}
                style={{
                  left: leftPx + 1,
                  width: Math.max(widthPx - 2, 30),
                  backgroundColor: block.color + '20',
                  borderColor: block.color + '60',
                }}
                title={`${block.title} · ${formatHour(block.startHour)}`}
              >
                <Icon size={11} style={{ color: block.color }} className="flex-shrink-0" />
                <span className="text-[11px] font-medium truncate" style={{ color: block.color }}>
                  {block.title}
                </span>
              </div>
            );
          })}

          {/* Live now line */}
          {currentHour >= 6 && currentHour <= 24 && (
            <div
              className="absolute top-0 bottom-0 z-10 pointer-events-none"
              style={{ left: (currentHour - 6) * HOUR_PX }}
            >
              <div className="w-[2px] h-full bg-[var(--danger)] shadow-[0_0_8px_rgba(242,63,67,0.6)]" />
              <div className="absolute -top-0.5 -left-1 w-2.5 h-2.5 rounded-full bg-[var(--danger)] animate-pulse-dot" />
            </div>
          )}

          {/* Empty state */}
          {todayBlocks.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={() => router.push('/schedule')}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] inline-flex items-center gap-1.5 transition-colors"
              >
                <Calendar size={12} /> Добавить активности на сегодня
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Ambient Sound Control ───────────────────────────────────────────────── */
type AmbientType = 'none' | 'cafe' | 'forest' | 'white-noise' | 'rain';

function AmbientControl() {
  const { ambientSound, ambientVolume, setAmbientSound, setAmbientVolume } = useSettingsStore();
  // Single source of truth — synced with the Music panel in the side bar.
  const active = ambientSound as AmbientType;

  const sounds: { id: AmbientType; label: string; desc: string; Icon: React.ElementType }[] = [
    { id: 'cafe',        label: 'Кафе',      desc: 'Шум кофейни',      Icon: Coffee },
    { id: 'forest',      label: 'Лес',       desc: 'Птицы и листва',   Icon: TreePine },
    { id: 'white-noise', label: 'Белый шум', desc: 'Концентрация',     Icon: Wind },
    { id: 'rain',        label: 'Дождь',     desc: 'Умиротворение',    Icon: Waves },
  ];

  const toggle = (id: AmbientType) => {
    const engine = getAmbientEngine();
    if (active === id) {
      engine.stop();
      setAmbientSound('none');
    } else {
      engine.play(id as any, ambientVolume);
      setAmbientSound(id as any);
    }
  };

  const handleVolume = (v: number) => {
    setAmbientVolume(v);
    getAmbientEngine().setVolume(v);
  };

  return (
    <div className="border border-[var(--border)] rounded-[14px] overflow-hidden bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(15,23,42,0.04)] flex flex-col">
      <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-[var(--bg-subtle)] to-[var(--bg-card)] border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-6 h-6 rounded-[7px] flex items-center justify-center transition-colors',
            active === 'none' ? 'bg-[var(--bg-subtle)]' : 'bg-[var(--accent-light)]'
          )}>
            {active === 'none'
              ? <VolumeX size={12} className="text-[var(--text-muted)]" />
              : <Volume2 size={12} className="text-[var(--accent)]" />
            }
          </div>
          <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-[0.08em]">Звуки</span>
          {active !== 'none' && (
            <span className="inline-flex items-end gap-[2px] h-3">
              {[0,1,2,3].map(i => (
                <motion.span
                  key={i}
                  className="w-[2px] bg-[var(--accent)] rounded-full"
                  animate={{ height: ['25%', '95%', '45%', '85%', '25%'] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
                />
              ))}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <VolumeX size={10} className="text-[var(--text-muted)]" />
          <input
            type="range"
            min={0} max={1} step={0.05}
            value={ambientVolume}
            onChange={e => handleVolume(+e.target.value)}
            disabled={active === 'none'}
            className="w-20 h-1 accent-[var(--accent)] cursor-pointer disabled:opacity-40"
            title={`Громкость: ${Math.round(ambientVolume * 100)}%`}
          />
          <Volume2 size={10} className="text-[var(--text-muted)]" />
          <span className="text-[10px] text-[var(--text-secondary)] tabular-nums font-medium w-7 text-right">
            {Math.round(ambientVolume * 100)}%
          </span>
        </div>
      </div>

      <div className="p-2 grid grid-cols-4 gap-1.5 flex-1">
        {sounds.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => toggle(id)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-[10px] transition-all duration-150 border min-h-[52px]',
              active === id
                ? 'bg-[var(--accent-light)] border-[var(--border-accent)] shadow-[0_1px_3px_rgba(37,99,235,0.15)]'
                : 'border-[var(--border)]/40 hover:bg-[var(--bg-hover)] hover:border-[var(--border)]'
            )}
          >
            <Icon size={14} className={active === id ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'} />
            <span className={cn(
              'text-[10px] font-semibold leading-none',
              active === id ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
            )}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Password Prompt (for private rooms) ─────────────────────────────── */
function PasswordPrompt({ slug, onSubmit }: { slug: string; onSubmit: (pw: string) => void }) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[24px] p-8 max-w-sm w-full shadow-[0_8px_32px_rgba(15,23,42,0.10)] space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 bg-[var(--accent-light)] rounded-[14px] flex items-center justify-center mx-auto mb-3">
            <Settings size={24} className="text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Приватная сессия</h2>
          <p className="text-[var(--text-muted)] text-sm mt-1">Введите пароль для входа</p>
          <p className="text-[10px] text-[var(--text-muted)] font-mono mt-1">#{slug}</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!pw.trim()) { setErr('Введите пароль'); return; }
            onSubmit(pw.trim());
          }}
          className="space-y-3"
        >
          <Input
            label="Пароль"
            type="password"
            value={pw}
            onChange={e => { setPw(e.target.value); setErr(''); }}
            placeholder="••••••••"
            autoFocus
          />
          {err && <p className="text-xs text-[var(--danger)]">{err}</p>}
          <Button type="submit" className="w-full" size="lg">
            Войти <ArrowRight size={14} />
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => router.push('/')}>
            <ArrowLeft size={14} /> На главную
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ─── Join Modal ──────────────────────────────────────────────────────────── */
function JoinModal({ slug, onJoin }: { slug: string; onJoin: (name: string, avatarId: string) => void }) {
  const [name, setName] = useState('');
  const [avatarId, setAvatarId] = useState('');
  const [error, setError] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem('vc_user');
      if (s) { const u = JSON.parse(s); if (u.name) setName(u.name); if (u.avatarId) setAvatarId(u.avatarId); }
    } catch {}
  }, []);

  const hasFace = isFaceId(avatarId);

  const submit = () => {
    if (!name.trim()) { setError('Введите ваше имя'); return; }
    // Gate: must build an avatar before entering the room.
    if (!hasFace) { setError(''); setShowBuilder(true); return; }
    onJoin(name.trim(), avatarId);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[28px] p-8 shadow-[0_8px_32px_rgba(15,23,42,0.10),0_4px_12px_rgba(15,23,42,0.06)]">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-[var(--accent-light)] rounded-[16px] flex items-center justify-center mx-auto mb-4">
              <ChevronRight size={28} className="text-[var(--accent)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Войти в комнату</h2>
            <p className="text-[var(--text-muted)] text-sm mt-1 font-mono">#{slug}</p>
          </div>

          <div className="space-y-5">
            <Input
              label="Ваше имя"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              placeholder="Введите имя"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && submit()}
            />

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Аватар</label>
              {hasFace ? (
                <div className="flex items-center gap-3">
                  <Avatar id={avatarId} size={56} className="ring-2 ring-[var(--border)]" />
                  <button
                    type="button"
                    onClick={() => setShowBuilder(true)}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-[12px] border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                  >
                    <Sparkles size={14} /> Изменить аватар
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowBuilder(true)}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-[14px] border-2 border-dashed border-[var(--border-strong)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
                >
                  <Sparkles size={16} /> Собрать свой аватар
                </button>
              )}
            </div>

            {error && (
              <p className="text-sm text-[var(--danger)] bg-[rgba(242,63,67,0.1)] border border-[rgba(242,63,67,0.35)] rounded-[10px] px-3 py-2">
                {error}
              </p>
            )}

            <Button className="w-full" size="lg" onClick={submit}>
              Войти в комнату <ArrowRight size={16} />
            </Button>
          </div>
        </div>
      </div>

      {showBuilder && (
        <AvatarBuilder
          initial={hasFace ? decodeFace(avatarId) : undefined}
          onDone={(id) => { setAvatarId(id); setShowBuilder(false); }}
          onClose={() => setShowBuilder(false)}
        />
      )}
    </div>
  );
}

/* ─── Status Selector ─────────────────────────────────────────────────────── */
function StatusSelector({ slug }: { slug: string }) {
  const { currentUser, updateMyStatus } = useRoomStore();
  const [customText, setCustomText] = useState(currentUser?.currentTask || '');

  const statuses: { status: 'focus' | 'break' | 'away'; label: string; Icon: React.ElementType; activeColor: string }[] = [
    { status: 'focus', label: 'В фокусе', Icon: Zap,    activeColor: 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--border-accent)]' },
    { status: 'break', label: 'Перерыв',  Icon: Coffee, activeColor: 'bg-[rgba(74,138,120,0.12)] text-[#4a8a78] border-[rgba(74,138,120,0.35)]' },
    { status: 'away',  label: 'Отошёл',   Icon: Ghost,  activeColor: 'bg-[var(--bg-hover)] text-[var(--text-secondary)] border-[var(--border)]' },
  ];

  const emitStatus = (status: 'focus' | 'break' | 'away', task?: string) => {
    updateMyStatus(status, task);
    gs().emit('room:update-status', { roomId: slug, status, currentTask: task ?? currentUser?.currentTask });
  };

  const [justSent, setJustSent] = useState(false);
  const submitCustom = () => {
    const task = customText.trim();
    if (!task) return;
    emitStatus(currentUser?.status as any ?? 'focus', task);
    setCustomText('');         // clear input (status broadcast — not persisted on panel)
    setJustSent(true);
    setTimeout(() => setJustSent(false), 1500);
  };

  const STATUS_DOTS: Record<string, string> = {
    focus: 'var(--accent)', break: '#4a8a78', away: 'var(--status-away)',
  };

  return (
    <div className="border border-[var(--border)] rounded-[14px] overflow-hidden bg-[var(--bg-card)] shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-2.5 px-3.5 py-3 bg-gradient-to-r from-[var(--bg-subtle)] to-[var(--bg-card)]">
        <div className="w-7 h-7 rounded-[8px] bg-[var(--accent-light)] flex items-center justify-center">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: STATUS_DOTS[currentUser?.status || 'focus'] }}
          />
        </div>
        <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-[0.08em]">Мой статус</span>
      </div>
      <div className="p-2 space-y-1">
        {statuses.map(({ status, label, Icon, activeColor }) => (
          <button
            key={status}
            onClick={() => emitStatus(status)}
            className={cn(
              'w-full text-left text-sm px-2.5 py-2 rounded-[10px] border transition-all duration-150 flex items-center gap-2.5',
              currentUser?.status === status
                ? activeColor
                : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
            )}
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: STATUS_DOTS[status] }}
            />
            {currentUser?.status === status ? (
              <span className="relative flex-shrink-0 inline-flex">
                {/* break → coffee steam rising; focus/away animate the icon itself */}
                {status === 'break' && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 flex gap-[2.5px] pointer-events-none">
                    {[0, 1, 2].map(i => (
                      <motion.span
                        key={i}
                        className="w-[1.5px] h-1.5 rounded-full bg-current"
                        animate={{ y: [0, -4, 0], opacity: [0, 0.6, 0], scaleY: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.22, ease: 'easeOut' }}
                      />
                    ))}
                  </span>
                )}
                <motion.span
                  className="inline-flex"
                  animate={STATUS_ICON_ANIM[status].animate}
                  transition={STATUS_ICON_ANIM[status].transition}
                >
                  <Icon size={14} />
                </motion.span>
              </span>
            ) : (
              <Icon size={14} className="flex-shrink-0 opacity-80" />
            )}
            <span className="font-medium">{label}</span>
            {currentUser?.status === status && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current opacity-60" />
            )}
          </button>
        ))}
      </div>

      {/* Custom status text — ephemeral, broadcasts to others without saving on panel */}
      <div className="px-2.5 pb-2.5 pt-2.5 border-t border-[var(--border)] space-y-2">
        <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--text-muted)] px-0.5">Чем занимаюсь</div>

        {/* Current active custom task (read-only badge) */}
        {currentUser?.currentTask && (
          <div className="flex items-center gap-1.5 px-2 py-1 text-[10px] text-[var(--accent)] bg-[var(--accent-light)] border border-[var(--border-accent)] rounded-[8px]">
            <span className="w-1 h-1 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="truncate">{currentUser.currentTask}</span>
            <button
              onClick={() => emitStatus(currentUser?.status as any ?? 'focus', '')}
              className="ml-auto text-[var(--text-muted)] hover:text-[#d06a5e]"
              title="Очистить"
            >×</button>
          </div>
        )}

        {/* Lined-paper input box (pencil + input + send), tag chips below */}
        <div className="lined-paper rounded-[12px] border border-[var(--border)] overflow-hidden transition-all focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/12">
          <div className="flex items-center gap-2 px-2.5 py-2">
            <Pencil size={13} className="text-[var(--accent)] flex-shrink-0" />
            <input
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submitCustom(); } }}
              placeholder={justSent ? 'Отправлено ✓' : 'пишу курсовую...'}
              maxLength={60}
              className={cn(
                'flex-1 min-w-0 bg-transparent border-0 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none',
                justSent && 'placeholder:text-[var(--accent)]'
              )}
            />
            <button
              type="button"
              onClick={submitCustom}
              disabled={!customText.trim()}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] rounded-[6px] transition-colors disabled:opacity-30 flex-shrink-0"
              aria-label="Отправить"
            >
              <ChevronRight size={13} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1 px-2.5 pb-2">
            {['курсовая', 'чтение', 'задачи', 'проект'].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setCustomText(tag)}
                className="text-[9px] px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--border-accent)] hover:bg-[var(--accent-light)] transition-colors tracking-[0.03em]"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Bottom Dock: Schedule + Ambient ─────────────────────────────────────── */
function BottomDock() {
  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-card)] px-4 py-3 hidden lg:block">
      <div className="grid grid-cols-2 gap-3 max-w-[920px] mx-auto">
        <MiniSchedule />
        <AmbientControl />
      </div>
    </div>
  );
}

/* ─── Main Room Page ──────────────────────────────────────────────────────── */
export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const store = useRoomStore();
  const initialized = useRef(false);

  const [showJoin, setShowJoin] = useState(false);
  const [connError, setConnError] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    if (initialized.current) return;
    try {
      const s = localStorage.getItem('vc_user');
      if (s) {
        const u = JSON.parse(s);
        if (u.name) { initSocket(u.name, u.avatarId || 'fox', u.id); return; }
      }
    } catch {}
    setShowJoin(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      try {
        // Выходим из голоса только когда покидаем комнату целиком,
        // а не при переключении вкладок в боковой панели.
        if (useVoiceStore.getState().inVoice) leaveVoice();
      } catch {}
      try {
        const s = getSocket();
        s.emit('room:leave', slug);
        disconnectSocket();
      } catch {}
      store.reset();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-join voice on entry — connect muted (mic off) + camera off. The manual
  // «Голос» button is gone; voice is automatic. Fully non-blocking (voice is
  // optional and must never prevent the room from working).
  const voiceTried = useRef(false);
  useEffect(() => {
    if (voiceTried.current) return;
    const cu = store.currentUser;
    if (store.isConnected && cu && store.room) {
      voiceTried.current = true;
      joinVoice(slug, { id: cu.id, name: cu.name, avatarId: cu.avatarId }, { startMuted: true })
        .catch(() => { /* voice optional — never block the room */ });
    }
  }, [store.isConnected, store.currentUser, store.room, slug]);

  const initSocket = useCallback((name: string, avatarId: string, userId?: string) => {
    if (initialized.current) return;
    initialized.current = true;

    store.setLoading(true);
    store.setError(null);
    setShowJoin(false);

    const id = userId || uuidv4();
    const participant: Participant = {
      id, name, avatarId,
      status: 'focus',
      pomodoroCount: 0,
      focusMinutes: 0,
      joinedAt: Date.now(),
    };

    localStorage.setItem('vc_user', JSON.stringify({ id, name, avatarId }));
    store.setCurrentUser(participant);

    const socket = getSocket();

    // Build the room config from localStorage. Done as a fresh function so we
    // can call it on every (re)connect — and we only clear vc_create_room AFTER
    // the server acknowledges the join, so a dropped first connect never loses it.
    const buildRoomConfig = (): any => {
      try {
        const cd = localStorage.getItem('vc_create_room');
        if (cd) {
          const rd = JSON.parse(cd);
          if (rd.slug === slug) {
            return {
              name: rd.name,
              isPrivate: !!rd.isPrivate,
              isPublic: !!rd.isPublic,
              password: rd.password || null,
              maxParticipants: rd.maxParticipants || 50,
              ownerId: participant.id,
            };
          }
        }
        // Fallback: durable owned-rooms copy (survives vc_create_room removal +
        // server restarts). Lets the owner re-send full config on every reconnect.
        const owned = JSON.parse(localStorage.getItem('vc_owned_rooms') || '{}');
        const od = owned[slug];
        if (od) {
          return {
            name: od.name,
            isPrivate: !!od.isPrivate,
            isPublic: !!od.isPublic,
            password: od.password || null,
            maxParticipants: od.maxParticipants || 50,
            ownerId: participant.id,
          };
        }
        return null;
      } catch { return null; }
    };

    let joinPassword: string | undefined = undefined;
    try {
      const pw = sessionStorage.getItem('vc_room_pw_' + slug);
      if (pw) joinPassword = pw;
    } catch {}

    const onConnect = () => {
      store.setConnected(true);
      store.setLoading(false);
      setConnError('');
      const roomConfig = buildRoomConfig();
      // NEVER mutate `participant` directly — Immer freezes store objects, so
      // `participant.isOwner = true` throws "object is not extensible" and aborts
      // the whole join. Always build a fresh object instead.
      const joinParticipant = roomConfig ? { ...participant, isOwner: true } : { ...participant };
      if (roomConfig) {
        store.setCurrentUser(joinParticipant);
        // Persist a durable copy of the config keyed by slug so we can re-send it
        // on every reconnect (server free-tier sleeps/restarts wipe room state).
        try {
          const owned = JSON.parse(localStorage.getItem('vc_owned_rooms') || '{}');
          owned[slug] = {
            name: roomConfig.name,
            isPrivate: roomConfig.isPrivate,
            isPublic: roomConfig.isPublic,
            password: roomConfig.password,
            maxParticipants: roomConfig.maxParticipants,
            ownerId: participant.id,
          };
          localStorage.setItem('vc_owned_rooms', JSON.stringify(owned));
        } catch {}
      }
      (socket as any).emit('room:join', { slug, participant: joinParticipant, roomConfig, password: joinPassword }, (resp: any) => {
        if (resp && resp.ok === false) {
          if (resp.error === 'invalid_password') { setNeedsPassword(true); return; }
          // Room was closed (everyone left & it was reaped) or we were kicked —
          // stop auto-resurrecting it and bounce home.
          if (resp.error === 'room_closed' || resp.error === 'kicked') {
            try {
              localStorage.removeItem('vc_create_room');
              const owned = JSON.parse(localStorage.getItem('vc_owned_rooms') || '{}');
              if (owned && owned[slug]) { delete owned[slug]; localStorage.setItem('vc_owned_rooms', JSON.stringify(owned)); }
            } catch {}
            setConnError(resp.error === 'kicked'
              ? 'Вас удалили из этой сессии.'
              : 'Эта сессия больше не существует.');
            store.setLoading(false);
            try { (socket as any).emit('room:leave', slug); } catch {}
            setTimeout(() => router.push('/'), 1500);
            return;
          }
          return;
        }
        try { if (roomConfig) localStorage.removeItem('vc_create_room'); } catch {}
      });
    };

    const onDisconnect = () => store.setConnected(false);

    const onConnectError = (err: Error) => {
      setConnError(err.message);
      store.setLoading(false);
      store.setConnected(false);
    };

    const onRoomState = (roomData: any) => {
      // Fallback: if server lost state and returns just the slug as name,
      // try to recover the human-readable name from localStorage recents.
      let nameFromCache: string | undefined;
      try {
        const recent = JSON.parse(localStorage.getItem('vc_recent_rooms') || '[]');
        const entry = recent.find((r: any) => r.slug === slug);
        if (entry?.name && entry.name !== slug) nameFromCache = entry.name;
      } catch {}
      const finalName =
        (roomData.name && roomData.name !== slug) ? roomData.name
        : (nameFromCache || roomData.name || slug);

      // Remember it for future joins
      try {
        const recent = JSON.parse(localStorage.getItem('vc_recent_rooms') || '[]');
        const filtered = recent.filter((r: any) => r.slug !== slug);
        filtered.unshift({ slug, name: finalName, visitedAt: Date.now() });
        localStorage.setItem('vc_recent_rooms', JSON.stringify(filtered.slice(0, 20)));
      } catch {}

      const room: Room = {
        id: roomData.id || slug,
        slug,
        name: finalName,
        ownerId: roomData.ownerId || participant.id,
        isPrivate: !!roomData.isPrivate,
        maxParticipants: roomData.maxParticipants || 50,
        participants: roomData.participants || [],
        createdAt: Date.now(),
        lastActivity: Date.now(),
        timerMode: roomData.timerMode || 'group',
      };
      store.setRoom(room);
      store.setLoading(false);

      // Keep our own owner flag in sync — e.g. after the owner transfers the
      // crown, the new owner's currentUser.isOwner must flip so the UI updates.
      try {
        const cu = useRoomStore.getState().currentUser;
        if (cu) {
          const shouldOwn = room.ownerId === cu.id;
          if (!!cu.isOwner !== shouldOwn) {
            useRoomStore.getState().setCurrentUser({ ...cu, isOwner: shouldOwn });
          }
        }
      } catch {}
    };

    // Remove any prior listeners before adding (defensive against StrictMode double-mount)
    socket.off('connect'); socket.off('disconnect'); socket.off('connect_error');
    socket.off('room:state'); socket.off('room:participant-joined');
    socket.off('room:participant-left'); socket.off('room:participant-updated');
    socket.off('chat:message'); socket.off('chat:reaction');
    socket.off('room:kicked');

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);
    socket.on('room:state', onRoomState);
    socket.on('room:participant-joined', store.addParticipant);
    socket.on('room:participant-left', store.removeParticipant);
    socket.on('room:participant-updated', store.updateParticipant);
    socket.on('chat:message', store.addMessage);
    socket.on('chat:deleted' as any, ({ messageId }: any) => store.removeMessage(messageId));
    socket.on('chat:reaction', ({ messageId, reaction }) => store.updateMessageReaction(messageId, reaction));
    socket.on('room:kicked', () => {
      try { if (useVoiceStore.getState().inVoice) leaveVoice(); } catch {}
      try { getSocket().emit('room:leave', slug); disconnectSocket(); } catch {}
      router.push('/');
    });

    // Connect AFTER all handlers are registered, so the initial 'connect'
    // event is never missed (which previously dropped the room:join config).
    if (socket.connected) {
      onConnect();
    } else {
      connectSocket();
    }
  }, [slug, store]);

  const handleJoin = (name: string, avatarId: string) => {
    let id: string;
    try { id = JSON.parse(localStorage.getItem('vc_user') || '{}').id || uuidv4(); } catch { id = uuidv4(); }
    initSocket(name, avatarId, id);
  };

  if (needsPassword) return <PasswordPrompt slug={slug} onSubmit={(pw) => {
    sessionStorage.setItem('vc_room_pw_' + slug, pw);
    setNeedsPassword(false);
    initialized.current = false;
    window.location.reload();
  }} />;

  if (showJoin) return <JoinModal slug={slug} onJoin={handleJoin} />;

  if (store.isLoading) return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 border-[3px] border-[var(--border)] rounded-full" />
          <div className="absolute inset-0 border-[3px] border-t-[var(--accent)] rounded-full animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-[var(--text-primary)] font-medium text-sm">Подключение к комнате...</p>
          <p className="text-[var(--text-muted)] text-xs mt-1 font-mono">#{slug}</p>
        </div>
      </div>
    </div>
  );

  if (connError && !store.isConnected) return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[24px] p-8 max-w-sm w-full shadow-lg text-center space-y-4">
        <div className="w-14 h-14 bg-[rgba(242,63,67,0.15)] rounded-full flex items-center justify-center mx-auto">
            <WifiOff size={24} className="text-[var(--danger)]" />
          </div>
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Нет соединения</h2>
          <p className="text-[var(--text-muted)] text-sm mt-1">Не удалось подключиться к серверу</p>
        </div>
        <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[10px] px-4 py-2.5 font-mono break-all">{connError}</p>
        <p className="text-xs text-[var(--text-muted)]">Убедитесь, что Socket.io сервер запущен на порту 3001</p>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => { initialized.current = false; window.location.reload(); }}>
            Переподключиться
          </Button>
          <Button variant="ghost" className="flex-1" onClick={() => router.push('/')}>
            <ArrowLeft size={14} /> Главная
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[var(--bg-page)]">
      <RoomHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Timer + Status only */}
        <aside className="w-[300px] flex-shrink-0 bg-[var(--bg-card)] border-r border-[var(--border)] p-3 overflow-y-auto hidden lg:flex flex-col gap-2.5">
          <WallClock slug={slug} />
          <StatusSelector slug={slug} />
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-auto flex items-center gap-2 px-3 py-2 rounded-[10px] text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors duration-150"
          >
            <BarChart2 size={13} />
            Мой прогресс
          </button>
        </aside>

        {/* Center column: screen share + participants + bottom dock */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-y-auto">
            <ScreenShareTile />
            <ParticipantsGrid />
          </div>
          {/* Bottom dock: schedule + ambient */}
          <BottomDock />
        </div>

        {/* Right panel — музыка / люди / задачи */}
        <div className="h-full overflow-hidden lg:pr-3 lg:py-3">
          <SidePanel />
        </div>
      </div>

      {/* Reconnect banner */}
      <AnimatePresence>
        {!store.isConnected && !store.isLoading && !connError && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[var(--bg-elevated)] border border-[rgba(240,178,50,0.35)] rounded-[12px] px-4 py-2.5 text-sm text-[var(--status-break)] shadow-lg z-50"
          >
            <WifiOff size={14} />
            <span>Переподключение...</span>
            <div className="w-3.5 h-3.5 border-2 border-[var(--status-break)] border-t-transparent rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
