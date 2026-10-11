import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  TrendingUp, 
  Cpu, 
  Clock, 
  ShieldCheck 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar,
  Legend
} from 'recharts';
import { GlassCard } from '../glass/GlassCard';
import { GlassKPICard } from '../glass/GlassKPICard';
import { getDetectionHistory, computeAnalytics } from '../../lib/api';
import { AnalyticsData } from '../../types';

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const list = getDetectionHistory();
    setData(computeAnalytics(list));
  }, []);

  if (!data) return null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Acoustic Forensics Analytics
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Aggregated detection volume, risk classifications, and neural latency benchmarks.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassKPICard
          title="Total Scans"
          value={data.totalScans}
          icon={<BarChart3 className="w-5 h-5 text-indigo-400" />}
          subtitle="Processed audio samples"
        />
        <GlassKPICard
          title="Synthetic Ratio"
          value={data.totalScans ? `${Math.round((data.fakeDetected / data.totalScans) * 100)}%` : '0%'}
          icon={<TrendingUp className="w-5 h-5 text-rose-500" />}
          subtitle="Identified as deepfakes"
        />
        <GlassKPICard
          title="Avg Inference"
          value={`${data.avgLatencyMs} ms`}
          icon={<Clock className="w-5 h-5 text-emerald-500" />}
          subtitle="Zero-shot latency"
        />
        <GlassKPICard
          title="Model Health"
          value="100%"
          icon={<ShieldCheck className="w-5 h-5 text-[var(--vg-accent)]" />}
          subtitle="AASIST-L Online"
        />
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detection Trends Area Chart */}
        <div className="lg:col-span-2">
          <GlassCard title="Detection Volume Trend" subtitle="Daily distribution of human vs synthetic scans">
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.trendData}>
                  <defs>
                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorFake" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="real"
                    name="Human Voice"
                    stroke="#10B981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="fake"
                    name="Synthetic Clone"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorFake)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>

        {/* Risk Breakdown Pie Chart */}
        <div>
          <GlassCard title="Verdict Distribution" subtitle="Proportion of genuine vs cloned signals">
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.riskDistribution}
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
