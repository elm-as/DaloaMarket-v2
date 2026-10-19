import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  ArrowRight,
  RefreshCw,
  X,
  Share2,
  Check,
  ShoppingBag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useSupabase } from '../../hooks/useSupabase';
import { checkPaymentStatus } from '../../lib/payment';
import { formatPrice } from '../../lib/utils';

interface PendingEscrow {
  id: string;
  total_amount: number;
  created_at: string;
  order_metadata?: {
    items?: Array<{ title?: string; quantity?: number; price?: number }>;
    checkout_url?: string;
    delivery_mode?: string;
  } | null;
}

interface PendingOrderBannerProps {
  onOrderResolved?: () => void;
  className?: string;
}

export const PendingOrderBanner: React.FC<PendingOrderBannerProps> = ({
  onOrderResolved,
  className = '',
}) => {
  const { user } = useSupabase();
  const navigate = useNavigate();
  const [pendingEscrow, setPendingEscrow] = useState<PendingEscrow | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchPending = useCallback(async () => {
    if (!user || dismissed) return;
    try {
      // Rechercher les transactions créées il y a moins de 2 heures en attente de paiement
      const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('id, total_amount, created_at, order_metadata')
        .eq('buyer_id', user.id)
        .eq('status', 'pending')
        .is('order_id', null)
        .gt('created_at', twoHoursAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setPendingEscrow(data as PendingEscrow);
      } else {
        setPendingEscrow(null);
      }
    } catch {
      // Ignorer silencieusement si la table n'est pas joignable
    }
  }, [user, dismissed]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  if (!pendingEscrow || dismissed) return null;

  const checkoutUrl = pendingEscrow.order_metadata?.checkout_url;
  const itemsCount = pendingEscrow.order_metadata?.items?.length || 1;
  const firstItemTitle = pendingEscrow.order_metadata?.items?.[0]?.title || 'Commande en cours';

  const handleResume = () => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      toast.error('Session de paiement expirée. Veuillez relancer votre commande.');
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await checkPaymentStatus(pendingEscrow.id);
      if (res?.status === 'paid') {
        toast.success('Paiement confirmé ! Redirection en cours...');
        onOrderResolved?.();
        navigate(`/payment/success?transactionId=${pendingEscrow.id}&type=order`);
      } else if (res?.status === 'failure') {
        toast.error('Le paiement a échoué ou a été annulé.');
        setDismissed(true);
      } else {
        toast('Paiement toujours en attente de validation.', { icon: '⏳' });
      }
    } catch {
      toast.error('Impossible de vérifier le statut.');
    } finally {
      setVerifying(false);
    }
  };

  const handleCopyLink = async () => {
    if (!checkoutUrl) return;
    try {
      await navigator.clipboard.writeText(checkoutUrl);
      setCopied(true);
      toast.success('Lien de paiement copié ! Partagez-le pour régler depuis un autre téléphone.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Impossible de copier le lien.');
    }
  };

  const handleDismiss = async () => {
    setDismissed(true);
    try {
      await supabase
        .from('escrow_transactions')
        .update({ status: 'cancelled' })
        .eq('id', pendingEscrow.id);
    } catch {
      // Silencieux
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-r from-amber-50 via-orange-50/50 to-white p-4 shadow-sm transition-all ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Infos Commande */}
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
            <Clock className="h-5 w-5 animate-pulse text-amber-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-900 uppercase">
                Paiement non finalisé
              </span>
              <span className="text-xs font-semibold text-gray-500">
                {formatPrice(pendingEscrow.total_amount)}
              </span>
            </div>
            <p className="mt-1 text-sm font-bold text-gray-900 line-clamp-1">
              {firstItemTitle} {itemsCount > 1 ? `(+${itemsCount - 1} autre article${itemsCount > 2 ? 's' : ''})` : ''}
            </p>
            <p className="text-xs text-gray-600">
              Votre session de paiement Mobile Money est active.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-1 sm:pt-0">
          {checkoutUrl && (
            <button
              onClick={handleCopyLink}
              title="Copier le lien pour payer sur un autre téléphone"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5 text-gray-500" />}
              <span className="hidden sm:inline">{copied ? 'Copié' : 'Partager'}</span>
            </button>
          )}

          <button
            onClick={handleVerify}
            disabled={verifying}
            title="Vérifier si le paiement a déjà été débité"
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100/70 px-3 py-2 text-xs font-bold text-amber-900 hover:bg-amber-200 active:scale-95 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${verifying ? 'animate-spin' : ''}`} />
            <span>Vérifier</span>
          </button>

          <button
            onClick={handleResume}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 py-2 text-xs font-bold text-white shadow-sm hover:opacity-95 active:scale-95 transition"
          >
            <span>Payer maintenant</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={handleDismiss}
            title="Abandonner cette commande"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
