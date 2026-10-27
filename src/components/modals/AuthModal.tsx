import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  User,
  ShieldCheck,
  Cloud,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Sparkles,
  Info,
} from 'lucide-react';
import { AuthService } from '../../../packages/firebase/src/auth';
import { isFirebaseConfigured } from '../../../packages/firebase/src/config';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onAuthSuccess: (user: any) => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setError(null);
    setSuccessMsg(null);
  }, [tab, isOpen]);

  if (!isOpen) return null;

  const hasConfig = isFirebaseConfigured();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (!hasConfig) {
        // Local mode fallback
        const mockUser = {
          uid: 'local_user_1',
          email,
          displayName: displayName || email.split('@')[0],
          emailVerified: true,
        };
        onAuthSuccess(mockUser);
        onClose();
        return;
      }

      const user = await AuthService.signIn(email, password);
      onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      if (!hasConfig) {
        const mockUser = {
          uid: `user_${Date.now()}`,
          email,
          displayName: displayName || email.split('@')[0],
          emailVerified: true,
        };
        onAuthSuccess(mockUser);
        onClose();
        return;
      }

      const user = await AuthService.signUp(email, password, displayName);
      onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!hasConfig) {
        const mockUser = {
          uid: 'google_user_1',
          email: 'google.user@example.com',
          displayName: 'Google User',
          emailVerified: true,
        };
        onAuthSuccess(mockUser);
        onClose();
        return;
      }

      const user = await AuthService.signInWithGoogle();
      onAuthSuccess(user);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      if (hasConfig) {
        await AuthService.signOut();
      }
      onAuthSuccess(null);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0b2545] dark:bg-slate-950 text-white border-b border-[#081a31] dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold">
                {currentUser ? 'User Account' : 'HHM Cloud Account'}
              </h3>
              <p className="text-[11px] text-blue-200">
                {currentUser ? 'Manage cloud sync & profile' : 'Sign in to sync your PDFs'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!hasConfig && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-start space-x-2 text-[11px] text-amber-800 dark:text-amber-200">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Local-First Mode Active:</span> Firebase environment keys are not configured. You can continue with full local functionality, or simulate cloud sync locally.
              </div>
            </div>
          )}

          {currentUser ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-bold text-lg flex items-center justify-center shrink-0">
                  {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : currentUser.email[0].toUpperCase()}
                </div>
                <div className="flex-1 truncate">
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                    {currentUser.displayName || 'HHM User'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                  <div className="flex items-center space-x-1.5 mt-1 text-[11px] text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Connected to Cloud Sync</span>
                  </div>
                </div>
              </div>

              {/* Free-tier Storage Usage Indicator */}
              <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 space-y-1.5 text-xs">
                <div className="flex justify-between font-medium text-slate-700">
                  <span>Cloud Storage (Spark Free Tier)</span>
                  <span className="font-bold text-blue-700">12.4 MB / 1,000 MB</span>
                </div>
                <div className="w-full bg-blue-200/50 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: '1.24%' }} />
                </div>
                <p className="text-[10px] text-slate-500">
                  Free tier includes 1GB Storage & 50K daily document reads.
                </p>
              </div>

              <button
                onClick={handleSignOut}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-medium text-xs transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out of Session</span>
              </button>
            </div>
          ) : (
            /* Auth Tabs & Form */
            <div>
              {/* Tab selector */}
              <div className="flex border-b border-slate-200 mb-4 text-xs font-medium">
                <button
                  onClick={() => setTab('signin')}
                  className={`flex-1 pb-2 text-center border-b-2 transition-colors ${
                    tab === 'signin'
                      ? 'border-blue-600 text-blue-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setTab('signup')}
                  className={`flex-1 pb-2 text-center border-b-2 transition-colors ${
                    tab === 'signup'
                      ? 'border-blue-600 text-blue-600 font-bold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {error && (
                <div className="mb-3 p-2.5 rounded bg-red-50 border border-red-200 text-red-600 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-3 p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={tab === 'signup' ? handleSignUp : handleSignIn} className="space-y-3">
                {tab === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      Display Name (Optional)
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors mt-2"
                >
                  {isLoading ? 'Processing...' : tab === 'signup' ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-white px-2 text-slate-400">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center space-x-2 py-2 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                <span>Google Sign-In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
