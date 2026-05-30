'use client';

import { useEffect, useState } from 'react';
import {
  Mic, MicOff, Headphones, VolumeX, MonitorUp, MonitorOff,
  PhoneOff, Volume2, AlertTriangle, Signal,
} from 'lucide-react';
import { useVoiceStore } from '@/store/voiceStore';
import { useRoomStore } from '@/store/roomStore';
import {
  joinVoice, leaveVoice, setMicMuted, setDeafened, startScreenShare, stopScreenShare,
} from '@/lib/voice';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

// iOS Safari не поддерживает getDisplayMedia
const canScreenShare = typeof navigator !== 'undefined' && !!(navigator.mediaDevices as any)?.getDisplayMedia;

export default function VoicePanel() {
  const v = useVoiceStore();
  const { room, currentUser } = useRoomStore();
  const peers = Object.values(v.peers);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (useVoiceStore.getState().inVoice) leaveVoice(); }, []);

  const handleJoin = async () => {
    if (!room || !currentUser) return;
    setError(null);
    try {
      await joinVoice(room.slug, { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId });
    } catch (e: any) {
      const msg = e?.message || 'неизвестная ошибка';
      const hint = /timeout|xhr|websocket|failed/i.test(msg)
        ? 'Голосовой сервер недоступен. Проверьте NEXT_PUBLIC_SFU_URL и что SFU запущен.'
        : msg;
      setError(hint);
    }
  };

  /* ── Not joined → лендинг ──────────────────────────────────────── */
  if (!v.inVoice) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 gap-5 text-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
            <Volume2 size={32} className="text-[var(--accent)]" />
          </div>
          <div className="absolute -inset-1 rounded-full border-2 border-[var(--accent)]/30 animate-pulse" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)] text-base">Голосовой чат</p>
          <p className="text-sm text-[var(--text-muted)] mt-1.5 leading-relaxed">
            Говорите и делитесь экраном <br/> с участниками комнаты
          </p>
        </div>
        <button
          onClick={handleJoin}
          disabled={v.connecting}
          className={cn(
            'px-6 py-3 rounded-[10px] bg-[var(--status-online)] hover:bg-[#1F8C4D] text-white font-semibold text-sm transition-all disabled:opacity-60 inline-flex items-center gap-2',
            'shadow-md hover:shadow-glow active:scale-[0.98]'
          )}
        >
          {v.connecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Подключение…
            </>
          ) : (
            <><Mic size={16} /> Присоединиться</>
          )}
        </button>
        {error && (
          <div className="text-xs text-[var(--danger)] bg-[rgba(242,63,67,0.1)] border border-[rgba(242,63,67,0.35)] rounded-[10px] px-3 py-2 max-w-xs">
            <div className="flex items-start gap-1.5">
              <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── In voice → список + контролы ──────────────────────────────── */
  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)] flex-shrink-0 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
            <span className="relative flex w-2 h-2">
              <span className="absolute inset-0 rounded-full bg-[var(--status-online)] animate-pulse-dot" />
              <span className="relative rounded-full w-2 h-2 bg-[var(--status-online)]" />
            </span>
            В голосовом канале
          </h3>
          <p className="text-[11px] text-[var(--text-muted)] mt-0.5 inline-flex items-center gap-1">
            <Signal size={9} /> {peers.length + 1} в эфире
          </p>
        </div>
      </div>

      {/* Members */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
        <VoiceMember
          isMe
          name={currentUser?.name || 'Вы'}
          avatarId={currentUser?.avatarId || 'fox'}
          muted={v.micMuted}
          deafened={v.deafened}
          screen={v.sharingScreen}
          speaking={v.activeSpeakerId === currentUser?.id}
        />
        {peers.map(p => (
          <VoiceMember
            key={p.peerId}
            name={p.name}
            avatarId={p.avatarId}
            muted={p.muted}
            screen={p.screen}
            speaking={v.activeSpeakerId === p.peerId}
          />
        ))}
      </div>

      {/* Control bar — Discord style */}
      <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-subtle)] p-2 grid grid-cols-4 gap-1.5">
        <CtrlBtn
          active={!v.micMuted}
          onClick={() => setMicMuted(!v.micMuted)}
          icon={v.micMuted ? MicOff : Mic}
          label="Микро"
          danger={v.micMuted}
        />
        <CtrlBtn
          active={!v.deafened}
          onClick={() => setDeafened(!v.deafened)}
          icon={v.deafened ? VolumeX : Headphones}
          label="Звук"
          danger={v.deafened}
        />
        <CtrlBtn
          active={v.sharingScreen}
          onClick={() => v.sharingScreen ? stopScreenShare() : startScreenShare()}
          icon={v.sharingScreen ? MonitorOff : MonitorUp}
          label="Экран"
          disabled={!canScreenShare}
          highlight={v.sharingScreen}
        />
        <CtrlBtn
          active={false}
          onClick={() => leaveVoice()}
          icon={PhoneOff}
          label="Выйти"
          leave
        />
      </div>
      {!canScreenShare && (
        <div className="px-3 py-1.5 text-[10px] text-[var(--text-muted)] flex items-center gap-1 bg-[var(--bg-subtle)] border-t border-[var(--border)]">
          <AlertTriangle size={10} /> Демонстрация экрана недоступна на iOS
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
function VoiceMember({
  name, avatarId, muted, deafened, screen, speaking, isMe,
}: {
  name: string; avatarId: string; muted: boolean; deafened?: boolean;
  screen: boolean; speaking: boolean; isMe?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-2.5 py-1.5 rounded-[6px] transition-all',
      speaking ? 'bg-[rgba(35,165,90,0.12)]' : 'hover:bg-[var(--bg-hover)]'
    )}>
      <div className={cn(
        'rounded-full transition-all relative',
        speaking && 'ring-2 ring-[var(--status-online)] ring-offset-2 ring-offset-[var(--bg-card)]'
      )}>
        <Avatar id={avatarId} size={32} />
      </div>
      <span className={cn(
        'flex-1 text-sm font-medium truncate',
        speaking ? 'text-[var(--status-online)]' : 'text-[var(--text-primary)]'
      )}>
        {name}
        {isMe && <span className="text-[10px] text-[var(--text-muted)] ml-1">(вы)</span>}
      </span>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {screen && <MonitorUp size={13} className="text-[var(--accent)]" />}
        {deafened && <VolumeX size={13} className="text-[var(--danger)]" />}
        {muted
          ? <MicOff size={13} className="text-[var(--danger)]" />
          : !speaking && <Mic size={13} className="text-[var(--text-muted)] opacity-60" />
        }
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────── */
function CtrlBtn({
  icon: Icon, label, onClick, active, danger, leave, disabled, highlight,
}: {
  icon: React.ElementType; label: string; onClick: () => void; active: boolean;
  danger?: boolean; leave?: boolean; disabled?: boolean; highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center gap-1 py-2 rounded-[8px] text-[10px] font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95',
        leave
          ? 'bg-[var(--danger)] text-white hover:bg-[#D63239]'
          : danger
            ? 'bg-[rgba(242,63,67,0.15)] text-[var(--danger)] hover:bg-[rgba(242,63,67,0.25)]'
            : highlight
              ? 'bg-[var(--accent-light)] text-[var(--accent)] ring-1 ring-[var(--accent)]/30'
              : active
                ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]'
                : 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
