import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Trash2, 
  FileAudio, 
  CheckCircle, 
  AlertTriangle, 
  ArrowUpDown,
  Download
} from 'lucide-react';
import { GlassCard } from '../glass/GlassCard';
import { GlassInput } from '../glass/GlassInput';
import { GlassButton } from '../glass/GlassButton';
import { GlassBadge } from '../glass/GlassBadge';
import { getDetectionHistory, clearDetectionHistory } from '../../lib/api';
import { DetectionResult } from '../../types';

export const DetectionHistory: React.FC = () => {
  const [history, setHistory] = useState<DetectionResult[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'fake' | 'real'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    setHistory(getDetectionHistory());
  }, []);

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your local analysis history?')) {
      clearDetectionHistory();
      setHistory([]);
    }
  };

  const filtered = history
    .filter((item) => {
      if (search && !item.filename.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterType === 'fake' && item.prediction !== 'POSSIBLE_AI_VOICE') return false;
      if (filterType === 'real' && item.prediction === 'POSSIBLE_AI_VOICE') return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Detection History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Audit logs and forensic reports of all processed audio files.
          </p>
        </div>
        {history.length > 0 && (
          <GlassButton variant="danger" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={handleClear}>
            Clear History
          </GlassButton>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <GlassInput
            placeholder="Search files by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="w-full bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/30 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--vg-accent)]"
          >
            <option value="all">All Verdicts</option>
            <option value="fake">AI Synthetic Only</option>
            <option value="real">Human Real Only</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="p-2.5 rounded-xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 transition-colors shrink-0"
            title="Toggle Sort Order"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Records list */}
      <GlassCard>
        {filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <FileAudio className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No detection records found</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Try adjusting your filter or upload a new audio sample.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/20 dark:divide-white/10">
            {filtered.map((item) => {
              const isFake = item.prediction === 'POSSIBLE_AI_VOICE';
              return (
                <div
                  key={item.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/10 dark:hover:bg-white/5 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isFake
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isFake ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {item.filename}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                        <span>•</span>
                        <span>Model: {item.model_name}</span>
                        <span>•</span>
                        <span>Latency: {item.inference_time_ms}ms</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {item.confidence}%
                      </div>
                      <div className="text-[10px] text-slate-400">Confidence</div>
                    </div>

                    <GlassBadge variant={isFake ? 'danger' : 'success'} size="md">
                      {isFake ? 'SYNTHETIC' : 'HUMAN'}
                    </GlassBadge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
};
