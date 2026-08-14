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
    <div className="min-h-screen bg-gray-50/70 pb-20">
      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-8 pb-16 text-white rounded-b-[36px] shadow-lg text-center">
        <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-14 -left-8 w-32 h-32 rounded-full bg-white/10" />

        <div className="relative z-10 max-w-sm mx-auto">
          <div className="w-14 h-14 bg-white p-2.5 rounded-3xl shadow-xl mx-auto mb-3 flex items-center justify-center">
            <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Nouveau mot de passe
          </h1>
          <p className="text-xs text-orange-100 mt-1 font-medium">
            Définissez un mot de passe sécurisé pour votre compte
          </p>
        </div>
      </div>

      <div className="relative z-10 -mt-8 max-w-md mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 sm:p-8 border border-gray-100">
          {errorMsg && (
            <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5 pl-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Le mot de passe est requis',
                    minLength: { value: 6, message: '6 caractères minimum' },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={cn(
                    'w-full px-4 py-3.5 pr-12 rounded-2xl border bg-gray-50/70 text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-sm font-semibold',
                    errors.password ? 'border-red-500' : 'border-gray-200'
                  )}
                  placeholder="6 caractères minimum"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 active:scale-95 transition-all"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5 pl-1 font-semibold">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-800 mb-1.5 pl-1">
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
                  'w-full px-4 py-3.5 rounded-2xl border bg-gray-50/70 text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-sm font-semibold',
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
                )}
                placeholder="Confirmez votre mot de passe"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1.5 pl-1 font-semibold">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              color="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={loading}
              className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-extrabold text-white shadow-lg shadow-orange-500/25 active:scale-[0.98] mt-2"
              icon={<KeyRound size={18} />}
            >
              Mettre à jour le mot de passe
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}