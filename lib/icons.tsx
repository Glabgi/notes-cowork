// Shared icon helpers — single Lucide language across the app.
import {
  Briefcase, BookOpen, Palette, Dumbbell, Gamepad2, Leaf, Phone,
  Pin, Coffee, TreePine, Wind, Waves, VolumeX, Volume2, Bell, Music2, Cpu,
  Timer, Clock, Flame, Trophy, Rocket, Award, Handshake, Anchor, Crown,
  Sparkles, CheckCircle2, ThumbsUp, Heart, Smile, PartyPopper, Home,
  GraduationCap, FolderOpen, MessageSquare, Send, Users, Bot, User,
  Skull, Hourglass, Dice5, FileText, ListChecks, BarChart3, Calendar, Settings,
  ArrowRight, ArrowLeft, Check, X, AlertTriangle, Library,
} from 'lucide-react';

/* Activity types (scheduler / tasks) */
export const ActivityIcon: Record<string, React.ElementType> = {
  work: Briefcase,
  reading: BookOpen,
  creative: Palette,
  exercise: Dumbbell,
  gaming: Gamepad2,
  meditation: Leaf,
  meeting: Phone,
  other: Pin,
};

/* Task tags */
export const TaskTagIcon: Record<string, React.ElementType> = {
  work: Briefcase,
  study: GraduationCap,
  personal: Home,
  creative: Palette,
  other: FolderOpen,
};

/* Ambient sounds */
export const AmbientIcon: Record<string, React.ElementType> = {
  cafe: Coffee,
  forest: TreePine,
  'white-noise': Wind,
  rain: Waves,
  none: VolumeX,
};

/* Timer sound style */
export const TimerSoundIcon: Record<string, React.ElementType> = {
  bell: Bell,
  gong: Music2,
  chip: Cpu,
  none: VolumeX,
};

/* Reactions — Lucide replacement for emoji set, keys map to existing emoji values */
export const REACTIONS: { id: string; Icon: React.ElementType; label: string }[] = [
  { id: 'thumb',   Icon: ThumbsUp,    label: 'Класс' },
  { id: 'heart',   Icon: Heart,       label: 'Сердце' },
  { id: 'smile',   Icon: Smile,       label: 'Смех' },
  { id: 'fire',    Icon: Flame,       label: 'Огонь' },
  { id: 'party',   Icon: PartyPopper, label: 'Праздник' },
  { id: 'timer',   Icon: Timer,       label: 'Помидор' },
  { id: 'muscle',  Icon: Dumbbell,    label: 'Сила' },
  { id: 'check',   Icon: CheckCircle2,label: 'Готово' },
];

/* Re-export commonly needed glyphs so call sites pull from one place */
export {
  Briefcase, BookOpen, Palette, Dumbbell, Gamepad2, Leaf, Phone,
  Pin, Coffee, TreePine, Wind, Waves, VolumeX, Volume2, Bell, Music2, Cpu,
  Timer, Clock, Flame, Trophy, Rocket, Award, Handshake, Anchor, Crown,
  Sparkles, CheckCircle2, ThumbsUp, Heart, Smile, PartyPopper, Home,
  GraduationCap, FolderOpen, MessageSquare, Send, Users, Bot, User,
  Skull, Hourglass, Dice5, FileText, ListChecks, BarChart3, Calendar, Settings,
  ArrowRight, ArrowLeft, Check, X, AlertTriangle, Library,
};
