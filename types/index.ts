// ===================== USER & PARTICIPANTS =====================

export type UserStatus = 'focus' | 'break' | 'playing' | 'away';

export interface Avatar {
  id: string;
  svg: string;
  color: string;
}

export interface Participant {
  id: string;
  name: string;
  avatarId: string;
  status: UserStatus;
  currentTask?: string;
  customStatus?: string;
  pomodoroCount: number;
  focusMinutes: number;
  joinedAt: number;
  isOwner?: boolean;
  socketId?: string;
}

// ===================== ROOM =====================

export interface Room {
  id: string;
  slug: string;
  name: string;
  ownerId: string;
  isPrivate: boolean;
  password?: string;
  maxParticipants: number;
  participants: Participant[];
  createdAt: number;
  lastActivity: number;
  timerMode: 'group' | 'personal';
}

export interface RoomSettings {
  name: string;
  isPrivate: boolean;
  password?: string;
  maxParticipants: number;
  timerMode: 'group' | 'personal';
}

// ===================== CHAT =====================

export interface ChatReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userAvatarId: string;
  content: string;
  reactions: ChatReaction[];
  createdAt: number;
}

// ===================== TIMER =====================

export type TimerPhase = 'focus' | 'shortBreak' | 'longBreak';

export interface TimerState {
  phase: TimerPhase;
  isRunning: boolean;
  timeLeft: number; // seconds
  totalTime: number; // seconds
  pomodoroCount: number;
  settings: TimerSettings;
}

export interface TimerSettings {
  focusDuration: number; // minutes
  shortBreakDuration: number; // minutes
  longBreakDuration: number; // minutes
  longBreakInterval: number; // pomodoros before long break
  autoStart: boolean;
  sound: 'bell' | 'gong' | 'chip' | 'none';
}

// ===================== TASKS =====================

export type TaskTag = 'work' | 'study' | 'personal' | 'creative' | 'other';

export interface Task {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  isPublic: boolean;
  tag: TaskTag;
  pomodoroCount: number;
  estimatedPomodoros?: number;
  createdAt: number;
  completedAt?: number;
  order: number;
}

// ===================== GAMES =====================

export type GameType = 'chess' | 'tictactoe' | 'battleship';

export interface GameInvite {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId?: string; // undefined = open invite
  gameType: GameType;
  roomId: string;
  createdAt: number;
}

// Chess
export interface ChessGame {
  id: string;
  roomId: string;
  whitePlayerId: string;
  blackPlayerId: string;
  fen: string;
  pgn: string;
  turn: 'w' | 'b';
  status: 'waiting' | 'active' | 'checkmate' | 'draw' | 'resigned';
  winner?: string;
  timeControl: { initial: number; increment: number };
  whiteTime: number;
  blackTime: number;
  createdAt: number;
}

// TicTacToe
export type TicTacToeCell = 'X' | 'O' | null;
export interface TicTacToeGame {
  id: string;
  roomId: string;
  xPlayerId: string;
  oPlayerId: string;
  board: TicTacToeCell[];
  currentTurn: 'X' | 'O';
  winner: 'X' | 'O' | 'draw' | null;
  xScore: number;
  oScore: number;
  mode: 'classic' | 'ultimate';
  status: 'waiting' | 'active' | 'finished';
}

// Battleship
export type BattleshipCell = 'empty' | 'ship' | 'hit' | 'miss' | 'sunk';
export interface Ship {
  id: string;
  size: number;
  positions: number[];
  hits: number[];
  sunk: boolean;
}

export interface BattleshipPlayer {
  id: string;
  board: BattleshipCell[];
  ships: Ship[];
  ready: boolean;
}

export interface BattleshipGame {
  id: string;
  roomId: string;
  player1: BattleshipPlayer;
  player2: BattleshipPlayer;
  currentTurn: string; // userId
  status: 'setup' | 'active' | 'finished';
  winner?: string;
  createdAt: number;
}

// ===================== SCHEDULER =====================

export type ActivityType = 'work' | 'reading' | 'creative' | 'exercise' | 'gaming' | 'meditation' | 'meeting';

export interface ScheduleBlock {
  id: string;
  type: ActivityType;
  title: string;
  startHour: number; // 0-23
  duration: number; // minutes
  pomodoroCount?: number;
  color: string;
}

export interface DaySchedule {
  date: string;
  blocks: ScheduleBlock[];
}

// ===================== ANALYTICS =====================

export interface DailyStats {
  date: string;
  focusMinutes: number;
  pomodoroCount: number;
  tasksCompleted: number;
  gamesPlayed: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  unlockedAt?: number;
}

// ===================== SOCKET EVENTS =====================

export interface ServerToClientEvents {
  'room:state': (room: Room) => void;
  'room:participant-joined': (participant: Participant) => void;
  'room:participant-left': (participantId: string) => void;
  'room:participant-updated': (participant: Participant) => void;
  'chat:message': (message: ChatMessage) => void;
  'chat:reaction': (data: { messageId: string; reaction: ChatReaction }) => void;
  'timer:state': (timer: TimerState) => void;
  'timer:tick': (timeLeft: number) => void;
  'game:invite': (invite: GameInvite) => void;
  'game:start': (data: { gameType: GameType; gameId: string }) => void;
  'chess:update': (game: ChessGame) => void;
  'tictactoe:update': (game: TicTacToeGame) => void;
  'battleship:update': (game: BattleshipGame) => void;
  'room:kicked': () => void;
}

export interface ClientToServerEvents {
  'room:join': (data: { slug: string; participant: Omit<Participant, 'socketId'> }) => void;
  'room:leave': (roomId: string) => void;
  'room:update-status': (data: { roomId: string; status: UserStatus; currentTask?: string }) => void;
  'chat:send': (data: { roomId: string; content: string }) => void;
  'chat:react': (data: { roomId: string; messageId: string; emoji: string }) => void;
  'timer:start': (data: { roomId: string; settings: TimerSettings }) => void;
  'timer:pause': (roomId: string) => void;
  'timer:reset': (roomId: string) => void;
  'game:invite': (invite: Omit<GameInvite, 'id' | 'createdAt'>) => void;
  'game:accept': (data: { inviteId: string; roomId: string }) => void;
  'chess:move': (data: { gameId: string; move: string }) => void;
  'chess:resign': (gameId: string) => void;
  'tictactoe:move': (data: { gameId: string; cell: number }) => void;
  'battleship:ready': (data: { gameId: string; ships: Ship[] }) => void;
  'battleship:shoot': (data: { gameId: string; cell: number }) => void;
  'room:transfer-owner': (data: { roomId?: string; targetUserId: string }) => void;
  'room:kick': (data: { roomId?: string; targetUserId: string }) => void;
}
