import React from 'react';
import { 
  Sun, 
  Moon, 
  Laptop, 
  Check, 
  RotateCcw, 
  Sliders, 
  Palette, 
  EyeOff 
} from 'lucide-react';
import { GlassCard } from '../glass/GlassCard';
import { GlassButton } from '../glass/GlassButton';
import { useTheme, ACCENT_MAP } from '../../lib/theme';
import { AccentColor, ThemeMode } from '../../types';

export const AppearanceSettings: React.FC = () => {
  const {
    preferences,
    setMode,
    setAccent,
    setReducedTransparency,
    setReducedMotion,
    resetDefaults,
  } = useTheme();

  const modes: Array<{ id: ThemeMode; label: string; icon: React.ReactNode; desc: string }> = [
    { id: 'light', label: 'Light Mode', icon: <Sun className="w-5 h-5 text-amber-500" />, desc: 'Crisp white & soft gray (#F5F5F5)' },
    { id: 'dark', label: 'Dark Mode', icon: <Moon className="w-5 h-5 text-indigo-400" />, desc: 'Deep cosmic obsidian (#0B1020)' },
    { id: 'system', label: 'System Mode', icon: <Laptop className="w-5 h-5 text-slate-400" />, desc: 'Follows operating system settings' },
  ];

  const accents: Array<{ id: AccentColor; label: string; hex: string }> = [
    { id: 'indigo', label: 'Indigo', hex: ACCENT_MAP.indigo.hex },
    { id: 'blue', label: 'Blue', hex: ACCENT_MAP.blue.hex },
    { id: 'purple', label: 'Purple', hex: ACCENT_MAP.purple.hex },
    { id: 'emerald', label: 'Emerald', hex: ACCENT_MAP.emerald.hex },
    { id: 'amber', label: 'Amber', hex: ACCENT_MAP.amber.hex },
    { id: 'rose', label: 'Rose', hex: ACCENT_MAP.rose.hex },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Appearance & Themes
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Tailor the futuristic Liquid Glass interface to your preferred aesthetic and accessibility needs.
          </p>
        </div>
        <GlassButton variant="secondary" size="sm" icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={resetDefaults}>
          Reset to Defaults
        </GlassButton>
      </div>

      {/* Theme Modes */}
      <GlassCard title="Theme Mode" subtitle="Select your preferred surface luminance">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {modes.map((m) => {
            const active = preferences.mode === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  active
                    ? 'bg-[var(--vg-accent)]/15 border-[var(--vg-accent)] ring-2 ring-[var(--vg-accent)]/30'
                    : 'bg-white/30 dark:bg-white/5 border-white/30 dark:border-white/10 hover:bg-white/50 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-xl bg-white/40 dark:bg-white/10">{m.icon}</div>
                  {active && (
                    <div className="w-5 h-5 rounded-full bg-[var(--vg-accent)] text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </div>
                  )}
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{m.label}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Accent Colors */}
      <GlassCard title="Accent Color" subtitle="Select your primary brand glow and highlight tone">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
          {accents.map((accent) => {
            const active = preferences.accent === accent.id;
            return (
              <button
                key={accent.id}
                onClick={() => setAccent(accent.id)}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-2.5 transition-all cursor-pointer ${
                  active
                    ? 'border-white/80 dark:border-white/50 bg-white/50 dark:bg-white/15 scale-105 shadow-glass-md'
                    : 'border-white/30 dark:border-white/10 bg-white/20 dark:bg-white/5 hover:bg-white/40 dark:hover:bg-white/10'
                }`}
              >
                <span
                  className="w-7 h-7 rounded-full shadow-md flex items-center justify-center text-white"
                  style={{ backgroundColor: accent.hex }}
                >
                  {active && <Check className="w-4 h-4 stroke-[3]" />}
                </span>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {accent.label}
                </span>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* Accessibility Controls */}
      <GlassCard title="Accessibility & Motion" subtitle="Customize transparency filters and animation speeds">
        <div className="space-y-4 pt-2">
          {/* Reduced Transparency */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/10">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Reduced Transparency</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Increases surface opacity for improved contrast and high-legibility environments.
              </p>
            </div>
            <button
              onClick={() => setReducedTransparency(!preferences.reducedTransparency)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                preferences.reducedTransparency ? 'bg-[var(--vg-accent)]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  preferences.reducedTransparency ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Reduced Motion */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/10">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Reduced Motion</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Disables liquid wobble physics and background ambient animations.
              </p>
            </div>
            <button
              onClick={() => setReducedMotion(!preferences.reducedMotion)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                preferences.reducedMotion ? 'bg-[var(--vg-accent)]' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  preferences.reducedMotion ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};
