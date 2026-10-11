import React from 'react';

export interface GlassBadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'danger' | 'warning' | 'accent';
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const GlassBadge: React.FC<GlassBadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  pulse = false,
}) => {
  const variantStyles = {
    neutral: 'bg-white/30 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-white/30 dark:border-white/15',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    danger: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    accent: 'bg-[var(--vg-accent)]/15 text-[var(--vg-accent)] border-[var(--vg-accent)]/30',
  }[variant];

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  }[size];

  return (
    <span className={`inline-flex items-center font-medium rounded-full border backdrop-blur-md shadow-glass-xs ${variantStyles} ${sizeStyles}`}>
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
        </span>
      )}
      {children}
    </span>
  );
};
