import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { friendlyError } from '../lib/messages';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';

interface UpdatePasswordData {
  password: string;
  confirmPassword: string;
}

export default function UpdatePasswordPage() {
  usePageTitle('Nouveau mot de passe');
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<UpdatePasswordData>();

  const onSubmit = async (data: UpdatePasswordData) => {
    if (data.password !== data.confirmPassword) {
      setErrorMsg('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) throw error;
      navigate('/login');
    } catch (err: any) {
      setErrorMsg(friendlyError(err));
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
            <div className="w-16 h-16 rounded-full bg-[var(--color-primary-container)] flex items-center justify-center mx-auto mb-4">
              <KeyRound size={32} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">
              Nouveau mot de passe
            </h1>
            <p className="text-[var(--color-on-surface-variant)] text-sm mt-1">
              Choisissez un nouveau mot de passe pour votre compte
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Le mot de passe est requis',
                    minLength: { value: 6, message: '6 caracteres minimum' },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={cn(
                    'w-full px-4 py-3 pr-12 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all',
                    errors.password ? 'border-red-500' : 'border-[var(--color-outline)]'
                  )}
                  placeholder="6 caracteres minimum"
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

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                Confirmer le mot de passe
              </label>
              <input
                {...register('confirmPassword', {
                  required: 'Confirmation requise',
                  validate: (val) => val === watch('password') || 'Les mots de passe ne correspondent pas',
                })}
                type="password"
                autoComplete="new-password"
                className={cn(
                  'w-full px-4 py-3 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all',
                  errors.confirmPassword ? 'border-red-500' : 'border-[var(--color-outline)]'
                )}
                placeholder="Confirmez votre mot de passe"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              color="primary"
              fullWidth
              loading={loading}
              disabled={loading}
              className="active:scale-[0.97]"
            >
              Mettre à jour le mot de passe
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}