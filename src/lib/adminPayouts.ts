import { supabase } from './supabase';
import { triggerPayoutProcessing } from './payment';

const DRIVER_PAYOUT_REASONS: Record<string, string> = {
  unauthorized: "Action réservée à l'administration.",
  assignment_not_found: 'Course introuvable.',
  no_driver: 'Aucun livreur assigné à cette course.',
  no_escrow: 'Course payée en espèces : le livreur a été payé à la remise.',
  not_eligible:
    "Versement impossible : commande non livrée, séquestre non financé ou livreur sans numéro Mobile Money.",
};

/**
 * Programme le versement d'un livreur pour une course livrée, puis lance la
 * synchronisation MoneyFusion.
 *
 * Le montant (90 % des frais), le numéro et le réseau Mobile Money choisis par
 * le livreur sont décidés par la base (`admin_trigger_driver_payout` →
 * `create_delivery_payout`). Les deux écrans admin inséraient auparavant le
 * versement eux-mêmes : insertion refusée par la base, et réseau forcé sur
 * Orange Money dès qu'un numéro commençait par 07, même si le livreur avait
 * choisi Wave.
 */
export async function triggerDriverPayout(assignmentId: string): Promise<void> {
  const { data, error } = await (supabase as any).rpc('admin_trigger_driver_payout', {
    p_assignment_id: assignmentId,
  });
  if (error) throw error;

  const result = data as { success?: boolean; reason?: string } | null;
  if (!result?.success) {
    throw new Error(DRIVER_PAYOUT_REASONS[result?.reason || ''] || 'Versement refusé.');
  }

  await triggerPayoutProcessing({ force: true });
}

/**
 * Relance le traitement des versements en attente côté Railway et renvoie ce
 * qui a été traité. Contrairement à `triggerPayoutProcessing` (appel
 * silencieux après une action), une erreur remonte : l'admin doit la voir.
 */
export async function runPayoutProcessing(options: { retryFailed?: boolean } = {}): Promise<{ processed: number }> {
  const apiUrl = import.meta.env.VITE_PAYMENT_API_URL || 'https://api.daloamarket.com';
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error('Session expirée, reconnectez-vous.');

  const params = new URLSearchParams({ force: 'true' });
  if (options.retryFailed) params.set('retry_failed', 'true');

  const res = await fetch(`${apiUrl}/process-payouts?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || 'Le serveur de paiement a refusé la relance.');
  }
  return { processed: Number(data?.processed) || 0 };
}
