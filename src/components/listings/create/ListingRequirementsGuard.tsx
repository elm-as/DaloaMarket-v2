import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../../ui/Button';

interface ListingRequirementsGuardProps {
  hasPayoutInfo: boolean;
  onConfigurePayout: () => void;
  onConfigureShop: () => void;
}

/**
 * Affiche l'étape bloquante si le vendeur n'a pas encore configuré son retrait
 * Mobile Money ou la position GPS de sa boutique à Daloa.
 */
export const ListingRequirementsGuard: React.FC<ListingRequirementsGuardProps> = ({
  hasPayoutInfo,
  onConfigurePayout,
  onConfigureShop,
}) => (
  <div className="mx-auto max-w-lg px-4 py-8">
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-4">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
        <AlertTriangle className="h-6 w-6" />
      </div>
      <h2 className="text-base font-bold text-slate-900">
        {!hasPayoutInfo ? 'Compte Mobile Money requis' : 'Position boutique à Daloa requise'}
      </h2>
      <p className="text-xs text-slate-600 leading-relaxed">
        {!hasPayoutInfo
          ? 'Configurez votre numéro Mobile Money (Wave, Orange, MTN...) pour recevoir vos paiements.'
          : 'Positionnez votre boutique à Daloa dans vos paramètres afin que les acheteurs et coursiers vous localisent.'}
      </p>
      <Button
        color="primary"
        onClick={!hasPayoutInfo ? onConfigurePayout : onConfigureShop}
        className="w-full min-h-[48px] rounded-xl bg-orange-600 font-bold text-white hover:bg-orange-700"
      >
        {!hasPayoutInfo ? 'Configurer mes retraits' : 'Définir la position GPS'}
      </Button>
    </div>
  </div>
);
