'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
}

export default function Modal({ open, onClose, title, children, size = 'md', showClose = true }: ModalProps) {
  const sizes = {
    sm:   'max-w-sm',
    md:   'max-w-md',
    lg:   'max-w-lg',
    xl:   'max-w-2xl',
    full: 'max-w-4xl',
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ animation: 'fadeIn 0.15s ease-out' }}
    >
      <div className="absolute inset-0 bg-[#0F172A]/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative w-full bg-[var(--bg-card)] rounded-[24px] border border-[var(--border)] overflow-hidden',
          'shadow-[0_8px_32px_rgba(15,23,42,0.10),0_4px_12px_rgba(15,23,42,0.06)]',
          sizes[size]
        )}
        style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            {title && <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>}
            {showClose && (
              <button
                onClick={onClose}
                className="ml-auto p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="overflow-y-auto max-h-[85vh]">
          {children}
        </div>
      </div>
    </div>
  );
}
