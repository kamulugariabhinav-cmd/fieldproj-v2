import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  Mic, 
  FileAudio, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  Pause, 
  RotateCcw, 
  Cpu, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles,
  Download
} from 'lucide-react';
import { GlassCard } from '../glass/GlassCard';
import { GlassButton } from '../glass/GlassButton';
import { GlassBadge } from '../glass/GlassBadge';
import { GlassContainer } from '../glass/GlassContainer';
import { analyzeAudioFile } from '../../lib/api';
import { DetectionResult } from '../../types';

export const AudioDetector: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('audio/') && !selectedFile.name.match(/\.(wav|mp3|flac|ogg|m4a)$/i)) {
      setError('Please select an audio file (WAV, MP3, FLAC, M4A, or OGG).');
      return;
    }
    setError(null);
    setResult(null);
    setFile(selectedFile);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(selectedFile);
    setAudioUrl(url);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const runDetection = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      setProgressStep('Extracting Raw Waveform Spectrum...');
      await new Promise(r => setTimeout(r, 200));

      setProgressStep('Executing AASIST-L Graph Attention Nodes...');
      const detectionResult = await analyzeAudioFile(file, 'aasist_l');

      setProgressStep('Calibrating Confidence Distribution...');
      await new Promise(r => setTimeout(r, 150));

      setResult(detectionResult);
    } catch (err: any) {
      setError(err.message || 'Detection failed. Please check network and retry.');
    } finally {
      setAnalyzing(false);
      setProgressStep('');
    }
  };

  const resetDetector = () => {
    setFile(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setResult(null);
    setError(null);
    setIsPlaying(false);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          AASIST-L Deepfake Audio Detection
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload any audio stream to identify synthesized voice clones with zero-shot spectral inference.
        </p>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a"
        className="hidden"
        onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
      />

      {/* Main Upload / File Stage */}
      {!file ? (
        <GlassContainer
          intensity="deep"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="p-10 sm:p-14 text-center cursor-pointer border-dashed border-2 border-white/40 dark:border-white/20 hover:border-[var(--vg-accent)] transition-all group shadow-glass-lg"
        >
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[var(--vg-accent)]/15 text-[var(--vg-accent)] flex items-center justify-center border border-[var(--vg-accent)]/30 group-hover:scale-110 transition-transform mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Drag & drop your audio file here, or click to browse
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            Supports standard formats: WAV, MP3, FLAC, M4A, OGG up to 25MB.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <GlassButton variant="secondary" size="md">
              Choose Audio File
            </GlassButton>
          </div>
        </GlassContainer>
      ) : (
        <div className="space-y-6">
          {/* File Selected Card */}
          <GlassCard
            title="Audio File Selected"
            subtitle={`${(file.size / 1024).toFixed(1)} KB • ${file.type || 'audio/wav'}`}
            badge={
              <GlassBadge variant="accent" size="sm">
                Ready for Analysis
              </GlassBadge>
            }
            action={
              <GlassButton variant="ghost" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={resetDetector}>
                Replace
              </GlassButton>
            }
          >
            {/* Audio Preview Controls */}
            {audioUrl && (
              <div className="p-4 rounded-xl bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/10 flex items-center justify-between gap-4">
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlayback}
                    className="w-10 h-10 rounded-full bg-[var(--vg-accent)] text-white flex items-center justify-center hover:brightness-110 shadow-sm cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Audio waveform player
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/40 dark:bg-white/10 text-xs font-mono">
                  16 kHz Mono Ready
                </div>
              </div>
            )}

            {/* Run Button */}
            <div className="mt-6 flex flex-wrap gap-4 items-center justify-between">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-[var(--vg-accent)]" />
                Target Model: <strong className="text-slate-800 dark:text-slate-200">AASIST-L Integrated Neural Graph</strong>
              </div>
              <GlassButton
                variant="primary"
                size="lg"
                loading={analyzing}
                onClick={runDetection}
                icon={<Sparkles className="w-4 h-4" />}
              >
                {analyzing ? 'Analyzing Audio...' : 'Execute Deepfake Detection'}
              </GlassButton>
            </div>
          </GlassCard>

          {/* Progress / Loading Indicator */}
          {analyzing && (
            <GlassContainer intensity="deep" className="p-6 text-center space-y-4">
              <div className="w-10 h-10 border-3 border-[var(--vg-accent)] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{progressStep}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evaluating SincNet frequency filterbanks and graph attention weights...
              </p>
            </GlassContainer>
          )}

          {/* Error Message */}
          {error && (
            <GlassContainer intensity="subtle" className="p-4 bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
              <GlassButton variant="danger" size="sm" onClick={runDetection}>
                Retry
              </GlassButton>
            </GlassContainer>
          )}

          {/* Detection Result Card */}
          {result && (
            <GlassContainer intensity="deep" className="p-6 sm:p-8 space-y-6 shadow-glass-xl border-white/40 dark:border-white/20 animate-in fade-in zoom-in-95 duration-300">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/20 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-3 rounded-2xl ${
                      result.prediction === 'POSSIBLE_AI_VOICE'
                        ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                    }`}
                  >
                    {result.prediction === 'POSSIBLE_AI_VOICE' ? (
                      <ShieldAlert className="w-8 h-8" />
                    ) : (
                      <ShieldCheck className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      {result.prediction === 'POSSIBLE_AI_VOICE'
                        ? 'Synthetic Voice Detected'
                        : 'Authentic Human Voice'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      ID: {result.id} • Analyzed on {new Date(result.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                <GlassBadge
                  variant={result.prediction === 'POSSIBLE_AI_VOICE' ? 'danger' : 'success'}
                  pulse
                  size="md"
                >
                  {result.risk_level} RISK LEVEL
                </GlassBadge>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-white/40 dark:bg-white/5 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Confidence Score</div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">{result.confidence}%</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/40 dark:bg-white/5 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Neural Architecture</div>
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white">{result.model_name}</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/40 dark:bg-white/5 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Inference Latency</div>
                  <div className="text-xl font-extrabold text-emerald-500">{result.inference_time_ms} ms</div>
                </div>
                <div className="p-3.5 rounded-xl bg-white/40 dark:bg-white/5 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase">Audio Length</div>
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {result.audio_duration_seconds ? `${result.audio_duration_seconds.toFixed(2)}s` : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/20 dark:border-white/10">
                <GlassButton variant="secondary" size="md" onClick={resetDetector}>
                  Scan Another Sample
                </GlassButton>
                <GlassButton
                  variant="ghost"
                  size="md"
                  icon={<Download className="w-4 h-4" />}
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `voiceguard-analysis-${result.id}.json`;
                    a.click();
                  }}
                >
                  Export Forensics JSON
                </GlassButton>
              </div>
            </GlassContainer>
          )}
        </div>
      )}
    </div>
  );
};
