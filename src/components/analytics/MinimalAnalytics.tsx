import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, ShieldCheck, ShieldAlert, Cpu } from 'lucide-react';
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
  Legend 
} from 'recharts';
import { GlassContainer } from '../glass/GlassContainer';
import { getDetectionHistory, computeAnalytics } from '../../lib/api';
import { AnalyticsData } from '../../types';

export const MinimalAnalytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    const list = getDetectionHistory();
    setData(computeAnalytics(list));
  }, []);

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Detection Analytics
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Anonymous scan statistics and synthetic voice distribution.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <GlassContainer intensity="subtle" className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Scans</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{data.totalScans}</div>
        </GlassContainer>

        <GlassContainer intensity="subtle" className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Human Voices</div>
          <div className="text-2xl font-black text-emerald-500 mt-1">{data.realDetected}</div>
        </GlassContainer>

        <GlassContainer intensity="subtle" className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">AI-Generated</div>
          <div className="text-2xl font-black text-rose-500 mt-1">{data.fakeDetected}</div>
        </GlassContainer>

        <GlassContainer intensity="subtle" className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Avg Confidence</div>
          <div className="text-2xl font-black text-[#6366F1] mt-1">{data.avgConfidence}%</div>
        </GlassContainer>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassContainer
          intensity="deep"
          className="md:col-span-2 p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-3"
        >
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Activity Timeline</h4>
          <div className="h-60 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trendData}>
                <defs>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorFake" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#888888" fontSize={11} tickLine={false} />
                <YAxis stroke="#888888" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="real"
                  name="Human"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReal)"
                />
                <Area
                  type="monotone"
                  dataKey="fake"
                  name="AI-Generated"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorFake)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassContainer>

        <GlassContainer
          intensity="deep"
          className="p-5 rounded-2xl border border-slate-200/80 dark:border-white/10 space-y-3"
        >
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Classification Ratio</h4>
          <div className="h-60 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.riskDistribution}
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
                <Legend verticalAlign="bottom" height={30} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </GlassContainer>
      </div>
    </div>
  );
};
