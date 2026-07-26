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
    canonical: 'https://daloamarket.shop/become-pro'
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
    <div className="min-h-screen bg-[var(--color-surface)] pb-20">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-[var(--color-surface)] border-b border-[var(--color-outline)] px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Retour</span>
        </button>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[var(--color-primary-50)] text-[var(--color-primary-700)] border border-[var(--color-primary-200)] flex items-center gap-1.5">
          <Star size={13} className="fill-[var(--color-primary)] text-[var(--color-primary)]" />
          Pass Vendeur Pro
        </span>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-5">
        {/* Header Hero Compact */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-[var(--color-on-surface)] tracking-tight">
            Devenir Vendeur Pro
          </h1>
          <p className="text-xs text-[var(--color-on-surface-variant)] max-w-xs mx-auto">
            Accédez à la livraison privée, au paiement cash et à la visibilité prioritaire.
          </p>
        </div>

        {/* Plan Switcher */}
        <div className="p-1 bg-[var(--color-surface-variant)] rounded-2xl border border-[var(--color-outline)] grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => setSelectedPlan('monthly')}
            className={cn(
              "py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center active:scale-[0.98]",
              selectedPlan === 'monthly'
                ? "bg-white text-[var(--color-on-surface)] shadow-sm border border-[var(--color-outline)]"
                : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
            )}
          >
            <span>Mensuel</span>
            <span className="text-sm font-bold text-[var(--color-primary)] mt-0.5">{formatPrice(SELLER_BADGE_PRICE)}</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPlan('yearly')}
            className={cn(
              "py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex flex-col items-center justify-center relative active:scale-[0.98]",
              selectedPlan === 'yearly'
                ? "bg-white text-[var(--color-on-surface)] shadow-sm border border-[var(--color-primary)]"
                : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
            )}
          >
            <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-[9px] font-bold uppercase tracking-wider">
              2 mois offerts
            </span>
            <span>Annuel</span>
            <span className="text-sm font-bold text-[var(--color-primary)] mt-0.5">{formatPrice(SELLER_BADGE_YEARLY_PRICE)}</span>
          </button>
        </div>

        {/* Card Pro */}
        <Card padding="md" className="rounded-3xl border border-[var(--color-primary-200)] bg-surface shadow-elevation-1 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--color-outline)] pb-3">
            <div>
              <span className="text-[10px] font-bold text-[var(--color-primary)] uppercase tracking-wider block">
                Offre Vendeur Pro
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-bold text-[var(--color-on-surface)] leading-none">
                  {formatPrice(planPrice)}
                </span>
                <span className="text-xs text-[var(--color-on-surface-variant)]">
                  / {selectedPlan === 'yearly' ? 'an' : 'mois'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary-700)] font-bold text-[11px] border border-[var(--color-primary-200)]">
                <Tag size={12} /> ~80 F / jour
              </span>
            </div>
          </div>

          {/* List of Features */}
          <div className="space-y-3">
            {PRO_HIGHLIGHTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-lg bg-[var(--color-primary-50)] text-[var(--color-primary)] flex items-center justify-center flex-shrink-0 border border-[var(--color-primary-200)] mt-0.5">
                    <Check size={14} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--color-on-surface)] leading-tight">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Standard Comparison Note */}
          <div className="pt-2 border-t border-[var(--color-outline)] text-[11px] text-[var(--color-on-surface-variant)] flex items-center justify-between">
            <span>Compte Standard (Gratuit) :</span>
            <span className="font-semibold text-[var(--color-on-surface)]">Limité à 10 annonces • Pas de Cash</span>
          </div>
        </Card>

        {/* Error Message if any */}
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}

        {/* CTA Button */}
        <div className="space-y-2">
          <Button
            onClick={handlePay}
            color="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={loading}
            className="rounded-2xl font-bold text-sm py-3.5 active:scale-[0.98] shadow-elevation-2 flex items-center justify-center gap-2"
          >
            <span>Passer au Pass Pro ({formatPrice(planPrice)})</span>
            <ArrowRight size={18} />
          </Button>

          <div className="flex items-center justify-center gap-3 text-[11px] text-[var(--color-on-surface-variant)] pt-1">
            <span className="flex items-center gap-1"><ShieldCheck size={13} className="text-[var(--color-success)]" /> Paiement sécurisé</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Zap size={13} className="text-[var(--color-primary)]" /> MoneyFusion (Wave, OM, MTN, Moov)</span>
          </div>
        </div>
      </div>
    </div>
  );
}