import React from 'react';
import {
  Info, MapPin, Mail, Phone, Globe, Shield, Server, User, Building,
  Heart, ShoppingBag, Truck, Lock, Sparkles, CheckCircle2, Users, Rocket
} from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { Card } from '../components/ui/Card';

export default function AboutPage() {
  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'DaloaMarket',
    url: 'https://daloamarket.com',
    logo: 'https://daloamarket.com/logo.png',
    founder: {
      '@type': 'Person',
      name: 'OULOBO Elmas Tresor',
      jobTitle: 'Fondateur & Lead Developer',
      nationality: 'Ivorian'
    },
    foundingLocation: {
      '@type': 'Place',
      name: 'Abidjan, Côte d\'Ivoire'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+2250788000831',
      contactType: 'customer support',
      email: 'support@daloamarket.com',
      areaServed: 'CI'
    },
    sameAs: [
      'https://delivery.daloamarket.com',
      'https://docs.daloamarket.com'
    ]
  };

  useSEO('À propos de DaloaMarket — Fondateur, Mission & Écosystème', {
    description: 'Découvrez l\'histoire de DaloaMarket, la première marketplace et réseau de livraison de proximité à Daloa (Côte d\'Ivoire), conçue et développée par OULOBO Elmas Tresor.',
    canonical: 'https://daloamarket.com/about',
    jsonLd: schemaOrg,
  });

  return (
    <div className="min-h-screen bg-gray-50/70 pb-28">
      {/* HERO HEADER */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-orange-600 to-amber-700 px-4 pt-10 pb-20 text-white rounded-b-[40px] shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-black/15 blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 bg-white p-2.5 rounded-3xl shadow-xl mx-auto mb-4 flex items-center justify-center">
            <img src="/logo.png" alt="DaloaMarket Logo" className="w-full h-full object-contain" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold uppercase tracking-wider text-orange-100 mb-3 border border-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            L'histoire & La vision
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Digitaliser le commerce de proximité à Daloa
          </h1>
          <p className="text-xs sm:text-sm text-orange-100 mt-2 font-medium max-w-xl mx-auto leading-relaxed">
            Une plateforme 100% ivoirienne reliant commerçants, étudiants, acheteurs et livreurs indépendants dans toute la Cité des Antilopes.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-10 relative z-20 space-y-6">
        {/* LA GENÈSE DU PROJET */}
        <Card elevation={2} padding="md" className="rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-primary border-b border-gray-100 pb-3">
            <Rocket className="w-5 h-5 text-primary" />
            <h2 className="text-base font-black text-gray-900 uppercase tracking-wider">Pourquoi DaloaMarket ?</h2>
          </div>

          <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">
            À Daloa, le commerce informel sur les réseaux sociaux (groupes Facebook, statuts WhatsApp) manquait de structure, de sécurité et d'outils adaptés aux réalités locales. Les arnaques, l'absence de suivi des colis et l'opacité sur les livraisons freinaient le potentiel économique des commerçants, des artisans et des étudiants.
          </p>

          <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">
            <strong>DaloaMarket</strong> est né pour combler ce vide : offrir une marketplace moderne, rapide et accessible à tous, couplée à <strong>DaloaDelivery</strong>, un réseau de coursiers géolocalisés avec système de validation par code OTP et paiement sous séquestre sécurisé.
          </p>

          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="p-3 bg-orange-50/70 border border-orange-100 rounded-2xl text-center">
              <span className="text-lg font-black text-primary block">100%</span>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tight mt-0.5">Local & Daloa</p>
            </div>
            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-center">
              <span className="text-lg font-black text-emerald-600 block">OTP</span>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tight mt-0.5">Courses Sécurisées</p>
            </div>
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl text-center">
              <span className="text-lg font-black text-blue-600 block">&lt; 10 min</span>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tight mt-0.5">Retraits d'argent</p>
            </div>
          </div>
        </Card>

        {/* L'ÉQUIPE FONDATRICE */}
        <Card elevation={2} padding="md" className="rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-primary border-b border-gray-100 pb-3">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-base font-black text-gray-900 uppercase tracking-wider">L'Équipe & Les Fondateurs</h2>
          </div>

          <div className="space-y-4">
            {/* Fondateur Principal */}
            <div className="bg-gradient-to-br from-gray-50 to-orange-50/40 p-4 rounded-2xl border border-gray-200/70 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center font-black text-base flex-shrink-0 shadow-md">
                OE
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-gray-900">OULOBO Elmas Tresor</h3>
                  <span className="text-[10px] font-bold bg-primary-50 text-primary px-2 py-0.5 rounded-full border border-primary-100">
                    Fondateur & Concepteur
                  </span>
                </div>
                <p className="text-xs text-gray-600 font-medium mt-1 leading-relaxed">
                  Concepteur, architecte technique et développeur principal de l'écosystème DaloaMarket & DaloaDelivery. Il pilote la vision produit et l'ingénierie logicielle depuis Abidjan.
                </p>
              </div>
            </div>

            {/* Équipe Terrain & Communication */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-xs">
                    AJ
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-gray-900">Armand J.</h4>
                    <p className="text-[10px] text-orange-600 font-bold">Co-fondateur · Communication & Relations Partenaires</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                  Pilote la stratégie de communication auprès des commerçants, les partenariats locaux et le déploiement opérationnel sur le terrain à Daloa.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/60">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-black text-xs">
                    DN
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-gray-900">Diomandé (DNPH)</h4>
                    <p className="text-[10px] text-orange-600 font-bold">Co-fondateur · Communication Digitale & Médias</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                  En charge de la création de contenu, de la communication sur les réseaux sociaux, de la visibilité digitale et du lien avec la communauté.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* NOTRE MISSION & ENGAGEMENTS */}
        <Card elevation={2} padding="md" className="rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-primary border-b border-gray-100 pb-3">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-base font-black text-gray-900 uppercase tracking-wider">Nos Piliers de Confiance</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-orange-50 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">Paiement Séquestre Sécurisé</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed font-medium">
                  Via Mobile Money (Wave, Orange, MTN, Moov) et Crypto, l'argent est protégé et débloqué uniquement après vérification du colis.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Truck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">Livreurs Indépendants Vérifiés</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed font-medium">
                  Les livreurs touchent 90% du prix de livraison et sont guidés par un système de sécurité nocturne (22h30 - 05h30).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">Vitrines Marchands Dédiées</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed font-medium">
                  Chaque vendeur dispose d'un profil vitrine personnalisé, avec gestion de stock, avis clients et statistiques de ventes.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900">Reversements Instantanés</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed font-medium">
                  Les gains des vendeurs et livreurs sont transférés automatiquement sur leur compte Mobile Money en moins de 10 minutes.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* COORDONNÉES & INFORMATIONS TECHNIQUES */}
        <Card elevation={2} padding="md" className="rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2.5 text-primary border-b border-gray-100 pb-3">
            <Building className="w-5 h-5 text-primary" />
            <h2 className="text-base font-black text-gray-900 uppercase tracking-wider">Coordonnées & Informations Techniques</h2>
          </div>

          <div className="space-y-3 text-xs text-gray-700 font-medium leading-relaxed">
            <div className="flex items-start gap-2">
              <span className="font-bold text-gray-900 min-w-[130px]">Projet & Éditeur :</span>
              <span>Projet en cours d'immatriculation d'Entreprise Individuelle (Côte d'Ivoire), fondé par <strong>OULOBO Elmas Tresor</strong>.</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="font-bold text-gray-900 min-w-[130px]">Siège Opérationnel :</span>
              <span>Daloa / Abidjan, Côte d'Ivoire.</span>
            </div>

            <div className="flex items-start gap-2">
              <span className="font-bold text-gray-900 min-w-[130px]">WhatsApp & Appel :</span>
              <a href="tel:+2250788000831" className="text-primary font-bold hover:underline">+225 07 88 00 08 31</a>
            </div>

            <div className="flex items-start gap-2">
              <span className="font-bold text-gray-900 min-w-[130px]">E-mails Officiels :</span>
              <div className="flex flex-col gap-0.5">
                <span>Général & Partenariats : <a href="mailto:contact@daloamarket.com" className="text-primary font-bold hover:underline">contact@daloamarket.com</a></span>
                <span>Support Client & Litiges : <a href="mailto:support@daloamarket.com" className="text-primary font-bold hover:underline">support@daloamarket.com</a></span>
              </div>
            </div>

            <div className="flex items-start gap-2 pt-2 border-t border-gray-100">
              <span className="font-bold text-gray-900 min-w-[130px]">Infrastructure :</span>
              <span>Base de données & Auth : <strong>Supabase</strong> · Backend Paiement : <strong>Render</strong> · Hébergement Web : <strong>Netlify</strong> · Nom de domaine : <strong>LWS</strong></span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
