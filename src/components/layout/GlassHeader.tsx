import React, { useEffect, useState } from 'react';
import { 
  Sun, 
  Moon, 
  Laptop, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldAlert,
  Sparkles 
} from 'lucide-react';
import { GlassContainer } from '../glass/GlassContainer';
import { GlassBadge } from '../glass/GlassBadge';
import { useTheme, ACCENT_MAP } from '../../lib/theme';
import { useAuth } from '../../lib/auth';
import { checkBackendHealth } from '../../lib/api';
import { AppView } from '../../types';

interface GlassHeaderProps {
  onNavigate: (view: AppView) => void;
  onOpenAuth?: () => void;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({ onNavigate, onOpenAuth }) => {
  const { preferences, resolvedTheme, setMode } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [backendStatus, setBackendStatus] = useState<'online' | 'checking' | 'offline'>('checking');

  const verifyHealth = async () => {
    setBackendStatus('checking');
    try {
      await checkBackendHealth();
      setBackendStatus('online');
    } catch {
      setBackendStatus('offline');
    }
  };

  useEffect(() => {
    verifyHealth();
    const interval = setInterval(verifyHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleThemeMode = () => {
    if (preferences.mode === 'light') setMode('dark');
    else if (preferences.mode === 'dark') setMode('system');
    else setMode('light');
  };

  return (
    <header className="sticky top-4 z-30 px-4 md:px-6 mb-6">
      <GlassContainer
        intensity="medium"
        className="px-4 py-3 sm:px-6 flex items-center justify-between shadow-glass-md border-white/30 dark:border-white/10"
      >
        {/* Status & Model info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                backendStatus === 'online'
                  ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]'
                  : backendStatus === 'checking'
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-rose-500 shadow-[0_0_8px_#EF4444]'
              }`}
            />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden sm:inline">
              {backendStatus === 'online'
                ? 'Backend Operational (AASIST-L)'
                : backendStatus === 'checking'
                ? 'Verifying Cloud Inference...'
                : 'Backend Standby'}
            </span>
          </div>

          <GlassBadge variant={backendStatus === 'online' ? 'success' : 'warning'} size="sm">
            {backendStatus === 'online' ? '99.2% Spec Accuracy' : 'Render Live'}
          </GlassBadge>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick theme toggle */}
          <button
            onClick={toggleThemeMode}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white/30 dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/10 border border-white/30 dark:border-white/10 transition-colors"
            title={`Current: ${preferences.mode} (Click to switch)`}
          >
            {preferences.mode === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : preferences.mode === 'dark' ? (
              <Moon className="w-4 h-4 text-indigo-400" />
            ) : (
              <Laptop className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Accent Color Indicator */}
          <button
            onClick={() => onNavigate('appearance')}
            className="p-1.5 rounded-xl bg-white/30 dark:bg-white/5 border border-white/30 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5"
            title="Appearance Settings"
          >
            <span
              className="w-3.5 h-3.5 rounded-full shadow-sm"
              style={{ backgroundColor: ACCENT_MAP[preferences.accent].hex }}
            />
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 capitalize hidden md:inline">
              {preferences.accent}
            </span>
          </button>

          {/* User Profile or Sign In */}
          {isAuthenticated && user ? (
            <button
              onClick={() => onNavigate('profile')}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl bg-white/30 dark:bg-white/5 border border-white/30 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-[var(--vg-accent)] text-white text-[11px] font-bold flex items-center justify-center">
                {user.name ? user.name[0] : 'U'}
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden sm:inline">
                {user.name || 'Account'}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[var(--vg-accent)] text-white hover:brightness-105 shadow-sm transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </GlassContainer>
    </header>
  );
};
