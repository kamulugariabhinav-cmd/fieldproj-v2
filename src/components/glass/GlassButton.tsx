import React from 'react';
import { Glass } from '@samasante/liquid-glass';

export interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  disabled,
  className = '',
  ...props
}) => {
  const sizeClasses = {
    sm: 'text-xs px-3 py-1.5 gap-1.5 rounded-lg min-h-[36px]',
    md: 'text-sm px-4 py-2.5 gap-2 rounded-xl min-h-[44px]',
    lg: 'text-base px-6 py-3.5 gap-2.5 rounded-2xl min-h-[50px] font-medium',
  }[size];

  const variantClasses = {
    primary:
      'bg-[var(--vg-accent)] text-white shadow-[0_4px_20px_rgba(var(--vg-accent-rgb),0.35)] hover:shadow-[0_6px_25px_rgba(var(--vg-accent-rgb),0.5)] border border-white/30 hover:brightness-105 active:scale-[0.98]',
    accent:
      'bg-[var(--vg-accent)]/15 text-[var(--vg-accent)] border border-[var(--vg-accent)]/30 hover:bg-[var(--vg-accent)]/25 active:scale-[0.98]',
    secondary:
      'bg-white/40 dark:bg-white/10 text-slate-900 dark:text-slate-100 border border-white/40 dark:border-white/15 backdrop-blur-md shadow-glass-sm hover:bg-white/60 dark:hover:bg-white/15 hover:border-white/60 dark:hover:border-white/25 active:scale-[0.98]',
    ghost:
      'bg-transparent text-slate-700 dark:text-slate-300 hover:bg-white/20 dark:hover:bg-white/10 border border-transparent hover:border-white/20',
    danger:
      'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.2)]',
  }[variant];

  return (
    <Glass optics={{ strength: 0.35, dispersion: 0.2 }}>
      <button
        disabled={disabled || loading}
        className={`relative inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${sizeClasses} ${variantClasses} ${className}`}
        {...props}
      >
        {/* Internal specular highlight reflection */}
        <span className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-70" />
        
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : (
          icon && <span className="shrink-0">{icon}</span>
        )}
        <span>{children}</span>
        {iconRight && <span className="shrink-0">{iconRight}</span>}
      </button>
    </Glass>
  );
};
