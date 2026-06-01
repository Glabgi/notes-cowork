'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'focus' | 'break' | 'gaming' | 'away' | 'blue' | 'success' | 'warning' | 'error' | 'purple';
  className?: string;
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-[#f0ece4] text-[#7a6a55] border border-[var(--border)]',
    focus:   'bg-[#e3efe6] text-[#3f7566] border border-[#cfe3d6]',
    break:   'bg-[#f4e7d3] text-[#9a5a2e] border border-[#e8c4a0]',
    gaming:  'bg-[#f1e3d4] text-[#8a4f28] border border-[#ecd6c0]',
    away:    'bg-[#f0ece4] text-[#7a6a55] border border-[var(--border)]',
    blue:    'bg-[#f1e3d4] text-[#b06838] border border-[var(--border-accent)]',
    success: 'bg-[#e3efe6] text-[#3f7566] border border-[#cfe3d6]',
    warning: 'bg-[#f4e7d3] text-[#9a5a2e] border border-[#e8c4a0]',
    error:   'bg-[#f3e0dc] text-[#c4555a] border border-[#eccfcb]',
    purple:  'bg-[#f1e3d4] text-[#8a4f28] border border-[#ecd6c0]',
  };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
