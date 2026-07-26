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

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginPage() {
  usePageTitle('Connexion');
  const { user, signIn } = useSupabase();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 rounded-2xl shadow-elevation-2">
          <div className="text-center mb-6">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 overflow-hidden">
              <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">Connexion</h1>
            <p className="text-[var(--color-on-surface-variant)] text-sm mt-1">
              Connectez-vous a votre compte DaloaMarket
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                Email
              </label>
              <input
                {...register('email', {
                  required: "L'email est requis",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Email invalide',
                  },
                })}
                type="email"
                autoComplete="email"
                className={cn(
                  'w-full px-4 py-3 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all',
                  errors.email ? 'border-red-500' : 'border-[var(--color-outline)]'
                )}
                placeholder="votre@email.com"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  {...register('password', { required: 'Le mot de passe est requis' })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={cn(
                    'w-full px-4 py-3 pr-12 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all',
                    errors.password ? 'border-red-500' : 'border-[var(--color-outline)]'
                  )}
                  placeholder="Votre mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] active:scale-[0.97]"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div className="text-right">
              <Link
                to="/auth/reset-password"
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                Mot de passe oublie ?
              </Link>
            </div>

            <Button
              type="submit"
              color="primary"
              fullWidth
              loading={loading}
              disabled={loading}
              className="active:scale-[0.97]"
            >
              <LogIn size={18} className="mr-2" />
              Se connecter
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-outline)]" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-[var(--color-surface)] text-[var(--color-on-surface-variant)]">
                ou
              </span>
            </div>
          </div>

          <p className="text-center text-sm text-[var(--color-on-surface-variant)]">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-[var(--color-primary)] font-medium hover:underline">
              Rejoignez DaloaMarket
            </Link>
          </p>
        </Card>
      </motion.div>
    </div>
  );
}