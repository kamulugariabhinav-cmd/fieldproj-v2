import React, { useState } from 'react';
import { ThemeProvider } from './lib/theme';
import { AuthProvider, useAuth } from './lib/auth';
import { GlassAppShell } from './components/layout/GlassAppShell';
import { LandingPage } from './components/public/LandingPage';
import { AuthModal } from './components/public/AuthModal';
import { DashboardOverview } from './components/dashboard/DashboardOverview';
import { AudioDetector } from './components/dashboard/AudioDetector';
import { DetectionHistory } from './components/dashboard/DetectionHistory';
import { AnalyticsView } from './components/dashboard/AnalyticsView';
import { AppearanceSettings } from './components/dashboard/AppearanceSettings';
import { AccountProfile } from './components/dashboard/AccountProfile';
import { HelpSupport } from './components/dashboard/HelpSupport';
import { AppView, DetectionResult } from './types';

const MainAppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('overview');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [selectedScan, setSelectedScan] = useState<DetectionResult | null>(null);
  const { isAuthenticated } = useAuth();

  const handleNavigate = (view: AppView) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'landing':
        return (
          <LandingPage
            onNavigate={handleNavigate}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        );
      case 'overview':
        return (
          <DashboardOverview
            onNavigate={handleNavigate}
            onSelectScan={(scan) => {
              setSelectedScan(scan);
              handleNavigate('history');
            }}
          />
        );
      case 'detection':
        return <AudioDetector />;
      case 'history':
        return <DetectionHistory />;
      case 'analytics':
        return <AnalyticsView />;
      case 'appearance':
        return <AppearanceSettings />;
      case 'profile':
      case 'account':
        return <AccountProfile />;
      case 'help':
        return <HelpSupport />;
      default:
        return (
          <DashboardOverview
            onNavigate={handleNavigate}
            onSelectScan={() => handleNavigate('history')}
          />
        );
    }
  };

  return (
    <GlassAppShell
      currentView={currentView}
      onNavigate={handleNavigate}
      onOpenAuth={() => setAuthModalOpen(true)}
    >
      {renderCurrentView()}
      
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </GlassAppShell>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
