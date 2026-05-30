'use client';

import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-3.5 py-2.5 bg-[var(--bg-input)] border rounded-[8px] text-[var(--text-primary)] placeholder-[var(--text-muted)]',
            'focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25',
            'transition-all duration-150 text-sm',
            error ? 'border-[var(--danger)]' : 'border-[var(--border)] hover:border-[var(--border-strong)]',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
