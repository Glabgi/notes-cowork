import { create } from 'zustand';
import type { GameType, GameInvite, ChessGame, TicTacToeGame, BattleshipGame } from '@/types';

interface GameStore {
  activeGame: { type: GameType; id: string } | null;
  pendingInvites: GameInvite[];
  chessGame: ChessGame | null;
  tictactoeGame: TicTacToeGame | null;
  battleshipGame: BattleshipGame | null;
  isGameOpen: boolean;

  setActiveGame: (game: { type: GameType; id: string } | null) => void;
  addInvite: (invite: GameInvite) => void;
  removeInvite: (inviteId: string) => void;
  setChessGame: (game: ChessGame | null) => void;
  setTicTacToeGame: (game: TicTacToeGame | null) => void;
  setBattleshipGame: (game: BattleshipGame | null) => void;
  setGameOpen: (open: boolean) => void;
  closeGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  activeGame: null,
  pendingInvites: [],
  chessGame: null,
  tictactoeGame: null,
  battleshipGame: null,
  isGameOpen: false,

  setActiveGame: (game) => set({ activeGame: game }),
  addInvite: (invite) => set((s) => ({ pendingInvites: [...s.pendingInvites, invite] })),
  removeInvite: (inviteId) =>
    set((s) => ({ pendingInvites: s.pendingInvites.filter(i => i.id !== inviteId) })),
  setChessGame: (game) => set({ chessGame: game }),
  setTicTacToeGame: (game) => set({ tictactoeGame: game }),
  setBattleshipGame: (game) => set({ battleshipGame: game }),
  setGameOpen: (open) => set({ isGameOpen: open }),
  closeGame: () => set({ isGameOpen: false, activeGame: null }),
}));
