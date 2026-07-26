import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, User as UserIcon, Clock, CheckCircle, Eye, EyeOff, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn, formatDate } from '../../lib/utils';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { OtpPinDisplay } from '../ui/OtpPinDisplay';
import type { Order } from '../../types/order';
import toast from 'react-hot-toast';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const BuyerSection: React.FC<{ order: Order; onChanged: () => void }> = ({ order, onChanged }) => {
  const [otpRevealed, setOtpRevealed] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const delivery = Array.isArray(order.delivery_assignment) 
    ? order.delivery_assignment[0] 
    : (order.delivery_assignment as any);
  const otp = delivery?.delivery_otp;
  const alreadyConfirmed = !!delivery?.buyer_confirmed_at;

  const showDeliveryOtp = delivery && ['awaiting_pickup', 'accepted', 'picked_up', 'in_transit'].includes(delivery.status) && otp;

  // Annulation possible si la commande est payée et que le livreur n'a pas encore récupéré
  const canCancel = order.status === 'paid'
    && delivery
    && ['pending_seller_confirmation', 'awaiting_pickup', 'accepted'].includes(delivery.status);

  const showDisputeBtn = ['paid', 'in_transit', 'delivered'].includes(order.status) 
    && delivery 
    && delivery.status !== 'disputed' 
    && delivery.status !== 'cancelled';

  const handleCancelOrder = async () => {
    setCancelLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('cancel_order_buyer', {
        p_order_id: order.id,
        p_user_id: (order as any).buyer_id
      });
      if (error) throw error;
      const result = data as any as { success: boolean; reason?: string };
      if (!result.success) {
        toast.error(result.reason || 'Annulation refusée');
      } else {
        toast.success('Commande annulée. Remboursement en cours (hors frais de service).');
        onChanged();
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur lors de l\'annulation'));
    } finally {
      setCancelLoading(false);
      setShowCancelConfirm(false);
    }
  };

  const handleReportDispute = async () => {
    const reason = window.prompt("Quel est le problème avec votre commande ? (ex: Produit non conforme, Livreur impoli, Retard important, etc.)");
    if (!reason || !reason.trim()) return;

    setConfirmLoading(true);
    try {
      const { data, error } = await supabase.rpc('report_delivery_dispute', {
        p_assignment_id: delivery.id,
        p_reason: reason.trim()
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.reason || 'Erreur inconnue');

      toast.success("Litige signalé avec succès. L'administration va l'étudier.");
      onChanged();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du signalement du litige");
    } finally {
      setConfirmLoading(false);
    }
  };

  if (order.status === 'cancelled') return null;
  if (!showDeliveryOtp && order.status !== 'delivered' && !canCancel) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      <div className="rounded-2xl overflow-hidden border border-blue-200 shadow-sm">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 px-5 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-[15px] leading-tight">Votre commande</p>
            <p className="text-white/80 text-[12px]">
              {order.status === 'delivered' ? 'Commande livrée' : 'Suivez votre livraison'}
            </p>
          </div>
        </div>

        <div className="bg-white p-5 space-y-4">
          {order.seller_name && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">Vendeur</p>
                <p className="text-[14px] font-semibold text-gray-900 truncate">{order.seller_name}</p>
              </div>
            </div>
          )}

          {(order.status === 'in_transit' || (delivery && ['picked_up', 'in_transit'].includes(delivery.status))) && (
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm">
              <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
              </div>
              <div>
                <p className="text-[12px] font-bold text-blue-800 uppercase tracking-wider mb-0.5">Statut de la livraison</p>
                <p className="text-[14px] font-semibold text-gray-900 leading-tight">
                  {delivery?.status === 'picked_up' || delivery?.status === 'in_transit'
                    ? 'Le livreur est en route vers vous'
                    : delivery?.status === 'accepted'
                      ? 'Le livreur se dirige vers le vendeur'
                      : 'Livraison en cours'}
                </p>
              </div>
            </div>
          )}

          {showDeliveryOtp && otp && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] font-bold text-gray-900">Code de livraison</p>
                  <p className="text-[12px] text-gray-500">Donnez ce code au livreur à l'arrivée</p>
                </div>
                <button
                  onClick={() => setOtpRevealed(!otpRevealed)}
                  className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 active:scale-90 transition-transform"
                >
                  {otpRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <AnimatePresence mode="wait">
                {otpRevealed ? (
                  <motion.div
                    key="revealed"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <OtpPinDisplay code={otp} accentColor="emerald" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2 py-3"
                  >
                    {otp.split('').map((_: string, i: number) => (
                      <div key={i} className="w-11 h-14 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}



          {canCancel && (
            <div className="pt-2 border-t border-gray-100">
              {!showCancelConfirm ? (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full py-3 px-4 bg-white border-2 border-red-200 hover:border-red-300 text-red-600 rounded-xl text-[13px] font-bold active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Annuler la commande
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-[13px] text-red-700 font-medium text-center">
                    Confirmer l'annulation ? Le remboursement sera traité (hors frais de service).
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-[13px] font-semibold active:scale-[0.97] transition-transform"
                    >
                      Retour
                    </button>
                    <button
                      onClick={handleCancelOrder}
                      disabled={cancelLoading}
                      className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-[13px] font-semibold active:scale-[0.97] transition-transform disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {cancelLoading ? (
                        <><LoadingSpinner size="sm" /> Annulation...</>
                      ) : (
                        'Oui, annuler'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {showDisputeBtn && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleReportDispute}
                disabled={confirmLoading}
                className="w-full py-2.5 px-4 bg-white border border-amber-200 hover:border-amber-300 text-amber-600 rounded-xl text-[13px] font-bold active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Signaler un problème / Litige
              </button>
            </div>
          )}

          {order.status === 'delivered' && (
            <div className="flex items-center gap-3 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[14px] font-bold text-emerald-800">Commande livrée</p>
                {delivery?.delivered_at && (
                  <p className="text-[12px] text-emerald-600">
                    Livrée le {formatDate(delivery.delivered_at)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
