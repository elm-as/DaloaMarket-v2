import React from 'react';
import { Info, MapPin, Mail, Globe, Shield, Server, User, Building, Heart, ShoppingBag, Truck, Lock } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { Card } from '../components/ui/Card';

export default function AboutPage() {
  useSEO('À propos — Mentions légales', {
    description: 'En savoir plus sur DaloaMarket, la plateforme ivoirienne de petites annonces et marketplace de proximité à Daloa (Côte d\'Ivoire).',
    canonical: 'https://daloamarket.com/about'
  });

  return (
    <div className="min-h-screen bg-gray-50/70 pb-28">
      {/* HERO HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 px-4 pt-8 pb-16 text-white rounded-b-[36px] shadow-lg">
        <div className="absolute -top-12 -right-10 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-14 -left-8 w-32 h-32 rounded-full bg-white/10" />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="w-16 h-16 bg-white p-2.5 rounded-3xl shadow-xl mx-auto mb-3 flex items-center justify-center">
            <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            À propos de DaloaMarket
          </h1>
          <p className="text-xs sm:text-sm text-orange-100 mt-1 font-medium">
            La marketplace 100% dédiée à la ville de Daloa · Côte d'Ivoire
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8 relative z-20 space-y-6">
        {/* PRESENTATION */}
        <Card elevation={2} padding="md" className="rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 space-y-4">
          <div className="p-4 bg-orange-50/70 border border-orange-100 rounded-2xl text-sm font-medium text-orange-950 leading-relaxed">
            <strong>DaloaMarket</strong> est une plateforme ivoirienne de petites annonces et de commerce local, fondée en 2025 par <strong>Elmas</strong> (ElmasCore). Notre mission est de connecter directement les vendeurs et acheteurs de Daloa (centre-ouest de la Côte d'Ivoire) avec des outils modernes, fiables et sécurisés.
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-gray-50 rounded-2xl text-center">
              <span className="text-lg font-extrabold text-orange-600">3%</span>
              <p className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">Frais de service acheteur</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-2xl text-center">
              <span className="text-lg font-extrabold text-orange-600">3,5% / 2,5%</span>
              <p className="text-[11px] font-bold text-gray-500 uppercase mt-0.5">Commission vendeur (Standard / Pro)</p>
            </div>
          </div>
        </Card>

        {/* FONCTIONNALITES CLÉS */}
        <Card elevation={2} padding="md" className="rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-6 space-y-4">
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
            <Shield className="w-5 h-5 text-orange-500" />
            Nos garanties & Fonctionnalités
          </h2>

          <div className="space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">Paiement sécurisé par séquestre (Escrow)</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Via notre partenaire MoneyFusion (Orange Money, Wave, MTN, Moov), les fonds sont bloqués en toute sécurité et débloqués uniquement lors de la validation du code OTP secret de livraison.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">Livraison géolocalisée avec DaloaDelivery</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Calcul automatique des frais selon la distance réelle (500 FCFA min + 85 FCFA/km au-delà de 1,5 km).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">Boutiques Vendeurs & Pass Pro</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Vitrines personnalisées avec bannière, logo, stock illimité, retrait en boutique et livreurs affiliés avec option COD.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* MENTIONS LÉGALES */}
        <Card elevation={2} padding="md" className="rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-6 space-y-4">
          <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
            <Building className="w-5 h-5 text-orange-500" />
            Mentions légales
          </h2>

          <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
            <div>
              <span className="font-bold text-gray-900">Éditeur :</span> Édité par ELMAS (ElmasCore), entreprise individuelle de droit ivoirien fondée par Elmas à Daloa.
            </div>
            <div>
              <span className="font-bold text-gray-900">Directeur de la publication :</span> Elmas (Fondateur).
            </div>
            <div>
              <span className="font-bold text-gray-900">Hébergement :</span> Netlify Inc. (Frontend) & Supabase Inc. (Base de données et authentification).
            </div>
            <div>
              <span className="font-bold text-gray-900">Contact :</span> <a href="mailto:support@daloamarket.com" className="text-orange-600 font-bold underline">support@daloamarket.com</a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
