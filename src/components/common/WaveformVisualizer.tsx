import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  analyserNode?: AnalyserNode | null;
  isRecording?: boolean;
  isPlaying?: boolean;
  barCount?: number;
  className?: string;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  analyserNode,
  isRecording = false,
  isPlaying = false,
  barCount = 36,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dataArray: Uint8Array<ArrayBuffer> | null = null;
    if (analyserNode) {
      analyserNode.fftSize = 128;
      const bufferLength = analyserNode.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const spacing = 3;
      const totalSpacing = spacing * (barCount - 1);
      const barWidth = Math.max(3, (width - totalSpacing) / barCount);

      if (isRecording && analyserNode && dataArray) {
        analyserNode.getByteFrequencyData(dataArray);
      }

      phase += 0.05;

      for (let i = 0; i < barCount; i++) {
        let normalizedHeight = 0.15; // baseline resting height

        if (isRecording && dataArray) {
          // Sample frequency bin
          const binIndex = Math.floor((i / barCount) * (dataArray.length / 2));
          const value = dataArray[binIndex] || 0;
          // Scale amplitude
          normalizedHeight = Math.max(0.12, (value / 255) * 0.95);
        } else if (isPlaying) {
          // Playback rhythmic wave
          const wave = Math.sin(phase + i * 0.3) * 0.35 + 0.45;
          normalizedHeight = Math.max(0.15, wave);
        } else {
          // Idle calm ambient breathing
          const idleWave = Math.sin(phase * 0.5 + i * 0.2) * 0.08 + 0.18;
          normalizedHeight = idleWave;
        }

        const barHeight = Math.max(6, normalizedHeight * height);
        const x = i * (barWidth + spacing);
        const y = (height - barHeight) / 2;

        // Rounded pill vertical bar
        ctx.fillStyle = '#6366F1';
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyserNode, isRecording, isPlaying, barCount]);

  return (
    <div className={`w-full flex items-center justify-center overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        width={420}
        height={72}
        className="w-full max-w-[420px] h-[72px]"
      />
    </div>
  );
};
