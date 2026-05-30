/**
 * Notes Cowork — self-hosted mediasoup SFU.
 * Handles voice + screen-share for up to ~20 peers per room.
 *
 * Topology: one mediasoup Router per voice room. Each peer opens a WebRTC
 * "send" transport (publishes mic + optional screen) and a "recv" transport
 * (subscribes to everyone else's producers). The server forwards streams —
 * each peer uploads once, regardless of room size (SFU, not mesh).
 *
 * Signaling rides on Socket.io. Runs as a SEPARATE service from the main
 * Render Socket.io (which has no UDP). Deploy on a UDP-capable host (VPS).
 */
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const mediasoup = require('mediasoup');
const config = require('./config');

const app = express();
app.use(cors({ origin: '*' }));
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
});

/* ── mediasoup workers ──────────────────────────────────────────────── */
let workers = [];
let nextWorkerIdx = 0;

async function createWorkers() {
  for (let i = 0; i < config.numWorkers; i++) {
    const worker = await mediasoup.createWorker({
      logLevel: config.worker.logLevel,
      rtcMinPort: config.worker.rtcMinPort,
      rtcMaxPort: config.worker.rtcMaxPort,
    });
    worker.on('died', () => {
      console.error(`mediasoup worker ${worker.pid} died — exiting in 2s`);
      setTimeout(() => process.exit(1), 2000);
    });
    workers.push(worker);
  }
  console.log(`mediasoup: ${workers.length} worker(s) ready`);
}
function nextWorker() {
  const w = workers[nextWorkerIdx];
  nextWorkerIdx = (nextWorkerIdx + 1) % workers.length;
  return w;
}

/* ── room state ─────────────────────────────────────────────────────── */
// rooms: slug -> { router, audioObserver, peers: Map<peerId, Peer> }
// Peer: { socketId, name, transports: Map, producers: Map, consumers: Map, muted, screen }
const rooms = new Map();

async function getOrCreateRoom(slug) {
  let room = rooms.get(slug);
  if (room) return room;
  const router = await nextWorker().createRouter({ mediaCodecs: config.mediaCodecs });
  // Active-speaker detection (drives the "who is talking" green ring)
  const audioObserver = await router.createActiveSpeakerObserver({ interval: 400 });
  room = { router, audioObserver, peers: new Map() };
  audioObserver.on('dominantspeaker', ({ producer }) => {
    // Find which peer owns this producer and broadcast active speaker
    for (const [peerId, peer] of room.peers) {
      if (peer.producers.has(producer.id)) {
        io.to('voice:' + slug).emit('voice:active-speaker', { peerId });
        break;
      }
    }
  });
  rooms.set(slug, room);
  console.log(`room created: ${slug}`);
  return room;
}

function createWebRtcTransport(router) {
  return router.createWebRtcTransport({
    listenIps: [{ ip: '0.0.0.0', announcedIp: config.announcedIp || '127.0.0.1' }],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
  });
}

function peerPublicInfo(peerId, peer) {
  return {
    peerId,
    name: peer.name,
    avatarId: peer.avatarId,
    muted: peer.muted,
    screen: !!peer.screen,
  };
}

/* ── signaling ──────────────────────────────────────────────────────── */
io.on('connection', (socket) => {
  let roomSlug = null;
  let peerId = null;

  const getRoom = () => rooms.get(roomSlug);
  const getPeer = () => { const r = getRoom(); return r && r.peers.get(peerId); };

  // 1) Join the voice room → return router RTP capabilities + existing peers
  socket.on('voice:join', async ({ slug, peer }, cb) => {
    try {
      roomSlug = slug;
      peerId = peer.id;
      const room = await getOrCreateRoom(slug);
      // Защита от «двоения»: если этот же peerId уже есть (ghost после обрыва
      // соединения или повторный join), закрываем старые транспорты/продюсеры
      // и сообщаем остальным, что старый экземпляр ушёл — иначе участник
      // отрисуется дважды и его звук задвоится.
      const stale = room.peers.get(peerId);
      if (stale) {
        try { for (const t of stale.transports.values()) t.close(); } catch {}
        room.peers.delete(peerId);
        socket.to('voice:' + slug).emit('voice:peer-left', { peerId });
      }
      room.peers.set(peerId, {
        socketId: socket.id, name: peer.name, avatarId: peer.avatarId,
        transports: new Map(), producers: new Map(), consumers: new Map(),
        muted: false, screen: false,
      });
      socket.join('voice:' + slug);

      // existing peers + their producers (so the newcomer can consume them)
      const existingPeers = [];
      for (const [pid, p] of room.peers) {
        if (pid === peerId) continue;
        existingPeers.push({
          ...peerPublicInfo(pid, p),
          producers: [...p.producers.values()].map(pr => ({ producerId: pr.id, kind: pr.kind, source: pr.appData.source })),
        });
      }
      socket.to('voice:' + slug).emit('voice:peer-joined', peerPublicInfo(peerId, room.peers.get(peerId)));
      cb({ rtpCapabilities: room.router.rtpCapabilities, peers: existingPeers });
    } catch (e) { console.error('voice:join', e); cb({ error: e.message }); }
  });

  // 2) Create a WebRTC transport (called twice: for sending and receiving)
  socket.on('voice:create-transport', async ({ direction }, cb) => {
    try {
      const room = getRoom(); const peer = getPeer();
      if (!room || !peer) return cb({ error: 'not in room' });
      const transport = await createWebRtcTransport(room.router);
      transport.appData = { direction };
      peer.transports.set(transport.id, transport);
      transport.on('dtlsstatechange', s => { if (s === 'closed') transport.close(); });
      cb({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
    } catch (e) { console.error('create-transport', e); cb({ error: e.message }); }
  });

  // 3) Connect transport (DTLS handshake)
  socket.on('voice:connect-transport', async ({ transportId, dtlsParameters }, cb) => {
    try {
      const peer = getPeer(); const t = peer && peer.transports.get(transportId);
      if (!t) return cb({ error: 'no transport' });
      await t.connect({ dtlsParameters });
      cb({ ok: true });
    } catch (e) { console.error('connect-transport', e); cb({ error: e.message }); }
  });

  // 4) Produce (publish mic or screen). source: 'mic' | 'screen' | 'screen-audio'
  socket.on('voice:produce', async ({ transportId, kind, rtpParameters, source }, cb) => {
    try {
      const room = getRoom(); const peer = getPeer();
      const t = peer && peer.transports.get(transportId);
      if (!t) return cb({ error: 'no transport' });
      const producer = await t.produce({ kind, rtpParameters, appData: { source: source || (kind === 'audio' ? 'mic' : 'screen') } });
      peer.producers.set(producer.id, producer);
      if (source === 'screen') peer.screen = true;

      // feed audio producers to the active-speaker observer
      if (kind === 'audio' && source !== 'screen-audio') {
        try { await room.audioObserver.addProducer({ producerId: producer.id }); } catch {}
      }
      producer.on('transportclose', () => { peer.producers.delete(producer.id); });

      // tell everyone else there's a new stream to consume
      socket.to('voice:' + roomSlug).emit('voice:new-producer', {
        peerId, producerId: producer.id, kind, source: producer.appData.source,
      });
      cb({ id: producer.id });
    } catch (e) { console.error('produce', e); cb({ error: e.message }); }
  });

  // 5) Consume someone's producer
  socket.on('voice:consume', async ({ transportId, producerId, rtpCapabilities }, cb) => {
    try {
      const room = getRoom(); const peer = getPeer();
      if (!room.router.canConsume({ producerId, rtpCapabilities })) return cb({ error: 'cannot consume' });
      const t = peer.transports.get(transportId);
      const consumer = await t.consume({ producerId, rtpCapabilities, paused: true });
      peer.consumers.set(consumer.id, consumer);
      consumer.on('transportclose', () => peer.consumers.delete(consumer.id));
      consumer.on('producerclose', () => {
        peer.consumers.delete(consumer.id);
        socket.emit('voice:consumer-closed', { consumerId: consumer.id });
      });
      cb({
        id: consumer.id, producerId, kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
        source: consumer.appData?.source,
      });
    } catch (e) { console.error('consume', e); cb({ error: e.message }); }
  });

  // 6) Resume a consumer (consumers start paused to avoid races)
  socket.on('voice:resume-consumer', async ({ consumerId }, cb) => {
    try {
      const peer = getPeer(); const c = peer.consumers.get(consumerId);
      if (c) await c.resume();
      cb && cb({ ok: true });
    } catch (e) { cb && cb({ error: e.message }); }
  });

  // Mute / unmute (just announce; client pauses its own track)
  socket.on('voice:set-muted', ({ muted }) => {
    const peer = getPeer(); if (!peer) return;
    peer.muted = !!muted;
    io.to('voice:' + roomSlug).emit('voice:peer-updated', peerPublicInfo(peerId, peer));
  });

  // Stop screen share
  socket.on('voice:stop-screen', () => {
    const peer = getPeer(); if (!peer) return;
    for (const [id, pr] of peer.producers) {
      if (pr.appData.source === 'screen' || pr.appData.source === 'screen-audio') {
        pr.close(); peer.producers.delete(id);
        io.to('voice:' + roomSlug).emit('voice:producer-closed', { peerId, producerId: id });
      }
    }
    peer.screen = false;
    io.to('voice:' + roomSlug).emit('voice:peer-updated', peerPublicInfo(peerId, peer));
  });

  const leaveVoice = () => {
    const room = getRoom(); const peer = getPeer();
    if (!room || !peer) return;
    for (const t of peer.transports.values()) t.close();
    room.peers.delete(peerId);
    socket.to('voice:' + roomSlug).emit('voice:peer-left', { peerId });
    if (room.peers.size === 0) {
      room.audioObserver.close(); room.router.close(); rooms.delete(roomSlug);
      console.log(`room closed: ${roomSlug}`);
    }
    roomSlug = null; peerId = null;
  };

  socket.on('voice:leave', leaveVoice);
  socket.on('disconnect', leaveVoice);
});

app.get('/health', (_, res) => res.json({ status: 'ok', rooms: rooms.size, workers: workers.length }));

createWorkers().then(() => {
  httpServer.listen(config.listenPort, () => {
    console.log(`SFU listening on :${config.listenPort} (announcedIp=${config.announcedIp || '127.0.0.1'}, rtc ${config.rtcMinPort}-${config.rtcMaxPort})`);
  });
});
