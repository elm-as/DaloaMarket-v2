import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Sparkles, ArrowLeft, CheckCircle } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useSupabase } from '../hooks/useSupabase';
import { SELLER_BADGE_PRICE, SELLER_BADGE_YEARLY_PRICE } from '../lib/featureFlags';
import toast from 'react-hot-toast';

const plans = [
  {
    id: 'monthly',
    title: 'PRO Mensuel',
    price: SELLER_BADGE_PRICE,
    period: '30 jours',
    features: [
      'Commission de vente réduite à 2,5% (au lieu de 3,5%)',
      '1 boost d\'annonce gratuit inclus',
      'Publications d\'annonces illimitées',
      'Badge PRO certifié sur votre profil',
      'Boutique personnalisée (bannière, logo, thème)',
      'Support prioritaire 24h/24',
    ],
    color: '#6366f1',
    popular: false,
  },
  {
    id: 'yearly',
    title: 'PRO Annuel',
    price: SELLER_BADGE_YEARLY_PRICE,
    period: '365 jours',
    features: [
      'Commission de vente réduite à 2,5% (au lieu de 3,5%)',
      '1 boost d\'annonce gratuit inclus',
      'Publications d\'annonces illimitées',
      'Badge PRO certifié sur votre profil',
      'Boutique personnalisée (bannière, logo, thème)',
      'Support prioritaire 24h/24',
      'Économisez 5 000 FCFA (2 mois offerts !)',
    ],
    color: '#f59e0b',
    popular: true,
  },
];

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useSupabase();

  const pricingSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Abonnement Vendeur PRO DaloaMarket',
    description: 'Devenez vendeur certifié sur DaloaMarket à Daloa. Profitez de commissions réduites, d\'annonces illimitées et d\'une boutique personnalisée.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Pass PRO Mensuel',
        price: SELLER_BADGE_PRICE,
        priceCurrency: 'XOF',
        availability: 'https://schema.org/InStock',
        url: 'https://daloamarket.com/become-pro',
      },
      {
        '@type': 'Offer',
        name: 'Pass PRO Annuel',
        price: SELLER_BADGE_YEARLY_PRICE,
        priceCurrency: 'XOF',
        availability: 'https://schema.org/InStock',
        url: 'https://daloamarket.com/become-pro',
      },
    ],
  };

  useSEO('Abonnement Vendeur Pro — Tarifs et Avantages', {
    description: 'Découvrez les offres Pass Vendeur PRO DaloaMarket à Daloa. Vendez plus vite avec un badge de confiance, des boosts d\'annonce et une boutique personnalisée.',
    keywords: 'vendeur pro Daloa, passe vendeur DaloaMarket, boutique certifiée Daloa, e-commerce Côte d\'Ivoire',
    canonical: 'https://daloamarket.com/become-pro',
    jsonLd: pricingSchema,
  });

  const handleBuy = (planId: string) => {
    if (!user) {
      toast.error('Connectez-vous pour vous abonner');
      navigate('/login');
      return;
    }
    navigate(`/devenir-pro?plan=${planId}`);
  };

  return (
    <motion.div className="min-h-screen pb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="sticky top-[56px] z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4">
        <div className="flex items-center h-12 gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 active:scale-[0.97] transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold">Abonnement Vendeur Pro</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4 pb-8">
        <div className="text-center mb-6">
          <p className="text-gray-500 text-sm">Boostez vos ventes avec la formule Vendeur PRO</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
              <Card elevation={plan.popular ? 3 : 2} padding="lg" className="relative h-full flex flex-col justify-between">
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-bold text-white flex items-center gap-1"
                    style={{ background: plan.color }}>
                    <Sparkles className="h-3 w-3" /> Recommandé (Économique)
                  </div>
                )}
                <div className="text-center flex-1 flex flex-col justify-between">
                  <div>
                    <div className="mx-auto mb-3 w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${plan.color}15` }}>
                      <Star className="h-8 w-8" style={{ color: plan.color }} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{plan.title}</h3>
                    <div className="mt-2 mb-4">
                      <span className="text-3xl font-black" style={{ color: plan.color }}>{plan.price.toLocaleString()} FCFA</span>
                      <span className="text-xs text-gray-500 block mt-1">valable {plan.period}</span>
                    </div>
                    <ul className="space-y-2.5 mb-6 text-left">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: plan.color }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button variant={plan.popular ? 'filled' : 'outlined'} color="primary" fullWidth onClick={() => handleBuy(plan.id)}>
                    S'abonner
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}