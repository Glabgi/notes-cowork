'use client';

import { motion } from 'framer-motion';
import {
  Coffee, TreePine, Wind, Waves, Volume2, VolumeX, Disc3, Play, Pause,
} from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { getAmbientEngine } from '@/lib/ambientAudio';
import { cn } from '@/lib/utils';

type SoundId = 'cafe' | 'forest' | 'white-noise' | 'rain';

const TRACKS: { id: SoundId; title: string; desc: string; Icon: React.ElementType }[] = [
  { id: 'cafe',        title: 'Уютная кофейня',   desc: 'Тёплый гул кафе',   Icon: Coffee },
  { id: 'forest',      title: 'Лесное утро',      desc: 'Птицы и листва',    Icon: TreePine },
  { id: 'rain',        title: 'Тихий дождь',      desc: 'Капли по стеклу',   Icon: Waves },
  { id: 'white-noise', title: 'Белый шум',        desc: 'Глубокий фокус',    Icon: Wind },
];

export default function MusicPanel() {
  const { ambientSound, ambientVolume, setAmbientSound, setAmbientVolume } = useSettingsStore();
  const active = ambientSound as string;
  const playing = active !== 'none';
  const current = TRACKS.find(t => t.id === active);

  const play = (id: SoundId) => {
    const engine = getAmbientEngine();
    if (active === id) {
      engine.stop();
      setAmbientSound('none');
    } else {
      engine.play(id as any, ambientVolume);
      setAmbientSound(id as any);
    }
  };

  const stop = () => {
    getAmbientEngine().stop();
    setAmbientSound('none');
  };

  const handleVolume = (v: number) => {
    setAmbientVolume(v);
    getAmbientEngine().setVolume(v);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)] flex-shrink-0">
        <h3 className="font-semibold text-[var(--text-primary)] text-sm">Музыка для фокуса</h3>
        <p className="text-xs text-[var(--text-muted)]">
          {playing ? 'Сейчас играет' : 'Выберите атмосферу'}
        </p>
      </div>

      {/* Now playing — vinyl disc */}
      <div className="px-4 py-5 flex flex-col items-center gap-3 border-b border-[var(--border)]">
        <div className="relative">
          <motion.div
            className="w-28 h-28 rounded-full flex items-center justify-center shadow-md"
            style={{ background: 'radial-gradient(circle at 50% 50%, #3a322a 0 30%, #2a2018 31% 100%)' }}
            animate={playing ? { rotate: 360 } : { rotate: 0 }}
            transition={playing
              ? { repeat: Infinity, ease: 'linear', duration: 8 }
              : { duration: 0.4 }}
          >
            {/* grooves */}
            <div className="absolute inset-2 rounded-full border border-[rgba(255,255,255,0.05)]" />
            <div className="absolute inset-4 rounded-full border border-[rgba(255,255,255,0.05)]" />
            <div className="absolute inset-6 rounded-full border border-[rgba(255,255,255,0.05)]" />
            {/* label */}
            <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center">
              {current
                ? (() => { const Icon = current.Icon; return <Icon size={18} className="text-white" />; })()
                : <Disc3 size={18} className="text-white/80" />}
            </div>
            <div className="absolute w-2 h-2 rounded-full bg-[var(--bg-card)]" />
          </motion.div>

          {/* play / pause */}
          <button
            onClick={() => playing ? stop() : play((current?.id || 'cafe') as SoundId)}
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center shadow-md transition-colors active:scale-95"
            title={playing ? 'Пауза' : 'Играть'}
          >
            {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-[1px]" />}
          </button>
        </div>

        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {current?.title || 'Ничего не играет'}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {current?.desc || 'Выберите трек ниже'}
          </p>
        </div>

        {/* equalizer */}
        {playing && (
          <span className="inline-flex items-end gap-[3px] h-4">
            {[0, 1, 2, 3, 4].map(i => (
              <motion.span
                key={i}
                className="w-[3px] bg-[var(--accent)] rounded-full"
                animate={{ height: ['25%', '95%', '40%', '80%', '25%'] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.1, ease: 'easeInOut' }}
              />
            ))}
          </span>
        )}

        {/* volume */}
        <div className="flex items-center gap-2 w-full max-w-[200px] mt-1">
          <VolumeX size={13} className="text-[var(--text-muted)] flex-shrink-0" />
          <input
            type="range"
            min={0} max={1} step={0.05}
            value={ambientVolume}
            onChange={e => handleVolume(+e.target.value)}
            className="flex-1 h-1 accent-[var(--accent)] cursor-pointer"
            title={`Громкость: ${Math.round(ambientVolume * 100)}%`}
          />
          <Volume2 size={13} className="text-[var(--text-muted)] flex-shrink-0" />
        </div>
      </div>

      {/* Playlist */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {TRACKS.map(({ id, title, desc, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => play(id)}
              className={cn(
                'w-full flex items-center gap-3 px-2.5 py-2 rounded-[10px] border transition-all text-left',
                isActive
                  ? 'bg-[var(--accent-light)] border-[var(--border-accent)]'
                  : 'border-transparent hover:bg-[var(--bg-hover)]'
              )}
            >
              <span className={cn(
                'w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0',
                isActive ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
              )}>
                <Icon size={16} />
              </span>
              <span className="flex-1 min-w-0">
                <span className={cn(
                  'block text-sm font-medium truncate',
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'
                )}>{title}</span>
                <span className="block text-[11px] text-[var(--text-muted)] truncate">{desc}</span>
              </span>
              {isActive
                ? <Pause size={14} className="text-[var(--accent)] flex-shrink-0" />
                : <Play size={14} className="text-[var(--text-muted)] flex-shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
