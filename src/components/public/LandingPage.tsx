import React from 'react';
import { 
  ShieldCheck, 
  Mic, 
  Cpu, 
  Lock, 
  Zap, 
  BarChart, 
  ArrowRight, 
  CheckCircle, 
  Waves, 
  FileAudio, 
  Fingerprint, 
  Sparkles 
} from 'lucide-react';
import { GlassContainer } from '../glass/GlassContainer';
import { GlassCard } from '../glass/GlassCard';
import { GlassButton } from '../glass/GlassButton';
import { GlassBadge } from '../glass/GlassBadge';
import { AppView } from '../../types';

interface LandingPageProps {
  onNavigate: (view: AppView) => void;
  onOpenAuth: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onOpenAuth }) => {
  return (
    <div className="space-y-16 py-6 sm:py-12">
      {/* Hero Section */}
      <section className="relative text-center max-w-4xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/40 dark:bg-white/10 border border-white/40 dark:border-white/10 backdrop-blur-xl shadow-glass-sm animate-pulse">
          <Sparkles className="w-4 h-4 text-[var(--vg-accent)]" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
            AASIST-L Integrated Neural Detection
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--vg-accent)] text-white font-bold">
            v2.4
          </span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
          Autonomous <span className="bg-gradient-to-r from-[var(--vg-accent)] via-purple-500 to-indigo-400 bg-clip-text text-transparent">AI Voice Deepfake</span> Defense
        </h1>

        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
          Protect executive communication, fraud hotlines, and media integrity with millisecond 
          spectral graph inference powered by the AASIST-L zero-shot neural architecture.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <GlassButton
            variant="primary"
            size="lg"
            iconRight={<ArrowRight className="w-4 h-4" />}
            onClick={() => onNavigate('detection')}
          >
            Launch Audio Detector
          </GlassButton>
          <GlassButton
            variant="secondary"
            size="lg"
            icon={<FileAudio className="w-4 h-4" />}
            onClick={() => onNavigate('overview')}
          >
            Explore Dashboard
          </GlassButton>
        </div>

        {/* Live Interactive Hero Preview Card */}
        <div className="pt-8 max-w-3xl mx-auto">
          <GlassContainer intensity="deep" className="p-6 sm:p-8 text-left border-white/40 dark:border-white/20 shadow-glass-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/20 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-[var(--vg-accent)]/20 text-[var(--vg-accent)] border border-[var(--vg-accent)]/30">
                  <Waves className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">Sample Audio Evaluation</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">bank_wire_authorization_sample.wav • 4.8s duration</p>
                </div>
              </div>
              <GlassBadge variant="danger" pulse size="md">
                HIGH RISK: 98.4% SYNTHETIC
              </GlassBadge>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Model Core</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">AASIST-L</div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Graph Attention</div>
                <div className="text-sm font-bold text-emerald-500">24 Nodes Active</div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Latency</div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">184 ms</div>
              </div>
              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-400 uppercase">Detection Result</div>
                <div className="text-sm font-bold text-rose-500">Cloned Audio</div>
              </div>
            </div>
          </GlassContainer>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Enterprise Grade Deepfake Verification
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Combining raw waveform signal processing with modern graph convolution to expose subtle vocoder artifacts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard
            interactive
            icon={<Cpu className="w-5 h-5 text-indigo-400" />}
            title="SincNet Waveform Slicing"
            subtitle="Direct raw audio processing with parameterized bandpass filters, preserving phase integrity that spectrograms discard."
          >
            <div className="mt-4 flex items-center text-xs font-semibold text-[var(--vg-accent)]">
              Raw audio stream • 16 kHz native
            </div>
          </GlassCard>

          <GlassCard
            interactive
            icon={<Fingerprint className="w-5 h-5 text-purple-400" />}
            title="Integrated Graph Attention"
            subtitle="Heterogeneous graph neural networks analyze spectral and temporal correlations simultaneously to pinpoint synthesis traces."
          >
            <div className="mt-4 flex items-center text-xs font-semibold text-[var(--vg-accent)]">
              Zero-shot spoof generalization
            </div>
          </GlassCard>

          <GlassCard
            interactive
            icon={<Zap className="w-5 h-5 text-amber-400" />}
            title="Real-Time Sub-Second Scoring"
            subtitle="Engineered for mission-critical operations with sub-250ms cloud inference, live confidence scoring, and audit trails."
          >
            <div className="mt-4 flex items-center text-xs font-semibold text-[var(--vg-accent)]">
              Production ready on Render & Vercel
            </div>
          </GlassCard>
        </div>
      </section>

      {/* How Detection Works */}
      <section className="space-y-8 max-w-4xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            How AASIST-L Verification Works
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">
            Four sequential layers designed to beat state-of-the-art TTS and voice cloning models.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 backdrop-blur-md">
            <span className="text-xs font-bold text-[var(--vg-accent)]">Step 01</span>
            <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1">Audio Intake & Resampling</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Audio uploads (WAV, MP3, FLAC, M4A) are resampled to 16,000 Hz mono PCM with strict channel alignment.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 backdrop-blur-md">
            <span className="text-xs font-bold text-[var(--vg-accent)]">Step 02</span>
            <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1">Sinc-Convolutional Front-End</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Custom sinc filters extract frequency spectrum cues without human-crafted STFT approximations.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 backdrop-blur-md">
            <span className="text-xs font-bold text-[var(--vg-accent)]">Step 03</span>
            <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1">Graph Attention Network (GAT)</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Spectral and temporal nodes construct relationship matrices, exposing neural vocoder harmonic smearing.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/30 dark:border-white/10 backdrop-blur-md">
            <span className="text-xs font-bold text-[var(--vg-accent)]">Step 04</span>
            <h4 className="font-bold text-base text-slate-900 dark:text-white mt-1">Calibrated Risk Scoring</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Raw logits are calibrated against ASVspoof benchmarks to produce low/medium/high confidence labels.
            </p>
          </div>
        </div>
      </section>

      {/* Security & CTA Footer Card */}
      <section>
        <GlassContainer intensity="deep" className="p-8 sm:p-12 text-center space-y-6 border-white/40 dark:border-white/20">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-[var(--vg-accent)]/20 text-[var(--vg-accent)] flex items-center justify-center border border-[var(--vg-accent)]/30">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            Secure, Privacy-Preserving Voice Authentication
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            Audio submissions are analyzed in volatile memory and never stored or retained for model training without authorization.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <GlassButton variant="primary" size="lg" onClick={() => onNavigate('detection')}>
              Start Audio Analysis
            </GlassButton>
            <GlassButton variant="secondary" size="lg" onClick={onOpenAuth}>
              Operator Sign In
            </GlassButton>
          </div>
        </GlassContainer>
      </section>
    </div>
  );
};
