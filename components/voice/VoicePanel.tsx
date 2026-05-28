'use client';

import { useEffect } from 'react';
import { Mic, MicOff, Headphones, VolumeX, MonitorUp, MonitorOff, PhoneOff, Volume2, AlertTriangle } from 'lucide-react';
import { useVoiceStore } from '@/store/voiceStore';
import { useRoomStore } from '@/store/roomStore';
import {
  joinVoice, leaveVoice, setMicMuted, setDeafened, startScreenShare, stopScreenShare,
} from '@/lib/voice';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';

// iOS Safari cannot screen-share (getDisplayMedia unsupported)
const canScreenShare = typeof navigator !== 'undefined' && !!(navigator.mediaDevices as any)?.getDisplayMedia;

export default function VoicePanel() {
  const v = useVoiceStore();
  const { room, currentUser } = useRoomStore();
  const peers = Object.values(v.peers);

  useEffect(() => () => { if (useVoiceStore.getState().inVoice) leaveVoice(); }, []);

  const handleJoin = async () => {
    if (!room || !currentUser) return;
    try {
      await joinVoice(room.slug, { id: currentUser.id, name: currentUser.name, avatarId: currentUser.avatarId });
    } catch (e: any) {
      alert('Не удалось подключиться к голосу: ' + (e?.message || 'ошибка') + '\nПроверьте, что голосовой сервер запущен.');
    }
  };

  /* Not joined → big join CTA */
  if (!v.inVoice) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--accent-light)] flex items-center justify-center">
          <Volume2 size={28} className="text-[var(--accent)]" />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">Голосовой чат</p>
          <p className="text-sm text-[var(--text-muted)] mt-1">Говорите и делитесь экраном с участниками комнаты</p>
        </div>
        <button
          onClick={handleJoin}
          disabled={v.connecting}
          className="px-5 py-2.5 rounded-[12px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-sm transition-colors disabled:opacity-60 inline-flex items-center gap-2"
        >
          <Mic size={16} /> {v.connecting ? 'Подключение…' : 'Присоединиться'}
        </button>
      </div>
    );
  }

  /* In voice → participant list + controls */
  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] min-h-0">
      <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)] flex-shrink-0 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-[var(--text-primary)] text-sm flex items-center gap-1.5">
            <Volume2 size={14} className="text-[#16A34A]" /> В голосе
          </h3>
          <p className="text-xs text-[var(--text-muted)]">{peers.length + 1} участник(ов)</p>
        </div>
      </div>

      {/* Members */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        {/* me */}
        <VoiceMember
          name={(currentUser?.name || 'Вы') + ' (вы)'}
          avatarId={currentUser?.avatarId || 'fox'}
          muted={v.micMuted}
          screen={v.sharingScreen}
          speaking={v.activeSpeakerId === currentUser?.id}
        />
        {peers.map(p => (
          <VoiceMember key={p.peerId} name={p.name} avatarId={p.avatarId}
            muted={p.muted} screen={p.screen} speaking={v.activeSpeakerId === p.peerId} />
        ))}
      </div>

      {/* Control bar */}
      <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-subtle)] p-2 grid grid-cols-4 gap-1.5">
        <CtrlBtn active={!v.micMuted} onClick={() => setMicMuted(!v.micMuted)}
          icon={v.micMuted ? MicOff : Mic} label="Микро" danger={v.micMuted} />
        <CtrlBtn active={!v.deafened} onClick={() => setDeafened(!v.deafened)}
          icon={v.deafened ? VolumeX : Headphones} label="Звук" danger={v.deafened} />
        <CtrlBtn active={v.sharingScreen} onClick={() => v.sharingScreen ? stopScreenShare() : startScreenShare()}
          icon={v.sharingScreen ? MonitorOff : MonitorUp} label="Экран" disabled={!canScreenShare} />
        <CtrlBtn active={false} onClick={() => leaveVoice()} icon={PhoneOff} label="Выйти" leave />
      </div>
      {!canScreenShare && (
        <div className="px-3 py-1.5 text-[10px] text-[var(--text-muted)] flex items-center gap-1 bg-[var(--bg-subtle)]">
          <AlertTriangle size={10} /> Демонстрация экрана недоступна на iOS
        </div>
      )}
    </div>
  );
}

function VoiceMember({ name, avatarId, muted, screen, speaking }: { name: string; avatarId: string; muted: boolean; screen: boolean; speaking: boolean }) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-2.5 py-2 rounded-[10px] transition-all border',
      speaking ? 'border-[#16A34A] bg-[#F0FDF4]' : 'border-transparent hover:bg-[var(--bg-hover)]'
    )}>
      <div className={cn('rounded-full transition-all', speaking && 'ring-2 ring-[#16A34A] ring-offset-1')}>
        <Avatar id={avatarId} size={32} />
      </div>
      <span className="flex-1 text-sm font-medium text-[var(--text-primary)] truncate">{name}</span>
      {screen && <MonitorUp size={13} className="text-[var(--accent)]" />}
      {muted ? <MicOff size={14} className="text-[#EF4444]" /> : <Mic size={14} className="text-[var(--text-muted)]" />}
    </div>
  );
}

function CtrlBtn({ icon: Icon, label, onClick, active, danger, leave, disabled }: {
  icon: React.ElementType; label: string; onClick: () => void; active: boolean;
  danger?: boolean; leave?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center gap-1 py-2 rounded-[10px] text-[10px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        leave ? 'bg-[#FEE2E2] text-[#DC2626] hover:bg-[#FECACA]'
          : danger ? 'bg-[#FEF2F2] text-[#DC2626] hover:bg-[#FEE2E2]'
          : active ? 'bg-[var(--accent-light)] text-[var(--accent)]'
          : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border)]'
      )}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
