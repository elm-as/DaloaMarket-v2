import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Coins, ArrowLeft, Check, Zap, Sparkles, CreditCard, Shield, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { friendlyError } from '../lib/messages';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { cn, validateIvorianPhone } from '../lib/utils';
import { initiatePayment } from '../lib/payment';
import { CREDIT_PACKS } from '../lib/featureFlags';

interface CreditPackFormData {
  name: string;
  phone: string;
}

const PAYMENT_METHODS = [
  { id: 'wave', label: 'Wave', logo: '/wave-logo.png', bgClass: 'bg-cyan-50 dark:bg-cyan-950/20', borderClass: 'border-cyan-200 dark:border-cyan-900/40 text-cyan-700 dark:text-cyan-400' },
  { id: 'orange', label: 'Orange Money', logo: '/Orange_logo.svg', bgClass: 'bg-orange-50 dark:bg-orange-950/20', borderClass: 'border-orange-200 dark:border-orange-900/40 text-orange-700 dark:text-orange-400' },
  { id: 'mtn', label: 'MTN MoMo', logo: '/MTN logo.jpeg', bgClass: 'bg-yellow-50 dark:bg-yellow-950/20', borderClass: 'border-yellow-200 dark:border-yellow-900/40 text-yellow-700 dark:text-yellow-400' },
  { id: 'moov', label: 'Moov Money', logo: '/moov-logo.png', bgClass: 'bg-green-50 dark:bg-green-950/20', borderClass: 'border-green-200 dark:border-green-900/40 text-green-700 dark:text-green-400' },
];

export default function AcheterPackAnnoncesPage() {
  usePageTitle('Acheter des Crédits');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useSupabase();

  const isSuccess = searchParams.get('status') === 'success';
  const successCredits = searchParams.get('credits') || '0';

  const [step, setStep] = useState(1);
  const [selectedPack, setSelectedPack] = useState<typeof CREDIT_PACKS[number]>(CREDIT_PACKS[1]); // Default to Argent pack
  const [selectedMethod, setSelectedMethod] = useState<string>('wave');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreditPackFormData>({
    defaultValues: {
      name: userProfile?.full_name || '',
      phone: userProfile?.phone || '',
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const onSubmit = async (data: CreditPackFormData) => {
    if (!validateIvorianPhone(data.phone)) {
      setErrorMsg('Numéro de téléphone ivoirien invalide (ex: 0102030405)');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const payment = await initiatePayment({
        type: selectedPack.id,
        amount: selectedPack.price,
        userId: user.id,
        customerName: data.name,
        customerPhone: data.phone,
        metadata: { 
          name: data.name, 
          phone: data.phone, 
          credits: selectedPack.credits,
          payment_method: selectedMethod 
        },
      });

      if (payment?.paymentUrl) {
        window.location.href = payment.paymentUrl;
      } else {
        setErrorMsg('Impossible de lancer le paiement. Réessayez.');
      }
    } catch (err: any) {
      setErrorMsg(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const currentBalance = userProfile?.listing_credits ?? 0;

  // Show Success screen after successful checkout return
  if (isSuccess) {
    return (
      <div className="pb-20 min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full"
        >
          <Card className="p-8 rounded-2xl border border-green-200 dark:border-green-900/50 shadow-lg text-center bg-[var(--color-surface)]">
            <div className="w-16 h-16 bg-green-50 dark:bg-green-950/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={36} className="text-green-500" />
            </div>
            
            <h1 className="text-2xl font-extrabold text-[var(--color-on-surface)]">
              Paiement validé
            </h1>
            
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-3">
              Votre compte a été rechargé automatiquement. Vous disposez maintenant de vos crédits.
            </p>

            <div className="my-6 p-4 rounded-xl bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 flex items-center justify-center gap-3">
              <Coins size={24} className="text-yellow-600 dark:text-yellow-500 fill-yellow-500/10" />
              <div className="text-left">
                <div className="text-xs text-green-800 dark:text-green-400 font-medium">Crédits ajoutés</div>
                <div className="text-lg font-black text-green-900 dark:text-green-200">+{successCredits} crédits</div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate('/profil')}
                color="primary"
                fullWidth
                className="py-3 font-semibold rounded-xl"
              >
                Gérer mes annonces
              </Button>
              <Button
                onClick={() => navigate('/')}
                variant="outlined"
                fullWidth
                className="py-3 font-semibold rounded-xl border-[var(--color-outline)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
              >
                Retour à l'accueil
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-28 min-h-screen bg-gray-50/70">
      {/* ── HERO BANNER ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 px-5 pt-6 pb-16 rounded-b-[36px] shadow-lg">
        <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-14 -left-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="relative max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (step > 1) {
                  setStep(step - 1);
                } else {
                  navigate(-1);
                }
              }}
              className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all"
              aria-label="Retour"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-100">
                Visibilité & Boosts
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">
                Packs de Crédits
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-white text-xs font-extrabold border border-white/20">
            <Coins size={15} className="fill-amber-300 stroke-amber-400" />
            <span>{currentBalance} crédit{currentBalance > 1 ? 's' : ''}</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 -mt-8 max-w-2xl lg:max-w-5xl mx-auto px-4">
        {/* Wizard Steps Indicator */}
        <div className="bg-white rounded-3xl p-3.5 border border-gray-100 shadow-lg shadow-gray-200/50 mb-6 max-w-md mx-auto">
          <div className="flex items-center justify-between relative px-3">
            {/* Background Line */}
            <div className="absolute left-8 right-8 top-1/2 -translate-y-1/2 h-1 bg-gray-100 -z-0 rounded-full" />
            {/* Active Progress Line */}
            <div 
              className="absolute left-8 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-orange-500 to-amber-600 transition-all duration-300 -z-0 rounded-full"
              style={{ width: `${((step - 1) / 2) * (100 - 20)}%` }}
            />

            {[
              { label: 'Pack', stepNum: 1 },
              { label: 'Paiement', stepNum: 2 },
              { label: 'Validation', stepNum: 3 }
            ].map((item) => (
              <div key={item.stepNum} className="relative z-10 flex flex-col items-center gap-1">
                <div 
                  className={cn(
                    "w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-bold transition-all shadow-sm",
                    step === item.stepNum 
                      ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white ring-4 ring-orange-500/20 shadow-orange-500/30" 
                      : step > item.stepNum
                        ? "bg-emerald-500 text-white shadow-emerald-500/20"
                        : "bg-white text-gray-400 border border-gray-200"
                  )}
                >
                  {step > item.stepNum ? <Check size={14} strokeWidth={3} /> : item.stepNum}
                </div>
                <span className={cn(
                  "text-[10px] font-extrabold transition-colors",
                  step === item.stepNum ? "text-orange-600" : step > item.stepNum ? "text-gray-800" : "text-gray-400"
                )}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Wizard Body with transitions */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-xl font-extrabold text-gray-900">
                  Sélectionnez votre formule de crédits
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Boostez la position de vos annonces pour maximiser vos ventes à Daloa.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CREDIT_PACKS.map((pack) => {
                  const isSelected = selectedPack.id === pack.id;
                  return (
                    <div
                      key={pack.id}
                      onClick={() => setSelectedPack(pack)}
                      className={cn(
                        "relative cursor-pointer rounded-3xl p-6 border-2 transition-all flex flex-col justify-between overflow-hidden active:scale-[0.98]",
                        isSelected
                          ? "border-orange-500 bg-white shadow-xl shadow-orange-500/10 ring-2 ring-orange-500/20"
                          : "border-gray-100 bg-white shadow-md shadow-gray-200/50 hover:border-gray-200"
                      )}
                    >
                      {pack.popular && (
                        <div className="absolute top-0 right-0 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-[9px] font-black uppercase tracking-wider py-1 px-3.5 rounded-bl-2xl flex items-center gap-1 shadow-sm">
                          <Sparkles size={10} />
                          Populaire
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest block">
                          {pack.label}
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-2">
                          <span className="text-3xl font-black text-gray-900">
                            {pack.credits}
                          </span>
                          <span className="text-xs text-gray-500 font-extrabold">
                            crédits
                          </span>
                        </div>

                        <div className="mt-4 space-y-2.5 text-xs text-gray-600 font-medium">
                          <div className="flex items-center gap-2">
                            <Zap size={14} className="text-amber-500 fill-amber-500" />
                            <span>Boosts d'annonces 24h</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Check size={14} className="text-emerald-600" />
                            <span>Validité illimitée</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-base font-black text-orange-600">
                          {pack.price.toLocaleString()} FCFA
                        </span>
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                          isSelected ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300"
                        )}>
                          {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setStep(2)}
                  color="primary"
                  size="lg"
                  className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-extrabold shadow-lg shadow-orange-500/25 active:scale-[0.98] flex items-center gap-1 px-8"
                >
                  Continuer
                  <ChevronRight size={16} />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-xl font-extrabold text-gray-900">
                  Choisissez votre opérateur
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Paiement sécurisé instantané par Mobile Money.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = selectedMethod === method.id;
                  return (
                    <div
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={cn(
                        "cursor-pointer rounded-3xl p-5 border-2 transition-all flex flex-col items-center text-center justify-center gap-3 active:scale-95",
                        isSelected
                          ? "border-orange-500 bg-white shadow-xl shadow-orange-500/10 ring-2 ring-orange-500/20"
                          : "border-gray-100 bg-white shadow-md shadow-gray-200/50 hover:border-gray-200"
                      )}
                    >
                      <div className="w-14 h-12 flex items-center justify-center">
                        <img 
                          src={method.logo} 
                          alt={method.label} 
                          className="max-h-full max-w-full object-contain rounded-lg"
                        />
                      </div>
                      <span className="text-xs font-extrabold text-gray-900">
                        {method.label}
                      </span>
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected ? "border-orange-500 bg-orange-500 text-white" : "border-gray-300"
                      )}>
                        {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  onClick={() => setStep(1)}
                  variant="outlined"
                  size="lg"
                  className="rounded-2xl font-extrabold"
                >
                  ← Retour
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  color="primary"
                  size="lg"
                  className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-extrabold shadow-lg shadow-orange-500/25 active:scale-[0.98] flex items-center gap-1 px-8"
                >
                  Continuer
                  <ChevronRight size={16} />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-xl font-extrabold text-gray-900">
                  Coordonnées de facturation
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Validez vos informations pour lancer le prélèvement sécurisé.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Form Side */}
                <div className="col-span-2 space-y-4">
                  {errorMsg && (
                    <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
                      {errorMsg}
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg shadow-gray-200/50 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5 pl-1">
                        Nom complet
                      </label>
                      <input
                        {...register('name', { required: 'Le nom est requis' })}
                        type="text"
                        className={cn(
                          'w-full px-4 py-3 rounded-2xl border bg-gray-50/70 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-sm font-semibold',
                          errors.name ? 'border-red-500' : 'border-gray-200'
                        )}
                        placeholder="Ex: Kouassi Konan"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-xs mt-1 pl-1 font-semibold">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1.5 pl-1">
                        Numéro Mobile Money (10 chiffres)
                      </label>
                      <input
                        {...register('phone', {
                          required: 'Le téléphone est requis',
                          validate: (val) => validateIvorianPhone(val) || 'Format invalide (ex: 0102030405)',
                        })}
                        type="tel"
                        className={cn(
                          'w-full px-4 py-3 rounded-2xl border bg-gray-50/70 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-sm font-semibold',
                          errors.phone ? 'border-red-500' : 'border-gray-200'
                        )}
                        placeholder="Ex: 01 02 03 04 05"
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-xs mt-1 pl-1 font-semibold">{errors.phone.message}</p>
                      )}
                      <span className="text-[11px] text-gray-400 mt-1.5 block pl-1">
                        Ce numéro recevra le push de paiement Mobile Money.
                      </span>
                    </div>

                    <div className="flex justify-between pt-4 gap-3">
                      <Button
                        type="button"
                        onClick={() => setStep(2)}
                        variant="outlined"
                        size="lg"
                        className="rounded-2xl font-extrabold"
                      >
                        ← Retour
                      </Button>
                      
                      <Button
                        type="submit"
                        color="primary"
                        size="lg"
                        loading={loading}
                        disabled={loading}
                        className="flex-1 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-extrabold text-white shadow-lg shadow-orange-500/25 active:scale-[0.98]"
                      >
                        Payer {selectedPack.price.toLocaleString()} FCFA
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Summary Card */}
                <div className="col-span-1">
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-lg shadow-gray-200/50 space-y-4">
                    <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-2">
                      <CreditCard size={15} className="text-orange-600" />
                      Résumé de la commande
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Pack :</span>
                        <span className="font-extrabold text-gray-900">{selectedPack.label}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Crédits :</span>
                        <span className="font-extrabold text-orange-600">+{selectedPack.credits}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Opérateur :</span>
                        <span className="font-extrabold text-gray-900">
                          {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label}
                        </span>
                      </div>
                      <div className="border-t border-gray-100 my-3" />
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-gray-500 uppercase">Total :</span>
                        <span className="text-xl font-black text-orange-600 tabular-nums">
                          {selectedPack.price.toLocaleString()} FCFA
                        </span>
                      </div>
                    </div>

                    <div className="bg-orange-50/70 p-3.5 rounded-2xl border border-orange-100 flex items-start gap-2.5">
                      <Shield size={16} className="text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] text-orange-950 font-medium leading-snug">
                        Paiement sécurisé par MoneyFusion. Vos crédits sont activés automatiquement.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAQs */}
        {step < 3 && (
          <div className="mt-8 bg-white rounded-3xl p-6 border border-gray-100 shadow-md shadow-gray-200/50">
            <h4 className="text-xs font-extrabold text-gray-900 mb-3 uppercase tracking-wider">Questions fréquentes</h4>
            <div className="space-y-3 text-xs text-gray-600">
              <div>
                <h5 className="font-extrabold text-gray-900">À quoi servent les crédits ?</h5>
                <p className="mt-0.5 leading-relaxed font-medium">Les crédits servent à booster vos annonces pour qu'elles restent tout en haut des résultats de recherche. 1 crédit = 24h de boost.</p>
              </div>
              <div>
                <h5 className="font-extrabold text-gray-900">Combien coûte un boost ?</h5>
                <p className="mt-0.5 leading-relaxed font-medium">Le coût dépend de la durée : 24 heures coûte 1 crédit, 48 heures coûte 2 crédits, et 7 jours coûte 5 crédits.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}