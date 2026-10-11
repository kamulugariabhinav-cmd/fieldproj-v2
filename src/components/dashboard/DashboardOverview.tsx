import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Mic, 
  BarChart3, 
  ArrowUpRight, 
  History, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { GlassKPICard } from '../glass/GlassKPICard';
import { GlassCard } from '../glass/GlassCard';
import { GlassButton } from '../glass/GlassButton';
import { GlassBadge } from '../glass/GlassBadge';
import { getDetectionHistory, computeAnalytics } from '../../lib/api';
import { AppView, DetectionResult, AnalyticsData } from '../../types';

interface DashboardOverviewProps {
  onNavigate: (view: AppView) => void;
  onSelectScan?: (scan: DetectionResult) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate, onSelectScan }) => {
  const [history, setHistory] = useState<DetectionResult[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const list = getDetectionHistory();
    setHistory(list);
    setAnalytics(computeAnalytics(list));
  }, []);

  const recentScans = history.slice(0, 5);

  return (
    <div className="space-y-8 py-2">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Security Intelligence Console
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time acoustic analysis powered by the AASIST-L neural engine.
          </p>
        </div>
        <GlassButton
          variant="primary"
          size="md"
          icon={<Mic className="w-4 h-4" />}
          onClick={() => onNavigate('detection')}
        >
          New Audio Scan
        </GlassButton>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassKPICard
          title="Total Analyses"
          value={analytics ? analytics.totalScans : 0}
          change="+18.4%"
          isPositive={true}
          icon={<BarChart3 className="w-5 h-5" />}
          subtitle="All audio runs"
        />
        <GlassKPICard
          title="Real Voice Verified"
          value={analytics ? analytics.realDetected : 0}
          change="+12.0%"
          isPositive={true}
          icon={<ShieldCheck className="w-5 h-5 text-emerald-500" />}
          subtitle="Human acoustic patterns"
        />
        <GlassKPICard
          title="Synthetic Clones"
          value={analytics ? analytics.fakeDetected : 0}
          change="-4.2%"
          isPositive={false}
          icon={<ShieldAlert className="w-5 h-5 text-rose-500" />}
          subtitle="AI spoof detected"
        />
        <GlassKPICard
          title="Avg Confidence"
          value={analytics ? `${analytics.avgConfidence}%` : '0%'}
          change="+1.5%"
          isPositive={true}
          icon={<Cpu className="w-5 h-5 text-[var(--vg-accent)]" />}
          subtitle="Spectral calibration"
        />
      </div>

      {/* Recent Detections Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <GlassCard
            title="Recent Audio Analyses"
            subtitle="Real-time timeline of verified audio records"
            action={
              <GlassButton
                variant="ghost"
                size="sm"
                iconRight={<ArrowUpRight className="w-3.5 h-3.5" />}
                onClick={() => onNavigate('history')}
              >
                View Full History
              </GlassButton>
            }
          >
            {recentScans.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <Mic className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No audio scans recorded yet. Upload an audio sample to test the model.
                </p>
                <GlassButton variant="primary" size="sm" onClick={() => onNavigate('detection')}>
                  Start First Scan
                </GlassButton>
              </div>
            ) : (
              <div className="divide-y divide-white/20 dark:divide-white/10">
                {recentScans.map((scan) => {
                  const isFake = scan.prediction === 'POSSIBLE_AI_VOICE';
                  return (
                    <div
                      key={scan.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/10 dark:hover:bg-white/5 px-2 rounded-xl transition-colors cursor-pointer"
                      onClick={() => onSelectScan && onSelectScan(scan)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isFake
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isFake ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {scan.filename}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(scan.timestamp).toLocaleString()} • {scan.audio_duration_seconds ? `${scan.audio_duration_seconds.toFixed(1)}s` : 'Audio'} • {scan.inference_time_ms}ms
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <GlassBadge variant={isFake ? 'danger' : 'success'} size="sm">
                          {isFake ? 'SYNTHETIC AI' : 'HUMAN VOICE'}
                        </GlassBadge>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {scan.confidence}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Neural Engine Status Card */}
        <div className="space-y-4">
          <GlassCard
            title="AASIST-L Architecture"
            subtitle="Spectral Graph Model"
          >
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-white/30 dark:bg-white/5 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Model Checkpoint</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">AASIST-L (Raw Graph Attention)</p>
              </div>

              <div className="p-3 rounded-xl bg-white/30 dark:bg-white/5 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sample Rate Target</span>
                <p className="font-semibold text-slate-800 dark:text-slate-200">16,000 Hz Mono Resampled</p>
              </div>

              <div className="p-3 rounded-xl bg-white/30 dark:bg-white/5 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Benchmark</span>
                <p className="font-semibold text-emerald-500 font-mono">ASVspoof 2019 / 2021 LA Track</p>
              </div>

              <GlassButton
                variant="accent"
                size="sm"
                className="w-full justify-center"
                onClick={() => onNavigate('analytics')}
              >
                Inspect Analytical Curves
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
