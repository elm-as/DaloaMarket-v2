import React from 'react';
import { ArrowLeft, Sparkles, Star, ShieldCheck, Banknote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

export const AffiliatedNonProUpgradeCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50/70 pb-20">
      {/* Header */}
      <header className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-amber-600 px-5 pt-6 pb-14 rounded-b-[36px] shadow-lg shadow-orange-500/15">
        <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white active:scale-95 transition-all shadow-xs"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-100">
                Espace Vendeur · Logistique
              </p>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Livreurs Affiliés
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="relative z-10 -mt-7 max-w-xl mx-auto px-4">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-amber-100 shadow-xl shadow-gray-200/50 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/25 text-white">
            <Sparkles className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-black border border-amber-200 mb-3">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Fonctionnalité Réservée aux Vendeurs Pro
          </span>

          <h2 className="text-xl font-black text-gray-900 mb-2">
            Affiliez vos propres livreurs de confiance
          </h2>

          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
            Passez au Pass Vendeur Pro pour confier vos colis en priorité à vos livreurs habituels et activer le paiement à la livraison (Cash on Delivery) à Daloa.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left mb-6">
            <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-100 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-gray-900">Vos livreurs dédiés</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Courses attribuées en direct à votre flotte de livreurs.</p>
              </div>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-3">
              <Banknote className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-black text-gray-900">Paiement Cash (COD)</h4>
                <p className="text-[11px] text-gray-500 mt-0.5">Encaissez en liquide ou Mobile Money à la réception du colis.</p>
              </div>
            </div>
          </div>

          <Button
            color="primary"
            size="lg"
            onClick={() => navigate('/devenir-pro')}
            className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-black shadow-lg shadow-orange-500/25 active:scale-[0.98]"
          >
            Devenir Vendeur Pro ➔
          </Button>
        </div>
      </div>
    </div>
  );
};
