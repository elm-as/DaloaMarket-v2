import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { friendlyError } from '../lib/messages';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  usePageTitle('Connexion');
  const { user, signIn } = useSupabase();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { error } = await signIn(data.email, data.password);
      if (error) throw error;
    } catch (err: any) {
      setAuthError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row lg:items-center lg:justify-center lg:px-4 lg:py-8">
      {/* MOBILE: App-like Header */}
      <div className="lg:hidden bg-gradient-to-br from-orange-500 to-amber-600 px-4 pt-12 pb-24 rounded-b-[40px] shadow-sm relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg -rotate-3 p-2">
            <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Bon retour !</h1>
          <p className="text-orange-100 text-sm">Connectez-vous à DaloaMarket</p>
        </div>
      </div>

      {/* DESKTOP: Full width container with grid */}
      <div className="hidden lg:block w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-2 gap-8 items-center">
          {/* Left Side: Marketing Panel */}
          <div className="flex flex-col justify-between bg-gradient-to-br from-orange-600 to-amber-700 rounded-3xl p-10 text-white min-h-[520px] relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-white rounded-2xl p-2 shadow-md">
                  <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
                </div>
                <span className="text-2xl font-black tracking-tight text-white">DaloaMarket</span>
              </div>

              <h2 className="text-3xl font-black leading-tight text-white mb-4">
                Achetez & Vendez en toute sérénité à Daloa.
              </h2>
              <p className="text-orange-100 text-sm leading-relaxed mb-8">
                Rejoignez la plus grande marketplace locale de Daloa. Transactions sécurisées et livraisons express dans tous les quartiers.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-lg">🔒</div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Paiement Escrow Sécurisé</h4>
                    <p className="text-xs text-orange-100">Votre argent reste protégé jusqu'à la livraison contrôlée par OTP.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-lg">🛵</div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Livraison Express Locale</h4>
                    <p className="text-xs text-orange-100">Recevez vos colis directement chez vous ou en boutique partenaire.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-orange-100 font-medium">
              <span>© 2026 DaloaMarket — ElmasCore</span>
              <span>Support: +225 07 00 00 00</span>
            </div>
          </div>

          {/* Right Side: Form (Desktop) */}
          <div className="w-full max-w-md mx-auto">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100">
              <div className="text-left mb-6">
                <h1 className="text-2xl font-extrabold text-[var(--color-on-surface)]">Connexion</h1>
                <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
                  Connectez-vous à votre compte DaloaMarket
                </p>
              </div>

              {authError && (
                <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  {authError}
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-[var(--color-on-surface)] mb-1.5 pl-1">Email</label>
                  <input
                    {...register('email', {
                      required: "L'email est requis",
                      pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Email invalide' },
                    })}
                    type="email"
                    autoComplete="email"
                    className={cn(
                      'w-full px-4 py-3 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all text-sm font-medium',
                      errors.email ? 'border-red-500' : 'border-[var(--color-outline)]'
                    )}
                    placeholder="votre@email.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-[var(--color-on-surface)] mb-1.5 pl-1">Mot de passe</label>
                  <div className="relative">
                    <input
                      {...register('password', { required: 'Le mot de passe est requis' })}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      className={cn(
                        'w-full px-4 py-3 pr-12 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all text-sm font-medium',
                        errors.password ? 'border-red-500' : 'border-[var(--color-outline)]'
                      )}
                      placeholder="Votre mot de passe"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] active:scale-95">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.password.message}</p>}
                </div>

                <div className="text-right">
                  <Link to="/auth/reset-password" className="text-sm text-[var(--color-primary)] hover:underline font-medium">Mot de passe oublié ?</Link>
                </div>

                <Button type="submit" color="primary" fullWidth loading={loading} disabled={loading} className="py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold rounded-2xl active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2">
                  <LogIn size={18} />
                  Se connecter
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-[var(--color-on-surface-variant)]">ou</span></div>
              </div>

              <button
                type="button"
                disabled={googleLoading || loading}
                onClick={async () => {
                  setGoogleLoading(true); setAuthError(null);
                  try {
                    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
                    if (error) throw error;
                  } catch (err: any) { setAuthError(friendlyError(err)); setGoogleLoading(false); }
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 bg-white text-[#3c4043] font-medium text-sm hover:shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                )}
                Se connecter avec Google
              </button>

              <p className="text-center text-sm text-[var(--color-on-surface-variant)] mt-5">
                Pas encore de compte ?{' '}
                <Link to="/register" className="text-[var(--color-primary)] font-bold hover:underline">Rejoignez DaloaMarket</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE: Form Card (overlapping the header) */}
      <div className="lg:hidden flex-1 px-5 -mt-10 relative z-20 pb-10">
        <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-red-50 rounded-2xl flex items-start gap-3"
            >
              <span className="text-red-500 flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-sm text-red-600 font-medium">{authError}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 pl-1">Adresse Email</label>
              <input
                {...register('email', {
                  required: "L'email est requis",
                  pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Email invalide' },
                })}
                type="email"
                autoComplete="email"
                className={cn(
                  'w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-colors font-medium text-sm',
                  errors.email && 'ring-1 ring-red-500'
                )}
                placeholder="votre@email.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 pl-1">Mot de passe</label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Le mot de passe est requis' })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={cn(
                    'w-full px-4 py-3.5 pr-12 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-colors font-medium text-sm',
                    errors.password && 'ring-1 ring-red-500'
                  )}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 active:scale-95">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.password.message}</p>}
            </div>

            <div className="text-right">
              <Link to="/auth/reset-password" className="text-sm text-[var(--color-primary)] hover:underline font-semibold">Mot de passe oublié ?</Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[var(--color-primary)] text-white font-bold rounded-2xl shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-gray-400 font-medium">ou</span></div>
          </div>

          <button
            type="button"
            disabled={googleLoading || loading}
            onClick={async () => {
              setGoogleLoading(true); setAuthError(null);
              try {
                const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
                if (error) throw error;
              } catch (err: any) { setAuthError(friendlyError(err)); setGoogleLoading(false); }
            }}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-2xl border border-gray-200 bg-white text-[#3c4043] font-medium text-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            )}
            Se connecter avec Google
          </button>

          <p className="mt-6 text-center text-sm font-medium text-gray-500">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-[var(--color-primary)] font-bold hover:underline">Rejoignez DaloaMarket</Link>
          </p>
        </div>
      </div>
    </div>
  );
}