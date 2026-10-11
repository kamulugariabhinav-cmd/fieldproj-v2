import React, { useState } from 'react';
import { GlassModal } from '../glass/GlassModal';
import { GlassTabs } from '../glass/GlassTabs';
import { GlassInput } from '../glass/GlassInput';
import { GlassButton } from '../glass/GlassButton';
import { useAuth } from '../../lib/auth';
import { Phone, KeyRound, Sparkles, CheckCircle, ShieldAlert } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithGoogle, loginWithPhone, verifyOtp, guestLogin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'google' | 'phone'>('google');

  // Phone Auth State
  const [phone, setPhone] = useState('');
  const [otpStep, setOtpStep] = useState<'input_phone' | 'input_code'>('input_phone');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);

  const handleGoogleAuth = async () => {
    setMessage(null);
    try {
      await loginWithGoogle();
      onClose();
    } catch (e: any) {
      setMessage({ text: e.message || 'Google authentication failed', type: 'error' });
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const res = await loginWithPhone(phone);
    if (res.success) {
      setOtpStep('input_code');
      setMessage({ text: res.message, type: 'info' });
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    if (!/^[0-9]?$/.test(val)) return;
    const next = [...otpCode];
    next[index] = val;
    setOtpCode(next);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otpCode.join('');
    if (token.length !== 6) {
      setMessage({ text: 'Please enter all 6 digits.', type: 'error' });
      return;
    }
    const res = await verifyOtp(phone, token);
    if (res.success) {
      onClose();
    } else {
      setMessage({ text: res.message, type: 'error' });
    }
  };

  const handleDemoAccess = () => {
    guestLogin();
    onClose();
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      title="VoiceGuard Authentication"
      description="Secure portal access for cybersecurity operators and forensic auditors."
      maxWidth="md"
    >
      <div className="space-y-6">
        <GlassTabs
          tabs={[
            { id: 'google', label: 'Google Sign In' },
            { id: 'phone', label: 'Phone & OTP' },
          ]}
          activeTab={activeTab}
          onChange={(id) => {
            setActiveTab(id as any);
            setMessage(null);
          }}
        />

        {message && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === 'error'
                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {message.type === 'error' ? <ShieldAlert className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Tab 1: Google Sign In */}
        {activeTab === 'google' && (
          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Sign in instantly with your verified workspace credentials via Google Identity.
            </p>
            <GlassButton
              variant="secondary"
              size="lg"
              className="w-full justify-center"
              loading={isLoading}
              onClick={handleGoogleAuth}
              icon={
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              }
            >
              Continue with Google Workspace
            </GlassButton>
          </div>
        )}

        {/* Tab 2: Phone + OTP */}
        {activeTab === 'phone' && (
          <div className="space-y-4 pt-2">
            {otpStep === 'input_phone' ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <GlassInput
                  label="Mobile Phone Number"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  leftIcon={<Phone className="w-4 h-4" />}
                  helper="Include international dialing prefix (e.g. +1, +44, +91)."
                  required
                />
                <GlassButton variant="primary" size="md" className="w-full" type="submit">
                  Dispatch Security Code
                </GlassButton>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Enter 6-Digit Passcode
                  </label>
                  <div className="flex justify-between gap-2">
                    {otpCode.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-input-${i}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        className="w-11 h-12 text-center text-lg font-bold rounded-xl bg-white/40 dark:bg-white/10 border border-white/30 dark:border-white/15 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--vg-accent)]"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <GlassButton
                    variant="ghost"
                    size="md"
                    type="button"
                    onClick={() => setOtpStep('input_phone')}
                  >
                    Change Number
                  </GlassButton>
                  <GlassButton
                    variant="primary"
                    size="md"
                    className="flex-1"
                    type="submit"
                    loading={isLoading}
                  >
                    Confirm & Sign In
                  </GlassButton>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Guest Demo bypass */}
        <div className="pt-4 border-t border-white/20 dark:border-white/10 text-center">
          <button
            onClick={handleDemoAccess}
            className="text-xs font-semibold text-[var(--vg-accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" /> Continue with Instant Demo Session
          </button>
        </div>
      </div>
    </GlassModal>
  );
};
