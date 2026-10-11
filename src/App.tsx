import React, { useState } from 'react';
import { ThemeProvider } from './lib/theme';
import { MinimalHeader, MinimalNavTab } from './components/common/MinimalHeader';
import { DetectionPanel } from './components/detect/DetectionPanel';
import { MinimalHistory } from './components/history/MinimalHistory';
import { MinimalAnalytics } from './components/analytics/MinimalAnalytics';
import { AudioLines, History, BarChart2 } from 'lucide-react';
import { GlassContainer } from './components/glass/GlassContainer';

const MainContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MinimalNavTab>('detect');

  const renderContent = () => {
    switch (activeTab) {
      case 'detect':
        return <DetectionPanel />;
      case 'history':
        return <MinimalHistory />;
      case 'analytics':
        return <MinimalAnalytics />;
      default:
        return <DetectionPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1020] text-slate-900 dark:text-slate-100 transition-colors duration-200 relative overflow-x-hidden pb-20 sm:pb-12">
      {/* Background Refractive Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] rounded-full bg-[#6366F1]/10 blur-[130px]" />
        <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-purple-500/10 blur-[140px]" />
      </div>

      <div className="relative z-10 pt-4 px-4 sm:px-6">
        {/* Top Header */}
        <MinimalHeader activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Main Body */}
        <main className="py-2 animate-in fade-in duration-200">
          {renderContent()}
        </main>
      </div>

      {/* Floating Bottom Navigation on Mobile (<640px) */}
      <div className="sm:hidden fixed bottom-4 inset-x-4 z-40">
        <GlassContainer
          intensity="deep"
          className="p-1.5 flex items-center justify-around rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-lg"
        >
          <button
            onClick={() => setActiveTab('detect')}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all ${
              activeTab === 'detect'
                ? 'text-[#6366F1] font-bold bg-[#6366F1]/10'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <AudioLines className="w-5 h-5" />
            <span className="text-[10px]">Detect</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all ${
              activeTab === 'history'
                ? 'text-[#6366F1] font-bold bg-[#6366F1]/10'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <History className="w-5 h-5" />
            <span className="text-[10px]">History</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all ${
              activeTab === 'analytics'
                ? 'text-[#6366F1] font-bold bg-[#6366F1]/10'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            <span className="text-[10px]">Analytics</span>
          </button>
        </GlassContainer>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <MainContent />
    </ThemeProvider>
  );
};

export default App;
