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
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">{label}</label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 bg-[var(--bg-card)] border rounded-[12px] text-[var(--text-primary)] placeholder-[#94A3B8]',
            'shadow-[0_1px_3px_rgba(15,23,42,0.06)]',
            'focus:outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[#DBEAFE]/50',
            'transition-all duration-150 text-sm',
            error ? 'border-[#EF4444]' : 'border-[var(--border)] hover:border-[var(--border-strong)]',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-[#EF4444]">{error}</p>}
        {hint && !error && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
