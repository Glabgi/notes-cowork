import { create } from 'zustand';

export interface VoicePeer {
  peerId: string;
  name: string;
  avatarId: string;
  muted: boolean;
  screen: boolean;
  camera: boolean;
  speaking: boolean;
}

interface VoiceState {
  connected: boolean;
  connecting: boolean;
  inVoice: boolean;
  micMuted: boolean;       // my mic muted
  deafened: boolean;       // I don't hear anyone
  sharingScreen: boolean;  // I'm sharing my screen
  cameraOn: boolean;       // my camera is on
  activeSpeakerId: string | null;
  peers: Record<string, VoicePeer>;  // other peers (not me)
  /** peerId currently presenting a screen (for the big tile), or null */
  screenPeerId: string | null;
  /** peerId → their live camera MediaStream (includes my own under my id) */
  cameraStreams: Record<string, MediaStream>;

  setConnected: (v: boolean) => void;
  setConnecting: (v: boolean) => void;
  setInVoice: (v: boolean) => void;
  setMicMuted: (v: boolean) => void;
  setDeafened: (v: boolean) => void;
  setSharingScreen: (v: boolean) => void;
  setCameraOn: (v: boolean) => void;
  setActiveSpeaker: (id: string | null) => void;
  setScreenPeer: (id: string | null) => void;
  setCameraStream: (peerId: string, stream: MediaStream | null) => void;
  upsertPeer: (p: Partial<VoicePeer> & { peerId: string }) => void;
  removePeer: (peerId: string) => void;
  reset: () => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  connected: false,
  connecting: false,
  inVoice: false,
  micMuted: false,
  deafened: false,
  sharingScreen: false,
  cameraOn: false,
  activeSpeakerId: null,
  peers: {},
  screenPeerId: null,
  cameraStreams: {},

  setConnected: (connected) => set({ connected }),
  setConnecting: (connecting) => set({ connecting }),
  setInVoice: (inVoice) => set({ inVoice }),
  setMicMuted: (micMuted) => set({ micMuted }),
  setDeafened: (deafened) => set({ deafened }),
  setSharingScreen: (sharingScreen) => set({ sharingScreen }),
  setCameraOn: (cameraOn) => set({ cameraOn }),
  setActiveSpeaker: (activeSpeakerId) => set({ activeSpeakerId }),
  setScreenPeer: (screenPeerId) => set({ screenPeerId }),

  setCameraStream: (peerId, stream) => set((s) => {
    const cameraStreams = { ...s.cameraStreams };
    if (stream) cameraStreams[peerId] = stream;
    else delete cameraStreams[peerId];
    return { cameraStreams };
  }),

  upsertPeer: (p) => set((s) => ({
    peers: {
      ...s.peers,
      [p.peerId]: {
        peerId: p.peerId,
        name: p.name ?? s.peers[p.peerId]?.name ?? 'Гость',
        avatarId: p.avatarId ?? s.peers[p.peerId]?.avatarId ?? 'fox',
        muted: p.muted ?? s.peers[p.peerId]?.muted ?? false,
        screen: p.screen ?? s.peers[p.peerId]?.screen ?? false,
        camera: p.camera ?? s.peers[p.peerId]?.camera ?? false,
        speaking: p.speaking ?? s.peers[p.peerId]?.speaking ?? false,
      },
    },
  })),

  removePeer: (peerId) => set((s) => {
    const peers = { ...s.peers }; delete peers[peerId];
    const cameraStreams = { ...s.cameraStreams }; delete cameraStreams[peerId];
    return { peers, cameraStreams, screenPeerId: s.screenPeerId === peerId ? null : s.screenPeerId };
  }),

  reset: () => set({
    inVoice: false, micMuted: false, deafened: false, sharingScreen: false, cameraOn: false,
    activeSpeakerId: null, peers: {}, screenPeerId: null, cameraStreams: {},
  }),
}));
