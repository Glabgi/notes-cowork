'use client';

// Voice/screen-share client — wraps mediasoup-client against our self-hosted SFU.
// Connects to a SEPARATE Socket.io (the SFU on the VPS), independent of the
// rooms/chat Socket.io. Singleton per page.

import { io, type Socket } from 'socket.io-client';
import { Device, types as msTypes } from 'mediasoup-client';
import { useVoiceStore } from '@/store/voiceStore';

type Transport = msTypes.Transport;
type Producer = msTypes.Producer;
type Consumer = msTypes.Consumer;

const SFU_URL = process.env.NEXT_PUBLIC_SFU_URL || 'http://localhost:4000';

let socket: Socket | null = null;
let device: Device | null = null;
let sendTransport: Transport | null = null;
let recvTransport: Transport | null = null;
let micProducer: Producer | null = null;
let screenProducer: Producer | null = null;
let screenAudioProducer: Producer | null = null;
const consumers = new Map<string, Consumer>();
// remote audio elements + screen video tracks
const audioEls = new Map<string, HTMLAudioElement>();
let onScreenTrack: ((peerId: string, track: MediaStreamTrack | null) => void) | null = null;

/* ── autoplay unlock ────────────────────────────────────────────────────
 * Браузеры (особенно Safari/iOS) запрещают audio.play() без user-gesture.
 * Один раз слушаем первый клик/тач и пытаемся доиграть всё, что было
 * заблокировано. Это нужно потому, что пользователь может зайти в голос
 * и не кликать дальше — а кто-то уже говорит. */
let audioUnlocked = false;
function ensureAutoplayUnlock() {
  if (typeof window === 'undefined' || audioUnlocked) return;
  const unlock = () => {
    audioUnlocked = true;
    audioEls.forEach(el => {
      if (el.paused && !el.muted) el.play().catch(() => {});
    });
    window.removeEventListener('click', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('click', unlock, { once: true });
  window.addEventListener('touchstart', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

function emitAck<T = any>(event: string, data?: any): Promise<T> {
  return new Promise((resolve) => socket!.emit(event, data, (resp: T) => resolve(resp)));
}

export function setScreenTrackHandler(fn: typeof onScreenTrack) { onScreenTrack = fn; }

export async function joinVoice(slug: string, me: { id: string; name: string; avatarId: string }) {
  const store = useVoiceStore.getState();
  if (store.inVoice || store.connecting) return;
  store.setConnecting(true);
  ensureAutoplayUnlock();

  if (!SFU_URL || (/your[._-]?sfu|localhost/i.test(SFU_URL) && typeof window !== 'undefined' && !/localhost|127\./.test(window.location.hostname))) {
    // Дружелюбное предупреждение: на проде нацелен на localhost — голос не заработает
    console.warn('[voice] SFU_URL=' + SFU_URL + ' — на production это не сработает. Настройте NEXT_PUBLIC_SFU_URL.');
  }

  // reconnection включён: при сворачивании вкладки / кратком обрыве сети
  // браузер может усыпить сокет — даём ему восстановиться, чтобы не выкидывать
  // пользователя из звонка.
  socket = io(SFU_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  await new Promise<void>((res, rej) => {
    socket!.once('connect', () => res());
    socket!.once('connect_error', (e) => rej(new Error('Не удалось подключиться к голосовому серверу (' + (e?.message || 'connect_error') + ')')));
    setTimeout(() => rej(new Error('Таймаут подключения к голосовому серверу (15с)')), 15000);
  }).catch((e) => { store.setConnecting(false); try { socket?.disconnect(); } catch {} ; socket = null; throw e; });

  store.setConnected(true);
  wireServerEvents(slug);

  // 1) join → get router capabilities + existing peers
  const { rtpCapabilities, peers, error } = await emitAck('voice:join', { slug, peer: me });
  if (error) { store.setConnecting(false); throw new Error(error); }

  device = new Device();
  await device.load({ routerRtpCapabilities: rtpCapabilities });

  // 2) create transports
  sendTransport = await createTransport('send');
  recvTransport = await createTransport('recv');

  // 3) publish mic
  await produceMic();

  // 4) consume everyone already in the room
  for (const p of peers) {
    store.upsertPeer({ peerId: p.peerId, name: p.name, avatarId: p.avatarId, muted: p.muted, screen: p.screen });
    for (const pr of p.producers || []) {
      await consume(pr.producerId, p.peerId, pr.source);
    }
  }

  store.setInVoice(true);
  store.setConnecting(false);
}

async function createTransport(direction: 'send' | 'recv'): Promise<Transport> {
  const params = await emitAck('voice:create-transport', { direction });
  const t = direction === 'send'
    ? device!.createSendTransport(params)
    : device!.createRecvTransport(params);

  t.on('connect', ({ dtlsParameters }, callback, errback) => {
    emitAck('voice:connect-transport', { transportId: t.id, dtlsParameters })
      .then((r: any) => r?.error ? errback(new Error(r.error)) : callback())
      .catch(errback);
  });

  if (direction === 'send') {
    t.on('produce', ({ kind, rtpParameters, appData }, callback, errback) => {
      emitAck('voice:produce', { transportId: t.id, kind, rtpParameters, source: (appData as any)?.source })
        .then((r: any) => r?.error ? errback(new Error(r.error)) : callback({ id: r.id }))
        .catch(errback);
    });
  }
  return t;
}

async function produceMic() {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  } catch (e: any) {
    if (e?.name === 'NotAllowedError') {
      throw new Error('Доступ к микрофону отклонён. Разрешите его в настройках браузера.');
    }
    if (e?.name === 'NotFoundError') {
      throw new Error('Микрофон не найден. Подключите его и попробуйте снова.');
    }
    throw new Error('Не удалось получить микрофон: ' + (e?.message || 'неизвестная ошибка'));
  }
  const track = stream.getAudioTracks()[0];
  micProducer = await sendTransport!.produce({ track, appData: { source: 'mic' } });
}

async function consume(producerId: string, peerId: string, source?: string) {
  const resp = await emitAck('voice:consume', {
    transportId: recvTransport!.id, producerId, rtpCapabilities: device!.rtpCapabilities,
  });
  if (resp.error) return;
  const consumer = await recvTransport!.consume({
    id: resp.id, producerId: resp.producerId, kind: resp.kind, rtpParameters: resp.rtpParameters,
  });
  consumers.set(consumer.id, consumer);
  await emitAck('voice:resume-consumer', { consumerId: consumer.id });

  const stream = new MediaStream([consumer.track]);
  if (consumer.kind === 'audio' && source !== 'screen-audio') {
    // play remote mic
    const el = new Audio(); el.srcObject = stream; el.autoplay = true;
    (el as any).playsInline = true;
    audioEls.set(consumer.id, el);
    if (useVoiceStore.getState().deafened) el.muted = true;
    el.play().catch(() => { /* unlocked at first user gesture via ensureAutoplayUnlock */ });
  } else if (consumer.kind === 'video' && source === 'screen') {
    useVoiceStore.getState().setScreenPeer(peerId);
    onScreenTrack?.(peerId, consumer.track);
  } else if (consumer.kind === 'audio' && source === 'screen-audio') {
    const el = new Audio(); el.srcObject = stream; el.autoplay = true;
    audioEls.set(consumer.id, el);
    if (!useVoiceStore.getState().deafened) el.play().catch(() => {});
  }
}

function wireServerEvents(slug: string) {
  const store = useVoiceStore.getState();
  socket!.on('voice:peer-joined', (p) => store.upsertPeer(p));
  socket!.on('voice:peer-updated', (p) => store.upsertPeer(p));
  socket!.on('voice:peer-left', ({ peerId }) => store.removePeer(peerId));
  socket!.on('voice:new-producer', ({ producerId, peerId, source }) => consume(producerId, peerId, source));
  socket!.on('voice:active-speaker', ({ peerId }) => {
    store.setActiveSpeaker(peerId);
    // clear speaking on others, set on this one
    Object.values(useVoiceStore.getState().peers).forEach(p =>
      store.upsertPeer({ peerId: p.peerId, speaking: p.peerId === peerId }));
  });
  socket!.on('voice:producer-closed', ({ peerId }) => {
    if (useVoiceStore.getState().screenPeerId === peerId) {
      store.setScreenPeer(null); onScreenTrack?.(peerId, null);
    }
  });
  socket!.on('voice:consumer-closed', ({ consumerId }) => {
    const c = consumers.get(consumerId); if (c) { c.close(); consumers.delete(consumerId); }
    const el = audioEls.get(consumerId); if (el) { el.srcObject = null; audioEls.delete(consumerId); }
  });
}

/* ── controls ───────────────────────────────────────────────────────── */
export function setMicMuted(muted: boolean) {
  if (micProducer) muted ? micProducer.pause() : micProducer.resume();
  useVoiceStore.getState().setMicMuted(muted);
  socket?.emit('voice:set-muted', { muted });
}

export function setDeafened(deaf: boolean) {
  audioEls.forEach(el => { el.muted = deaf; });
  useVoiceStore.getState().setDeafened(deaf);
  if (deaf && !useVoiceStore.getState().micMuted) setMicMuted(true);
}

export async function startScreenShare() {
  try {
    const stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: { frameRate: 15 }, audio: true });
    const videoTrack = stream.getVideoTracks()[0];
    screenProducer = await sendTransport!.produce({ track: videoTrack, appData: { source: 'screen' }, encodings: [{ maxBitrate: 1_500_000 }] });
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) screenAudioProducer = await sendTransport!.produce({ track: audioTrack, appData: { source: 'screen-audio' } });
    videoTrack.onended = () => stopScreenShare();
    useVoiceStore.getState().setSharingScreen(true);
    // show my own screen locally in the big tile
    useVoiceStore.getState().setScreenPeer('me');
    onScreenTrack?.('me', videoTrack);
  } catch (e) {
    // user cancelled the picker — no-op
  }
}

export function stopScreenShare() {
  screenProducer?.close(); screenProducer = null;
  screenAudioProducer?.close(); screenAudioProducer = null;
  socket?.emit('voice:stop-screen');
  const st = useVoiceStore.getState();
  st.setSharingScreen(false);
  if (st.screenPeerId === 'me') { st.setScreenPeer(null); onScreenTrack?.('me', null); }
}

export function leaveVoice() {
  try { micProducer?.close(); screenProducer?.close(); screenAudioProducer?.close(); } catch {}
  consumers.forEach(c => c.close()); consumers.clear();
  audioEls.forEach(el => { el.srcObject = null; }); audioEls.clear();
  try { sendTransport?.close(); recvTransport?.close(); } catch {}
  socket?.emit('voice:leave');
  socket?.disconnect();
  socket = null; device = null; sendTransport = null; recvTransport = null;
  micProducer = screenProducer = screenAudioProducer = null;
  useVoiceStore.getState().reset();
  useVoiceStore.getState().setConnected(false);
}
