import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { friendlyError } from '../lib/messages';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { cn, validateIvorianPhone, DISTRICTS } from '../lib/utils';

interface ProfileFormData {
  full_name: string;
  phone: string;
  district: string;
  payout_network?: string;
  payout_number?: string;
}

export default function CompleteProfilePage() {
  usePageTitle('Compléter mon profil');
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile, createUserProfile } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const from = (location.state as any)?.from || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (userProfile && userProfile.full_name) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (data: ProfileFormData) => {
    if (!validateIvorianPhone(data.phone)) {
      setErrorMsg('Numéro de téléphone ivoirien invalide');
      return;
    }

    if (data.payout_number && !validateIvorianPhone(data.payout_number)) {
      setErrorMsg('Numéro de retrait ivoirien invalide');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      await createUserProfile({
        email: user.email || '',
        full_name: data.full_name,
        phone: data.phone,
        district: data.district,
        payout_network: data.payout_network || null,
        payout_number: data.payout_number || null,
      });
      navigate(from);
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
              <UserCheck size={32} className="text-[var(--color-primary)]" />
            </div>
            <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">
              Compléter mon profil
            </h1>
            <p className="text-[var(--color-on-surface-variant)] text-sm mt-1">
              Ces informations sont necessaires pour continuer
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
                Nom complet
              </label>
              <input
                {...register('full_name', { required: 'Le nom est requis' })}
                type="text"
                className={cn(
                  'w-full px-4 py-3 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all',
                  errors.full_name ? 'border-red-500' : 'border-[var(--color-outline)]'
                )}
                placeholder="Votre nom complet"
              />
              {errors.full_name && (
                <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                Téléphone (format ivoirien)
              </label>
              <input
                {...register('phone', {
                  required: 'Le téléphone est requis',
                  validate: (val) => validateIvorianPhone(val) || 'Format invalide (ex: 0102030405)',
                })}
                type="tel"
                className={cn(
                  'w-full px-4 py-3 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all',
                  errors.phone ? 'border-red-500' : 'border-[var(--color-outline)]'
                )}
                placeholder="0102030405"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                Commune / District
              </label>
              <select
                {...register('district', { required: 'La commune est requise' })}
                className={cn(
                  'w-full px-4 py-3 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all',
                  errors.district ? 'border-red-500' : 'border-[var(--color-outline)]'
                )}
              >
                <option value="">Selectionnez votre commune</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {errors.district && (
                <p className="text-red-500 text-xs mt-1">{errors.district.message}</p>
              )}
            </div>

            <div className="pt-4 border-t border-[var(--color-outline)]">
              <h3 className="text-sm font-bold text-[var(--color-on-surface)] mb-2">Informations de paiement (Optionnel)</h3>
              <p className="text-xs text-[var(--color-on-surface-variant)] mb-4 leading-relaxed">
                Configurez ceci si vous comptez vendre des produits. C'est sur ce compte que vos gains seront virés.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                    Réseau de retrait
                  </label>
                  <select
                    {...register('payout_network')}
                    className="w-full px-4 py-3 rounded-2xl border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all"
                  >
                    <option value="">Sélectionnez un réseau</option>
                    <option value="wave-ci">Wave</option>
                    <option value="orange-money-ci">Orange Money</option>
                    <option value="mtn-ci">MTN Money</option>
                    <option value="moov-ci">Moov Money</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
                    Numéro de retrait
                  </label>
                  <input
                    {...register('payout_number', {
                      validate: (val) => {
                        if (!val) return true;
                        return validateIvorianPhone(val) || 'Format invalide';
                      }
                    })}
                    type="tel"
                    className={cn(
                      'w-full px-4 py-3 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all',
                      errors.payout_number ? 'border-red-500' : 'border-[var(--color-outline)]'
                    )}
                    placeholder="Numéro qui recevra l'argent"
                  />
                  {errors.payout_number && (
                    <p className="text-red-500 text-xs mt-1">{errors.payout_number.message}</p>
                  )}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              color="primary"
              fullWidth
              loading={loading}
              disabled={loading}
              className="active:scale-[0.97]"
            >
              Enregistrer
            </Button>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}