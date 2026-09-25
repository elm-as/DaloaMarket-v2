import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ExternalLink, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { triggerPayoutProcessing } from '../../../lib/payment';
import { cn, formatPrice, formatDate } from '../../../lib/utils';
import { AdminBadge, AdminButton, AdminEmpty, AdminTabs, adminInputClass } from '../ui/AdminUI';
import { deliveryStatus } from '../deliveries/status';
import type { DisputeDeliveryItem } from './types';

type ResolveAction = 'refund_partial' | 'refund_complete' | 'deliver';

const ACTIONS: { key: ResolveAction; label: string; effect: string; variant: 'primary' | 'danger' | 'secondary' }[] = [
  {
    key: 'refund_partial',
    label: 'Remboursement partiel',
    effect: 'Client absent : l’acheteur est remboursé de l’article, le livreur est payé, le colis retourne au vendeur.',
    variant: 'primary',
  },
  {
    key: 'refund_complete',
    label: 'Remboursement total',
    effect: 'L’acheteur récupère tout (article et livraison). Ni le vendeur ni le livreur ne sont payés.',
    variant: 'danger',
  },
  {
    key: 'deliver',
    label: 'Valider la livraison',
    effect: 'La commande est considérée livrée : le vendeur et le livreur sont payés.',
    variant: 'secondary',
  },
];

const SUCCESS: Record<ResolveAction, string> = {
  refund_partial: 'Remboursement partiel effectué, livreur payé.',
  refund_complete: 'Remboursement total validé.',
  deliver: 'Livraison validée : vendeur et livreur payés.',
};

const person = (name?: string | null, phone?: string | null) => (
  <>
    {name || 'Inconnu'}
    {phone && <span className="text-gray-500"> · {phone}</span>}
  </>
);

interface DisputeSettlementSectionProps {
  disputes: DisputeDeliveryItem[];
  onDisputeResolved: () => void;
}

/**
 * Liste des litiges : une ligne par course, dépliée au clic pour le détail et
 * l'arbitrage. Chaque décision demande une confirmation : elle déplace de
 * l'argent et ne se défait pas.
 */
export const DisputeSettlementSection: React.FC<DisputeSettlementSectionProps> = ({
  disputes,
  onDisputeResolved,
}) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'disputed' | 'all'>('disputed');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, setPending] = useState<{ id: string; action: ResolveAction } | null>(null);

  const handleResolve = async (assignmentId: string, action: ResolveAction) => {
    setProcessingId(assignmentId);
    try {
      const { data, error } = await (supabase as any).rpc('resolve_delivery_dispute', {
        p_assignment_id: assignmentId,
        p_action: action,
      });
      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.reason || 'Action non autorisée');
      }
      toast.success(SUCCESS[action]);
      // Envoie tout de suite les versements créés par l'arbitrage.
      await triggerPayoutProcessing({ force: true });
      setPending(null);
      setOpenId(null);
      onDisputeResolved();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du traitement du litige');
    } finally {
      setProcessingId(null);
    }
  };

  const openCount = disputes.filter((d) => d.status === 'disputed').length;
  const filtered = disputes.filter((item) => {
    if (filterMode === 'disputed' && item.status !== 'disputed') return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return [item.order?.buyer?.full_name, item.order?.seller?.full_name, item.delivery_person?.name, item.id]
        .some((v) => (v || '').toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminTabs<'disputed' | 'all'>
          value={filterMode}
          onChange={setFilterMode}
          tabs={[
            { key: 'disputed', label: 'À arbitrer', count: openCount },
            { key: 'all', label: 'Courses récentes', count: disputes.length },
          ]}
        />
        <div className="relative sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom ou n° de course"
            className={cn(adminInputClass, 'pl-8')}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <AdminEmpty title="Aucun litige" description="Aucune course contestée en attente d’arbitrage." />
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => {
            const open = openId === item.id;
            const isDisputed = item.status === 'disputed';
            const status = deliveryStatus(item.status);
            const productAmount = item.order?.product_amount || 0;
            const deliveryFee = item.order?.delivery_fee || 0;
            const driverPay = Math.max(0, deliveryFee - Math.round(deliveryFee * 0.1));
            const isProcessing = processingId === item.id;
            const confirm = pending?.id === item.id ? ACTIONS.find((a) => a.key === pending.action) : undefined;

            return (
              <li
                key={item.id}
                className={cn('rounded-xl border bg-white', isDisputed ? 'border-red-200' : 'border-gray-200')}
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(open ? null : item.id);
                    setPending(null);
                  }}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                >
                  <span className="w-20 shrink-0 font-mono text-xs text-gray-500">#{item.id.slice(0, 8)}</span>
                  <span className="w-24 shrink-0">
                    <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                    {item.dispute_reason || `${item.order?.buyer?.full_name || 'Acheteur'} ← ${item.order?.seller?.full_name || 'Vendeur'}`}
                  </span>
                  <span className="hidden shrink-0 text-sm tabular-nums text-gray-700 sm:inline">
                    {formatPrice(productAmount + deliveryFee)}
                  </span>
                  <span className="hidden w-24 shrink-0 text-right text-xs text-gray-500 md:inline">
                    {formatDate(item.created_at)}
                  </span>
                  <ChevronDown size={16} className={cn('shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
                </button>

                {open && (
                  <div className="space-y-3 border-t border-gray-100 px-3 py-3">
                    {item.dispute_reason && (
                      <p className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-900">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-600" />
                        {item.dispute_reason}
                      </p>
                    )}

                    <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs">
                      <dt className="text-gray-500">Acheteur</dt>
                      <dd className="text-gray-900">{person(item.order?.buyer?.full_name, item.order?.buyer?.phone)}</dd>
                      <dt className="text-gray-500">Vendeur</dt>
                      <dd className="text-gray-900">{person(item.order?.seller?.full_name, item.order?.seller?.phone)}</dd>
                      <dt className="text-gray-500">Livreur</dt>
                      <dd className="text-gray-900">{person(item.delivery_person?.name || 'Non assigné', item.delivery_person?.phone)}</dd>
                      {(item.pickup_location || item.dropoff_location) && (
                        <>
                          <dt className="text-gray-500">Trajet</dt>
                          <dd className="text-gray-900">
                            {item.pickup_location || 'Vendeur'} → {item.dropoff_location || 'Acheteur'}
                          </dd>
                        </>
                      )}
                      <dt className="text-gray-500">Montants</dt>
                      <dd className="text-gray-900">
                        Article {formatPrice(productAmount)} · course {formatPrice(deliveryFee)} (livreur{' '}
                        {formatPrice(driverPay)})
                      </dd>
                      <dt className="text-gray-500">Créée le</dt>
                      <dd className="text-gray-900">{formatDate(item.created_at)}</dd>
                      {item.resolved_at && (
                        <>
                          <dt className="text-gray-500">Arbitré le</dt>
                          <dd className="text-gray-900">{formatDate(item.resolved_at)}</dd>
                        </>
                      )}
                    </dl>

                    {item.delivery_photo_url && (
                      <a
                        href={item.delivery_photo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-gray-700 hover:underline"
                      >
                        <ExternalLink size={12} /> Voir la preuve de livraison
                      </a>
                    )}

                    {isDisputed &&
                      (confirm ? (
                        <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                          <p className="text-sm font-medium text-gray-900">{confirm.label} ?</p>
                          <p className="text-xs text-gray-600">{confirm.effect} Cette décision est définitive.</p>
                          <div className="flex gap-2">
                            <AdminButton
                              size="sm"
                              variant={confirm.variant === 'danger' ? 'danger' : 'primary'}
                              loading={isProcessing}
                              onClick={() => handleResolve(item.id, confirm.key)}
                            >
                              Confirmer
                            </AdminButton>
                            <AdminButton size="sm" variant="ghost" disabled={isProcessing} onClick={() => setPending(null)}>
                              Annuler
                            </AdminButton>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {ACTIONS.map((a) => (
                            <AdminButton
                              key={a.key}
                              size="sm"
                              variant={a.variant}
                              onClick={() => setPending({ id: item.id, action: a.key })}
                            >
                              {a.label}
                            </AdminButton>
                          ))}
                        </div>
                      ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
