'use client';

import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'focus' | 'break' | 'gaming' | 'away' | 'blue' | 'success' | 'warning' | 'error' | 'purple';
  className?: string;
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-[#F1F5F9] text-[#64748B] border border-[var(--border)]',
    focus:   'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
    break:   'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]',
    gaming:  'bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]',
    away:    'bg-[#F1F5F9] text-[#64748B] border border-[var(--border)]',
    blue:    'bg-[#DBEAFE] text-[#1D4ED8] border border-[var(--border-accent)]',
    success: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
    warning: 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]',
    error:   'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]',
    purple:  'bg-[#EDE9FE] text-[#6D28D9] border border-[#DDD6FE]',
  };

  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}
