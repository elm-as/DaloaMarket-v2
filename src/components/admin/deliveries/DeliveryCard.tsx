import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ExternalLink, ArrowRight } from 'lucide-react';
import { cn, formatDate, formatPrice } from '../../../lib/utils';
import { type AdminDeliveryItem, isDriverDelivery } from './types';
import { AdminBadge } from '../ui/AdminUI';
import { deliveryStatus } from './status';

const person = (name?: string | null, phone?: string | null) => (
  <>
    {name || 'Inconnu'}
    {phone && <span className="text-gray-500"> · {phone}</span>}
  </>
);

interface DeliveryCardProps {
  item: AdminDeliveryItem;
  photoUrl?: string;
}

/**
 * Course sous forme de ligne compacte ; un clic déplie le détail. En lecture
 * seule : l'arbitrage se fait à la page Litiges et le versement livreur à la
 * page Versements (la carte portait les deux, en double).
 */
export const DeliveryCard: React.FC<DeliveryCardProps> = ({ item, photoUrl }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const status = deliveryStatus(item.status);
  const buyer = item.order?.buyer;
  const seller = item.order?.seller;
  const driver = item.delivery_person;
  const withDriver = isDriverDelivery(item);

  const deliveryFee = item.delivery_price || item.order?.delivery_fee || 0;
  // 90 % au livreur, arrondi comme create_delivery_payout.
  const driverNetFee = Math.max(0, deliveryFee - Math.round(deliveryFee * 0.1));
  const payout = item.driver_payout;
  const payoutPaid = payout?.status === 'paid' || payout?.status === 'completed';
  const payoutPending = payout?.status === 'pending' || payout?.status === 'processing';
  const payoutFailed = payout?.status === 'failed';
  // Paiement à la livraison : aucun séquestre, le livreur encaisse sa course
  // en espèces à la remise ; aucun virement n'est attendu.
  const paidInCash = item.order?.payment_method === 'cod' && !payout;
  const driverToPay = withDriver && item.status === 'delivered' && driverNetFee > 0 && !payoutPaid && !paidInCash;
  // Course annulée sans versement : rien n'est dû au livreur (s'il a été
  // dédommagé lors d'un litige, le versement existe et s'affiche normalement).
  const cancelledUnpaid = item.status === 'cancelled' && !payout;

  const from = item.pickup_location || 'Vendeur';
  const to = withDriver ? item.dropoff_location || 'Adresse de livraison' : 'Retrait en boutique';

  return (
    <li className="rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <span className="w-20 shrink-0 font-mono text-xs text-gray-500">#{item.id.slice(0, 8)}</span>
        <span className="w-32 shrink-0">
          <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
          {from} → {to}
        </span>
        {withDriver && (
          <span
            className={cn(
              'hidden shrink-0 text-sm tabular-nums sm:inline',
              cancelledUnpaid ? 'text-gray-400 line-through' : 'text-gray-700'
            )}
          >
            {formatPrice(deliveryFee)}
          </span>
        )}
        {(driverToPay || payoutFailed) && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" title="Livreur à régler" />}
        <span className="hidden w-24 shrink-0 text-right text-xs text-gray-500 md:inline">{formatDate(item.created_at)}</span>
        <ChevronDown size={16} className={cn('shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-3 border-t border-gray-100 px-3 py-3">
          <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs">
            <dt className="text-gray-500">Acheteur</dt>
            <dd className="text-gray-900">{person(buyer?.full_name, buyer?.phone)}</dd>
            <dt className="text-gray-500">Vendeur</dt>
            <dd className="text-gray-900">{person(seller?.full_name, seller?.phone)}</dd>
            <dt className="text-gray-500">Livreur</dt>
            <dd className="text-gray-900">
              {withDriver ? person(driver?.name || 'Non assigné', driver?.phone) : 'Aucun (retrait en boutique)'}
            </dd>
            <dt className="text-gray-500">Créée le</dt>
            <dd className="text-gray-900">{formatDate(item.created_at)}</dd>
            {withDriver && (
              <>
                <dt className="text-gray-500">Course</dt>
                <dd className="text-gray-900">
                  {cancelledUnpaid ? (
                    <>{formatPrice(deliveryFee)} prévus · non dus, course annulée</>
                  ) : (
                    <>
                      {formatPrice(deliveryFee)} · livreur {formatPrice(driverNetFee)} · commission{' '}
                      {formatPrice(deliveryFee - driverNetFee)}
                    </>
                  )}
                </dd>
                <dt className="text-gray-500">Versement livreur</dt>
                <dd>
                  {payoutPaid ? (
                    <AdminBadge tone="success">
                      Payé{payout?.withdraw_mode ? ` via ${payout.withdraw_mode.replace('-ci', '')}` : ''}
                    </AdminBadge>
                  ) : payoutPending ? (
                    <AdminBadge tone="warning">En attente d’envoi</AdminBadge>
                  ) : payoutFailed ? (
                    <AdminBadge tone="danger">Échec</AdminBadge>
                  ) : driverToPay ? (
                    <AdminBadge tone="danger">Non créé</AdminBadge>
                  ) : paidInCash && item.status !== 'cancelled' ? (
                    <span className="text-gray-500">En espèces à la remise (pas de virement)</span>
                  ) : cancelledUnpaid ? (
                    <span className="text-gray-500">Aucun : course annulée</span>
                  ) : (
                    <span className="text-gray-500">Après la livraison</span>
                  )}
                </dd>
              </>
            )}
          </dl>

          {photoUrl && (
            <button
              type="button"
              onClick={() => window.open(photoUrl, '_blank')}
              className="inline-flex items-center gap-1 text-xs text-gray-700 hover:underline"
            >
              <ExternalLink size={12} /> Voir la preuve de livraison
            </button>
          )}

          {(item.status === 'disputed' || driverToPay || payoutFailed) && (
            <div className="flex flex-wrap gap-3">
              {item.status === 'disputed' && (
                <button
                  onClick={() => navigate('/admin/litiges')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline"
                >
                  Arbitrer ce litige <ArrowRight size={12} />
                </button>
              )}
              {(driverToPay || payoutFailed) && (
                <button
                  onClick={() => navigate('/admin/versements')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:underline"
                >
                  Régler le livreur <ArrowRight size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
};
