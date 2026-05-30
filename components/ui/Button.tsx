'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, variant = 'primary', size = 'md', loading, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-medium tracking-tight rounded-[8px] transition-all duration-150 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]';

    const variants = {
      primary:   'bg-accent-grad text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_2px_8px_rgba(91,99,211,0.35)] hover:shadow-glow hover:brightness-110',
      secondary: 'bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--border-strong)]',
      ghost:     'bg-transparent hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
      outline:   'border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:border-[var(--accent)] bg-transparent',
      danger:    'bg-[var(--danger)] hover:brightness-110 text-white shadow-sm',
      success:   'bg-[var(--status-online)] hover:brightness-110 text-white shadow-sm',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5',
      md: 'text-sm px-4 py-2.5',
      lg: 'text-base px-6 py-3',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
