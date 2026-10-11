import React from 'react';
import { AudioLines } from 'lucide-react';

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ className = '', onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 cursor-pointer select-none group ${className}`}
    >
      <div className="w-9 h-9 rounded-xl bg-[#6366F1]/15 text-[#6366F1] flex items-center justify-center border border-[#6366F1]/30 shadow-sm group-hover:scale-105 transition-transform">
        <AudioLines className="w-5 h-5 text-[#6366F1]" strokeWidth={2.4} />
      </div>
      <span className="font-semibold text-lg tracking-tight text-slate-900 dark:text-white">
        VoiceGuard
      </span>
    </div>
  );
};
