import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ExternalLink,
  ArrowRight,
  Package,
  Store,
  Truck,
  Phone,
  XCircle,
} from 'lucide-react';
import { cn, formatDate, formatPrice } from '../../../lib/utils';
import { type AdminDeliveryItem, isDriverDelivery } from './types';
import { AdminBadge, AdminButton } from '../ui/AdminUI';
import { deliveryStatus } from './status';

interface DeliveryCardProps {
  item: AdminDeliveryItem;
  photoUrl?: string;
  cancellingId?: string | null;
  onCancelItem?: (item: AdminDeliveryItem) => void;
}

const ContactLine: React.FC<{ role: string; name?: string | null; phone?: string | null }> = ({
  role,
  name,
  phone,
}) => (
  <div className="flex items-center justify-between gap-2 py-1 text-xs">
    <span className="text-stone-500">{role}</span>
    <div className="flex items-center gap-2 font-medium text-stone-900">
      <span className="truncate max-w-[160px]">{name || 'Non renseigné'}</span>
      {phone && (
        <a
          href={`tel:${phone}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 rounded bg-stone-100 px-1.5 py-0.5 font-mono text-[11px] text-stone-700 hover:bg-stone-200"
        >
          <Phone size={10} />
          {phone}
        </a>
      )}
    </div>
  </div>
);

export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  item,
  photoUrl,
  cancellingId,
  onCancelItem,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const status = deliveryStatus(item.status);
  const buyer = item.order?.buyer;
  const seller = item.order?.seller;
  const driver = item.delivery_person;
  const listing = item.order?.listing;
  const withDriver = isDriverDelivery(item);

  const productAmount = item.order?.product_amount || 0;
  const deliveryFee = item.delivery_price ?? item.order?.delivery_fee ?? 0;
  const totalAmount = item.order?.total_amount || productAmount + deliveryFee;

  const driverNetFee = Math.max(0, deliveryFee - Math.round(deliveryFee * 0.1));
  const payout = item.driver_payout;
  const payoutPaid = payout?.status === 'paid' || payout?.status === 'completed';
  const payoutPending = payout?.status === 'pending' || payout?.status === 'processing';
  const payoutFailed = payout?.status === 'failed';

  const paymentMethod = item.order?.payment_method || (withDriver ? 'cod' : 'cash_at_shop');
  const isCashPayment = paymentMethod === 'cod' || paymentMethod === 'cash_at_shop';
  const paidInCash = isCashPayment && !payout;
  const driverToPay = withDriver && item.status === 'delivered' && driverNetFee > 0 && !payoutPaid && !paidInCash;
  const isCancelled = item.status === 'cancelled' || item.order?.status === 'cancelled';
  const canAdminCancel =
    !isCancelled &&
    !['delivered', 'completed', 'auto_released', 'refunded'].includes(item.status) &&
    Boolean(onCancelItem);

  const from = seller?.full_name || item.pickup_location || 'Boutique vendeur';
  const to = withDriver
    ? item.dropoff_location || item.order?.delivery_address || 'Adresse client'
    : 'Retrait en boutique';

  const shortRef = `#${(item.order_id || item.id).slice(0, 6)}`;
  const photoThumb = listing?.photos?.[0];
  const hasListingTitle = Boolean(listing?.title);
  const titleText = listing?.title || (withDriver ? `Course ${shortRef}` : `Commande ${shortRef}`);

  return (
    <li
      className={cn(
        'rounded-xl border bg-white transition-colors',
        open ? 'border-stone-300 shadow-xs' : 'border-stone-200/90 hover:border-stone-300'
      )}
    >
      {/* Ligne principale : lecture directe en 1 coup d'œil */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {photoThumb ? (
          <img
            src={photoThumb}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg border border-stone-200/80 object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
            {withDriver ? <Truck size={17} /> : <Store size={17} />}
          </div>
        )}

        {/* Produit + Acteurs */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-stone-900">{titleText}</span>
            {hasListingTitle && (
              <span className="shrink-0 font-mono text-[11px] text-stone-400">{shortRef}</span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500">
            <span className="truncate max-w-[260px]">
              {buyer?.full_name ? `${buyer.full_name} → ${from}` : `${from} → ${to}`}
            </span>
            {withDriver && driver?.name && (
              <>
                <span className="text-stone-300">·</span>
                <span className="text-stone-600 font-medium">🛵 {driver.name}</span>
              </>
            )}
            <span className="text-stone-300 hidden sm:inline">·</span>
            <span className="hidden sm:inline text-stone-400">{formatDate(item.created_at)}</span>
          </div>
        </div>

        {/* Mode & Paiement (Bureau) */}
        <div className="hidden md:flex shrink-0 items-center gap-1.5">
          <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
            {withDriver ? 'Livraison' : 'Retrait'}
          </span>
          {item.order && (
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-[11px] font-medium',
                isCashPayment ? 'bg-stone-100 text-stone-600' : 'bg-emerald-50 text-emerald-700'
              )}
            >
              {isCashPayment ? 'Espèces' : 'En ligne'}
            </span>
          )}
        </div>

        {/* Montant tabulaire */}
        <div className="shrink-0 text-right">
          <p
            className={cn(
              'text-sm font-bold tabular-nums',
              isCancelled ? 'text-stone-400 line-through' : 'text-stone-900'
            )}
          >
            {totalAmount > 0 ? formatPrice(totalAmount) : withDriver ? formatPrice(deliveryFee) : 'Retrait'}
          </p>
          {withDriver && deliveryFee > 0 && productAmount > 0 && (
            <p className="text-[11px] text-stone-400 tabular-nums">
              dont livr. {formatPrice(deliveryFee)}
            </p>
          )}
        </div>

        {/* Statut */}
        <div className="flex shrink-0 items-center gap-2">
          {(driverToPay || payoutFailed) && (
            <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" title="Livreur à régler" />
          )}
          <AdminBadge tone={status.tone}>{status.label}</AdminBadge>
          <ChevronDown
            size={16}
            className={cn('shrink-0 text-stone-400 transition-transform', open && 'rotate-180')}
          />
        </div>
      </button>

      {/* Tiroir de détail structuré en 3 blocs clairs */}
      {open && (
        <div className="border-t border-stone-100 bg-stone-50/50 px-4 py-4 rounded-b-xl">
          <div className="grid gap-4 lg:grid-cols-3">
            {/* 1. Acteurs & Trajet */}
            <div className="rounded-lg border border-stone-200/80 bg-white p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Acteurs & Trajet
              </p>
              <div className="divide-y divide-stone-100">
                <ContactLine role="Acheteur" name={buyer?.full_name} phone={buyer?.phone} />
                <ContactLine role="Vendeur" name={seller?.full_name} phone={seller?.phone} />
                <ContactLine
                  role="Livreur"
                  name={withDriver ? driver?.name || 'Non assigné' : 'Retrait boutique'}
                  phone={withDriver ? driver?.phone : null}
                />
              </div>
              <p className="mt-2 border-t border-stone-100 pt-2 text-xs text-stone-600">
                <span className="font-medium text-stone-900">Itinéraire :</span> {from} → {to}
              </p>
            </div>

            {/* 2. Détail financier */}
            <div className="rounded-lg border border-stone-200/80 bg-white p-3">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Détail financier
              </p>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Montant article</dt>
                  <dd className="font-medium text-stone-900 tabular-nums">{formatPrice(productAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Frais de livraison</dt>
                  <dd className="font-medium text-stone-900 tabular-nums">{formatPrice(deliveryFee)}</dd>
                </div>
                <div className="flex justify-between border-t border-stone-100 pt-1.5 font-semibold text-stone-900">
                  <dt>Total commande</dt>
                  <dd className="tabular-nums">{formatPrice(totalAmount)}</dd>
                </div>
                <div className="flex justify-between pt-1">
                  <dt className="text-stone-500">Mode de règlement</dt>
                  <dd className="font-medium text-stone-800">
                    {isCashPayment ? 'Espèces (à la remise)' : 'Payé en ligne (Séquestre)'}
                  </dd>
                </div>
                {withDriver && (
                  <div className="flex items-center justify-between pt-1">
                    <dt className="text-stone-500">Part livreur ({formatPrice(driverNetFee)})</dt>
                    <dd>
                      {payoutPaid ? (
                        <AdminBadge tone="success">Payé</AdminBadge>
                      ) : payoutPending ? (
                        <AdminBadge tone="warning">En cours</AdminBadge>
                      ) : payoutFailed ? (
                        <AdminBadge tone="danger">Échec</AdminBadge>
                      ) : driverToPay ? (
                        <AdminBadge tone="danger">À verser</AdminBadge>
                      ) : paidInCash ? (
                        <span className="text-stone-500">Encaissé cash</span>
                      ) : isCancelled ? (
                        <span className="text-stone-400">Annulée</span>
                      ) : (
                        <span className="text-stone-500">Après remise</span>
                      )}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* 3. Actions & Vérifications */}
            <div className="flex flex-col justify-between rounded-lg border border-stone-200/80 bg-white p-3">
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  Actions & Preuves
                </p>
                <div className="flex flex-wrap gap-2">
                  {item.order?.listing_id && (
                    <AdminButton
                      size="sm"
                      icon={Package}
                      onClick={() => navigate(`/listing/${item.order?.listing_id}`)}
                    >
                      Voir l'annonce
                    </AdminButton>
                  )}
                  {photoUrl && (
                    <AdminButton
                      size="sm"
                      icon={ExternalLink}
                      onClick={() => window.open(photoUrl, '_blank')}
                    >
                      Preuve photo
                    </AdminButton>
                  )}
                  {item.status === 'disputed' && (
                    <AdminButton
                      size="sm"
                      variant="danger"
                      icon={ArrowRight}
                      onClick={() => navigate('/admin/litiges')}
                    >
                      Arbitrer le litige
                    </AdminButton>
                  )}
                  {(driverToPay || payoutFailed) && (
                    <AdminButton
                      size="sm"
                      variant="primary"
                      icon={ArrowRight}
                      onClick={() => navigate('/admin/versements')}
                    >
                      Régler le livreur
                    </AdminButton>
                  )}
                </div>
              </div>

              {canAdminCancel && (
                <div className="mt-3 border-t border-stone-100 pt-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400">Commande test ou bloquée ?</span>
                  <AdminButton
                    size="sm"
                    variant="ghost"
                    icon={XCircle}
                    loading={cancellingId === item.id}
                    onClick={() => onCancelItem?.(item)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Annuler la commande
                  </AdminButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </li>
  );
};
