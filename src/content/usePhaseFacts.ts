import { usePhase } from '../contexts/PhaseContext';
import { FEES, pct } from './legalFacts';

/**
 * Régime en vigueur pour les textes publics (CGU, FAQ, Tarifs…), calculé depuis
 * la configuration réelle (`system_settings.phase_config`) au lieu d'être figé
 * sur la phase de lancement. Basculer de phase dans l'admin met les textes à
 * jour en même temps que les règles appliquées par la base.
 */
export function usePhaseFacts() {
  const { phaseConfig } = usePhase();
  const override = phaseConfig.seller_fee_override;

  /** Aucune commission vendeur prélevée aujourd'hui (phase de lancement). */
  const noSellerCommission = override != null && Number(override) === 0;
  /** Commission vendeur appliquée aujourd'hui, en toutes lettres. */
  const sellerFeeText =
    override != null ? pct(Number(override)) : `${FEES.sellerStandardPct} (${FEES.sellerProPct} pour les Vendeurs Pro)`;

  /** Paiement à la livraison, retrait sur place et livreurs affiliés ouverts à tous. */
  const proFeaturesOpenToAll = Boolean(
    phaseConfig.allow_cod_for_all &&
      phaseConfig.allow_pickup_for_all &&
      phaseConfig.allow_affiliated_deliverers_for_all
  );

  return {
    isLaunch: phaseConfig.phase === 0,
    noSellerCommission,
    sellerFeeText,
    proFeaturesOpenToAll,
    codOpenToAll: Boolean(phaseConfig.allow_cod_for_all),
  };
}
