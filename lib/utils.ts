import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(): string {
  const adjectives = [
    'morning', 'cosmic', 'quiet', 'deep', 'bright', 'swift', 'calm', 'bold',
    'fresh', 'golden', 'silver', 'crystal', 'forest', 'ocean', 'urban', 'zen',
    'laser', 'pixel', 'turbo', 'neon', 'cyber', 'alpha', 'omega', 'delta',
  ];
  const nouns = [
    'crew', 'squad', 'team', 'lab', 'hub', 'den', 'base', 'nest',
    'forge', 'grove', 'cove', 'peak', 'zone', 'spot', 'room', 'space',
    'pod', 'dock', 'port', 'gate', 'node', 'core', 'nexus', 'flow',
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.random().toString(36).substring(2, 6);
  return `${adj}-${noun}-${num}`;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}м`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}ч ${m}м` : `${h}ч`;
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    focus: 'В фокусе',
    break: 'Перерыв',
    playing: 'Играет',
    away: 'Отошёл',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    focus: 'bg-green-500',
    break: 'bg-amber-500',
    playing: 'bg-purple-500',
    away: 'bg-gray-400',
  };
  return colors[status] || 'bg-gray-400';
}

export function getTagColor(tag: string): string {
  const colors: Record<string, string> = {
    work: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    study: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    personal: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
    creative: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    other: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };
  return colors[tag] || colors.other;
}

export function getActivityColor(type: string): string {
  const colors: Record<string, string> = {
    work: '#3B82F6',
    reading: '#8B5CF6',
    creative: '#F59E0B',
    exercise: '#10B981',
    gaming: '#EC4899',
    meditation: '#6366F1',
    meeting: '#EF4444',
  };
  return colors[type] || '#6B7280';
}

export function getActivityLabel(type: string): string {
  const labels: Record<string, string> = {
    work: 'Работа',
    reading: 'Чтение',
    creative: 'Творчество',
    exercise: 'Спорт',
    gaming: 'Игры',
    meditation: 'Отдых',
    meeting: 'Созвон',
  };
  return labels[type] || type;
}

export function shareUrl(url: string, platform: 'telegram' | 'whatsapp', text: string): void {
  const encoded = encodeURIComponent(text + '\n' + url);
  const links = {
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    whatsapp: `https://wa.me/?text=${encoded}`,
  };
  window.open(links[platform], '_blank');
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
