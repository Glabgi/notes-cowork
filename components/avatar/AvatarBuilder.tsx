'use client';

/**
 * AvatarBuilder — a Sims/Snapchat-style face creator. Renders its own overlay.
 * The live preview reuses the shared <Avatar> (which safely renders the SVG),
 * so this file never touches dangerouslySetInnerHTML directly.
 * onDone returns the encoded avatarId string + the raw FaceConfig.
 */

import { useState } from 'react';
import { Shuffle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/ui/Avatar';
import {
  type FaceConfig, type Gender, DEFAULT_FACE, encodeFace, randomFace,
  SKIN, HAIR_COLORS, EYE_COLORS, CLOTHES_COLORS, BG_COLORS,
  HAIR_STYLES, BROW_STYLES, EYE_STYLES, MOUTH_STYLES, GLASSES_STYLES, CLOTHES_STYLES,
} from '@/lib/faceAvatar';

const LABELS: Record<string, Record<string, string>> = {
  hair: { none: 'Без', short: 'Короткие', buzz: 'Ёжик', bun: 'Пучок', long: 'Длинные', curly: 'Кудри', mohawk: 'Ирокез' },
  brows: { default: 'Обычные', thick: 'Густые', thin: 'Тонкие', angry: 'Сердитые' },
  eyes: { round: 'Круглые', almond: 'Миндаль', wide: 'Большие', sleepy: 'Сонные' },
  mouth: { smile: 'Улыбка', neutral: 'Ровно', grin: 'Зубы', small: 'Маленький' },
  glasses: { none: 'Без', round: 'Круглые', square: 'Квадрат', sun: 'Солнечные' },
  clothes: { tshirt: 'Футболка', hoodie: 'Худи', sweater: 'Свитер', collar: 'Рубашка', dress: 'Платье' },
  gender: { fem: 'Женский', masc: 'Мужской', neutral: 'Не важно' },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="w-[88px] flex-shrink-0 pt-1.5 text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ColorRow({ label, value, colors, onPick }: { label: string; value: string; colors: string[]; onPick: (c: string) => void }) {
  return (
    <Row label={label}>
      {colors.map(col => (
        <button
          key={col}
          type="button"
          onClick={() => onPick(col)}
          title={col}
          className={cn(
            'w-7 h-7 rounded-full border-2 transition-transform hover:scale-110',
            value === col ? 'border-[var(--accent)] scale-110 ring-2 ring-[var(--accent)]/20' : 'border-[var(--border)]'
          )}
          style={{ background: col }}
        />
      ))}
    </Row>
  );
}

function ChipRow({ label, value, options, kind, onPick }: { label: string; value: string; options: string[]; kind: string; onPick: (v: string) => void }) {
  const labels = LABELS[kind] || {};
  return (
    <Row label={label}>
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onPick(o)}
          className={cn(
            'px-2.5 py-1 rounded-full text-[11px] border transition-colors',
            value === o
              ? 'bg-[var(--accent-light)] border-[var(--border-accent)] text-[var(--accent)] font-medium'
              : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]'
          )}
        >
          {labels[o] || o}
        </button>
      ))}
    </Row>
  );
}

export default function AvatarBuilder({ initial, onDone, onClose }: {
  initial?: FaceConfig;
  onDone: (avatarId: string, cfg: FaceConfig) => void;
  onClose?: () => void;
}) {
  const [cfg, setCfg] = useState<FaceConfig>(initial || DEFAULT_FACE);
  const set = (patch: Partial<FaceConfig>) => setCfg(c => ({ ...c, ...patch }));

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[24px] w-full max-w-md max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-bold text-[var(--text-primary)]">Собери свой аватар</h3>
          {onClose && (
            <button onClick={onClose} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
              <X size={18} />
            </button>
          )}
        </div>

        {/* preview */}
        <div className="flex items-center justify-center gap-5 py-4 bg-[var(--bg-subtle)] border-b border-[var(--border)]">
          <Avatar id={encodeFace(cfg)} size={112} className="ring-2 ring-[var(--border)] shadow-md" />
          <button
            onClick={() => setCfg(randomFace())}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            <Shuffle size={14} /> Случайно
          </button>
        </div>

        {/* controls */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2.5">
          <ChipRow label="Пол" kind="gender" value={cfg.gender} options={['fem', 'masc', 'neutral']} onPick={v => set({ gender: v as Gender })} />
          <ColorRow label="Кожа" value={cfg.skin} colors={SKIN} onPick={c => set({ skin: c })} />
          <ChipRow label="Причёска" kind="hair" value={cfg.hair} options={HAIR_STYLES} onPick={v => set({ hair: v })} />
          <ColorRow label="Цвет волос" value={cfg.hairColor} colors={HAIR_COLORS} onPick={c => set({ hairColor: c })} />
          <ChipRow label="Брови" kind="brows" value={cfg.brows} options={BROW_STYLES} onPick={v => set({ brows: v })} />
          <ChipRow label="Глаза" kind="eyes" value={cfg.eyes} options={EYE_STYLES} onPick={v => set({ eyes: v })} />
          <ColorRow label="Цвет глаз" value={cfg.eyeColor} colors={EYE_COLORS} onPick={c => set({ eyeColor: c })} />
          <ChipRow label="Рот" kind="mouth" value={cfg.mouth} options={MOUTH_STYLES} onPick={v => set({ mouth: v })} />
          <ChipRow label="Очки" kind="glasses" value={cfg.glasses} options={GLASSES_STYLES} onPick={v => set({ glasses: v })} />
          <ChipRow label="Одежда" kind="clothes" value={cfg.clothes} options={CLOTHES_STYLES} onPick={v => set({ clothes: v })} />
          <ColorRow label="Цвет одежды" value={cfg.clothesColor} colors={CLOTHES_COLORS} onPick={c => set({ clothesColor: c })} />
          <ColorRow label="Фон" value={cfg.bg} colors={BG_COLORS} onPick={c => set({ bg: c })} />
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)]">
          <button
            onClick={() => onDone(encodeFace(cfg), cfg)}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-[12px] bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition-colors"
          >
            <Check size={16} /> Готово
          </button>
        </div>
      </div>
    </div>
  );
}
