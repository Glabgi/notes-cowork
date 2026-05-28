import { create } from 'zustand';

export interface VoicePeer {
  peerId: string;
  name: string;
  avatarId: string;
  muted: boolean;
  screen: boolean;
  speaking: boolean;
}

interface VoiceState {
  connected: boolean;
  connecting: boolean;
  inVoice: boolean;
  micMuted: boolean;       // my mic muted
  deafened: boolean;       // I don't hear anyone
  sharingScreen: boolean;  // I'm sharing my screen
  activeSpeakerId: string | null;
  peers: Record<string, VoicePeer>;  // other peers (not me)
  /** peerId currently presenting a screen (for the big tile), or null */
  screenPeerId: string | null;

  setConnected: (v: boolean) => void;
  setConnecting: (v: boolean) => void;
  setInVoice: (v: boolean) => void;
  setMicMuted: (v: boolean) => void;
  setDeafened: (v: boolean) => void;
  setSharingScreen: (v: boolean) => void;
  setActiveSpeaker: (id: string | null) => void;
  setScreenPeer: (id: string | null) => void;
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
  activeSpeakerId: null,
  peers: {},
  screenPeerId: null,

  setConnected: (connected) => set({ connected }),
  setConnecting: (connecting) => set({ connecting }),
  setInVoice: (inVoice) => set({ inVoice }),
  setMicMuted: (micMuted) => set({ micMuted }),
  setDeafened: (deafened) => set({ deafened }),
  setSharingScreen: (sharingScreen) => set({ sharingScreen }),
  setActiveSpeaker: (activeSpeakerId) => set({ activeSpeakerId }),
  setScreenPeer: (screenPeerId) => set({ screenPeerId }),

  upsertPeer: (p) => set((s) => ({
    peers: {
      ...s.peers,
      [p.peerId]: {
        peerId: p.peerId,
        name: p.name ?? s.peers[p.peerId]?.name ?? 'Гость',
        avatarId: p.avatarId ?? s.peers[p.peerId]?.avatarId ?? 'fox',
        muted: p.muted ?? s.peers[p.peerId]?.muted ?? false,
        screen: p.screen ?? s.peers[p.peerId]?.screen ?? false,
        speaking: p.speaking ?? s.peers[p.peerId]?.speaking ?? false,
      },
    },
  })),

  removePeer: (peerId) => set((s) => {
    const peers = { ...s.peers }; delete peers[peerId];
    return { peers, screenPeerId: s.screenPeerId === peerId ? null : s.screenPeerId };
  }),

  reset: () => set({
    inVoice: false, micMuted: false, deafened: false, sharingScreen: false,
    activeSpeakerId: null, peers: {}, screenPeerId: null,
  }),
}));
