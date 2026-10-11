import React from 'react';
import { GlassCard } from './GlassCard';

export interface GlassKPICardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon: React.ReactNode;
  subtitle?: string;
}

export const GlassKPICard: React.FC<GlassKPICardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  icon,
  subtitle,
}) => {
  return (
    <GlassCard interactive intensity="medium" className="transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        <div className="p-2.5 rounded-xl bg-white/40 dark:bg-white/10 text-[var(--vg-accent)] border border-white/30 dark:border-white/10 shadow-glass-xs">
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {value}
        </div>
        <div className="flex items-center gap-2 pt-1">
          {change ? (
            <span
              className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-0.5 rounded-md ${
                isPositive
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              }`}
            >
              {isPositive ? '↑' : '↓'} {change}
            </span>
          ) : (
            <span className="text-xs text-slate-400">N/A</span>
          )}
          {subtitle && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </GlassCard>
  );
};
