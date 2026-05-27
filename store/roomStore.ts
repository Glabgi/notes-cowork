import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Room, Participant, ChatMessage, UserStatus } from '@/types';

interface RoomState {
  room: Room | null;
  currentUser: Participant | null;
  messages: ChatMessage[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setRoom: (room: Room) => void;
  setCurrentUser: (user: Participant) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (participantId: string) => void;
  updateParticipant: (participant: Participant) => void;
  addMessage: (message: ChatMessage) => void;
  updateMessageReaction: (messageId: string, reaction: { emoji: string; count: number; users: string[] }) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updateMyStatus: (status: UserStatus, currentTask?: string) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>()(
  immer((set) => ({
    room: null,
    currentUser: null,
    messages: [],
    isConnected: false,
    isLoading: false,
    error: null,

    setRoom: (room) => set((state) => { state.room = room; }),
    setCurrentUser: (user) => set((state) => { state.currentUser = user; }),

    addParticipant: (participant) =>
      set((state) => {
        if (state.room && !state.room.participants.find(p => p.id === participant.id)) {
          state.room.participants.push(participant);
        }
      }),

    removeParticipant: (participantId) =>
      set((state) => {
        if (state.room) {
          state.room.participants = state.room.participants.filter(p => p.id !== participantId);
        }
      }),

    updateParticipant: (participant) =>
      set((state) => {
        if (state.room) {
          const idx = state.room.participants.findIndex(p => p.id === participant.id);
          if (idx !== -1) {
            state.room.participants[idx] = participant;
          }
        }
        if (state.currentUser?.id === participant.id) {
          state.currentUser = participant;
        }
      }),

    addMessage: (message) =>
      set((state) => {
        // Dedupe by id (server may broadcast or component may double-register on reconnect)
        if (state.messages.find(m => m.id === message.id)) return;
        state.messages.push(message);
        if (state.messages.length > 200) {
          state.messages = state.messages.slice(-200);
        }
      }),

    updateMessageReaction: (messageId, reaction) =>
      set((state) => {
        const msg = state.messages.find(m => m.id === messageId);
        if (msg) {
          const idx = msg.reactions.findIndex(r => r.emoji === reaction.emoji);
          if (idx !== -1) {
            msg.reactions[idx] = reaction;
          } else {
            msg.reactions.push(reaction);
          }
        }
      }),

    setConnected: (connected) => set((state) => { state.isConnected = connected; }),
    setLoading: (loading) => set((state) => { state.isLoading = loading; }),
    setError: (error) => set((state) => { state.error = error; }),

    updateMyStatus: (status, currentTask) =>
      set((state) => {
        if (state.currentUser) {
          state.currentUser.status = status;
          if (currentTask !== undefined) state.currentUser.currentTask = currentTask;
        }
        if (state.room) {
          const me = state.room.participants.find(p => p.id === state.currentUser?.id);
          if (me) {
            me.status = status;
            if (currentTask !== undefined) me.currentTask = currentTask;
          }
        }
      }),

    reset: () =>
      set((state) => {
        state.room = null;
        state.currentUser = null;
        state.messages = [];
        state.isConnected = false;
        state.error = null;
      }),
  }))
);
