import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, MessageCircle, Phone, Store, Truck, XCircle } from 'lucide-react';
import { cn, formatDate, formatPrice } from '../../lib/utils';
import type { Order } from '../../types/order';
import { getTimelineProgress, type UserRole } from './OrderStatusTimeline';
import { getClosedCopy } from './orderClosedCopy';
import { InlineSellerRating } from './InlineSellerRating';

interface OrderStatusHeroProps {
  order: Order;
  role: UserRole;
  userId?: string | null;
}

const TONES = {
  progress: { card: 'border-orange-200 bg-orange-50/60', icon: 'bg-[var(--color-primary)] text-white', bar: 'bg-[var(--color-primary)]' },
  success: { card: 'border-emerald-200 bg-emerald-50/70', icon: 'bg-emerald-500 text-white', bar: 'bg-emerald-500' },
  cancelled: { card: 'border-gray-200 bg-white', icon: 'bg-gray-100 text-gray-500', bar: '' },
  dispute: { card: 'border-amber-200 bg-amber-50/70', icon: 'bg-amber-500 text-white', bar: '' },
} as const;

const SUPPORT_WHATSAPP = 'https://wa.me/2250704163361';

/**
 * Encadré d'état en tête du suivi de commande. Il change de forme avec la
 * commande — en cours, livrée, annulée, en litige — au lieu de se limiter à
 * la petite pastille du haut, et répond à « où en est-on et que dois-je faire ».
 */
export const OrderStatusHero: React.FC<OrderStatusHeroProps> = ({ order, role, userId }) => {
  const navigate = useNavigate();
  const delivery = Array.isArray(order.delivery_assignment)
    ? order.delivery_assignment[0]
    : (order.delivery_assignment as any);
  const isPickup = order.delivery_mode === 'pickup' || order.delivery_mode === 'pickup_point';
  const isDelivered = order.status === 'delivered' || order.status === 'completed';
  const closed = getClosedCopy(order, userId);

  /* ── Annulée / litige ── */
  if (closed) {
    const tone = TONES[closed.kind === 'dispute' ? 'dispute' : 'cancelled'];
    const Icon = closed.kind === 'dispute' ? AlertTriangle : XCircle;
    return (
      <Shell className={tone.card}>
        <div className="flex items-start gap-3.5">
          <IconBubble className={tone.icon}>
            <Icon className="h-6 w-6" />
          </IconBubble>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold leading-tight text-gray-900">{closed.title}</h2>
            <p className="mt-1 text-[13px] leading-snug text-gray-600">{closed.message}</p>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-white/80 px-3 py-2 text-[13px] font-medium text-gray-800 ring-1 ring-gray-100">
          {closed.money}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {closed.kind === 'cancelled' ? (
            <button
              onClick={() => navigate('/')}
              className="text-[13px] font-medium text-gray-700 hover:text-gray-900"
            >
              Voir d’autres articles
            </button>
          ) : (
            <button
              onClick={() => navigate('/mes-commandes')}
              className="inline-flex items-center gap-1 text-[13px] font-medium text-gray-700 hover:text-gray-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Mes commandes
            </button>
          )}
          <a
            href={SUPPORT_WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[13px] font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Aide WhatsApp
          </a>
        </div>
      </Shell>
    );
  }

  /* ── Livrée ── */
  if (isDelivered) {
    const tone = TONES.success;
    const when = delivery?.delivered_at || delivery?.buyer_confirmed_at;
    const title =
      role === 'seller' ? 'Vente conclue' : isPickup ? 'Article retiré' : role === 'delivery' ? 'Course terminée' : 'Commande livrée';
    return (
      <Shell className={tone.card}>
        <div className="flex items-start gap-3.5">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 16 }}
          >
            <IconBubble className={tone.icon}>
              <CheckCircle2 className="h-6 w-6" />
            </IconBubble>
          </motion.div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold leading-tight text-gray-900">{title}</h2>
            <p className="mt-1 text-[13px] text-gray-600">
              {when ? `Le ${formatDate(when)}` : 'Remise confirmée'} · {formatPrice(order.total_amount)}
            </p>
          </div>
        </div>
        <ProgressBar done={1} total={1} className={tone.bar} />
        {role === 'buyer' && userId && order.listing_id && (
          <div className="mt-4 border-t border-emerald-100 pt-3">
            <InlineSellerRating userId={userId} sellerId={order.seller_id} listingId={order.listing_id} />
          </div>
        )}
      </Shell>
    );
  }

  /* ── En cours ── */
  const tone = TONES.progress;
  const progress = getTimelineProgress(order, role);
  const Icon = isPickup ? Store : Truck;
  const driverPhone = order.delivery_person?.phone;
  const showCallDriver = role === 'buyer' && !isPickup && !!driverPhone && order.status === 'in_transit';

  return (
    <Shell className={tone.card}>
      <div className="flex items-start gap-3.5">
        <IconBubble className={cn(tone.icon, 'relative')}>
          <span className="absolute inset-0 animate-ping rounded-2xl bg-[var(--color-primary)] opacity-20" />
          <Icon className="relative h-6 w-6" />
        </IconBubble>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-[var(--color-primary-dark)]">
            Étape {Math.min(progress.done + 1, progress.total)} sur {progress.total}
          </p>
          <h2 className="text-[17px] font-semibold leading-tight text-gray-900">{progress.label}</h2>
          <p className="mt-1 text-[13px] leading-snug text-gray-600">{progress.description}</p>
        </div>
      </div>
      <ProgressBar done={progress.done} total={progress.total} className={tone.bar} />
      {showCallDriver && (
        <a
          href={`tel:${driverPhone}`}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-[13px] font-medium text-gray-800 ring-1 ring-gray-200 hover:bg-gray-50"
        >
          <Phone className="h-3.5 w-3.5" /> Appeler le livreur
        </a>
      )}
    </Shell>
  );
};

const Shell: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <motion.section
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className={cn('rounded-2xl border p-4', className)}
    aria-live="polite"
  >
    {children}
  </motion.section>
);

const IconBubble: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', className)}>{children}</div>
);

/** Barre en segments : une case par étape du parcours. */
const ProgressBar: React.FC<{ done: number; total: number; className: string }> = ({ done, total, className }) => (
  <div className="mt-4 flex gap-1" aria-hidden>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={cn('h-1.5 flex-1 rounded-full', i < done ? className : 'bg-gray-200')} />
    ))}
  </div>
);
