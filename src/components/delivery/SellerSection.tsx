import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package as PackageIcon, User as UserIcon, Clock, CheckCircle, XCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { OtpPinDisplay } from '../ui/OtpPinDisplay';
import type { Order, RpcResult } from '../../types/order';
import toast from 'react-hot-toast';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const SellerSection: React.FC<{ order: Order; onChanged: () => void }> = ({ order, onChanged }) => {
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [otpRevealed, setOtpRevealed] = useState(false);
  const delivery = Array.isArray(order.delivery_assignment) 
    ? order.delivery_assignment[0] 
    : (order.delivery_assignment as any);

  const showConfirm = ['pending', 'paid'].includes(order.status) && (!delivery || ['pending_seller_confirmation', 'pending'].includes(delivery.status)) && !delivery?.pickup_confirmed_by_seller;
  const showCancel = ['pending', 'paid'].includes(order.status) && (!delivery || ['pending_seller_confirmation', 'pending'].includes(delivery.status));
  const showPickupOtp = delivery?.pickup_confirmed_by_seller && delivery?.pickup_otp && ['awaiting_pickup', 'accepted', 'picked_up'].includes(delivery.status);
  const alreadyPickedUp = delivery?.status === 'picked_up' || delivery?.status === 'in_transit' || delivery?.status === 'delivered';

  const showDisputeBtn = ['paid', 'in_transit', 'delivered'].includes(order.status) 
    && delivery 
    && delivery.status !== 'disputed' 
    && delivery.status !== 'cancelled';

  const handleConfirmAvailability = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('confirm_seller_availability', {
        p_order_id: order.id,
      });
      if (error) throw error;
      const result = data as unknown as RpcResult;
      if (!result.success) throw new Error(result.reason || 'Confirmation refusée');
      
      if (order.delivery_fee) {
        let sellerAddress = 'Adresse du vendeur';
        try {
          const { data: userData } = await supabase.from('users').select('district').eq('id', order.seller_id).single();
          if (userData?.district) {
            sellerAddress = userData.district;
          }
        } catch (e) {
          console.error("Could not fetch seller district", e);
        }

        await supabase
          .from('delivery_assignments')
          .update({ 
            delivery_price: order.delivery_fee,
            pickup_location: sellerAddress,
            dropoff_location: order.delivery_address || 'Adresse de livraison'
          } as any)
          .eq('order_id', order.id);
      }
      
      toast.success('Disponibilité confirmée ! Les livreurs peuvent voir la course.');
      onChanged();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Erreur lors de la confirmation'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelUnavailable = async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.rpc('cancel_order_unavailable', {
        p_order_id: order.id,
      });
      if (error) throw error;
      const result = data as unknown as RpcResult;
      if (!result.success) throw new Error(result.reason || 'Annulation refusée');
      toast.success('Commande annulée.');
      onChanged();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Erreur lors de l'annulation"));
    } finally {
      setCancelling(false);
    }
  };

  const handleReportDispute = async () => {
    const reason = window.prompt("Quel est le problème avec cette livraison ? (ex: Livreur injoignable, Colis refusé, etc.)");
    if (!reason || !reason.trim()) return;

    setLoading(true);
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
      setLoading(false);
    }
  };

  if (order.status === 'delivered' && !showPickupOtp) return null;
  if (order.status === 'cancelled') return null;
  if (!showConfirm && !showCancel && !showPickupOtp) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      <div className="rounded-2xl overflow-hidden border border-amber-200 shadow-sm">
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <PackageIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-[15px] leading-tight">Vous êtes le vendeur</p>
            <p className="text-white/80 text-[12px]">Gérez cette commande</p>
          </div>
        </div>

        <div className="bg-white p-5 space-y-4">
          {order.buyer_name && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <UserIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase font-bold text-gray-400 tracking-wider">Acheteur</p>
                <p className="text-[14px] font-semibold text-gray-900 truncate">{order.buyer_name}</p>
              </div>
            </div>
          )}

          {showConfirm && (
            <div className="space-y-2.5 mb-4">
              <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <Clock className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[13px] text-amber-700 leading-snug">
                  L'acheteur a payé cette commande. Confirmez que le produit est toujours disponible.
                </p>
              </div>
              <button
                onClick={handleConfirmAvailability}
                disabled={loading || cancelling}
                className="w-full h-12 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-md shadow-emerald-200 disabled:opacity-50"
              >
                {loading ? <LoadingSpinner size="sm" /> : <CheckCircle className="w-5 h-5" />}
                Confirmer la disponibilité
              </button>
            </div>
          )}

          {showCancel && (
            <div className="space-y-2.5">
              <button
                onClick={handleCancelUnavailable}
                disabled={loading || cancelling}
                className="w-full h-10 bg-transparent text-red-500 border border-red-200 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all hover:bg-red-50 disabled:opacity-50"
              >
                {cancelling ? <LoadingSpinner size="sm" /> : <XCircle className="w-4 h-4" />}
                Je n'ai plus le produit — annuler
              </button>
            </div>
          )}

          {showDisputeBtn && (
            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleReportDispute}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-white border border-amber-200 hover:border-amber-300 text-amber-700 rounded-xl text-[13px] font-bold active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Signaler un problème / Litige
              </button>
            </div>
          )}

          {showPickupOtp && delivery?.pickup_otp && (
            <div className="space-y-3">
              {alreadyPickedUp ? (
                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[14px] font-bold text-emerald-800">Colis récupéré</p>
                    <p className="text-[12px] text-emerald-600">Le livreur a récupéré le colis avec le code {delivery.pickup_otp}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-bold text-gray-900">Code de ramassage</p>
                      <p className="text-[12px] text-gray-500">
                        {delivery.delivery_person_id
                          ? 'Donnez ce code au livreur quand il arrive'
                          : 'Gardez ce code prêt pour le livreur'}
                      </p>
                    </div>
                    <button
                      onClick={() => setOtpRevealed(!otpRevealed)}
                      className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 active:scale-90 transition-transform"
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
                        <OtpPinDisplay code={delivery.pickup_otp} accentColor="orange" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="hidden"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2 py-3"
                      >
                        {delivery.pickup_otp.split('').map((_: string, i: number) => (
                          <div key={i} className="w-11 h-14 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
