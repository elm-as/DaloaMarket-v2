import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { friendlyError } from '../lib/messages';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';

interface ResetFormData {
  email: string;
}

export default function ResetPasswordPage() {
  usePageTitle('Mot de passe oublie');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormData>();

  const onSubmit = async (data: ResetFormData) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSent(true);
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
            Mot de passe oublié
          </h1>
          <p className="text-xs text-orange-100 mt-1 font-medium">
            Récupérez l'accès à votre compte DaloaMarket
          </p>
        </div>
      </div>

      <div className="relative z-10 -mt-8 max-w-md mx-auto px-4">
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 sm:p-8 border border-gray-100">
          {sent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100"
              >
                <Mail size={32} />
              </motion.div>
              <p className="text-base font-extrabold text-gray-900 mb-1">Lien de réinitialisation envoyé</p>
              <p className="text-xs text-gray-500 mb-6 font-medium leading-relaxed">
                Consultez votre boîte de réception et cliquez sur le lien pour définir votre nouveau mot de passe.
              </p>
              <Link to="/login">
                <Button
                  variant="outlined"
                  size="lg"
                  fullWidth
                  className="rounded-2xl font-extrabold active:scale-[0.98]"
                >
                  <ArrowLeft size={18} className="mr-2" />
                  Retour à la connexion
                </Button>
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1.5 pl-1">
                  Adresse email du compte
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
                    'w-full px-4 py-3.5 rounded-2xl border bg-gray-50/70 text-gray-900 placeholder:text-gray-400 placeholder:font-normal focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-sm font-semibold',
                    errors.email ? 'border-red-500' : 'border-gray-200'
                  )}
                  placeholder="votre@email.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5 pl-1 font-semibold">{errors.email.message}</p>
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
                icon={<Mail size={18} />}
              >
                Envoyer le lien de récupération
              </Button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors">
                  ← Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}