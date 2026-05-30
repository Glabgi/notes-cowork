'use client';

import { useState } from 'react';
import { Copy, Share2, Check, Users, Home, Send, MessageCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useRoomStore } from '@/store/roomStore';
import { useRouter } from 'next/navigation';
import { copyToClipboard, shareUrl } from '@/lib/utils';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export default function RoomHeader() {
  const { room, isConnected } = useRoomStore();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showShare, setShowShare] = useState(false);

  if (!room) return (
    <header className="h-14 glass border-b border-[var(--divider)] flex items-center px-4 gap-3 rounded-b-[20px]">
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
      <header className="h-14 glass border-b border-[var(--divider)] flex items-center px-4 gap-3 flex-shrink-0 z-40 rounded-b-[20px]">
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
            <span className="text-[10px] font-semibold text-[var(--status-break)] bg-[rgba(245,158,11,0.12)] border border-[rgba(245,158,11,0.35)] px-1.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0">
              приватная
            </span>
          )}
        </div>

        {/* Live-status capsule */}
        <div className="hidden sm:flex items-center gap-3 glass-subtle rounded-full px-3.5 py-1.5 flex-shrink-0 border border-[var(--border)]">
          <div className="flex items-center gap-1.5" title={isConnected ? 'В сети' : 'Переподключение'}>
            <div className={cn('w-2 h-2 rounded-full', isConnected ? 'bg-[var(--status-online)]' : 'bg-[var(--danger)] animate-pulse-dot')} />
            <span className="text-xs text-[var(--text-secondary)] font-medium">{isConnected ? 'В сети' : 'Связь...'}</span>
          </div>
          {focusCount > 0 && (
            <>
              <span className="w-px h-3.5 bg-[var(--divider)]" />
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--status-online)] animate-pulse-dot" />
                <span className="text-xs text-[var(--status-online)] font-medium">{focusCount} в фокусе</span>
              </div>
            </>
          )}
          <span className="w-px h-3.5 bg-[var(--divider)]" />
          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
            <Users size={14} />
            <span className="text-xs tabular-nums font-medium">{room.participants.length}</span>
          </div>
        </div>

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
              onClick={() => shareUrl(roomUrl, 'telegram', `Присоединяйся к «${room.name}» в Notes Cowork!`)}>
              <Send size={14} /> Telegram
            </Button>
            <Button variant="secondary" size="sm"
              onClick={() => shareUrl(roomUrl, 'whatsapp', `Присоединяйся к «${room.name}» в Notes Cowork!`)}>
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
