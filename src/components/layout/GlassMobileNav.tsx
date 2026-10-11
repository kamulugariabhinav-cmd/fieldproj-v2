import React from 'react';
import { LayoutDashboard, Mic, History, BarChart3, Settings } from 'lucide-react';
import { GlassContainer } from '../glass/GlassContainer';
import { AppView } from '../../types';

interface GlassMobileNavProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export const GlassMobileNav: React.FC<GlassMobileNavProps> = ({ currentView, onNavigate }) => {
  const items: Array<{ id: AppView; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'detection', label: 'Detect', icon: <Mic className="w-5 h-5" /> },
    { id: 'history', label: 'History', icon: <History className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'appearance', label: 'Theme', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <div className="md:hidden fixed bottom-4 inset-x-4 z-40">
      <GlassContainer
        intensity="deep"
        className="px-3 py-2 flex items-center justify-around shadow-glass-xl border-white/30 dark:border-white/15"
      >
        {items.map((item) => {
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                active
                  ? 'text-[var(--vg-accent)] scale-105 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <div className={`p-1 rounded-lg ${active ? 'bg-[var(--vg-accent)]/15' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px]">{item.label}</span>
            </button>
          );
        })}
      </GlassContainer>
    </div>
  );
};
