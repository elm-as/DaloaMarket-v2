import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Compteurs « à traiter » du tableau de bord admin.
 *
 * Existe parce que rien n'indiquait qu'un avis était arrivé ou qu'un livreur
 * avait déposé ses pièces : il fallait ouvrir chaque onglet pour s'en rendre
 * compte. Une CNI est restée 5 jours sans regard, deux avis 20 jours.
 *
 * Source : RPC admin_pending_counts() (réservée aux admins).
 */
export interface AdminPendingCounts {
  kyc_a_verifier: number;
  livreurs_sans_pieces: number;
  avis_7j: number;
  avis_sans_reponse: number;
  avis_total: number;
  signalements: number;
  litiges: number;
  messages_contact: number;
  suggestions: number;
  paiements_en_attente: number;
  payouts_en_attente: number;
  calcule_le: string;
}

const EMPTY: AdminPendingCounts = {
  kyc_a_verifier: 0,
  livreurs_sans_pieces: 0,
  avis_7j: 0,
  avis_sans_reponse: 0,
  avis_total: 0,
  signalements: 0,
  litiges: 0,
  messages_contact: 0,
  suggestions: 0,
  paiements_en_attente: 0,
  payouts_en_attente: 0,
  calcule_le: '',
};

export function useAdminPendingCounts(enabled = true) {
  const [counts, setCounts] = useState<AdminPendingCounts>(EMPTY);
  const [loading, setLoading] = useState(enabled);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      // `as any` : database.types.ts est generé et ne connaît pas encore
      // admin_pending_counts (même convention que le reste de l'admin).
      const { data, error } = await (supabase as any).rpc('admin_pending_counts');
      if (error) throw error;
      if (data) setCounts({ ...EMPTY, ...(data as Partial<AdminPendingCounts>) });
    } catch (err) {
      // Un compteur indisponible ne doit jamais casser le tableau de bord.
      console.warn('Compteurs admin indisponibles:', err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
    if (!enabled) return;
    const timer = setInterval(refresh, 60_000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh, enabled]);

  // Pastilles de la navigation admin : chaque compteur pointe vers la page qui
  // le traite réellement. Les pièces livreurs se vérifient sur le site
  // DaloaDelivery, et les messages de contact n'ont pas d'écran : ils ne
  // gonflent plus les pastilles de pages qui ne les affichent pas.
  const byTab: Record<string, number> = {
    ambassadeurs: (counts as any).ambassadeurs_payouts_en_attente || 0,
    feedbacks: counts.avis_sans_reponse,
    features: counts.suggestions,
    reports: counts.signalements,
    litiges: counts.litiges,
    versements: counts.payouts_en_attente,
  };

  const total = Object.values(byTab).reduce((a, b) => a + b, 0);

  return { counts, byTab, total, loading, refresh };
}
