import React, { useEffect, useState } from 'react';
import { Shield, MapPin, Bike, Sparkles } from 'lucide-react';
import { fetchMarketplaceProofStats, type MarketplaceProofStats } from '../../lib/engagementSignals';

interface CommunityProofStripProps {
  isPhase0: boolean;
}

/**
 * Bandeau sobre de garanties opérationnelles et d'activité locale à Daloa.
 */
export const CommunityProofStrip: React.FC<CommunityProofStripProps> = ({ isPhase0 }) => {
  const [stats, setStats] = useState<MarketplaceProofStats | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchMarketplaceProofStats()
      .then((res) => {
        if (mounted && res) setStats(res);
      })
      .catch((err) => {
        console.warn('CommunityProofStrip stats warning:', err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="relative z-20 -mt-5 px-4">
      <div className="mx-auto max-w-2xl lg:max-w-5xl bg-white rounded-2xl p-3 border border-gray-200/80 shadow-sm flex items-center justify-around gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center flex-shrink-0">
            <Shield className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-gray-900 block leading-tight">
              Paiement protégé
            </span>
            <span className="text-[10px] text-gray-500 font-medium hidden sm:inline">
              Validation par code OTP à la remise
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-gray-100" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 border border-orange-100 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-4 w-4" />
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-gray-900 block leading-tight tabular-nums font-mono">
              {stats && stats.totalMembers > 50 ? `${stats.totalMembers}+ comptes` : 'Réseau Daloa'}
            </span>
            <span className="text-[10px] text-gray-500 font-medium hidden sm:inline tabular-nums font-mono">
              {stats && stats.activeListings > 0
                ? `${stats.activeListings} annonces actives`
                : 'Commerçants vérifiés à Daloa'}
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-gray-100" />

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center flex-shrink-0">
            {isPhase0 ? <Sparkles className="h-4 w-4" /> : <Bike className="h-4 w-4" />}
          </div>
          <div className="text-left">
            <span className="text-xs font-bold text-gray-900 block leading-tight">
              {isPhase0 ? 'Publication gratuite' : 'Livraison locale'}
            </span>
            <span className="text-[10px] text-gray-500 font-medium hidden sm:inline">
              {isPhase0 ? 'Sans frais d’inscription' : 'Coursiers à Daloa'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CommunityProofStrip;
