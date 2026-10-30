import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface CodRefusalSellerBoxProps {
  orderId: string;
  buyerId: string;
  onRefusalReported: () => void;
}

const REFUSAL_REASONS = [
  { id: 'buyer_unreachable', label: 'Client injoignable (téléphone éteint / ne répond pas)' },
  { id: 'buyer_refused_no_money', label: "Client n'a pas l'argent à l'arrivée du livreur" },
  { id: 'buyer_refused_changed_mind', label: "Client a changé d'avis sans prévenir" },
  { id: 'buyer_fake_location', label: 'Adresse ou numéro introuvable (fausse commande)' },
] as const;

interface BuyerCodStats {
  cod_orders_count: number;
  cod_delivered_count: number;
  cod_refused_count: number;
  cod_reliability_score: number;
}

export const CodRefusalSellerBox: React.FC<CodRefusalSellerBoxProps> = ({
  orderId,
  buyerId,
  onRefusalReported,
}) => {
  const [stats, setStats] = useState<BuyerCodStats | null>(null);
  const [openModal, setOpenModal] = useState(false);
  const [reason, setReason] = useState<string>('buyer_unreachable');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!buyerId) return;
    let active = true;
    (async () => {
      try {
        const { data } = await (supabase.from('users') as any)
          .select('cod_orders_count, cod_delivered_count, cod_refused_count, cod_reliability_score')
          .eq('id', buyerId)
          .maybeSingle();
        if (active && data) {
          setStats({
            cod_orders_count: Number(data.cod_orders_count || 0),
            cod_delivered_count: Number(data.cod_delivered_count || 0),
            cod_refused_count: Number(data.cod_refused_count || 0),
            cod_reliability_score: Number(data.cod_reliability_score ?? 100),
          });
        }
      } catch {
        // Ignorer
      }
    })();
    return () => {
      active = false;
    };
  }, [buyerId]);

  const handleReportRefusal = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await (supabase as any).rpc('report_cod_delivery_refusal', {
        p_order_id: orderId,
        p_reason: reason,
        p_notes: notes.trim() || null,
      });
      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.reason || 'Impossible de signaler le refus.');
      }
      toast.success(
        data.is_now_blocked
          ? 'Refus enregistré : stock libéré et acheteur suspendu du paiement à la livraison (14j).'
          : 'Refus enregistré : stock libéré et avertissement envoyé à l’acheteur.'
      );
      setOpenModal(false);
      onRefusalReported();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du signalement');
    } finally {
      setSubmitting(false);
    }
  };

  const isRisky = stats && (stats.cod_refused_count > 0 || stats.cod_reliability_score < 75);

  return (
    <div className="space-y-2.5 pt-2 border-t border-gray-100">
      {stats && (
        <div
          className={cn(
            'flex items-center justify-between rounded-xl border px-3 py-2 text-xs',
            isRisky
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
          )}
        >
          <div className="flex items-center gap-2">
            {isRisky ? (
              <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            <span className="font-bold">
              Indice Anti-Lapin :{' '}
              {stats.cod_orders_count <= 1 && stats.cod_refused_count === 0
                ? 'Nouvel acheteur COD'
                : `${stats.cod_reliability_score}% fiable`}
            </span>
          </div>
          <span className="font-mono text-[11px] font-extrabold tabular-nums">
            {stats.cod_delivered_count} liv. · {stats.cod_refused_count} lapin(s)
          </span>
        </div>
      )}

      {!openModal ? (
        <button
          type="button"
          onClick={() => setOpenModal(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 py-2.5 px-3 text-xs font-extrabold text-red-700 hover:bg-red-100 transition-colors"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Signaler un refus / client injoignable (Anti-Lapin)</span>
        </button>
      ) : (
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black text-red-900">Signaler une livraison non honorée</p>
            <button
              type="button"
              onClick={() => setOpenModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[11px] text-red-800 leading-snug">
            Cette action annule la commande, remet votre article en stock et sanctionne l'Indice Anti-Lapin du client.
          </p>
          <div className="space-y-1.5">
            {REFUSAL_REASONS.map((r) => (
              <label
                key={r.id}
                className={cn(
                  'flex items-center gap-2 rounded-xl border p-2.5 text-xs cursor-pointer transition-all',
                  reason === r.id
                    ? 'border-red-500 bg-white font-bold text-red-900'
                    : 'border-gray-200 bg-white/70 text-gray-700'
                )}
              >
                <input
                  type="radio"
                  name="cod_refusal_reason"
                  value={r.id}
                  checked={reason === r.id}
                  onChange={() => setReason(r.id)}
                  className="accent-red-600"
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Précision facultative..."
            className="w-full h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={handleReportRefusal}
              className="flex-1 h-9 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? <LoadingSpinner size="sm" /> : null}
              <span>Confirmer le refus</span>
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => setOpenModal(false)}
              className="px-3 h-9 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
