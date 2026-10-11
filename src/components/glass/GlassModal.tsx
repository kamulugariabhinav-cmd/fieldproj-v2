import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { GlassContainer } from './GlassContainer';

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }[maxWidth];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className={`relative w-full ${maxWidthClass} z-10 animate-in fade-in zoom-in-95 duration-200`}>
        <GlassContainer intensity="deep" className="p-6 sm:p-8 shadow-glass-xl border-white/30 dark:border-white/20">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white/20 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>

          {(title || description) && (
            <div className="mb-6 space-y-1 pr-8">
              {title && <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>}
              {description && <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
          )}

          {children}
        </GlassContainer>
      </div>
    </div>
  );
};
