import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, MapPin, Bike, Sparkles, Flame, Users, MessageCircle } from 'lucide-react';
import { fetchMarketplaceProofStats, type MarketplaceProofStats } from '../../lib/engagementSignals';

const WHATSAPP_CHANNEL_URL = 'https://whatsapp.com/channel/0029Vb7bC5kC6ZvmSeP0gL1z';

interface CommunityProofStripProps {
  isPhase0: boolean;
}

/**
 * Bandeau de preuve sociale et psychologique sur l'accueil :
 * - Confiance (Garantie Satisfait ou remboursé par code OTP)
 * - Appartenance (Compteur réel des membres et annonces actives à Daloa + Chaîne WhatsApp)
 * - Gratification immédiate & Curiosité (Livraison express & pépites en promo)
 */
export const CommunityProofStrip: React.FC<CommunityProofStripProps> = ({ isPhase0 }) => {
  const [stats, setStats] = useState<MarketplaceProofStats | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchMarketplaceProofStats().then((res) => {
      if (mounted && res) setStats(res);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="relative z-20 -mt-6 px-4 space-y-2.5">
      {/* Piliers Confiance + Appartenance + Rapidité */}
      <div className="mx-auto max-w-2xl lg:max-w-5xl bg-white rounded-3xl p-3 border border-gray-100 shadow-lg shadow-gray-200/50 flex items-center justify-around gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="text-xs font-extrabold text-gray-900 block leading-tight">
              Satisfait ou remboursé
            </span>
            <span className="text-[10px] text-gray-500 font-semibold hidden sm:inline">
              Argent bloqué par code OTP
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-gray-100" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="text-xs font-extrabold text-gray-900 block leading-tight tabular-nums">
              {stats && stats.totalMembers > 50 ? `${stats.totalMembers}+ membres` : '100% Daloa'}
            </span>
            <span className="text-[10px] text-gray-500 font-semibold hidden sm:inline tabular-nums">
              {stats && stats.activeListings > 0
                ? `${stats.activeListings} articles en ligne`
                : 'Vendeurs vérifiés à Daloa'}
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-gray-100" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            {isPhase0 ? <Sparkles className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
          </div>
          <div className="text-left">
            <span className="text-xs font-extrabold text-gray-900 block leading-tight">
              {isPhase0 ? 'Gratuit' : 'Livraison Express'}
            </span>
            <span className="text-[10px] text-gray-500 font-semibold hidden sm:inline">
              {isPhase0 ? 'Sans commission' : 'Le jour même à Daloa'}
            </span>
          </div>
        </div>
      </div>

      {/* Pills Curiosité & Appartenance communautaire */}
      <div className="mx-auto max-w-2xl lg:max-w-5xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {stats && stats.activePromos > 0 && (
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200/80 px-3 py-1.5 text-[11px] font-extrabold text-red-700 hover:bg-red-100/70 transition-colors whitespace-nowrap tabular-nums"
            >
              <Flame className="w-3.5 h-3.5 text-red-600 fill-red-500" />
              <span>{stats.activePromos} offres en promo à saisir</span>
            </Link>
          )}

          {stats && stats.newListings7d > 0 && (
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200/80 px-3 py-1.5 text-[11px] font-bold text-amber-900 hover:bg-amber-100/70 transition-colors whitespace-nowrap tabular-nums"
            >
              <Users className="w-3.5 h-3.5 text-orange-600" />
              <span>+{stats.newListings7d} nouveautés cette semaine</span>
            </Link>
          )}
        </div>

        <a
          href={WHATSAPP_CHANNEL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-[11px] font-extrabold text-emerald-800 hover:bg-emerald-100 transition-colors whitespace-nowrap"
        >
          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>Rejoindre la chaîne WhatsApp Daloa</span>
        </a>
      </div>
    </section>
  );
};

export default CommunityProofStrip;

