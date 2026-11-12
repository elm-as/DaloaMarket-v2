import React from 'react';
import { XCircle, CheckCircle2, Users, TrendingUp } from 'lucide-react';

const BEFORE_ITEMS = [
  'Annonces noyées derrière les boutiques mises en avant',
  'Pas de lien de vitrine personnalisé pour vos statuts WhatsApp',
  'Commission standard de 3,5 % sur chaque vente',
  'Aucun paiement en espèces à la livraison (COD)',
];

const AFTER_ITEMS = [
  'Priorité en tête des recherches des acheteurs à Daloa',
  'Vitrine Pro complète (bannière, logo, lien court partageable)',
  'Commission réduite à 2,5 % — vous gardez plus sur chaque vente',
  'Encaissement Cash à la livraison avec vos livreurs affiliés',
];

/**
 * Carte comparative Avant / Après (leviers Aspiration, Appartenance et réduction de Frustration)
 * affichée sur la page d'abonnement Pass Vendeur Pro.
 */
export const ProBeforeAfterCard: React.FC = () => {
  return (
    <div className="rounded-3xl bg-white border border-orange-100 shadow-lg shadow-gray-200/50 p-5 sm:p-6 space-y-4">
      {/* Bandeau Appartenance */}
      <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 border border-amber-200/70 px-3.5 py-2.5">
        <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
          <Users className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-black text-gray-900 leading-tight">
            Rejoignez le cercle des vendeurs Pro vérifiés de Daloa
          </p>
          <p className="text-[11px] text-gray-600 leading-snug mt-0.5">
            Les acheteurs de Daloa font 3× plus confiance aux boutiques qui portent le badge Pro Vérifié.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-orange-600" />
        <h3 className="text-sm font-black text-gray-900">
          Ce qui change concrètement pour votre boutique (Avant / Après)
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* AVANT */}
        <div className="rounded-2xl bg-gray-50 border border-gray-200/80 p-4 space-y-2.5">
          <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-gray-200 text-gray-700">
            Avant · Compte Standard
          </span>
          <ul className="space-y-2">
            {BEFORE_ITEMS.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-gray-600 leading-snug">
                <XCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* APRÈS */}
        <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-4 space-y-2.5">
          <span className="inline-block text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-600 text-white">
            Après · Boutique Pro Vérifiée ⭐
          </span>
          <ul className="space-y-2">
            {AFTER_ITEMS.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs font-semibold text-emerald-950 leading-snug">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProBeforeAfterCard;

