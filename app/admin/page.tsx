'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Users, DoorOpen, Zap, Globe, Lock, Activity, Clock, RefreshCw, LogOut, ShieldCheck, AlertTriangle, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoomRow { slug: string; name: string; participants: number; isPrivate: boolean; focus: number }
interface Stats {
  online: number; rooms: number; publicRooms: number; privateRooms: number;
  focusing: number; peakOnline: number; sockets: number; uptimeSec: number; ts: number;
  roomsList: RoomRow[];
}

function fmtUptime(sec: number): string {
  if (!sec || sec < 0) return '—';
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}д ${h}ч`;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

function StatCard({ icon: Icon, label, value, accent }: { icon: React.ElementType; label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[16px] p-4 shadow-[var(--shadow-sm)] flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0', accent ? 'bg-[var(--accent-light)]' : 'bg-[var(--bg-subtle)]')}>
        <Icon size={18} className={accent ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'} />
      </div>
      <div className="min-w-0">
        <p className="text-[26px] font-bold tabular-nums leading-none text-[var(--text-primary)]">{value}</p>
        <p className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)] mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(1, ...data);
  const W = 240, H = 40;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 4) - 2}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-10" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminPage() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<Stats | null>(null);
  const [err, setErr] = useState('');
  const [updatedAt, setUpdatedAt] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try { const k = sessionStorage.getItem('vc_admin_key'); if (k) { setKey(k); setAuthed(true); } } catch {}
    // force a neutral theme class so the admin looks consistent regardless of user pref
  }, []);

  const fetchStats = useCallback(async (k: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/stats?key=${encodeURIComponent(k)}`, { cache: 'no-store' });
      if (res.status === 401) { setErr('Неверный ключ'); setAuthed(false); try { sessionStorage.removeItem('vc_admin_key'); } catch {}; return; }
      if (res.status === 503) { setErr('ADMIN_KEY не задан на сервере (Vercel → Settings → Environment Variables)'); return; }
      if (!res.ok) { setErr('Сервер статистики недоступен'); return; }
      const d: Stats = await res.json();
      setData(d); setErr(''); setUpdatedAt(Date.now());
      setHistory(h => [...h.slice(-39), d.online]);
    } catch {
      setErr('Сеть недоступна');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed || !key) return;
    fetchStats(key);
    const i = setInterval(() => fetchStats(key), 5000);
    return () => clearInterval(i);
  }, [authed, key, fetchStats]);

  const submit = () => { if (!key.trim()) return; try { sessionStorage.setItem('vc_admin_key', key.trim()); } catch {}; setAuthed(true); setErr(''); };
  const logout = () => { try { sessionStorage.removeItem('vc_admin_key'); } catch {}; setAuthed(false); setData(null); setKey(''); setHistory([]); };

  /* ── Login gate ── */
  if (!authed) {
    return (
      <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-[24px] p-8 shadow-[var(--shadow-lg)] space-y-5">
          <div className="text-center">
            <div className="w-14 h-14 bg-[var(--accent-light)] rounded-[16px] flex items-center justify-center mx-auto mb-3">
              <ShieldCheck size={26} className="text-[var(--accent)]" />
            </div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Админ-панель</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">ICEF Notes Cowork · введите ключ доступа</p>
          </div>
          <input
            type="password"
            value={key}
            onChange={e => { setKey(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="ADMIN_KEY"
            autoFocus
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-[12px] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
          />
          {err && (
            <p className="text-xs text-[var(--danger)] flex items-center gap-1.5">
              <AlertTriangle size={13} className="flex-shrink-0" /> {err}
            </p>
          )}
          <button onClick={submit} className="w-full py-3 rounded-[12px] bg-[var(--accent)] text-white font-semibold hover:bg-[var(--accent-hover)] transition-colors">
            Войти
          </button>
        </div>
      </div>
    );
  }

  /* ── Dashboard ── */
  const online = data?.online ?? 0;
  const ago = updatedAt ? Math.max(0, Math.round((Date.now() - updatedAt) / 1000)) : null;

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[10px] bg-[var(--accent-light)] flex items-center justify-center">
              <ShieldCheck size={18} className="text-[var(--accent)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)] leading-tight">Админ-панель</h1>
              <p className="text-xs text-[var(--text-muted)]">ICEF Notes Cowork · живая статистика</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <span className="relative flex w-2 h-2">
                <span className="absolute inset-0 rounded-full bg-[var(--status-online)] animate-pulse-dot" />
                <span className="relative w-2 h-2 rounded-full bg-[var(--status-online)]" />
              </span>
              {err ? 'ошибка' : ago === null ? 'загрузка…' : `обновлено ${ago}с назад`}
            </span>
            <button onClick={() => fetchStats(key)} title="Обновить" className="w-9 h-9 rounded-[10px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] flex items-center justify-center transition-colors">
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={logout} title="Выйти" className="w-9 h-9 rounded-[10px] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--danger)] hover:border-[var(--border-strong)] flex items-center justify-center transition-colors">
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {err && (
          <div className="bg-[var(--bg-card)] border border-[rgba(240,103,111,0.4)] rounded-[14px] px-4 py-3 text-sm text-[var(--danger)] flex items-center gap-2">
            <AlertTriangle size={16} className="flex-shrink-0" /> {err}
          </div>
        )}

        {/* hero: online now */}
        <div className="rounded-[20px] p-6 bg-gradient-to-br from-[var(--accent)] to-[var(--accent-active)] text-white shadow-[var(--shadow-md)] relative overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/70 flex items-center gap-1.5">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inset-0 rounded-full bg-white animate-pulse-dot" />
                  <span className="relative w-2 h-2 rounded-full bg-white" />
                </span>
                Онлайн сейчас
              </p>
              <p className="text-[64px] font-black tabular-nums leading-none mt-2">{online}</p>
              <p className="text-sm text-white/80 mt-1">
                из них <b>{data?.focusing ?? 0}</b> в фокусе · пик за сессию <b>{data?.peakOnline ?? 0}</b>
              </p>
            </div>
            <Users size={40} className="text-white/40 flex-shrink-0" />
          </div>
          {history.length > 1 && (
            <div className="mt-4 opacity-70">
              <Sparkline data={history} />
            </div>
          )}
        </div>

        {/* stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={DoorOpen} label="Комнат" value={data?.rooms ?? 0} accent />
          <StatCard icon={Zap} label="В фокусе" value={data?.focusing ?? 0} />
          <StatCard icon={Globe} label="Публичных" value={data?.publicRooms ?? 0} />
          <StatCard icon={Lock} label="Приватных" value={data?.privateRooms ?? 0} />
          <StatCard icon={TrendingUp} label="Пик онлайн" value={data?.peakOnline ?? 0} />
          <StatCard icon={Clock} label="Аптайм" value={fmtUptime(data?.uptimeSec ?? 0)} />
        </div>

        {/* rooms table */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[16px] overflow-hidden shadow-[var(--shadow-sm)]">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
            <Activity size={15} className="text-[var(--accent)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Запущенные комнаты</span>
            <span className="ml-auto text-xs text-[var(--text-muted)]">{data?.rooms ?? 0} активных · {data?.sockets ?? 0} сокетов</span>
          </div>
          {data && data.roomsList.length > 0 ? (
            <div className="divide-y divide-[var(--border)]">
              {data.roomsList.map(r => (
                <div key={r.slug} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', r.participants > 0 ? 'bg-[var(--status-online)]' : 'bg-[var(--text-muted)]')} />
                  <span className="font-medium text-[var(--text-primary)] truncate">{r.name}</span>
                  {r.isPrivate && <Lock size={11} className="text-[var(--text-muted)] flex-shrink-0" />}
                  <span className="font-mono text-[11px] text-[var(--text-muted)] truncate hidden sm:inline">#{r.slug}</span>
                  <span className="ml-auto flex items-center gap-3 flex-shrink-0 text-[var(--text-secondary)]">
                    <span className="inline-flex items-center gap-1" title="Участников"><Users size={12} /> {r.participants}</span>
                    <span className="inline-flex items-center gap-1 text-[var(--accent)]" title="В фокусе"><Zap size={12} /> {r.focus}</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">Нет запущенных комнат</div>
          )}
        </div>
      </div>
    </div>
  );
}
