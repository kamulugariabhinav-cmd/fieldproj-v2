import React from 'react';
import { Glass, GlassOptics } from '@samasante/liquid-glass';

export interface GlassContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  optics?: Partial<GlassOptics>;
  interactive?: boolean;
  glow?: boolean;
  intensity?: 'subtle' | 'medium' | 'deep';
  className?: string;
  lensEnabled?: boolean;
}

export const GlassContainer: React.FC<GlassContainerProps> = ({
  children,
  optics,
  interactive = false,
  glow = false,
  intensity = 'medium',
  className = '',
  lensEnabled = true,
  ...props
}) => {
  const intensityClass = {
    subtle: 'bg-white/40 dark:bg-[#0B1020]/40 backdrop-blur-md border border-white/20 dark:border-white/10 shadow-glass-sm',
    medium: 'bg-white/60 dark:bg-[#0B1020]/70 backdrop-blur-xl border border-white/30 dark:border-white/15 shadow-glass-md',
    deep: 'bg-white/80 dark:bg-[#0B1020]/85 backdrop-blur-2xl border border-white/40 dark:border-white/20 shadow-glass-lg',
  }[intensity];

  const glowClass = glow ? 'ring-1 ring-[var(--vg-accent)]/30 shadow-[0_0_25px_rgba(var(--vg-accent-rgb),0.15)]' : '';
  const interactiveClass = interactive ? 'hover:border-white/50 dark:hover:border-white/25 hover:shadow-glass-lg transition-all duration-300' : '';

  const defaultOptics: Partial<GlassOptics> = {
    strength: 0.5,
    dispersion: 0.25,
    ...optics,
  };

  const innerContent = (
    <div
      className={`relative overflow-hidden rounded-2xl ${intensityClass} ${glowClass} ${interactiveClass} ${className}`}
      {...props}
    >
      {/* Specular glass highlight reflection line */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent" />
      <div className="relative z-10">{children}</div>
    </div>
  );

  if (!lensEnabled) {
    return innerContent;
  }

  return (
    <Glass optics={defaultOptics}>
      {innerContent}
    </Glass>
  );
};
