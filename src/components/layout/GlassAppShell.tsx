import React from 'react';
import { GlassSidebar } from './GlassSidebar';
import { GlassHeader } from './GlassHeader';
import { GlassMobileNav } from './GlassMobileNav';
import { AppView } from '../../types';

interface GlassAppShellProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenAuth: () => void;
  children: React.ReactNode;
}

export const GlassAppShell: React.FC<GlassAppShellProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-[#0B1020] text-slate-900 dark:text-slate-100 transition-colors duration-300 relative overflow-x-hidden selection:bg-[var(--vg-accent)] selection:text-white">
      {/* Background Refractive Ambient Glow Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[var(--vg-accent)]/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 rounded-full bg-purple-500/15 blur-[140px]" />
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 rounded-full bg-blue-500/15 blur-[130px]" />
      </div>

      {/* Floating Desktop Sidebar */}
      <GlassSidebar currentView={currentView} onNavigate={onNavigate} />

      {/* Main Content Area */}
      <div className="relative z-10 md:pl-24 lg:pl-72 flex flex-col min-h-screen transition-all duration-300 pb-24 md:pb-10">
        <GlassHeader onNavigate={onNavigate} onOpenAuth={onOpenAuth} />
        
        <main className="flex-1 px-4 md:px-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
          {children}
        </main>
      </div>

      {/* Floating Mobile Bottom Navigation */}
      <GlassMobileNav currentView={currentView} onNavigate={onNavigate} />
    </div>
  );
};
