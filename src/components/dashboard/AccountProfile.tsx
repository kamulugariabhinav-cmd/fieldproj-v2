import React from 'react';
import { User as UserIcon, Mail, Phone, Shield, Key, LogOut } from 'lucide-react';
import { GlassCard } from '../glass/GlassCard';
import { GlassButton } from '../glass/GlassButton';
import { GlassBadge } from '../glass/GlassBadge';
import { useAuth } from '../../lib/auth';

export const AccountProfile: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-2">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Operator Profile & Security
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your verified session credentials and security authorization tier.
        </p>
      </div>

      <GlassCard>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/20 dark:border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[var(--vg-accent)] to-purple-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {user?.name ? user.name[0] : 'U'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {user?.name || 'Verified Forensic Operator'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                User ID: {user?.id || 'usr_anonymous'} • Tier: Standard Analyst
              </p>
            </div>
          </div>
          <GlassBadge variant="success" size="md">
            Active Session
          </GlassBadge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6">
          <div className="p-3.5 rounded-xl bg-white/30 dark:bg-white/5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> Email Address
            </span>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {user?.email || 'N/A'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/30 dark:bg-white/5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Mobile Phone
            </span>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {user?.phone || 'N/A'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/30 dark:bg-white/5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Auth Provider
            </span>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 capitalize">
              {user?.provider || 'Session Token'}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-white/30 dark:bg-white/5 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" /> Role Permissions
            </span>
            <p className="text-sm font-bold text-emerald-500">
              AASIST-L Full Inference & Export
            </p>
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-white/20 dark:border-white/10 flex justify-end">
          <GlassButton variant="danger" size="md" icon={<LogOut className="w-4 h-4" />} onClick={logout}>
            End Session & Sign Out
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
};
