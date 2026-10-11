import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  Mic, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  Cpu, 
  ShieldCheck, 
  ShieldAlert,
  Download
} from 'lucide-react';
import { GlassContainer } from '../glass/GlassContainer';
import { GlassButton } from '../glass/GlassButton';
import { GlassBadge } from '../glass/GlassBadge';
import { WaveformVisualizer } from '../common/WaveformVisualizer';
import { analyzeAudioFile } from '../../lib/api';
import { DetectionResult } from '../../types';

export const DetectionPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upload' | 'live'>('upload');

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live Recording State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [isRecordedPlaying, setIsRecordedPlaying] = useState<boolean>(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const recordedAudioRef = useRef<HTMLAudioElement>(null);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
      stopMediaStream();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const stopMediaStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  // --- File Upload Handlers ---
  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile) return;
    if (!selectedFile.type.startsWith('audio/') && !selectedFile.name.match(/\.(wav|mp3|flac|ogg|m4a)$/i)) {
      setError('Please select a valid audio file (WAV, MP3, FLAC, M4A, or OGG).');
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

  const handleAnalyzeFile = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await analyzeAudioFile(file, 'aasist_l');
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please check network and retry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setResult(null);
    setError(null);
    setIsPlaying(false);
  };

  // --- Live Recording Handlers ---
  const startRecording = async () => {
    setError(null);
    setResult(null);
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup Web Audio API Analyser
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      setAnalyserNode(analyser);

      // Setup MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : '';

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const type = mimeType || 'audio/wav';
        const blob = new Blob(audioChunksRef.current, { type });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        stopMediaStream();
        setAnalyserNode(null);
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      setError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone permission was denied. Please allow microphone access in your browser settings.'
          : 'Unable to access microphone. Please ensure an audio input device is connected.'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsRecording(false);
  };

  const toggleRecordedPlayback = () => {
    if (!recordedAudioRef.current) return;
    if (isRecordedPlaying) {
      recordedAudioRef.current.pause();
      setIsRecordedPlaying(false);
    } else {
      recordedAudioRef.current.play();
      setIsRecordedPlaying(true);
    }
  };

  const handleAnalyzeRecordedAudio = async () => {
    if (!recordedBlob) return;
    if (recordingSeconds < 1) {
      setError('Recording is too short. Please speak for at least 1-2 seconds.');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const ext = recordedBlob.type.includes('ogg') ? 'ogg' : recordedBlob.type.includes('webm') ? 'webm' : 'wav';
      const fileFromBlob = new File([recordedBlob], `live_recording_${Date.now()}.${ext}`, {
        type: recordedBlob.type || 'audio/wav',
      });

      const res = await analyzeAudioFile(fileFromBlob, 'aasist_l');
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Please verify network and retry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetLiveRecording = () => {
    stopRecording();
    stopMediaStream();
    setRecordedBlob(null);
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setResult(null);
    setError(null);
    setRecordingSeconds(0);
    setIsRecordedPlaying(false);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="text-center space-y-3 pt-2">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Detect AI-Generated Voices Instantly
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
          Upload an audio file or record your voice to check whether it is human or AI-generated.
        </p>
      </div>

      {/* Main Detection Panel */}
      <GlassContainer
        intensity="deep"
        className="p-6 sm:p-10 shadow-lg border border-slate-200/80 dark:border-white/10 rounded-[24px]"
      >
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 shadow-xs">
            <button
              onClick={() => {
                setActiveTab('upload');
                setError(null);
                setResult(null);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UploadCloud className="w-4 h-4 text-[#6366F1]" />
              Upload Audio
            </button>
            <button
              onClick={() => {
                setActiveTab('live');
                setError(null);
                setResult(null);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'live'
                  ? 'bg-white dark:bg-white/15 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Mic className="w-4 h-4 text-[#6366F1]" />
              Live Detection
            </button>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a"
          className="hidden"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
        />

        {/* TAB 1: UPLOAD AUDIO */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            {!file ? (
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="p-10 sm:p-14 text-center cursor-pointer border-2 border-dashed border-slate-300 dark:border-white/15 hover:border-[#6366F1] dark:hover:border-[#6366F1] rounded-2xl bg-white/40 dark:bg-white/5 transition-all group"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-[#6366F1]/15 text-[#6366F1] flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Drag and drop audio file here, or click to browse
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  Supports WAV, MP3, FLAC, M4A, OGG up to 25MB
                </p>
                <div className="mt-5">
                  <GlassButton variant="secondary" size="md">
                    Select Audio File
                  </GlassButton>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Audio Details Card */}
                <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {file.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB • {file.type || 'audio file'}
                      </p>
                    </div>
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      icon={<RotateCcw className="w-3.5 h-3.5" />}
                      onClick={resetUpload}
                    >
                      Change
                    </GlassButton>
                  </div>

                  {/* Audio Player and Interactive Waveform */}
                  {audioUrl && (
                    <div className="space-y-3 pt-2">
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />
                      <div className="flex items-center gap-4">
                        <button
                          onClick={togglePlayback}
                          className="w-10 h-10 rounded-full bg-[#6366F1] text-white flex items-center justify-center hover:brightness-110 shadow-xs cursor-pointer shrink-0"
                          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                        </button>
                        <WaveformVisualizer isPlaying={isPlaying} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Analyze Button */}
                <div className="flex justify-center">
                  <GlassButton
                    variant="primary"
                    size="lg"
                    loading={isAnalyzing}
                    onClick={handleAnalyzeFile}
                    icon={<Sparkles className="w-4 h-4" />}
                    className="min-w-[200px]"
                  >
                    {isAnalyzing ? 'Analyzing Audio...' : 'Analyze Audio'}
                  </GlassButton>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: LIVE DETECTION */}
        {activeTab === 'live' && (
          <div className="space-y-6 text-center">
            {/* Live Waveform Display */}
            <div className="p-8 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isRecording ? 'bg-rose-500 animate-ping' : 'bg-slate-400'
                  }`}
                />
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {isRecording ? 'Recording Active' : recordedBlob ? 'Recording Ready' : 'Microphone Idle'}
                </span>
              </div>

              {/* Purple Waveform reacting to microphone audio */}
              <WaveformVisualizer
                analyserNode={analyserNode}
                isRecording={isRecording}
                isPlaying={isRecordedPlaying}
              />

              {/* Timer Display */}
              <div className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
                {formatTimer(recordingSeconds)}
              </div>
            </div>

            {/* Recording Controls */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {!isRecording && !recordedBlob && (
                <GlassButton
                  variant="primary"
                  size="lg"
                  icon={<Mic className="w-5 h-5 text-white" />}
                  onClick={startRecording}
                  className="px-8"
                >
                  Start Recording
                </GlassButton>
              )}

              {isRecording && (
                <GlassButton
                  variant="danger"
                  size="lg"
                  icon={<Square className="w-4 h-4 fill-current" />}
                  onClick={stopRecording}
                  className="px-8 animate-pulse"
                >
                  Stop Recording
                </GlassButton>
              )}

              {recordedBlob && (
                <div className="space-y-4 w-full">
                  {recordedUrl && (
                    <audio
                      ref={recordedAudioRef}
                      src={recordedUrl}
                      onEnded={() => setIsRecordedPlaying(false)}
                      className="hidden"
                    />
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <GlassButton
                      variant="secondary"
                      size="md"
                      icon={isRecordedPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                      onClick={toggleRecordedPlayback}
                    >
                      {isRecordedPlaying ? 'Pause Preview' : 'Listen Preview'}
                    </GlassButton>

                    <GlassButton
                      variant="ghost"
                      size="md"
                      icon={<RotateCcw className="w-4 h-4" />}
                      onClick={resetLiveRecording}
                    >
                      Re-record
                    </GlassButton>

                    <GlassButton
                      variant="primary"
                      size="md"
                      loading={isAnalyzing}
                      icon={<Sparkles className="w-4 h-4" />}
                      onClick={handleAnalyzeRecordedAudio}
                    >
                      {isAnalyzing ? 'Analyzing Recording...' : 'Analyze Recording'}
                    </GlassButton>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs font-semibold hover:underline shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* RESULT PRESENTATION CARD */}
        {result && (
          <div className="mt-8 pt-8 border-t border-slate-200/80 dark:border-white/10 space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white/60 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
              <div className="flex items-center gap-3.5">
                <div
                  className={`p-3 rounded-2xl ${
                    result.prediction === 'POSSIBLE_AI_VOICE'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {result.prediction === 'POSSIBLE_AI_VOICE' ? (
                    <ShieldAlert className="w-7 h-7" />
                  ) : (
                    <ShieldCheck className="w-7 h-7" />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {result.prediction === 'POSSIBLE_AI_VOICE'
                      ? 'AI-Generated Voice Detected'
                      : 'Authentic Human Voice'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Analyzed by AASIST-L neural graph model
                  </p>
                </div>
              </div>

              <GlassBadge
                variant={result.prediction === 'POSSIBLE_AI_VOICE' ? 'danger' : 'success'}
                pulse
                size="md"
              >
                {result.confidence}% Confidence
              </GlassBadge>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Verdict</span>
                <p className={`text-sm font-bold ${result.prediction === 'POSSIBLE_AI_VOICE' ? 'text-rose-500' : 'text-emerald-500'}`}>
                  {result.prediction === 'POSSIBLE_AI_VOICE' ? 'Synthetic AI' : 'Human Voice'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confidence</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">{result.confidence}%</p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Duration</span>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {result.audio_duration_seconds ? `${result.audio_duration_seconds.toFixed(1)}s` : 'Captured'}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/50 dark:border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Inference Time</span>
                <p className="text-sm font-bold text-emerald-500">{result.inference_time_ms} ms</p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <GlassButton
                variant="secondary"
                size="md"
                onClick={activeTab === 'upload' ? resetUpload : resetLiveRecording}
              >
                Analyze Another Audio
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
                  a.download = `voiceguard-detection-${result.id}.json`;
                  a.click();
                }}
              >
                Export JSON
              </GlassButton>
            </div>
          </div>
        )}
      </GlassContainer>
    </div>
  );
};
