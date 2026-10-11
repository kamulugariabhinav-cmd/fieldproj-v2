import React, { useEffect, useState } from 'react';
import { Sun, Moon, Laptop, AudioLines } from 'lucide-react';
import { Logo } from '../common/Logo';
import { useTheme } from '../../lib/theme';
import { checkBackendHealth } from '../../lib/api';
import { GlassContainer } from '../glass/GlassContainer';

export type MinimalNavTab = 'detect' | 'history' | 'analytics';

interface MinimalHeaderProps {
  activeTab: MinimalNavTab;
  onSelectTab: (tab: MinimalNavTab) => void;
}

export const MinimalHeader: React.FC<MinimalHeaderProps> = ({ activeTab, onSelectTab }) => {
  const { preferences, setMode } = useTheme();
  const [backendReady, setBackendReady] = useState<boolean | null>(null);

  useEffect(() => {
    checkBackendHealth()
      .then(() => setBackendReady(true))
      .catch(() => setBackendReady(false));
  }, []);

  const toggleTheme = () => {
    setMode(preferences.mode === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-4 z-40 max-w-4xl mx-auto px-4 mb-8">
      <GlassContainer
        intensity="deep"
        className="px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm border border-slate-200/80 dark:border-white/10 rounded-2xl"
      >
        {/* Left: VoiceGuard Logo */}
        <Logo onClick={() => onSelectTab('detect')} />

        {/* Center: Clean Nav Pills */}
        <nav className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/50 dark:border-white/5 text-xs font-semibold">
          <button
            onClick={() => onSelectTab('detect')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'detect'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Detect
          </button>
          <button
            onClick={() => onSelectTab('history')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            History
          </button>
          <button
            onClick={() => onSelectTab('analytics')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Analytics
          </button>
        </nav>

        {/* Right: Status Pill & Theme Toggle */}
        <div className="flex items-center gap-2">
          {backendReady !== null && (
            <span
              title={backendReady ? 'AASIST-L Backend Ready' : 'Backend Connecting...'}
              className={`w-2.5 h-2.5 rounded-full ${
                backendReady ? 'bg-emerald-500 shadow-xs' : 'bg-amber-500 animate-pulse'
              }`}
            />
          )}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            {preferences.mode === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>
        </div>
      </GlassContainer>
    </header>
  );
};
