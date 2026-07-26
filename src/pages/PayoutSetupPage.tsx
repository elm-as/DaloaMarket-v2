import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, ShieldCheck } from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/utils';
import { friendlyError } from '../lib/messages';
import { Button } from '../components/ui/Button';

interface PayoutFormData {
  payout_network: string;
  payout_number: string;
}

const PayoutSetupPage: React.FC = () => {
  usePageTitle('Coordonnées de paiement');
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useSupabase();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PayoutFormData>({
    defaultValues: {
      payout_network: '',
      payout_number: '',
    },
  });

  const selectedNetwork = watch('payout_network');

  useEffect(() => {
    if (userProfile) {
      const up = userProfile as any;
      setValue('payout_network', up.payout_network || '');
      setValue('payout_number', up.payout_number || '');
    }
  }, [userProfile, setValue]);

  const validatePayoutNumber = (value: string, formValues: PayoutFormData) => {
    if (!formValues.payout_network && !value) return true;
    if (formValues.payout_network && !value) return 'Le numéro est requis pour le retrait';
    if (value) {
      const cleaned = value.replace(/\D/g, '');
      if (cleaned.startsWith('225') && cleaned.length === 13) return true;
      if (cleaned.length === 10) return true;
      return 'Numéro invalide (ex: 0701020304)';
    }
    return true;
  };

  const onSubmit = async (data: PayoutFormData) => {
    setSaving(true);
    try {
      const { error } = await updateUserProfile({
        payout_network: data.payout_network || null,
        payout_number: data.payout_number || null,
      } as any);
      if (error) throw error;
      toast.success('Coordonnées de paiement mises à jour !');
      navigate(-1);
    } catch (err: any) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const networks = [
    { id: 'wave-ci', label: 'Wave', logo: '/wave-logo.png', color: 'border-blue-200 bg-blue-50/10' },
    { id: 'orange-money-ci', label: 'Orange', logo: '/Orange_logo.svg', color: 'border-orange-200 bg-orange-50/10' },
    { id: 'mtn-ci', label: 'MTN', logo: '/MTN logo.jpeg', color: 'border-yellow-200 bg-yellow-50/10' },
    { id: 'moov-ci', label: 'Moov', logo: '/moov-logo.png', color: 'border-emerald-200 bg-emerald-50/10' }
  ];

  return (
    <div className="w-full max-w-xl mx-auto pb-32">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900 leading-tight">Moyens de paiement</h1>
          <p className="text-xs text-gray-400">Coordonnées de retrait</p>
        </div>
      </div>

      <div className="px-4 pt-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <div className="flex gap-3 items-start pb-4 border-b border-gray-50">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Coordonnées de paiement (Retraits)</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Si vous vendez sur DaloaMarket, c'est ici que vous recevrez vos paiements. Ces informations sont strictement confidentielles.
                </p>
              </div>
            </div>

            {/* Réseau de réception */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                Réseau de réception
              </label>
              <div className="grid grid-cols-2 gap-4">
                {networks.map(net => {
                  const isChecked = selectedNetwork === net.id;
                  return (
                    <label
                      key={net.id}
                      className={cn(
                        'cursor-pointer relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all hover:scale-[1.01] active:scale-[0.99]',
                        isChecked
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm shadow-[var(--color-primary)]/10 scale-[1.01]'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      )}
                    >
                      <input
                        type="radio"
                        value={net.id}
                        {...register('payout_network')}
                        className="peer sr-only"
                      />
                      
                      {/* Logo Container */}
                      <div className="w-16 h-12 flex items-center justify-center overflow-hidden mb-2">
                        <img
                          src={net.logo}
                          alt={net.label}
                          className="max-w-full max-h-full object-contain rounded-lg"
                        />
                      </div>
                      
                      <span className={cn(
                        'text-xs font-bold transition-colors',
                        isChecked ? 'text-[var(--color-primary)]' : 'text-gray-600'
                      )}>
                        {net.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Numéro de réception */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">
                Numéro de réception
              </label>
              <input
                type="tel"
                {...register('payout_number', { validate: validatePayoutNumber })}
                className={cn(
                  'w-full h-12 px-4 text-sm font-medium rounded-2xl border bg-white text-gray-900 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
                  errors.payout_number ? 'border-red-400' : 'border-gray-200'
                )}
                placeholder="Ex: 0701020304"
              />
              {errors.payout_number && (
                <p className="text-xs text-red-500 mt-1 pl-1 font-semibold">{errors.payout_number.message}</p>
              )}
              <p className="text-[10px] text-gray-400 leading-normal pl-1">
                Veuillez saisir votre numéro Mobile Money ivoirien actif de 10 chiffres.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            color="primary"
            fullWidth
            loading={saving}
            disabled={saving}
            className="py-4 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold rounded-2xl active:scale-[0.98] transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Save size={18} />
            Enregistrer les coordonnées
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PayoutSetupPage;
