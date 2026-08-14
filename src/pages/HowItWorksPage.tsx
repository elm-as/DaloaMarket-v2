import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, PlusCircle, MessageSquare, CheckCircle, HelpCircle, FileText, Info, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSEO } from '../hooks/useSEO';
import { Card } from '../components/ui/Card';

const STEPS = [
  {
    number: 1,
    icon: UserPlus,
    title: 'Créez votre compte',
    description: "Inscrivez-vous gratuitement en quelques secondes avec votre numéro. Complétez votre profil et créez votre boutique.",
    color: 'text-blue-500',
    bg: 'bg-blue-100',
  },
  {
    number: 2,
    icon: PlusCircle,
    title: 'Publiez une annonce',
    description: 'Publiez gratuitement jusqu\'à 10 annonces actives en compte Standard, ou illimité avec le Pass Vendeur Pro (2 500 FCFA/mois).',
    color: 'text-green-500',
    bg: 'bg-green-100',
  },
  {
    number: 3,
    icon: MessageSquare,
    title: 'Discutez et commandez',
    description: 'Échangez avec les acheteurs, choisissez le paiement en ligne (Mobile Money) ou en espèces (COD / Retrait boutique).',
    color: 'text-purple-500',
    bg: 'bg-purple-100',
  },
  {
    number: 4,
    icon: CheckCircle,
    title: 'Livraison sécurisée',
    description: 'Livraison par le réseau DaloaDelivery ou par le livreur affilié du vendeur. Confirmation sécurisée par code OTP.',
    color: 'text-amber-500',
    bg: 'bg-amber-100',
  },
];

export default function HowItWorksPage() {
  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'Comment acheter et vendre sur DaloaMarket',
    description: 'Guide étape par étape pour publier des annonces et acheter à Daloa sur DaloaMarket.',
    step: STEPS.map((step) => ({
      '@type': 'HowToStep',
      position: step.number,
      name: step.title,
      text: step.description,
    })),
  };

  useSEO('Comment ça marche — Vendre et Acheter à Daloa', {
    description: 'Découvrez comment acheter et vendre facilement sur DaloaMarket. Publication d\'annonces gratuites, livraison sécurisée et astuces pour réussir.',
    keywords: 'comment vendre Daloa, publier annonce Daloa, achat occasion Daloa, marketplace Côte d\'Ivoire',
    canonical: 'https://daloamarket.com/how-it-works',
    jsonLd: howToSchema,
  });

  return (
    <div className="min-h-screen bg-gray-50/70 px-4 py-5 pb-28 lg:px-6">
      <div className="mx-auto mb-8 max-w-4xl rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 px-5 py-7 text-center text-white shadow-lg shadow-orange-200/50">
        <div className="w-14 h-14 flex items-center justify-center mx-auto mb-3 bg-white shadow-lg rounded-2xl p-2">
          <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight mb-2">
          Comment ça marche
        </h1>
        <p className="text-sm text-orange-100">
          Vendre sur DaloaMarket en 4 étapes simples
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.15 }}
            >
              <Card className="p-6 rounded-2xl shadow-elevation-1 text-center h-full relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center text-sm font-bold shadow-md">
                  {step.number}
                </div>

                <div className={`w-16 h-16 rounded-full ${step.bg} flex items-center justify-center mx-auto mt-4 mb-4`}>
                  <Icon size={32} className={step.color} />
                </div>

                <h3 className="font-semibold text-[var(--color-on-surface)] mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                  {step.description}
                </p>

                {index < STEPS.length - 1 && (
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-[var(--color-outline)]">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Liens utiles */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <h2 className="text-lg font-bold text-[var(--color-on-surface)] text-center mb-6">
          En savoir plus
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { to: '/faq', icon: HelpCircle, label: 'FAQ', desc: 'Questions fréquentes' },
            { to: '/help', icon: HelpCircle, label: 'Aide & Support', desc: 'Contactez-nous' },
            { to: '/terms', icon: FileText, label: 'CGU', desc: 'Conditions d\'utilisation' },
            { to: '/about', icon: Info, label: 'À propos', desc: 'Notre mission' },
            { to: '/privacy', icon: Shield, label: 'Confidentialité', desc: 'Protection des données' },
          ].map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3 p-4 rounded-2xl bg-white border border-gray-100 hover:border-primary/30 hover:shadow-sm active:scale-[0.97] transition-all no-underline"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900">{link.label}</p>
                  <p className="text-[11px] text-gray-500 truncate">{link.desc}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
