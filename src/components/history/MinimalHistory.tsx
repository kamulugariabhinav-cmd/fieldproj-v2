import React, { useState, useEffect } from 'react';
import { Search, Trash2, CheckCircle, AlertTriangle, FileAudio, RotateCcw } from 'lucide-react';
import { GlassContainer } from '../glass/GlassContainer';
import { GlassButton } from '../glass/GlassButton';
import { GlassBadge } from '../glass/GlassBadge';
import { getDetectionHistory, clearDetectionHistory } from '../../lib/api';
import { DetectionResult } from '../../types';

export const MinimalHistory: React.FC = () => {
  const [history, setHistory] = useState<DetectionResult[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'fake' | 'real'>('all');

  useEffect(() => {
    setHistory(getDetectionHistory());
  }, []);

  const handleClear = () => {
    if (window.confirm('Clear all local detection history records?')) {
      clearDetectionHistory();
      setHistory([]);
    }
  };

  const filtered = history.filter((item) => {
    if (search && !item.filename.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'fake' && item.prediction !== 'POSSIBLE_AI_VOICE') return false;
    if (filter === 'real' && item.prediction === 'POSSIBLE_AI_VOICE') return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Detection History
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Past audio files and voice recordings analyzed on this browser.
          </p>
        </div>
        {history.length > 0 && (
          <GlassButton
            variant="danger"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={handleClear}
          >
            Clear History
          </GlassButton>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search audio filenames..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-white/70 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
          />
        </div>
        <div className="flex gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('real')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'real'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
            }`}
          >
            Human
          </button>
          <button
            onClick={() => setFilter('fake')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === 'fake'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
            }`}
          >
            AI-Generated
          </button>
        </div>
      </div>

      {/* Records */}
      <GlassContainer
        intensity="deep"
        className="p-4 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm"
      >
        {filtered.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <FileAudio className="w-8 h-8 mx-auto text-slate-400 opacity-60" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No detection records found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Run an audio upload or live recording to record detections here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200/60 dark:divide-white/10">
            {filtered.map((item) => {
              const isFake = item.prediction === 'POSSIBLE_AI_VOICE';
              return (
                <div
                  key={item.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 rounded-xl hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        isFake
                          ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isFake ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.filename}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(item.timestamp).toLocaleString()} • {item.audio_duration_seconds ? `${item.audio_duration_seconds.toFixed(1)}s` : 'Audio'} • {item.inference_time_ms}ms
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.confidence}%
                      </div>
                      <div className="text-[10px] text-slate-400">Confidence</div>
                    </div>
                    <GlassBadge variant={isFake ? 'danger' : 'success'} size="sm">
                      {isFake ? 'AI-GENERATED' : 'HUMAN'}
                    </GlassBadge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassContainer>
    </div>
  );
};
