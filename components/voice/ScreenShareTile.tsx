'use client';

import { useEffect, useRef, useState } from 'react';
import { MonitorUp, X } from 'lucide-react';
import { useVoiceStore } from '@/store/voiceStore';
import { setScreenTrackHandler, stopScreenShare } from '@/lib/voice';
import { useRoomStore } from '@/store/roomStore';

// Big screen-share surface shown in the centre column when someone presents.
export default function ScreenShareTile() {
  const screenPeerId = useVoiceStore(s => s.screenPeerId);
  const peers = useVoiceStore(s => s.peers);
  const { currentUser } = useRoomStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  // Держим последнюю дорожку отдельно от DOM: трек часто приходит РАНЬШЕ,
  // чем смонтируется <video> (screenPeerId выставляется в том же тике), поэтому
  // нельзя писать srcObject прямо в обработчике — элемента ещё нет.
  const [track, setTrack] = useState<MediaStreamTrack | null>(null);

  useEffect(() => {
    setScreenTrackHandler((_peerId, t) => setTrack(t));
    return () => setScreenTrackHandler(null);
  }, []);

  // Применяем дорожку к <video>, как только и элемент, и трек доступны.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = track ? new MediaStream([track]) : null;
    if (track) el.play().catch(() => {});
  }, [track, screenPeerId]);

  if (!screenPeerId) return null;

  const isMe = screenPeerId === 'me';
  const presenterName = isMe ? 'Вы' : (peers[screenPeerId]?.name || 'Участник');

  return (
    <div className="mx-4 mb-3 rounded-[14px] overflow-hidden border border-[var(--border)] bg-black relative group">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
        <MonitorUp size={12} /> {presenterName} демонстрирует экран
      </div>
      {isMe && (
        <button
          onClick={stopScreenShare}
          className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-[#DC2626] text-white p-1.5 rounded-full transition-colors"
          title="Остановить демонстрацию"
        >
          <X size={14} />
        </button>
      )}
      <video ref={videoRef} autoPlay playsInline muted={isMe} className="w-full max-h-[46vh] object-contain bg-black" />
    </div>
  );
}
