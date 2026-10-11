import React from 'react';
import { HelpCircle, ExternalLink, ShieldCheck, Terminal, FileCode } from 'lucide-react';
import { GlassCard } from '../glass/GlassCard';
import { GlassButton } from '../glass/GlassButton';

export const HelpSupport: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Help & Technical Documentation
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Architectural guides, API endpoints, and troubleshooting manuals.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard title="FastAPI Detection Endpoint" subtitle="Direct machine-to-machine inference">
          <div className="space-y-3 text-xs">
            <div className="p-2.5 rounded-lg bg-black/40 text-emerald-400 font-mono text-[11px]">
              POST /api/detect<br />
              Content-Type: multipart/form-data<br />
              audio: [file binary]<br />
              model_name: aasist_l
            </div>
            <p className="text-slate-500 dark:text-slate-400">
              Communicates with the deployed Render backend supporting 16 kHz resampled zero-shot voice verification.
            </p>
          </div>
        </GlassCard>

        <GlassCard title="AASIST-L Model Details" subtitle="Integrated Raw Waveform Graph Attention">
          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p>• <strong>Weights Checkpoint:</strong> AASIST-L baseline architecture.</p>
            <p>• <strong>Front-end:</strong> SincNet filters extracting raw spectrums directly.</p>
            <p>• <strong>Back-end:</strong> Heterogeneous graph modules capturing temporal & spectral harmonics.</p>
            <p>• <strong>EER Benchmark:</strong> ~0.83% Equal Error Rate on ASVspoof 2019.</p>
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Frequently Asked Questions">
        <div className="space-y-4 text-xs divide-y divide-white/20 dark:divide-white/10">
          <div className="pt-3 first:pt-0">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Why did my scan take a few seconds on the first try?</h4>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              The backend runs on Render cloud instances. If idle, it spins up from standby mode. Subsequent detections take sub-250ms.
            </p>
          </div>

          <div className="pt-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">What audio file formats are supported?</h4>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              VoiceGuard accepts WAV, MP3, FLAC, M4A, and OGG. Files are automatically resampled to 16,000 Hz single-channel PCM before entering the neural network.
            </p>
          </div>

          <div className="pt-3">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">Is audio stored permanently?</h4>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              No. Audio payloads are analyzed in temporary memory buffers and discarded immediately after inference.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
