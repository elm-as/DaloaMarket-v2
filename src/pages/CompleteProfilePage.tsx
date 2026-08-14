import React, { useState, useMemo } from 'react';
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
import { trackCompleteRegistration } from '../lib/analytics';

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
  const { user, userProfile, isProfileComplete, createUserProfile } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const from = (location.state as any)?.from || '/';

  // Pre-fill from Google OAuth metadata or existing profile
  const googleMeta = user?.user_metadata;
  const prefillName = userProfile?.full_name || googleMeta?.full_name || googleMeta?.name || '';
  const nameFromGoogle = !userProfile?.full_name && !!(googleMeta?.full_name || googleMeta?.name);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      full_name: prefillName,
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isProfileComplete) {
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
        avatar_url: (!userProfile?.avatar_url && (googleMeta?.avatar_url || googleMeta?.picture))
          ? (googleMeta.avatar_url || googleMeta.picture)
          : undefined,
      });
      trackCompleteRegistration({ content_name: 'CompleteProfile' });
      navigate(from);
    } catch (err: any) {
      setErrorMsg(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* App-like Header Background */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 px-4 pt-12 pb-24 rounded-b-[40px] shadow-sm relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 flex flex-col items-center text-center">
          {googleMeta?.avatar_url || googleMeta?.picture ? (
            <img
              src={googleMeta.avatar_url || googleMeta.picture}
              alt="Photo de profil"
              className="w-20 h-20 rounded-full mb-4 border-4 border-white/30 object-cover shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg -rotate-3">
              <UserCheck className="w-8 h-8 text-orange-500" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-white mb-1">
            {nameFromGoogle ? `Bienvenue ${prefillName.split(' ')[0]} !` : 'Compléter mon profil'}
          </h1>
          <p className="text-orange-100 text-sm">
            {nameFromGoogle
              ? 'Plus que quelques infos pour finaliser'
              : 'Ces informations sont nécessaires pour continuer'}
          </p>
        </div>
      </div>

      {/* Form Card (overlapping the header) */}
      <div className="flex-1 px-5 -mt-10 relative z-20 pb-10">
        <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 bg-red-50 rounded-2xl flex items-start gap-3"
            >
              <span className="text-red-500 flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 pl-1">
                Nom complet
                {nameFromGoogle && (
                  <span className="ml-2 text-xs text-green-600 font-normal">✓ via Google</span>
                )}
              </label>
              <input
                {...register('full_name', { required: 'Le nom est requis' })}
                type="text"
                readOnly={nameFromGoogle}
                className={cn(
                  'w-full px-4 py-3.5 rounded-2xl focus:ring-2 outline-none transition-colors font-medium text-sm',
                  errors.full_name ? 'ring-1 ring-red-500 bg-gray-50 border-none' : nameFromGoogle ? 'bg-green-50 border border-green-200 text-green-800 cursor-default' : 'bg-gray-50 border-none focus:ring-[var(--color-primary)]'
                )}
                placeholder="Votre nom complet"
              />
              {errors.full_name && (
                <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 pl-1">
                Téléphone (format ivoirien)
              </label>
              <input
                {...register('phone', {
                  required: 'Le téléphone est requis',
                  validate: (val) => validateIvorianPhone(val) || 'Format invalide (ex: 0102030405)',
                })}
                type="tel"
                className={cn(
                  'w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-colors font-medium text-sm',
                  errors.phone && 'ring-1 ring-red-500'
                )}
                placeholder="0102030405"
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2 pl-1">
                Commune / District
              </label>
              <select
                {...register('district', { required: 'La commune est requise' })}
                className={cn(
                  'w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-colors font-medium text-sm',
                  errors.district && 'ring-1 ring-red-500'
                )}
              >
                <option value="">Selectionnez votre commune</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {errors.district && (
                <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.district.message}</p>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-1 pl-1">Informations de paiement</h3>
              <p className="text-xs text-gray-400 mb-4 pl-1 leading-relaxed">
                Optionnel — pour recevoir vos gains de vente via Mobile Money.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 pl-1">
                    Réseau de retrait
                  </label>
                  <select
                    {...register('payout_network')}
                    className="w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-colors font-medium text-sm"
                  >
                    <option value="">Sélectionnez un réseau</option>
                    <option value="wave-ci">Wave</option>
                    <option value="orange-money-ci">Orange Money</option>
                    <option value="mtn-ci">MTN Money</option>
                    <option value="moov-ci">Moov Money</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2 pl-1">
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
                      'w-full px-4 py-3.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-[var(--color-primary)] outline-none transition-colors font-medium text-sm',
                      errors.payout_number && 'ring-1 ring-red-500'
                    )}
                    placeholder="Numéro qui recevra l'argent"
                  />
                  {errors.payout_number && (
                    <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.payout_number.message}</p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[var(--color-primary)] text-white font-bold rounded-2xl shadow-md active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}