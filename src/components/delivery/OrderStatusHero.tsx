import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  Phone,
  Scale,
  Store,
  Truck,
  XCircle,
} from 'lucide-react';
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

/**
 * Une couleur par situation, en aplat dégradé, comme les bandeaux DaloaMarket :
 * orange = en cours, vert = livrée, rouge = litige, bleu-vert = litige réglé,
 * ardoise = annulée.
 */
const TONES = {
  progress: 'from-orange-500 via-[var(--color-primary)] to-amber-600 shadow-orange-500/25',
  success: 'from-emerald-500 to-teal-600 shadow-emerald-500/25',
  dispute: 'from-rose-500 to-red-600 shadow-red-500/25',
  resolved: 'from-teal-500 to-cyan-600 shadow-teal-500/25',
  cancelled: 'from-slate-500 to-slate-700 shadow-slate-500/20',
} as const;

const SUPPORT_WHATSAPP = 'https://wa.me/2250704163361';

/**
 * Encadré d'état en tête du suivi de commande : il change de couleur et de
 * contenu avec la commande — en cours, livrée, litige, litige réglé, annulée —
 * et répond à « où en est-on et que dois-je faire ».
 */
export const OrderStatusHero: React.FC<OrderStatusHeroProps> = ({ order, role, userId }) => {
  const navigate = useNavigate();
  const delivery = Array.isArray(order.delivery_assignment)
    ? order.delivery_assignment[0]
    : (order.delivery_assignment as any);
  const isPickup = order.delivery_mode === 'pickup' || order.delivery_mode === 'pickup_point';
  const isDelivered = order.status === 'delivered' || order.status === 'completed';
  const closed = getClosedCopy(order, userId);

  /* ── Annulée / litige / litige réglé ── */
  if (closed) {
    const Icon = closed.kind === 'dispute' ? AlertTriangle : closed.kind === 'resolved' ? Scale : XCircle;
    return (
      <Shell tone={TONES[closed.kind]}>
        <div className="flex items-start gap-3.5">
          <IconBubble>
            <Icon className="h-6 w-6" />
          </IconBubble>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold leading-tight">{closed.title}</h2>
            <p className="mt-1 text-[13px] leading-snug text-white/85">{closed.message}</p>
          </div>
        </div>
        <p className="mt-4 rounded-2xl bg-white/15 px-3.5 py-2.5 text-[13px] font-semibold backdrop-blur-md">
          {closed.money}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => navigate(closed.kind === 'cancelled' ? '/' : '/mes-commandes')}
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-white/90 hover:text-white"
          >
            {closed.kind === 'cancelled' ? (
              'Voir d’autres articles'
            ) : (
              <>
                <ArrowLeft className="h-3.5 w-3.5" /> Mes commandes
              </>
            )}
          </button>
          <a
            href={SUPPORT_WHATSAPP}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-[13px] font-semibold text-gray-900 hover:bg-white/90"
          >
            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> Aide WhatsApp
          </a>
        </div>
      </Shell>
    );
  }

  /* ── Livrée ── */
  if (isDelivered) {
    const when = delivery?.delivered_at || delivery?.buyer_confirmed_at;
    // Livraison validée par l'équipe à l'issue d'un litige.
    const settledByTeam = Boolean(delivery?.resolved_at);
    const title = settledByTeam
      ? 'Litige réglé · livraison validée'
      : role === 'seller'
        ? 'Vente conclue'
        : isPickup
          ? 'Article retiré'
          : role === 'delivery'
            ? 'Course terminée'
            : 'Commande livrée';
    return (
      <Shell tone={TONES.success}>
        <div className="flex items-start gap-3.5">
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 16 }}
          >
            <IconBubble>
              <CheckCircle2 className="h-6 w-6" />
            </IconBubble>
          </motion.div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold leading-tight">{title}</h2>
            <p className="mt-1 text-[13px] text-white/85">
              {when ? `Le ${formatDate(when)}` : 'Remise confirmée'} · {formatPrice(order.total_amount)}
            </p>
          </div>
        </div>
        <ProgressBar done={1} total={1} />
        {role === 'buyer' && userId && order.listing_id && (
          <div className="mt-4 rounded-2xl bg-white p-3.5 text-gray-900">
            <InlineSellerRating userId={userId} sellerId={order.seller_id} listingId={order.listing_id} />
          </div>
        )}
      </Shell>
    );
  }

  /* ── En cours ── */
  const progress = getTimelineProgress(order, role);
  const Icon = isPickup ? Store : Truck;
  const driverPhone = order.delivery_person?.phone;
  const showCallDriver = role === 'buyer' && !isPickup && !!driverPhone && order.status === 'in_transit';

  return (
    <Shell tone={TONES.progress}>
      <div className="flex items-start gap-3.5">
        <IconBubble className="relative">
          <span className="absolute inset-0 animate-ping rounded-2xl bg-white/25" />
          <Icon className="relative h-6 w-6" />
        </IconBubble>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-white/80">
            Étape {Math.min(progress.done + 1, progress.total)} sur {progress.total}
          </p>
          <h2 className="text-lg font-bold leading-tight">{progress.label}</h2>
          <p className="mt-1 text-[13px] leading-snug text-white/85">{progress.description}</p>
        </div>
      </div>
      <ProgressBar done={progress.done} total={progress.total} />
      {showCallDriver && (
        <a
          href={`tel:${driverPhone}`}
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-white px-3.5 text-[13px] font-semibold text-gray-900 hover:bg-white/90"
        >
          <Phone className="h-3.5 w-3.5 text-[var(--color-primary)]" /> Appeler le livreur
        </a>
      )}
    </Shell>
  );
};

const Shell: React.FC<{ tone: string; children: React.ReactNode }> = ({ tone, children }) => (
  <motion.section
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className={cn(
      'relative overflow-hidden rounded-3xl bg-gradient-to-br p-5 text-white shadow-lg',
      tone
    )}
    aria-live="polite"
  >
    <div className="pointer-events-none absolute -top-12 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
    <div className="relative">{children}</div>
  </motion.section>
);

const IconBubble: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md', className)}>
    {children}
  </div>
);

/** Barre en segments : une case par étape du parcours. */
const ProgressBar: React.FC<{ done: number; total: number }> = ({ done, total }) => (
  <div className="mt-4 flex gap-1" aria-hidden>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} className={cn('h-1.5 flex-1 rounded-full', i < done ? 'bg-white' : 'bg-white/30')} />
    ))}
  </div>
);
