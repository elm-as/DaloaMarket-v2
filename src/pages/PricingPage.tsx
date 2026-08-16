import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Sparkles, ArrowLeft, CheckCircle, ShieldCheck, Zap, TrendingUp, Award, Layers } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { useSupabase } from '../hooks/useSupabase';
import { SELLER_BADGE_PRICE, SELLER_BADGE_YEARLY_PRICE } from '../lib/featureFlags';
import { formatPrice } from '../lib/utils';
import toast from 'react-hot-toast';

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useSupabase();

  const pricingSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'Tarifs et Abonnements DaloaMarket',
    description: 'Modèle 100% gratuit à l\'entrée avec commission au succès de 3,5% et formule Vendeur PRO à 2 500 FCFA pour développer vos ventes à Daloa.',
    offers: [
      {
        '@type': 'Offer',
        name: 'Formule Lancement (Standard)',
        price: 0,
        priceCurrency: 'XOF',
        availability: 'https://schema.org/InStock',
        url: 'https://daloamarket.com/register',
      },
      {
        '@type': 'Offer',
        name: 'Pass PRO Mensuel',
        price: SELLER_BADGE_PRICE,
        priceCurrency: 'XOF',
        availability: 'https://schema.org/InStock',
        url: 'https://daloamarket.com/become-pro?plan=monthly',
      },
      {
        '@type': 'Offer',
        name: 'Pass PRO Annuel',
        price: SELLER_BADGE_YEARLY_PRICE,
        priceCurrency: 'XOF',
        availability: 'https://schema.org/InStock',
        url: 'https://daloamarket.com/become-pro?plan=yearly',
      },
    ],
  };

  useSEO('Tarifs & Transparence — Formule Lancement & Pass Pro', {
    description: 'Découvrez la tarification transparente de DaloaMarket : 100% gratuit jusqu\'à 20 articles, commission au succès de 3,5% et Pass Vendeur Pro à 2 500 FCFA.',
    keywords: 'tarifs DaloaMarket, vendeur pro Daloa, commission marketplace Daloa, e-commerce Côte d\'Ivoire',
    canonical: 'https://daloamarket.com/pricing',
    jsonLd: pricingSchema,
  });

  const handleBuyPro = (planId: 'monthly' | 'yearly') => {
    if (!user) {
      toast.error('Connectez-vous pour vous abonner');
      navigate('/login');
      return;
    }
    navigate(`/devenir-pro?plan=${planId}`);
  };

  return (
    <motion.div className="min-h-screen bg-gray-50/60 pb-20" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Top Header */}
      <div className="sticky top-[56px] z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-4">
        <div className="max-w-4xl mx-auto flex items-center h-14 gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-xl hover:bg-gray-100 active:scale-[0.97] transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Tarifs & Modèle Gagnant-Gagnant</h1>
            <p className="text-xs text-gray-500 hidden sm:block">Zéro risque : vous ne payez que lorsque vous vendez</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-6 pb-12 space-y-8">
        {/* Hero Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            Transparence totale • 100% Daloa
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Commencez gratuitement, payez uniquement au succès.
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            Supprimez toute friction pour lancer votre activité. Lorsque vos ventes décollent et que vous constatez la valeur, passez à la formule Pro pour accélérer.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {/* TIER 1: Phase de Lancement (Actuelle) */}
          <Card elevation={2} padding="lg" className="rounded-3xl border border-gray-100 flex flex-col justify-between bg-white relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold tracking-wider uppercase text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
                  Phase de Lancement
                </span>
                <span className="text-xs text-gray-400 font-medium">Idéal débutants</span>
              </div>

              <h3 className="text-xl font-extrabold text-gray-900">Formule Standard</h3>
              <p className="text-xs text-gray-500 mt-1 mb-4">100% gratuit à l'entrée sans aucun frais caché</p>

              <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-gray-900">0 FCFA</span>
                  <span className="text-xs text-gray-500 font-semibold">à l'inscription</span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1 font-medium">
                  Commission au succès : <strong className="text-emerald-700 font-bold">3,5% par vente conclue</strong>
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2.5 text-xs text-gray-700 font-medium">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span><strong>Jusqu'à 20 articles</strong> publiés gratuitement</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-gray-700 font-medium">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span><strong>0 FCFA d'avance</strong> : vous ne payez que lorsque vous avez déjà encaissé votre argent</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-gray-700 font-medium">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Paiement sécurisé par séquestre Escrow</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-gray-700 font-medium">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Livraison géolocalisée DaloaDelivery</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-gray-700 font-medium">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>Messagerie instantanée avec les acheteurs</span>
                </li>
              </ul>
            </div>

            <Button
              variant="outlined"
              color="primary"
              fullWidth
              className="rounded-2xl py-3.5 font-bold text-xs"
              onClick={() => navigate(user ? '/creer-annonce' : '/register')}
            >
              {user ? 'Déposer une annonce gratuite' : 'Créer mon compte vendeur'}
            </Button>
          </Card>

          {/* TIER 2: Phase de Croissance (Vendeur PRO) */}
          <Card elevation={3} padding="lg" className="rounded-3xl border-2 border-orange-400 bg-white flex flex-col justify-between relative shadow-xl shadow-orange-500/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-orange-500 to-amber-600 shadow-md">
              Phase de Croissance
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 mt-1">
                <span className="text-xs font-extrabold tracking-wider uppercase text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
                  Pass Vendeur PRO
                </span>
                <span className="text-xs text-amber-600 font-bold flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" /> Certifié
                </span>
              </div>

              <h3 className="text-xl font-extrabold text-gray-900">Formule Croissance</h3>
              <p className="text-xs text-gray-500 mt-1 mb-4">Pour les vendeurs qui veulent grossir et maximiser leurs profits</p>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-4 mb-6 border border-orange-100">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-orange-600">{formatPrice(SELLER_BADGE_PRICE)}</span>
                  <span className="text-xs text-gray-500 font-semibold">/ mois</span>
                </div>
                <p className="text-[11px] text-orange-800 mt-1 font-medium">
                  Ou {formatPrice(SELLER_BADGE_YEARLY_PRICE)} / an (<strong>2 mois offerts</strong>)
                </p>
              </div>

              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2.5 text-xs text-gray-900 font-bold">
                  <CheckCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Dépassement de quota</strong> : publications & stock illimités (+20 articles)</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-gray-900 font-bold">
                  <CheckCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Badge officiel "Vérifié & Certifié"</strong> sur profil et annonces</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-gray-900 font-bold">
                  <CheckCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Statistiques avancées & 1 Boost d'annonce offert / mois</strong></span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-gray-900 font-bold">
                  <CheckCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Commission réduite à 2,5%</strong> (au lieu de 3,5%)</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-gray-700 font-medium">
                  <CheckCircle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                  <span>Espace Livreurs Affiliés & option Cash à la livraison (COD)</span>
                </li>
              </ul>
            </div>

            <Button
              variant="filled"
              color="primary"
              fullWidth
              className="rounded-2xl py-3.5 font-extrabold text-xs bg-gradient-to-r from-orange-500 to-amber-600 shadow-lg shadow-orange-500/25"
              onClick={() => handleBuyPro('monthly')}
            >
              Passer Vendeur PRO ({formatPrice(SELLER_BADGE_PRICE)} / mois)
            </Button>
          </Card>
        </div>

        {/* Trust & Guarantee Strip */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm grid sm:grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <ShieldCheck className="w-6 h-6 text-emerald-500 mx-auto" />
            <h4 className="text-xs font-bold text-gray-900">Paiement Sécurisé Escrow</h4>
            <p className="text-[11px] text-gray-500">Protection acheteur & vendeur à 100% sur chaque transaction</p>
          </div>
          <div className="space-y-1">
            <TrendingUp className="w-6 h-6 text-orange-500 mx-auto" />
            <h4 className="text-xs font-bold text-gray-900">Commission au Succès</h4>
            <p className="text-[11px] text-gray-500">Vous ne payez que lorsque l'article est livré et validé</p>
          </div>
          <div className="space-y-1">
            <Award className="w-6 h-6 text-amber-500 mx-auto" />
            <h4 className="text-xs font-bold text-gray-900">Croissance Accompagnée</h4>
            <p className="text-[11px] text-gray-500">Passez Pro uniquement quand votre volume de vente le justifie</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}