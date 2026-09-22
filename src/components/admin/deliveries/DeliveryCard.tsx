import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, MapPin, User, ExternalLink, CheckCircle2, AlertTriangle,
  RefreshCw, WalletCards, ShieldCheck, ArrowRight, Phone
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn, formatDate, formatPrice } from '../../../lib/utils';
import { supabase } from '../../../lib/supabase';
import type { AdminDeliveryItem } from './types';

interface DeliveryCardProps {
  item: AdminDeliveryItem;
  photoUrl?: string;
  isProcessing: boolean;
  onResolveDispute: (assignmentId: string, action: 'deliver' | 'cancel' | 'refund_complete' | 'refund_partial') => void;
  onRefresh: () => void;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({
  item,
  photoUrl,
  isProcessing,
  onResolveDispute,
  onRefresh,
}) => {
  const [triggeringPayout, setTriggeringPayout] = useState(false);

  const buyer = item.order?.buyer;
  const seller = item.order?.seller;
  const driver = item.delivery_person;
  const isDisputed = item.status === 'disputed';
  const isDelivered = item.status === 'delivered';

  const deliveryFee = item.delivery_price || item.order?.delivery_fee || 0;
  const platformFee = Math.ceil(deliveryFee * 0.10);
  const driverNetFee = Math.max(0, deliveryFee - platformFee);

  const payout = item.driver_payout;
  const isPayoutPaid = payout?.status === 'paid' || payout?.status === 'completed';
  const isPayoutPending = payout?.status === 'pending' || payout?.status === 'processing';
  const isPayoutFailed = payout?.status === 'failed';

  const handleManualTriggerDriverPayout = async () => {
    if (!driver?.id) {
      toast.error('Aucun livreur assigné à cette course');
      return;
    }
    setTriggeringPayout(true);
    try {
      // 1. Tenter l'appel RPC sécurisé
      let createdPayoutId: string | null = null;
      try {
        const { data: rpcData, error: rpcErr } = await (supabase as any).rpc('admin_trigger_driver_payout', {
          p_assignment_id: item.id,
        });
        if (!rpcErr && rpcData?.success) {
          createdPayoutId = rpcData.payout_id;
        }
      } catch (e) {
        console.warn('RPC non disponible, passage au repli sécurisé client:', e);
      }

      // 2. Si non créé par la RPC, créer l'enregistrement directement
      if (!createdPayoutId) {
        const targetPhone = driver.payout_number || driver.phone;
        if (!targetPhone) {
          throw new Error('Numéro de téléphone du livreur introuvable.');
        }

        let network = driver.payout_network || 'wave-ci';
        const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('07') || cleanPhone.startsWith('22507')) {
          network = 'orange-money-ci';
        }

        const { data: inserted, error: insertErr } = await (supabase as any)
          .from('payouts')
          .insert({
            user_id: driver.user_id || driver.id,
            amount: driverNetFee,
            recipient_phone: targetPhone,
            withdraw_mode: network,
            type: 'delivery',
            status: 'pending',
            scheduled_for: new Date().toISOString(),
            idempotency_key: `payout_${item.order_id || item.id}_delivery_manual`,
            delivery_assignment_id: item.id,
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        createdPayoutId = inserted?.id;
      }

      toast.success('Versement livreur généré ! Déclenchement de la synchro MoneyFusion...');

      // 3. Déclencher immédiatement la synchro Railway
      try {
        const apiUrl = import.meta.env.VITE_PAYMENT_API_URL || 'https://api.daloamarket.com';
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (token) {
          await fetch(`${apiUrl}/process-payouts?force=true`, {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch (syncErr) {
        console.warn('Erreur appel Railway sync:', syncErr);
      }

      onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du déclenchement du versement livreur');
    } finally {
      setTriggeringPayout(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-white border rounded-2xl p-5 shadow-sm space-y-4 transition-all relative overflow-hidden',
        isDisputed ? 'border-red-300 shadow-red-50/50 shadow-md ring-1 ring-red-200' : 'border-slate-200'
      )}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">ID Course</span>
          <h3 className="font-bold text-slate-900 text-sm font-mono">#{item.id.slice(0, 8)}</h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(item.created_at)}</span>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={cn(
            'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
            item.status === 'delivered'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : isDisputed
              ? 'bg-red-50 text-red-700 border border-red-200'
              : item.status === 'cancelled'
              ? 'bg-slate-100 text-slate-700'
              : 'bg-amber-50 text-amber-700 border border-amber-200'
          )}
        >
          {item.status === 'disputed' ? 'LITIGE' : item.status}
        </span>
      </div>

      {/* BLOC DE SUIVI FINANCIER & RÉMUNÉRATION LIVREUR */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <WalletCards className="w-4 h-4 text-amber-500" />
            <span>Flux Financier Livreur</span>
          </div>
          <span className="text-[11px] font-mono tabular-nums text-slate-500">
            Course : {formatPrice(deliveryFee)}
          </span>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white p-2 rounded-lg border border-slate-200/60">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Com. DaloaMarket (10%)</span>
            <span className="font-mono tabular-nums font-bold text-slate-700">{formatPrice(platformFee)}</span>
          </div>
          <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-200/60">
            <span className="text-[10px] text-emerald-700 font-bold block uppercase">Net Dû Livreur (90%)</span>
            <span className="font-mono tabular-nums font-black text-emerald-800 text-sm">
              {formatPrice(driverNetFee)}
            </span>
          </div>
        </div>

        {/* Payout Status Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-bold text-slate-400">Versement :</span>
            {isPayoutPaid ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Payé via {payout?.withdraw_mode?.replace('-ci', '') || 'Mobile Money'}
              </span>
            ) : isPayoutPending ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                <Clock className="w-3 h-3 text-amber-600" />
                En attente d'envoi
              </span>
            ) : isPayoutFailed ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-300">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                Échec versement
              </span>
            ) : isDelivered ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                Non généré
              </span>
            ) : (
              <span className="text-[11px] text-slate-500 italic">En attente de livraison</span>
            )}
          </div>

          {/* Action to trigger or retry driver payout if needed */}
          {isDelivered && !isPayoutPaid && (
            <button
              onClick={handleManualTriggerDriverPayout}
              disabled={triggeringPayout}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[11px] transition-all flex items-center justify-center gap-1 shadow-xs active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3 h-3', triggeringPayout && 'animate-spin')} />
              <span>{triggeringPayout ? 'Génération...' : isPayoutFailed ? 'Réessayer virement' : 'Débloquer versement'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Actors Block */}
      <div className="bg-slate-50/70 rounded-xl p-3 space-y-1.5 text-xs border border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-semibold uppercase text-[9px]">Acheteur</span>
          <span className="font-bold text-slate-800">{buyer?.full_name || 'Inconnu'} {buyer?.phone && `(${buyer.phone})`}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-semibold uppercase text-[9px]">Vendeur</span>
          <span className="font-bold text-slate-800">{seller?.full_name || 'Inconnu'} {seller?.phone && `(${seller.phone})`}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400 font-semibold uppercase text-[9px]">Livreur</span>
          <span className="font-bold text-amber-800">{driver?.name || 'Non assigné'} {driver?.phone && `(${driver.phone})`}</span>
        </div>
      </div>

      {/* Trajectory */}
      <div className="space-y-1 text-xs text-slate-700">
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
          <span><strong className="text-slate-500">De :</strong> {item.pickup_location || 'Adresse du vendeur'}</span>
        </div>
        <div className="flex items-start gap-2">
          <MapPin className="w-3.5 h-3.5 text-indigo-500 mt-0.5" />
          <span><strong className="text-slate-500">À :</strong> {item.dropoff_location || 'Adresse de livraison'}</span>
        </div>
      </div>

      {/* Delivery Photo */}
      {photoUrl && (
        <div className="space-y-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Preuve de livraison</p>
          <div className="relative rounded-xl overflow-hidden border border-slate-200 group">
            <img
              src={photoUrl}
              alt="Preuve livraison"
              className="w-full h-32 object-cover cursor-pointer hover:scale-102 transition-transform duration-300"
              onClick={() => window.open(photoUrl, '_blank')}
            />
            <div className="absolute bottom-2 right-2 bg-black/60 text-white p-1 rounded-md text-[10px] flex items-center gap-1">
              <ExternalLink className="w-3 h-3" />
              <span>Agrandir</span>
            </div>
          </div>
        </div>
      )}

      {/* Dispute Actions */}
      {isDisputed && (
        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-wider">Décision d'Arbitrage</p>
          <div className="flex gap-2">
            <button
              onClick={() => onResolveDispute(item.id, 'refund_partial')}
              disabled={isProcessing}
              className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
            >
              Remb. Partiel (Livreur Payé)
            </button>
            <button
              onClick={() => onResolveDispute(item.id, 'refund_complete')}
              disabled={isProcessing}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50"
            >
              Remb. 100%
            </button>
          </div>
          <button
            onClick={() => onResolveDispute(item.id, 'deliver')}
            disabled={isProcessing}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Forcer Livraison (Payer Vendeur & Livreur)
          </button>
        </div>
      )}
    </motion.div>
  );
};
