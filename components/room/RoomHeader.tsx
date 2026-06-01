'use client';

import { useState } from 'react';
import {
  Copy, Share2, Check, Users, Home, Send, MessageCircle,
  Mic, MicOff, Headphones, VolumeX, MonitorUp, MonitorOff, PhoneOff, AlertTriangle,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRoomStore } from '@/store/roomStore';
import { useVoiceStore } from '@/store/voiceStore';
import {
  joinVoice, leaveVoice, setMicMuted, setDeafened, startScreenShare, stopScreenShare,
} from '@/lib/voice';
import { useRouter } from 'next/navigation';
import { copyToClipboard, shareUrl } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

// iOS Safari не поддерживает getDisplayMedia
const canScreenShare = typeof navigator !== 'undefined' && !!(navigator.mediaDevices as any)?.getDisplayMedia;

/* ── Voice controls — always visible in the header (перенесено наверх) ── */
function HeaderVoice() {
  const v = useVoiceStore();
  const { room, currentUser } = useRoomStore();
  const [error, setError] = useState<string | null>(null);
  const voiceCount = v.inVoice ? Object.keys(v.peers).length + 1 : 0;

  const handleJoin = async () => {
    if (!room || !currentUser) return;
    setError(null);
    try {
      await joinVoice(room.slug, { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId });
    } catch (e: any) {
      const msg = e?.message || 'неизвестная ошибка';
      setError(/timeout|xhr|websocket|failed/i.test(msg) ? 'Голосовой сервер недоступен' : msg);
      setTimeout(() => setError(null), 4000);
    }
  };

  if (!v.inVoice) {
    return (
      <div className="relative flex-shrink-0">
        <button
          onClick={handleJoin}
          disabled={v.connecting}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all active:scale-95 disabled:opacity-60',
            'bg-[var(--status-online)] text-white hover:bg-[var(--accent-active)] shadow-sm hover:shadow-glow'
          )}
          title="Присоединиться к голосовому чату"
        >
          {v.connecting
            ? <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <Mic size={14} />}
          <span className="hidden sm:inline">Голос</span>
        </button>
        {error && (
          <div className="absolute top-full mt-1 right-0 z-50 flex items-center gap-1.5 text-[11px] text-[var(--danger)] bg-[var(--bg-elevated)] border border-[rgba(196,85,90,0.35)] rounded-[8px] px-2 py-1 shadow-md whitespace-nowrap">
            <AlertTriangle size={11} /> {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 flex-shrink-0 pl-1.5 pr-1 py-1 rounded-full border border-[rgba(74,138,120,0.25)] bg-[rgba(74,138,120,0.08)]">
      <span className="hidden sm:inline-flex items-center gap-1 pl-1 pr-1.5 text-[11px] font-medium text-[var(--status-online)]">
        <span className="relative flex w-1.5 h-1.5">
          <span className="absolute inset-0 rounded-full bg-[var(--status-online)] animate-pulse-dot" />
          <span className="relative rounded-full w-1.5 h-1.5 bg-[var(--status-online)]" />
        </span>
        {voiceCount}
      </span>

      <VBtn
        on={!v.micMuted}
        danger={v.micMuted}
        onClick={() => setMicMuted(!v.micMuted)}
        icon={v.micMuted ? MicOff : Mic}
        title={v.micMuted ? 'Включить микрофон' : 'Выключить микрофон'}
      />
      <VBtn
        on={!v.deafened}
        danger={v.deafened}
        onClick={() => setDeafened(!v.deafened)}
        icon={v.deafened ? VolumeX : Headphones}
        title={v.deafened ? 'Включить звук' : 'Выключить звук'}
      />
      {canScreenShare && (
        <VBtn
          on={v.sharingScreen}
          accent={v.sharingScreen}
          onClick={() => v.sharingScreen ? stopScreenShare() : startScreenShare()}
          icon={v.sharingScreen ? MonitorOff : MonitorUp}
          title={v.sharingScreen ? 'Остановить показ экрана' : 'Показать экран'}
        />
      )}
      <button
        onClick={() => leaveVoice()}
        title="Выйти из голосового чата"
        className="w-7 h-7 rounded-full flex items-center justify-center bg-[var(--danger)] text-white hover:opacity-90 transition-all active:scale-90"
      >
        <PhoneOff size={13} />
      </button>
    </div>
  );
}

function VBtn({
  icon: Icon, onClick, on, danger, accent, title,
}: {
  icon: React.ElementType; onClick: () => void; on: boolean; danger?: boolean; accent?: boolean; title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90',
        danger
          ? 'bg-[rgba(196,85,90,0.15)] text-[var(--danger)] hover:bg-[rgba(196,85,90,0.25)]'
          : accent
            ? 'bg-[var(--accent-light)] text-[var(--accent)] ring-1 ring-[var(--accent)]/30'
            : 'text-[var(--status-online)] hover:bg-[rgba(74,138,120,0.15)]'
      )}
    >
      <Icon size={14} />
    </button>
  );
}

export default function RoomHeader() {
  const { room, isConnected } = useRoomStore();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  if (!room) return (
    <header className="h-14 bg-[var(--bg-card)]/95 border-b border-[var(--border)] flex items-center px-4 gap-3">
      <div className="w-2.5 h-2.5 rounded-full bg-[var(--status-break)] animate-pulse-dot flex-shrink-0" />
      <span className="text-[var(--text-secondary)] text-sm">Подключение...</span>
    </header>
  );

  const roomUrl = typeof window !== 'undefined' ? `${window.location.origin}/room/${room.slug}` : `/room/${room.slug}`;
  const focusCount = room.participants.filter(p => p.status === 'focus').length;

  const handleCopy = async () => {
    await copyToClipboard(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <header className="h-14 bg-[var(--bg-card)]/95 backdrop-blur-sm border-b border-[var(--border)] flex items-center px-4 gap-3 flex-shrink-0 z-40">
        {/* Connection dot */}
        <div className={cn('w-2 h-2 rounded-full flex-shrink-0', isConnected ? 'bg-[var(--status-online)]' : 'bg-[var(--danger)] animate-pulse-dot')} />

        {/* Room name */}
        <div className="flex items-baseline gap-2 min-w-0 flex-1">
          <h1
            className="font-bold text-[var(--text-primary)] text-lg truncate leading-tight"
            title={room.name}
          >
            {room.name}
          </h1>
          <span
            className="bg-[var(--bg-subtle)] text-[var(--text-muted)] font-mono text-[11px] px-2 py-0.5 rounded-full hidden md:inline-block flex-shrink-0 border border-[var(--border)]"
            title="Код сессии"
          >
            #{room.slug}
          </span>
          {room.isPrivate && (
            <span className="text-[10px] font-semibold text-[var(--status-break)] bg-[rgba(196,120,74,0.12)] border border-[rgba(196,120,74,0.35)] px-1.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0">
              приватная
            </span>
          )}
        </div>

        {/* Focus indicator */}
        {focusCount > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 bg-[rgba(74,138,120,0.12)] border border-[rgba(74,138,120,0.35)] rounded-full px-3 py-1 flex-shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--status-online)] animate-pulse-dot" />
            <span className="text-xs text-[var(--status-online)] font-medium">{focusCount} в фокусе</span>
          </div>
        )}

        {/* Participants count */}
        <div className="flex items-center gap-1.5 text-[var(--text-secondary)] flex-shrink-0">
          <Users size={15} />
          <span className="text-sm tabular-nums">{room.participants.length}</span>
        </div>

        {/* Voice controls — moved up here from the side panel */}
        <HeaderVoice />

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="hidden sm:flex">
            <Home size={14} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowShare(true)}>
            <Share2 size={14} />
            <span className="hidden sm:inline">Поделиться</span>
          </Button>
          <Button variant={copied ? 'secondary' : 'primary'} size="sm" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            <span className="hidden sm:inline">{copied ? 'Скопировано!' : 'Ссылка'}</span>
          </Button>
        </div>
      </header>

      {/* Share modal */}
      <Modal open={showShare} onClose={() => setShowShare(false)} title="Поделиться комнатой" size="sm">
        <div className="p-6 space-y-5">
          <div className="bg-[var(--bg-subtle)] border border-[var(--border)] rounded-[12px] flex items-center gap-2 px-3 py-2">
            <p className="flex-1 text-xs text-[var(--text-secondary)] font-mono truncate">{roomUrl}</p>
            <button onClick={handleCopy} className="p-1.5 hover:bg-[var(--bg-hover)] rounded-lg transition-colors flex-shrink-0">
              {copied ? <Check size={14} className="text-[var(--status-online)]" /> : <Copy size={14} className="text-[var(--text-muted)]" />}
            </button>
          </div>

          <div className="flex justify-center">
            <div className="bg-[var(--bg-subtle)] p-4 rounded-[16px] border border-[var(--border)]">
              <QRCodeSVG value={roomUrl} size={148} level="M" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm"
              onClick={() => shareUrl(roomUrl, 'telegram', `Присоединяйся к «${room.name}» в Тихом зале!`)}>
              <Send size={14} /> Telegram
            </Button>
            <Button variant="secondary" size="sm"
              onClick={() => shareUrl(roomUrl, 'whatsapp', `Присоединяйся к «${room.name}» в Тихом зале!`)}>
              <MessageCircle size={14} /> WhatsApp
            </Button>
          </div>

          <p className="text-center text-xs text-[var(--text-muted)] inline-flex items-center gap-1 w-full justify-center">
            <Users size={11} /> {room.participants.length} участников сейчас онлайн
          </p>
        </div>
      </Modal>
    </>
  );
}
