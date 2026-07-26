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
    <div className="pb-20 min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-outline)] px-4 py-3 flex items-center justify-between shadow-sm">
        <button
          onClick={() => {
            if (step > 1) {
              setStep(step - 1);
            } else {
              navigate(-1);
            }
          }}
          className="flex items-center gap-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors active:scale-[0.97]"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Retour</span>
        </button>
        
        <div className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 px-3 py-1.5 rounded-full text-yellow-700 dark:text-yellow-400">
          <Coins size={14} className="fill-yellow-500 stroke-yellow-700 dark:stroke-yellow-400" />
          <span className="text-xs font-bold">{currentBalance} crédit{currentBalance > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-6">
        
        {/* Wizard Steps Indicator */}
        <div className="mb-8 flex items-center justify-between max-w-md mx-auto relative px-2">
          {/* Background Line */}
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--color-outline)] -z-10" />
          {/* Active Progress Line */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[var(--color-primary)] transition-all duration-300 -z-10"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />

          {[
            { label: 'Pack', stepNum: 1 },
            { label: 'Paiement', stepNum: 2 },
            { label: 'Validation', stepNum: 3 }
          ].map((item) => (
            <div key={item.stepNum} className="flex flex-col items-center gap-1.5">
              <div 
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm border-2",
                  step === item.stepNum 
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)] scale-110" 
                    : step > item.stepNum
                      ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                      : "bg-[var(--color-surface)] text-[var(--color-on-surface-variant)] border-[var(--color-outline)]"
                )}
              >
                {step > item.stepNum ? <Check size={14} strokeWidth={3} /> : item.stepNum}
              </div>
              <span className={cn(
                "text-[10px] font-semibold transition-colors",
                step >= item.stepNum ? "text-[var(--color-on-surface)]" : "text-[var(--color-on-surface-variant)]"
              )}>
                {item.label}
              </span>
            </div>
          ))}
        </div>

        {/* Wizard Body with transitions */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-xl font-extrabold text-[var(--color-on-surface)]">
                  Sélectionnez votre pack
                </h2>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-1.5">
                  Choisissez la formule de crédits qui correspond le mieux à vos besoins de publication.
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
                        "relative cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col justify-between overflow-hidden",
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-surface)] shadow-md"
                          : "border-[var(--color-outline)] bg-[var(--color-surface)] hover:border-[var(--color-on-surface-variant)]/60"
                      )}
                    >
                      {pack.popular && (
                        <div className="absolute top-0 right-0 bg-[var(--color-primary)] text-white text-[9px] font-bold uppercase tracking-wider py-1 px-3 rounded-bl-xl flex items-center gap-1 shadow-sm">
                          <Sparkles size={8} />
                          Populaire
                        </div>
                      )}

                      <div>
                        <h3 className="text-xs font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">
                          {pack.label}
                        </h3>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-3xl font-black text-[var(--color-on-surface)]">
                            {pack.credits}
                          </span>
                          <span className="text-xs text-[var(--color-on-surface-variant)] font-semibold">
                            crédits
                          </span>
                        </div>

                        <div className="mt-4 space-y-2 text-xs text-[var(--color-on-surface-variant)]">
                          <div className="flex items-center gap-1.5">
                            <Zap size={14} className="text-yellow-500 fill-yellow-500" />
                            <span>Boosts instantanés</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check size={14} className="text-green-500" />
                            <span>Validité illimitée</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-[var(--color-outline)] flex items-center justify-between">
                        <span className="text-sm font-black text-[var(--color-primary)]">
                          {pack.price.toLocaleString()} FCFA
                        </span>
                        <div className={cn(
                          "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                          isSelected ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-outline)]"
                        )}>
                          {isSelected && <Check size={10} strokeWidth={3} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setStep(2)}
                  color="primary"
                  className="py-3 px-6 font-semibold rounded-xl flex items-center gap-1 shadow-sm active:scale-[0.97]"
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
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-xl font-extrabold text-[var(--color-on-surface)]">
                  Moyen de paiement
                </h2>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-1.5">
                  Sélectionnez le réseau Mobile Money avec lequel vous souhaitez régler.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = selectedMethod === method.id;
                  return (
                    <div
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={cn(
                        "cursor-pointer rounded-2xl p-4 border-2 transition-all flex flex-col items-center text-center justify-center gap-3",
                        isSelected
                          ? "border-[var(--color-primary)] bg-[var(--color-surface)] shadow-md"
                          : "border-[var(--color-outline)] bg-[var(--color-surface)] hover:border-[var(--color-on-surface-variant)]/60"
                      )}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-100">
                        <img 
                          src={method.logo} 
                          alt={method.label} 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Fallback if image fails
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[var(--color-on-surface)]">
                        {method.label}
                      </span>
                      <div className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                        isSelected ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-[var(--color-outline)]"
                      )}>
                        {isSelected && <Check size={10} strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <Button
                  onClick={() => setStep(1)}
                  variant="outlined"
                  className="py-3 px-6 font-semibold rounded-xl border-[var(--color-outline)] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
                >
                  Retour
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  color="primary"
                  className="py-3 px-6 font-semibold rounded-xl flex items-center gap-1 shadow-sm active:scale-[0.97]"
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
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-xl font-extrabold text-[var(--color-on-surface)]">
                  Informations de facturation
                </h2>
                <p className="text-xs text-[var(--color-on-surface-variant)] mt-1.5">
                  Renseignez vos coordonnées de paiement pour valider l'achat de vos crédits.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Form Side */}
                <div className="col-span-2 space-y-4">
                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">
                      {errorMsg}
                    </div>
                  )}

                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[var(--color-on-surface)] mb-1">
                        Nom complet
                      </label>
                      <input
                        {...register('name', { required: 'Le nom est requis' })}
                        type="text"
                        className={cn(
                          'w-full px-4 py-3 rounded-xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all text-xs font-medium',
                          errors.name ? 'border-red-500' : 'border-[var(--color-outline)]'
                        )}
                        placeholder="Ex: Kouassi Konan"
                      />
                      {errors.name && (
                        <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--color-on-surface)] mb-1">
                        Téléphone Mobile Money
                      </label>
                      <input
                        {...register('phone', {
                          required: 'Le téléphone est requis',
                          validate: (val) => validateIvorianPhone(val) || 'Format de numéro ivoirien invalide (ex: 0102030405)',
                        })}
                        type="tel"
                        className={cn(
                          'w-full px-4 py-3 rounded-xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all text-xs font-medium',
                          errors.phone ? 'border-red-500' : 'border-[var(--color-outline)]'
                        )}
                        placeholder="Ex: 0102030405"
                      />
                      {errors.phone && (
                        <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.phone.message}</p>
                      )}
                      <span className="text-[10px] text-[var(--color-on-surface-variant)] mt-1.5 block leading-normal">
                        Ce numéro sera utilisé pour initier la demande de prélèvement sur votre portefeuille mobile.
                      </span>
                    </div>

                    <div className="flex justify-between pt-4 gap-4">
                      <Button
                        type="button"
                        onClick={() => setStep(2)}
                        variant="outlined"
                        className="py-3 px-5 font-semibold rounded-xl border-[var(--color-outline)] text-[var(--color-on-surface-variant)]"
                      >
                        Retour
                      </Button>
                      
                      <Button
                        type="submit"
                        color="secondary"
                        loading={loading}
                        disabled={loading}
                        className="flex-1 py-3 font-semibold rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-variant)] text-white shadow-md active:scale-[0.97]"
                      >
                        Payer {selectedPack.price.toLocaleString()} FCFA
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Summary Card */}
                <div className="col-span-1">
                  <div className="bg-[var(--color-surface-variant)]/30 rounded-2xl p-5 border border-[var(--color-outline)]/40 space-y-4">
                    <h3 className="text-xs font-bold text-[var(--color-on-surface)] uppercase tracking-wider border-b border-[var(--color-outline)] pb-2 flex items-center gap-1.5">
                      <CreditCard size={14} className="text-[var(--color-primary)]" />
                      Résumé de l'achat
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--color-on-surface-variant)]">Pack :</span>
                        <span className="font-bold text-[var(--color-on-surface)]">{selectedPack.label}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--color-on-surface-variant)]">Crédits :</span>
                        <span className="font-bold text-[var(--color-on-surface)]">+{selectedPack.credits}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[var(--color-on-surface-variant)]">Opérateur :</span>
                        <span className="font-bold text-[var(--color-on-surface)]">
                          {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.label}
                        </span>
                      </div>
                      <div className="border-t border-[var(--color-outline)]/40 my-3" />
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-[var(--color-on-surface)]">Total à payer :</span>
                        <span className="text-base font-black text-[var(--color-primary)]">
                          {selectedPack.price.toLocaleString()} FCFA
                        </span>
                      </div>
                    </div>

                    <div className="bg-white/40 dark:bg-black/20 p-3 rounded-xl border border-[var(--color-outline)]/20 flex items-start gap-2">
                      <Shield size={14} className="text-green-600 mt-0.5" />
                      <span className="text-[10px] text-[var(--color-on-surface-variant)] leading-normal">
                        Paiement sécurisé par Money Fusion. Vos fonds sont protégés.
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
          <div className="mt-10 bg-[var(--color-surface-variant)]/30 rounded-2xl p-5 border border-[var(--color-outline)]/40">
            <h4 className="text-xs font-bold text-[var(--color-on-surface)] mb-3 uppercase tracking-wider">Questions fréquentes</h4>
            <div className="space-y-3 text-xs text-[var(--color-on-surface-variant)]">
              <div>
                <h5 className="font-bold text-[var(--color-on-surface)]">À quoi servent les crédits ?</h5>
                <p className="mt-0.5 leading-relaxed">Les crédits servent à booster vos annonces pour qu'elles restent tout en haut des résultats de recherche. 1 crédit = 24h de boost.</p>
              </div>
              <div>
                <h5 className="font-bold text-[var(--color-on-surface)]">Combien coûte un boost ?</h5>
                <p className="mt-0.5 leading-relaxed">Le coût dépend de la durée : 24 heures (1 jour) coûte 1 crédit, 48 heures (2 jours) coûte 2 crédits, et 7 jours coûte 5 crédits.</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}