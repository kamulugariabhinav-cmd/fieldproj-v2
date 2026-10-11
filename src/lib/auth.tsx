import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithPhone: (phone: string) => Promise<{ success: boolean; message: string }>;
  verifyOtp: (phone: string, token: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  guestLogin: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('voiceguard_user_session');
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Error reading session', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSession = (u: User | null) => {
    setUser(u);
    if (u) {
      localStorage.setItem('voiceguard_user_session', JSON.stringify(u));
    } else {
      localStorage.removeItem('voiceguard_user_session');
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const mockGoogleUser: User = {
      id: 'usr_g_' + Math.random().toString(36).substring(2, 9),
      name: 'Abhinav Kamulugari',
      email: 'abhinav.voiceguard@example.com',
      provider: 'google',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      createdAt: new Date().toISOString(),
    };
    saveSession(mockGoogleUser);
    setIsLoading(false);
  };

  const loginWithPhone = async (phone: string) => {
    if (!phone || phone.length < 10) {
      return { success: false, message: 'Please enter a valid phone number with country code.' };
    }
    // Simulate OTP dispatch
    return { success: true, message: `6-digit security code dispatched to ${phone}` };
  };

  const verifyOtp = async (phone: string, token: string) => {
    if (!token || token.trim().length !== 6) {
      return { success: false, message: 'Verification code must be 6 digits.' };
    }
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 700));
    const phoneUser: User = {
      id: 'usr_p_' + Math.random().toString(36).substring(2, 9),
      name: 'Security Operator',
      phone,
      provider: 'phone',
      createdAt: new Date().toISOString(),
    };
    saveSession(phoneUser);
    setIsLoading(false);
    return { success: true, message: 'Identity confirmed successfully.' };
  };

  const guestLogin = () => {
    const guestUser: User = {
      id: 'guest_' + Math.random().toString(36).substring(2, 8),
      name: 'Security Analyst (Demo)',
      email: 'demo@voiceguard.ai',
      provider: 'demo',
      createdAt: new Date().toISOString(),
    };
    saveSession(guestUser);
  };

  const logout = () => {
    saveSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithGoogle,
        loginWithPhone,
        verifyOtp,
        logout,
        guestLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
