import React, { useState } from 'react';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Mic, 
  History, 
  BarChart3, 
  User, 
  Palette, 
  Settings, 
  HelpCircle, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { GlassContainer } from '../glass/GlassContainer';
import { useAuth } from '../../lib/auth';
import { AppView } from '../../types';

interface GlassSidebarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export const GlassSidebar: React.FC<GlassSidebarProps> = ({ currentView, onNavigate }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const primaryNav: Array<{ id: AppView; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'detection', label: 'New Detection', icon: <Mic className="w-5 h-5" /> },
    { id: 'history', label: 'History', icon: <History className="w-5 h-5" /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-5 h-5" /> },
  ];

  const secondaryNav: Array<{ id: AppView; label: string; icon: React.ReactNode }> = [
    { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="w-5 h-5" /> },
    { id: 'account', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
    { id: 'help', label: 'Help & Docs', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  return (
    <aside
      className={`hidden md:flex flex-col fixed left-4 top-4 bottom-4 z-40 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <GlassContainer
        intensity="deep"
        className="h-full flex flex-col justify-between p-4 shadow-glass-xl border-white/30 dark:border-white/15"
      >
        {/* Brand / Logo */}
        <div className="space-y-6">
          <div className="flex items-center justify-between px-2 pt-2">
            <div
              onClick={() => onNavigate('overview')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--vg-accent)] to-indigo-400 p-0.5 shadow-glass-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950/80 rounded-[10px] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
              </div>
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                    VoiceGuard
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--vg-accent)]/20 text-[var(--vg-accent)] font-mono">
                      AI
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    AASIST-L Security
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/20 dark:hover:bg-white/5 transition-colors"
              title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Primary Nav */}
          <div className="space-y-1">
            <div className={`px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ${collapsed ? 'text-center' : ''}`}>
              {collapsed ? '•' : 'Main Menu'}
            </div>
            {primaryNav.map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[var(--vg-accent)]/25 to-[var(--vg-accent)]/10 text-[var(--vg-accent)] dark:text-white font-semibold border border-[var(--vg-accent)]/30 shadow-glass-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/20 dark:hover:bg-white/5'
                  }`}
                >
                  <span className={`${active ? 'text-[var(--vg-accent)]' : 'text-slate-400 dark:text-slate-500'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                  {active && !collapsed && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--vg-accent)] shadow-[0_0_8px_var(--vg-accent)]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary Nav */}
          <div className="space-y-1 pt-4 border-t border-white/20 dark:border-white/10">
            <div className={`px-2 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 ${collapsed ? 'text-center' : ''}`}>
              {collapsed ? '•' : 'Account'}
            </div>
            {secondaryNav.map((item) => {
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-gradient-to-r from-[var(--vg-accent)]/25 to-[var(--vg-accent)]/10 text-[var(--vg-accent)] dark:text-white font-semibold border border-[var(--vg-accent)]/30 shadow-glass-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/20 dark:hover:bg-white/5'
                  }`}
                >
                  <span className={`${active ? 'text-[var(--vg-accent)]' : 'text-slate-400 dark:text-slate-500'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer / User Profile & Logout */}
        <div className="pt-4 border-t border-white/20 dark:border-white/10 space-y-2">
          {user && (
            <div className={`flex items-center gap-3 p-2 rounded-xl bg-white/20 dark:bg-white/5 ${collapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {user.name || 'Analyst'}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                    {user.email || user.phone || 'Standard Plan'}
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={logout}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Sign Out"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </GlassContainer>
    </aside>
  );
};
