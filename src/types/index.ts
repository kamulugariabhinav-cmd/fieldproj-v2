export type ThemeMode = 'light' | 'dark' | 'system';
export type AccentColor = 'indigo' | 'blue' | 'purple' | 'emerald' | 'amber' | 'rose';

export interface ThemePreferences {
  mode: ThemeMode;
  accent: AccentColor;
  reducedTransparency: boolean;
  reducedMotion: boolean;
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  name?: string;
  provider?: string;
  avatarUrl?: string;
  createdAt?: string;
}

export interface DetectionResult {
  id: string;
  filename: string;
  prediction: 'POSSIBLE_AI_VOICE' | 'LIKELY_HUMAN_VOICE' | 'INCONCLUSIVE';
  canonical_prediction?: string;
  model_name: string;
  model_id?: string;
  model_score: number;
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  audio_duration_seconds: number;
  inference_time_ms: number;
  total_processing_time_ms: number;
  timestamp: string;
  file_size_bytes?: number;
  audio_features?: {
    sample_rate?: number;
    target_sample_rate?: number;
    channels?: number;
    rms_energy?: number;
  };
  windows_analyzed?: number;
  warnings?: string[];
}

export interface AnalyticsData {
  totalScans: number;
  realDetected: number;
  fakeDetected: number;
  avgConfidence: number;
  avgLatencyMs: number;
  trendData: Array<{ date: string; real: number; fake: number; total: number }>;
  riskDistribution: Array<{ name: string; value: number; color: string }>;
  modelUsage: Array<{ name: string; count: number; avgScore: number }>;
}

export type AppView = 
  | 'landing'
  | 'features'
  | 'how-it-works'
  | 'overview'
  | 'detection'
  | 'history'
  | 'analytics'
  | 'appearance'
  | 'profile'
  | 'account'
  | 'help';
