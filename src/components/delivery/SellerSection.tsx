import React, { useState } from 'react';
import { triggerPayoutProcessing } from '../../lib/payment';
import { motion } from 'framer-motion';
import { Package as PackageIcon, User as UserIcon, Clock, CheckCircle, XCircle, Eye, EyeOff, AlertTriangle, Store, Phone } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { OtpPinDisplay } from '../ui/OtpPinDisplay';
import { CodRefusalSellerBox } from './CodRefusalSellerBox';
import type { Order, RpcResult } from '../../types/order';
import toast from 'react-hot-toast';
import { friendlyError } from '../../lib/messages';

const SELLER_RPC_MESSAGES: Record<string, string> = {
  order_not_found: 'Commande introuvable ou non rattachée à votre boutique.',
  invalid_status: "Cette commande n'est plus dans un état permettant cette action.",
  already_picked_up: 'Le coursier a déjà récupéré le colis : annulation impossible.',
  not_cod_delivery: 'Cette action ne concerne que les livraisons payées à la livraison.',
  not_authenticated: 'Session expirée. Reconnectez-vous.',
};

export const SellerSection: React.FC<{ order: Order; onChanged: () => void }> = ({ order, onChanged }) => {
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [otpRevealed, setOtpRevealed] = useState(false);
  const [showHandoverConfirm, setShowHandoverConfirm] = useState(false);
  const [enteredBuyerOtp, setEnteredBuyerOtp] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');

  const isPickup = order.delivery_mode === 'pickup' || order.delivery_mode === 'pickup_point';
  const isCashAtShop = order.payment_method === 'cash_at_shop';
  const isCod = order.payment_method === 'cod';
  const delivery = Array.isArray(order.delivery_assignment) ? order.delivery_assignment[0] : (order.delivery_assignment as any);

  const isPickupOnlinePaid = isPickup && !isCashAtShop && ['paid', 'confirmed'].includes(order.status);
  const isCourierEscrow = !isPickup && !isCod;
  const alreadyPickedUp = ['picked_up', 'in_transit', 'delivered', 'auto_released'].includes(delivery?.status ?? '');

  const showConfirm = isCourierEscrow && ['pending', 'paid'].includes(order.status) && (!delivery || ['pending_seller_confirmation', 'pending'].includes(delivery.status)) && !delivery?.pickup_confirmed_by_seller;
  const showCancel = ['pending', 'paid'].includes(order.status) && !alreadyPickedUp;
  const showPickupOtp = isCourierEscrow && delivery?.pickup_confirmed_by_seller && delivery?.pickup_otp && ['awaiting_pickup', 'accepted', 'picked_up'].includes(delivery.status);
  const showDisputeBtn = !isCashAtShop && !['cancelled', 'completed', 'disputed'].includes(order.status) && delivery?.status !== 'disputed' && delivery?.status !== 'cancelled';

  const handleVerifyShopOtp = async () => {
    if (!enteredBuyerOtp || enteredBuyerOtp.trim().length < 4) {
      toast.error('Veuillez renseigner le code communiqué par le client.');
      return;
    }
    setLoading(true);
    try {
      const { data, error: rpcError } = await (supabase as any).rpc('complete_pickup_order', {
        p_order_id: order.id,
        p_entered_otp: enteredBuyerOtp.trim(),
      });
      if (rpcError) throw rpcError;
      if (data && data.success === false) {
        if (data.reason === 'invalid_otp') toast.error(`Code incorrect (tentative ${data.attempts ?? '?'}/${data.max_attempts ?? 5}).`);
        else if (data.reason === 'locked') toast.error('Trop de tentatives : la commande est passée en litige.');
        else if (data.reason === 'unauthorized') toast.error("Vous n'êtes pas autorisé à valider cette commande.");
        else toast.error(SELLER_RPC_MESSAGES[data.reason] || data.reason || 'Validation refusée.');
        return;
      }
      triggerPayoutProcessing();
      toast.success('Retrait validé ! Votre virement Mobile Money est programmé.');
      setEnteredBuyerOtp('');
      onChanged();
    } catch (err: unknown) {
      toast.error(friendlyError(err, 'Erreur lors de la validation'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDirectHandover = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('complete_pickup_order', { p_order_id: order.id });
      if (error) throw error;
      if (data && data.success === false) {
        toast.error(SELLER_RPC_MESSAGES[data.reason] || data.reason || 'Validation refusée.');
        return;
      }
      triggerPayoutProcessing();
      toast.success(isCashAtShop ? 'Paiement reçu et article remis avec succès !' : 'Livraison et encaissement validés !');
      setShowHandoverConfirm(false);
      onChanged();
    } catch (err: unknown) {
      toast.error(friendlyError(err, 'Erreur lors de la validation'));
    } finally {
      setLoading(false);
    }
  };

  const handleDispatchCodOrder = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('dispatch_cod_order', { p_order_id: order.id });
      if (error) throw error;
      const result = data as RpcResult;
      if (!result?.success) throw new Error(SELLER_RPC_MESSAGES[result?.reason || ''] || 'Expédition refusée');
      toast.success('Commande marquée comme en cours de livraison !');
      onChanged();
    } catch (err: unknown) {
      toast.error(friendlyError(err, 'Erreur lors de la mise à jour'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAvailability = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('confirm_seller_availability', { p_order_id: order.id });
      if (error) throw error;
      const result = data as unknown as RpcResult;
      if (!result.success) throw new Error(result.reason || 'Confirmation refusée');
      if (order.delivery_fee) {
        let sellerAddress = 'Adresse du vendeur';
        try {
          const { data: userData } = await supabase.from('users').select('district').eq('id', order.seller_id).single();
          if (userData?.district) sellerAddress = userData.district;
        } catch (_) { /* ignore */ }
        await supabase.from('delivery_assignments').update({
          delivery_price: order.delivery_fee,
          pickup_location: sellerAddress,
          dropoff_location: order.delivery_address || 'Adresse de livraison',
        } as any).eq('order_id', order.id);
      }
      toast.success(
        order.payment_method === 'online'
          ? 'Disponibilité confirmée ! Les livreurs peuvent voir la course.'
          : order.delivery_mode === 'delivery'
          ? "Disponibilité confirmée ! Livrez vous-même ou confiez la course à l'un de vos livreurs affiliés."
          : "Disponibilité confirmée ! L'acheteur vient récupérer l'article et vous paie sur place."
      );
      onChanged();
    } catch (err: unknown) {
      toast.error(friendlyError(err, 'Erreur lors de la confirmation'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelUnavailable = async () => {
    setCancelling(true);
    try {
      const { data, error } = await supabase.rpc('cancel_order_unavailable', { p_order_id: order.id });
      if (error) throw error;
      const result = data as unknown as RpcResult & { refunded?: boolean };
      if (!result.success) throw new Error(SELLER_RPC_MESSAGES[result.reason || ''] || 'Annulation refusée');
      if (result.refunded || (!isCashAtShop && !isCod)) triggerPayoutProcessing();
      toast.success("Commande annulée. L'acheteur a été prévenu.");
      setShowCancelConfirm(false);
      onChanged();
    } catch (err: unknown) {
      toast.error(friendlyError(err, "Erreur lors de l'annulation"));
    } finally {
      setCancelling(false);
    }
  };

  const handleReportDispute = async () => {
    if (!disputeReason.trim()) {
      toast.error('Veuillez décrire le problème rencontré.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('report_order_dispute', {
        p_order_id: order.id,
        p_reason: disputeReason.trim(),
      });
      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.reason || 'Erreur inconnue');
      toast.success("Litige signalé avec succès. L'administration va l'étudier.");
      setShowDisputeForm(false);
      setDisputeReason('');
      onChanged();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du signalement du litige');
    } finally {
      setLoading(false);
    }
  };

  if ((order.status === 'delivered' || order.status === 'completed') && !showPickupOtp) return null;
  if (order.status === 'cancelled') return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3.5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
              {isPickup ? <Store className="w-4 h-4" /> : <PackageIcon className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900 leading-tight">Espace Vendeur</p>
              <p className="text-[11px] text-gray-400">
                {isPickup ? 'Retrait direct sur place' : isCod ? 'Livraison directe (Paiement à la livraison)' : 'Expédition avec coursier'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-orange-50 text-orange-700">
            {isCashAtShop ? 'Paiement espèces' : isPickup ? 'Payé en ligne' : isCod ? 'Paiement à la livraison' : 'Séquestre'}
          </span>
        </div>

        {order.buyer_name && (
          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white shadow-2xs flex items-center justify-center text-gray-600 flex-shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-gray-400">Acheteur</p>
                <p className="text-[13px] font-bold text-gray-900 truncate">{order.buyer_name}</p>
              </div>
            </div>
            {order.buyer_phone && (
              <a href={`tel:${order.buyer_phone}`} className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center active:scale-95 transition-all shadow-sm flex-shrink-0" title="Appeler l'acheteur">
                <Phone className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {isPickupOnlinePaid && (
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2.5 p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-[12px] text-blue-900 leading-snug">
              <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>L'acheteur a déjà réglé la commande en ligne (fonds sécurisés en séquestre). Demandez-lui son <strong>Code secret de retrait</strong> pour valider la remise et débloquer votre paiement.</div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Code secret du client (6 chiffres)</label>
              <div className="flex gap-2">
                <input type="text" inputMode="numeric" maxLength={6} placeholder="Ex: 482910" value={enteredBuyerOtp} onChange={(e) => setEnteredBuyerOtp(e.target.value.replace(/\D/g, ''))} className="flex-1 h-11 px-3.5 text-center text-[16px] font-mono font-bold tracking-widest bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-hidden transition-all" />
                <button onClick={handleVerifyShopOtp} disabled={loading || enteredBuyerOtp.trim().length < 4} className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-sm disabled:opacity-40">
                  {loading ? <LoadingSpinner size="sm" /> : <CheckCircle className="w-4 h-4" />} Valider & Libérer
                </button>
              </div>
            </div>
          </div>
        )}

        {isPickup && isCashAtShop && ['pending', 'paid'].includes(order.status) && (
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2.5 p-3 bg-amber-50/70 rounded-xl border border-amber-100 text-[12px] text-amber-900 leading-snug">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>Réservation active. Lorsque le client se présente, encaissez <strong>{formatPrice(order.total_amount)}</strong> en espèces et validez la remise.</div>
            </div>
            {!showHandoverConfirm ? (
              <button onClick={() => setShowHandoverConfirm(true)} disabled={loading || cancelling} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm disabled:opacity-50">
                <CheckCircle className="w-4 h-4" /> Confirmer remise & encaissement ({formatPrice(order.total_amount)})
              </button>
            ) : (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <p className="text-[12px] font-bold text-emerald-900 text-center">Confirmez-vous avoir reçu {formatPrice(order.total_amount)} en espèces et remis le produit ?</p>
                <div className="flex gap-2">
                  <button onClick={handleConfirmDirectHandover} disabled={loading} className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[12px] flex items-center justify-center gap-1.5">{loading ? <LoadingSpinner size="sm" /> : <CheckCircle className="w-3.5 h-3.5" />} Oui, confirmer</button>
                  <button onClick={() => setShowHandoverConfirm(false)} disabled={loading} className="flex-1 h-9 bg-white text-gray-700 border border-gray-200 rounded-lg font-semibold text-[12px]">Annuler</button>
                </div>
              </div>
            )}
          </div>
        )}

        {!isPickup && isCod && ['pending', 'in_transit'].includes(order.status) && (
          <div className="space-y-3 pt-1">
            <div className="flex items-start gap-2.5 p-3 bg-amber-50/70 rounded-xl border border-amber-100 text-[12px] text-amber-900 leading-snug">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>Paiement à la livraison. Préparez le colis pour {order.delivery_address || 'Daloa'} et encaissez <strong>{formatPrice(order.total_amount)}</strong> à la livraison.</div>
            </div>
            {order.status === 'pending' ? (
              <button onClick={handleDispatchCodOrder} disabled={loading || cancelling} className="w-full h-11 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2">
                {loading ? <LoadingSpinner size="sm" /> : <PackageIcon className="w-4 h-4" />} Marquer le colis comme expédié
              </button>
            ) : !showHandoverConfirm ? (
              <button onClick={() => setShowHandoverConfirm(true)} disabled={loading || cancelling} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" /> Confirmer la livraison & encaissement ({formatPrice(order.total_amount)})
              </button>
            ) : (
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <p className="text-[12px] font-bold text-emerald-900 text-center">Confirmez-vous la bonne livraison et l'encaissement de {formatPrice(order.total_amount)} ?</p>
                <div className="flex gap-2">
                  <button onClick={handleConfirmDirectHandover} disabled={loading} className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[12px] flex items-center justify-center gap-1.5">{loading ? <LoadingSpinner size="sm" /> : <CheckCircle className="w-3.5 h-3.5" />} Oui, validé</button>
                  <button onClick={() => setShowHandoverConfirm(false)} disabled={loading} className="flex-1 h-9 bg-white text-gray-700 border border-gray-200 rounded-lg font-semibold text-[12px]">Annuler</button>
                </div>
              </div>
            )}
            <CodRefusalSellerBox orderId={order.id} buyerId={order.buyer_id} onRefusalReported={onChanged} />
          </div>
        )}

        {isCourierEscrow && showConfirm && (
          <div className="space-y-2.5 pt-1">
            <div className="flex items-start gap-2 p-3 bg-blue-50/70 rounded-xl border border-blue-100">
              <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-[12px] text-blue-900 leading-snug">Commande payée en ligne (séquestre sécurisé). Confirmez que le colis est prêt pour qu'un coursier soit assigné.</p>
            </div>
            <button onClick={handleConfirmAvailability} disabled={loading || cancelling} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[13px] flex items-center justify-center gap-2">
              {loading ? <LoadingSpinner size="sm" /> : <CheckCircle className="w-4 h-4" />} Confirmer la disponibilité pour coursier
            </button>
          </div>
        )}

        {showCancel && (
          <div className="pt-1">
            {!showCancelConfirm ? (
              <button onClick={() => setShowCancelConfirm(true)} disabled={loading || cancelling} className="w-full h-9 text-gray-400 hover:text-red-600 font-semibold text-[11px] flex items-center justify-center gap-1.5 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50">
                <XCircle className="w-3.5 h-3.5" /> Je n'ai plus le produit (annuler)
              </button>
            ) : (
              <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-2">
                <p className="text-xs font-bold text-red-900">Confirmez-vous ne plus avoir cet article ? L'acheteur sera prévenu{!isCashAtShop && !isCod ? ' et intégralement remboursé' : ''}.</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowCancelConfirm(false)} disabled={cancelling} className="flex-1 h-8 bg-white text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold">Retour</button>
                  <button onClick={handleCancelUnavailable} disabled={cancelling} className="flex-1 h-8 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1">{cancelling ? <LoadingSpinner size="sm" /> : 'Confirmer l’annulation'}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {showDisputeBtn && (
          <div className="pt-2 border-t border-gray-100">
            {!showDisputeForm ? (
              <button onClick={() => setShowDisputeForm(true)} disabled={loading} className="w-full py-2 px-3 bg-gray-50 hover:bg-amber-50 text-amber-700 border border-gray-200 rounded-lg text-[12px] font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Signaler un litige
              </button>
            ) : (
              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2.5">
                <p className="text-[12px] font-bold text-amber-900">Décrivez le problème rencontré</p>
                <textarea rows={3} value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Ex : Livreur injoignable, problème lors de la remise..." className="w-full rounded-lg border border-amber-200 bg-white p-2.5 text-xs text-gray-900 focus:border-amber-500 outline-hidden" />
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setShowDisputeForm(false); setDisputeReason(''); }} disabled={loading} className="flex-1 h-9 bg-white text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold">Annuler</button>
                  <button type="button" onClick={handleReportDispute} disabled={loading || !disputeReason.trim()} className="flex-1 h-9 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1.5">{loading ? <LoadingSpinner size="sm" /> : 'Envoyer au support'}</button>
                </div>
              </div>
            )}
          </div>
        )}

        {showPickupOtp && delivery?.pickup_otp && (
          <div className="space-y-2.5 pt-2 border-t border-gray-100">
            {alreadyPickedUp ? (
              <div className="flex items-center gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-[13px] font-bold text-emerald-900">Colis récupéré</p>
                  <p className="text-[11px] text-emerald-700">Code utilisé : {delivery.pickup_otp}</p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-bold text-gray-900">Code de ramassage</p>
                    <p className="text-[11px] text-gray-500">À donner au coursier à son arrivée</p>
                  </div>
                  <button onClick={() => setOtpRevealed(!otpRevealed)} className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-700">
                    {otpRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {otpRevealed ? (
                  <OtpPinDisplay code={delivery.pickup_otp} accentColor="amber" />
                ) : (
                  <div className="flex items-center justify-center gap-2 py-2">
                    {delivery.pickup_otp.split('').map((_: string, i: number) => (
                      <div key={i} className="w-9 h-11 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
