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
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 rounded-2xl shadow-elevation-2">
          <h1 className="text-2xl font-bold text-[var(--color-on-surface)] text-center mb-2">
            Mot de passe oublie
          </h1>
          <p className="text-[var(--color-on-surface-variant)] text-sm text-center mb-6">
            Entrez votre email pour recevoir un lien de reinitialisation
          </p>

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
                className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4"
              >
                <Mail size={32} className="text-green-500" />
              </motion.div>
              <p className="text-[var(--color-on-surface)] font-medium mb-2">Email envoyé</p>
              <p className="text-[var(--color-on-surface-variant)] text-sm mb-6">
                Vérifiez votre boîte de réception et suivez le lien.
              </p>
              <Link to="/login">
                <Button variant="outlined" fullWidth className="active:scale-[0.97]">
                  <ArrowLeft size={18} className="mr-2" />
                  Retour à la connexion
                </Button>
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  {errorMsg}
                </div>
              )}

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

              <Button
                type="submit"
                color="primary"
                fullWidth
                loading={loading}
                disabled={loading}
                className="active:scale-[0.97]"
              >
                <Mail size={18} className="mr-2" />
                Envoyer le lien
              </Button>

              <Link to="/login" className="block text-center text-sm text-[var(--color-primary)] hover:underline">
                Retour à la connexion
              </Link>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
}