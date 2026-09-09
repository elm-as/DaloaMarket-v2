import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ShieldCheck, Truck, Zap } from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { RegisterForm } from '../components/auth/RegisterForm';

export default function RegisterPage() {
  usePageTitle('Inscription');
  const { user } = useSupabase();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row lg:items-center lg:justify-center lg:px-4 lg:py-8">
      {/* MOBILE: App-like Header */}
      <div className="lg:hidden bg-gradient-to-br from-orange-500 to-amber-600 px-4 pt-12 pb-24 rounded-b-[40px] shadow-sm relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-lg -rotate-3 p-2">
            <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Bienvenue !</h1>
          <p className="text-orange-100 text-sm">Créez votre compte DaloaMarket</p>
        </div>
      </div>

      {/* DESKTOP: Full width container with grid */}
      <div className="hidden lg:block w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-12 gap-8 items-stretch bg-white rounded-3xl overflow-hidden shadow-elevation-2 border border-gray-100 p-4">
          {/* Left Side: Premium Marketing Panel */}
          <div className="col-span-6 flex flex-col justify-between p-8 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-white rounded-2xl p-1.5 flex items-center justify-center shadow-md">
                  <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-200">Plateforme Locale</span>
                  <h2 className="text-xl font-black tracking-tight leading-none text-white">DaloaMarket</h2>
                </div>
              </div>

              <h3 className="text-3xl font-extrabold leading-tight text-white mb-6">
                Vendez plus vite,<br />Achetez en toute confiance.
              </h3>

              <div className="space-y-5">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Paiement Sécurisé (Escrow)</h4>
                    <p className="text-xs text-orange-100 mt-0.5 leading-relaxed">
                      Les fonds sont bloqués de manière sécurisée et ne sont libérés au vendeur qu'après confirmation de la livraison par code OTP.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Livraison Intégrée avec DaloaDelivery</h4>
                    <p className="text-xs text-orange-100 mt-0.5 leading-relaxed">
                      Un service de livraison rapide et fiable à Daloa pour acheminer vos produits directement chez vos acheteurs.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Boosts d'Annonces & Comptes Pro</h4>
                    <p className="text-xs text-orange-100 mt-0.5 leading-relaxed">
                      Profitez de frais réduits à 2,5% de commission pour les vendeurs PRO et de boosts d'annonces pour maximiser votre visibilité.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-white/20 flex justify-between items-center text-xs text-orange-200">
              <span>© 2026 DaloaMarket</span>
              <span>Développé par ELMAS</span>
            </div>
          </div>

          {/* Right Side: Form (Desktop) */}
          <div className="col-span-6 p-8 flex flex-col justify-center">
            <div className="text-left mb-6">
              <h1 className="text-2xl font-extrabold text-gray-900">Créer un compte</h1>
              <p className="text-sm text-gray-500 mt-1">
                Rejoignez la plus grande communauté d'achat et vente de Daloa.
              </p>
            </div>

            <RegisterForm />
          </div>
        </div>
      </div>

      {/* MOBILE: Form Card */}
      <div className="lg:hidden flex-1 px-5 -mt-10 relative z-20 pb-10">
        <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}