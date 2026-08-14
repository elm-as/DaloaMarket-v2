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
    <div className="min-h-screen bg-gray-50/70 pb-32">
      {/* ── HERO BANNER ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-6 pb-14 rounded-b-[36px] shadow-lg">
        <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-14 -left-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="relative max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-100">
                Paiements & Retraits
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Coordonnées de retrait
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* ── FORM CONTENT (OVERLAPPING HERO) ── */}
      <div className="relative z-10 -mt-7 max-w-xl mx-auto px-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-6 space-y-5">
            <div className="flex gap-3.5 items-start pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">Compte Mobile Money (Vendeur)</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed font-medium">
                  Lorsque vos ventes sont finalisées avec succès sur DaloaMarket, vos gains sont automatiquement transférés sur ce compte.
                </p>
              </div>
            </div>

            {/* Réseau de réception */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider pl-1">
                Opérateur Mobile Money
              </label>
              <div className="grid grid-cols-2 gap-3">
                {networks.map(net => {
                  const isChecked = selectedNetwork === net.id;
                  return (
                    <label
                      key={net.id}
                      className={cn(
                        'cursor-pointer relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all active:scale-95',
                        isChecked
                          ? 'border-orange-500 bg-orange-50/50 shadow-sm ring-2 ring-orange-500/20'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
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
                        'text-xs font-extrabold transition-colors',
                        isChecked ? 'text-orange-600' : 'text-gray-700'
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
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider pl-1">
                Numéro de téléphone (10 chiffres)
              </label>
              <input
                type="tel"
                {...register('payout_number', { validate: validatePayoutNumber })}
                className={cn(
                  'w-full h-12 px-4 text-sm font-semibold rounded-2xl border bg-gray-50/70 text-gray-900 placeholder:text-gray-400 placeholder:font-normal outline-none transition-all focus:bg-white focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500',
                  errors.payout_number ? 'border-red-400 focus:ring-red-500/10' : 'border-gray-200'
                )}
                placeholder="Ex: 07 01 02 03 04"
              />
              {errors.payout_number && (
                <p className="text-xs text-red-500 mt-1 pl-1 font-semibold">{errors.payout_number.message}</p>
              )}
              <p className="text-[11px] text-gray-400 leading-normal pl-1">
                Saisissez votre numéro ivoirien actif associé à votre compte Wave ou Mobile Money.
              </p>
            </div>
          </div>

          <Button
            type="submit"
            color="primary"
            size="lg"
            fullWidth
            loading={saving}
            disabled={saving}
            className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-extrabold shadow-lg shadow-orange-500/25 active:scale-[0.98]"
            icon={<Save size={18} />}
          >
            Enregistrer mes coordonnées
          </Button>
        </form>
      </div>
    </div>
  );
};

export default PayoutSetupPage;
