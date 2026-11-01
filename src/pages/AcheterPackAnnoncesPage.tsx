import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Zap, Sparkles, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { friendlyError } from '../lib/messages';
import { cn, validateIvorianPhone } from '../lib/utils';
import { initiatePayment } from '../lib/payment';
import { CREDIT_PACKS } from '../lib/featureFlags';

const PAYMENT_METHODS = [
  { id: 'wave', label: 'Wave', color: 'border-sky-300 bg-sky-50 text-sky-800' },
  { id: 'orange', label: 'Orange Money', color: 'border-orange-300 bg-orange-50 text-orange-800' },
  { id: 'mtn', label: 'MTN MoMo', color: 'border-yellow-300 bg-yellow-50 text-yellow-800' },
  { id: 'moov', label: 'Moov Money', color: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
];

const PACKS_META: Record<string, { tag: string; tagClass: string; unitPrice: number; savings?: string }> = {
  credits_pack_5: { tag: 'DÉCOUVERTE', tagClass: 'bg-gray-100 text-gray-700', unitPrice: 100 },
  credits_pack_12: { tag: 'LE PLUS POPULAIRE', tagClass: 'bg-orange-100 text-orange-800', unitPrice: 83, savings: '-17%' },
  credits_pack_30: { tag: 'MEILLEURE VALEUR', tagClass: 'bg-emerald-100 text-emerald-800', unitPrice: 67, savings: '-33%' },
};

export default function AcheterPackAnnoncesPage() {
  usePageTitle('Acheter des Crédits de Boost');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useSupabase();
  const { phaseConfig } = useSystemSettings();
  const boostsEnabled = phaseConfig?.enable_boost ?? true;

  const isSuccess = searchParams.get('status') === 'success';
  const successCredits = searchParams.get('credits') || '0';

  const [selectedPackId, setSelectedPackId] = useState<string>('credits_pack_12');
  const [paymentMethod, setPaymentMethod] = useState<string>('wave');
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [fullName, setFullName] = useState(userProfile?.full_name || '');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  const selectedPack = CREDIT_PACKS.find((p) => p.id === selectedPackId) || CREDIT_PACKS[1];
  const currentBalance = (userProfile as any)?.boost_credits ?? 0;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boostsEnabled) {
      setErrorMsg('Les achats de crédits sont temporairement suspendus par l’administration.');
      return;
    }
    if (!phone || !validateIvorianPhone(phone)) {
      setErrorMsg('Veuillez entrer un numéro Mobile Money ivoirien valide (10 chiffres).');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const payment = await initiatePayment({
        type: selectedPack.id,
        amount: selectedPack.price,
        userId: user.id,
        customerName: fullName.trim() || userProfile?.full_name || 'Vendeur DaloaMarket',
        customerPhone: phone.trim(),
        metadata: {
          credits: selectedPack.credits,
          payment_method: paymentMethod,
        },
      });

      if (payment?.paymentUrl) {
        window.location.href = payment.paymentUrl;
      } else {
        setErrorMsg('Impossible de générer le lien de paiement. Veuillez réessayer.');
      }
    } catch (err: any) {
      setErrorMsg(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl ring-1 ring-gray-100">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="text-xl font-extrabold text-gray-900">Paiement validé avec succès !</h1>
          <p className="mt-2 text-sm text-gray-600">Vos crédits ont été crédités instantanément sur votre compte.</p>
          <div className="my-5 rounded-2xl bg-emerald-50/70 p-4 ring-1 ring-emerald-200">
            <p className="text-xs font-bold text-emerald-800">Crédits ajoutés</p>
            <p className="text-2xl font-black text-emerald-900 tabular-nums">+{successCredits} crédits</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/profil')}
            className="w-full rounded-2xl bg-orange-600 py-3 text-sm font-extrabold text-white shadow-md hover:bg-orange-700"
          >
            Aller sur mon profil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60 pb-20">
      {/* ── HEADER ── */}
      <header className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 px-4 pt-6 pb-12 text-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white transition-colors hover:bg-white/25"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-orange-200">Visibilité Accrue</p>
              <h1 className="text-xl font-black sm:text-2xl">Packs de Crédits Boost</h1>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/20 px-3 py-1.5 text-xs font-black backdrop-blur-md">
            <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
            <span className="tabular-nums">{currentBalance}</span> crédits
          </div>
        </div>
      </header>

      <main className="mx-auto -mt-6 max-w-4xl px-4">
        {!boostsEnabled && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-xs font-semibold">Les achats sont temporairement désactivés par l'administration.</p>
          </div>
        )}

        {/* ── GRILLE DES PACKS ── */}
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-black text-gray-900">1. Sélectionnez un pack</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {CREDIT_PACKS.map((pack) => {
              const isSelected = selectedPackId === pack.id;
              const meta = PACKS_META[pack.id] || { tag: 'PACK', tagClass: 'bg-gray-100 text-gray-700', unitPrice: 100 };
              const isPopular = pack.id === 'credits_pack_12';

              return (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => setSelectedPackId(pack.id)}
                  className={cn(
                    'relative flex flex-col justify-between rounded-3xl p-4 text-left transition-all',
                    isSelected
                      ? 'border-2 border-orange-500 bg-orange-50/40 shadow-lg shadow-orange-500/10'
                      : isPopular
                      ? 'border-2 border-orange-200 bg-white shadow-xs hover:border-orange-300'
                      : 'border border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-1">
                      <span className={cn('rounded-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider', meta.tagClass)}>
                        {meta.tag}
                      </span>
                      {meta.savings && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                          <Sparkles className="h-3 w-3" /> {meta.savings}
                        </span>
                      )}
                    </div>
                    <p className="text-base font-black text-gray-900">{pack.label}</p>
                    <p className="text-xs font-semibold text-gray-500">{pack.credits} crédits de mise en avant</p>
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="text-xl font-black text-orange-600 tabular-nums">
                      {Number(pack.price).toLocaleString('fr-FR')} <span className="text-xs font-bold text-gray-500">FCFA</span>
                    </p>
                    <p className="text-[11px] font-medium text-gray-400 tabular-nums">~{meta.unitPrice} FCFA / crédit</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── FORMULAIRE DE PAIEMENT ── */}
        <form onSubmit={handleCheckout} className="space-y-6">
          <section className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs sm:p-6">
            <h2 className="mb-3 text-sm font-black text-gray-900">2. Mode de paiement Mobile Money</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={cn(
                      'flex items-center justify-center rounded-2xl border-2 py-3 px-2 text-xs font-extrabold transition-all',
                      isSelected ? `${method.color} shadow-xs ring-2 ring-orange-500/20` : 'border-gray-200 bg-gray-50/50 text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    {method.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Votre nom complet</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Kouamé Jean"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs font-medium text-gray-900 outline-hidden focus:border-orange-500 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-gray-700">Numéro Mobile Money (Côte d'Ivoire)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ex: 0708091011"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs font-bold tabular-nums text-gray-900 outline-hidden focus:border-orange-500 focus:bg-white"
                  required
                />
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">
                {errorMsg}
              </div>
            )}

            <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row">
              <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Paiement direct sécurisé • Crédit instantané
              </div>
              <button
                type="submit"
                disabled={loading || !boostsEnabled}
                className="w-full rounded-2xl bg-orange-600 py-3 px-6 text-sm font-black text-white shadow-lg shadow-orange-600/25 transition-transform hover:bg-orange-700 active:scale-[0.99] disabled:opacity-50 sm:w-auto"
              >
                {loading ? 'Traitement en cours…' : `Payer ${Number(selectedPack.price).toLocaleString('fr-FR')} FCFA`}
              </button>
            </div>
          </section>
        </form>

        {/* ── ENGAGEMENT ET PERKS ── */}
        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
            <p className="text-xs font-black text-gray-900">⚡ Visibilité N°1</p>
            <p className="mt-1 text-[11px] text-gray-500">Vos annonces apparaissent en tête des recherches et des catégories.</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
            <p className="text-xs font-black text-gray-900">📈 Ventes Accélérées</p>
            <p className="mt-1 text-[11px] text-gray-500">Jusqu'à 3 fois plus de contacts d'acheteurs locaux à Daloa.</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs">
            <p className="text-xs font-black text-gray-900">🔒 Validité Permanente</p>
            <p className="mt-1 text-[11px] text-gray-500">Vos crédits n'expirent jamais et sont utilisables à tout moment.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
