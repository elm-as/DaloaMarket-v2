import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Star, ArrowLeft, Check, ShieldCheck, Truck, Store, Zap, Sparkles, ArrowRight, Tag, Palette, Percent, Award, PhoneCall } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSupabase } from '../hooks/useSupabase';
import { useSEO } from '../hooks/useSEO';
import { friendlyError } from '../lib/messages';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { cn, formatPrice } from '../lib/utils';
import { initiatePayment } from '../lib/payment';
import { SELLER_BADGE_PRICE, SELLER_BADGE_YEARLY_PRICE } from '../lib/featureFlags';

const PRO_HIGHLIGHTS = [
  {
    title: 'Livreurs Affiliés & Cash à la livraison (COD)',
    desc: 'Travaillez avec vos propres livreurs et encaissez en espèces',
    icon: Truck,
  },
  {
    title: 'Retrait en Boutique (Click & Collect Cash)',
    desc: 'Réservation directe et paiement en liquide au magasin',
    icon: Store,
  },
  {
    title: 'Vitrine & Personnalisation de Boutique',
    desc: 'Bannière, logo, description et lien unique de boutique',
    icon: Palette,
  },
  {
    title: 'Réductions des frais de commission',
    desc: 'Bénéficiez de frais de plateforme préférentiels sur vos transactions',
    icon: Percent,
  },
  {
    title: 'Badge Vendeur Pro Vérifié',
    desc: 'Insigne officiel de confiance sur vos annonces & votre profil',
    icon: Award,
  },
  {
    title: 'Publications & Stock illimités',
    desc: 'Publiez autant de produits que vous le souhaitez sans contrainte',
    icon: Sparkles,
  },
  {
    title: 'Priorité Maximale dans les recherches',
    desc: 'Vos produits s\'affichent en tête des résultats à Daloa',
    icon: Zap,
  },
  {
    title: 'Support Vendeur Dédié 24/7',
    desc: 'Ligne directe d\'assistance prioritaire par téléphone & WhatsApp',
    icon: PhoneCall,
  },
];

export default function BecomeProPage() {
  useSEO('Devenir Pro Vendeur', {
    description: "Passez au Pass Vendeur Pro DaloaMarket. Débloquez la livraison Cash (COD), vos livreurs affiliés personnels, le stock illimité et boostez vos ventes à Daloa.",
    keywords: "vendeur pro Daloa, boutique Daloa, livreurs affiliés, cash on delivery Daloa, badge vérifié DaloaMarket, e-commerce Côte d'Ivoire",
    canonical: 'https://daloamarket.com/become-pro'
  });
  
  const navigate = useNavigate();
  const location = useLocation();
  
  const queryParams = new URLSearchParams(location.search);
  const initialPlan = queryParams.get('plan') === 'yearly' ? 'yearly' : 'monthly';
  
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>(initialPlan);
  const { user, userProfile } = useSupabase();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const planPrice = selectedPlan === 'yearly' ? SELLER_BADGE_YEARLY_PRICE : SELLER_BADGE_PRICE;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const handlePay = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const customerName = userProfile?.full_name || 'Vendeur DaloaMarket';
      const customerPhone = userProfile?.phone || '';
      const payment = await initiatePayment({
        type: 'seller_badge',
        amount: planPrice,
        userId: user.id,
        customerName,
        customerPhone,
        metadata: { name: customerName, phone: customerPhone, plan: selectedPlan },
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

  return (
    <div className="min-h-screen bg-gray-50/70 pb-28">
      {/* ── HERO BANNER ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-amber-500 to-amber-600 px-5 pt-6 pb-16 rounded-b-[36px] shadow-lg">
        <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-14 -left-8 w-36 h-36 rounded-full bg-white/10" />
        <div className="relative max-w-5xl mx-auto flex items-center justify-between">
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
                Abonnement & Avantages Vendeur
              </p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Pass Vendeur Pro
              </h1>
            </div>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-extrabold border border-white/20">
            <Star size={13} className="fill-amber-300 text-amber-300" />
            Statut Vérifié
          </span>
        </div>
      </header>

      <div className="relative z-10 -mt-8 max-w-md lg:max-w-5xl mx-auto px-4 space-y-6">
        {/* Desktop 2-Column Layout */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-8 lg:items-start">
          {/* LEFT COLUMN: Plan Switcher & Checkout Card */}
          <div className="lg:col-span-1 space-y-4">

            {/* Plan Switcher */}
            <div className="p-1.5 bg-white rounded-3xl border border-gray-100 shadow-md shadow-gray-200/50 grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedPlan('monthly')}
                className={cn(
                  "py-3 px-3 rounded-2xl text-xs font-extrabold transition-all flex flex-col items-center justify-center active:scale-[0.98]",
                  selectedPlan === 'monthly'
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
                    : "text-gray-600 hover:text-gray-900 bg-gray-50/70"
                )}
              >
                <span>Mensuel</span>
                <span className={cn("text-sm font-black mt-0.5", selectedPlan === 'monthly' ? "text-white" : "text-orange-600")}>
                  {formatPrice(SELLER_BADGE_PRICE)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPlan('yearly')}
                className={cn(
                  "py-3 px-3 rounded-2xl text-xs font-extrabold transition-all flex flex-col items-center justify-center relative active:scale-[0.98]",
                  selectedPlan === 'yearly'
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20"
                    : "text-gray-600 hover:text-gray-900 bg-gray-50/70"
                )}
              >
                <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                  2 mois offerts
                </span>
                <span>Annuel</span>
                <span className={cn("text-sm font-black mt-0.5", selectedPlan === 'yearly' ? "text-white" : "text-orange-600")}>
                  {formatPrice(SELLER_BADGE_YEARLY_PRICE)}
                </span>
              </button>
            </div>

            {/* Card Pro */}
            <div className="rounded-3xl border border-orange-100 bg-white shadow-lg shadow-gray-200/50 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                <div>
                  <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-widest block">
                    Abonnement Pro
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-2xl font-black text-gray-900 leading-none">
                      {formatPrice(planPrice)}
                    </span>
                    <span className="text-xs font-semibold text-gray-500">
                      / {selectedPlan === 'yearly' ? 'an' : 'mois'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-orange-50 text-orange-700 font-extrabold text-[11px] border border-orange-200/60">
                    <Tag size={12} /> ~80 F / jour
                  </span>
                </div>
              </div>

              {/* List of Features */}
              <div className="space-y-3">
                {PRO_HIGHLIGHTS.map((item, idx) => {
                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0 border border-orange-100 mt-0.5">
                        <Check size={14} strokeWidth={3} />
                      </div>
                      <div>
                        <h3 className="text-xs font-extrabold text-gray-900 leading-tight">
                          {item.title}
                        </h3>
                        <p className="text-[11px] font-medium text-gray-500 mt-0.5 leading-snug">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Standard Comparison Note */}
              <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between font-medium">
                <span>Standard (Gratuit) :</span>
                <span className="font-bold text-gray-800">Max 10 annonces</span>
              </div>
            </div>

            {/* Error Message if any */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold text-center">
                {errorMsg}
              </div>
            )}

            {/* CTA Button */}
            <div className="space-y-2.5">
              <Button
                onClick={handlePay}
                color="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={loading}
                className="rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-extrabold text-sm py-4 active:scale-[0.98] shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
              >
                <span>Activer le Pass Pro ({formatPrice(planPrice)})</span>
                <ArrowRight size={18} />
              </Button>

              <div className="flex items-center justify-center gap-3 text-[11px] font-bold text-gray-400 pt-1">
                <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-emerald-500" /> Sécurisé par MoneyFusion</span>
                <span>•</span>
                <span>Wave, Orange, MTN, Moov</span>
              </div>
            </div>
          </div>{/* End LEFT COLUMN */}

          {/* RIGHT COLUMN: Pro Features Overview */}
          <div className="hidden lg:block lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-lg shadow-gray-200/50 space-y-4">
            <h3 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-3">
              Tous les privilèges exclusifs Vendeur Pro inclus :
            </h3>
            <div className="grid grid-cols-2 gap-3.5">
              {PRO_HIGHLIGHTS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-start gap-3.5 p-4 rounded-2xl bg-orange-50/30 border border-orange-100/50">
                    <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-extrabold text-gray-900 mb-1">{item.title}</h4>
                      <p className="text-[11px] font-medium text-gray-600 leading-snug">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>{/* End Grid */}
      </div>
    </div>
  );
}