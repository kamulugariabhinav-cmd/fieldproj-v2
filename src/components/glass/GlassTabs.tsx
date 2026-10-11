import React from 'react';
import { Glass } from '@samasante/liquid-glass';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
}

export interface GlassTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const GlassTabs: React.FC<GlassTabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`p-1.5 rounded-2xl bg-white/40 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 shadow-glass-sm flex flex-wrap gap-1.5 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Glass key={tab.id} optics={{ strength: isActive ? 0.4 : 0.1 }}>
            <button
              onClick={() => onChange(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'bg-white/80 dark:bg-white/20 text-slate-950 dark:text-white shadow-glass-sm border border-white/50 dark:border-white/20 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/20 dark:hover:bg-white/5'
              }`}
            >
              {isActive && (
                <div className="absolute inset-x-2 top-0 h-[1.5px] bg-[var(--vg-accent)] rounded-full" />
              )}
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--vg-accent)]/20 text-[var(--vg-accent)] font-semibold">
                  {tab.badge}
                </span>
              )}
            </button>
          </Glass>
        );
      })}
    </div>
  );
};
