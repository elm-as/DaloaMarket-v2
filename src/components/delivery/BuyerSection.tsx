import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, User as UserIcon, Clock, CheckCircle, Eye, EyeOff,
  XCircle, AlertTriangle, Store, ShieldAlert, MessageCircle, HelpCircle,
  Truck, CreditCard, CheckCircle2, RotateCcw
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useSupabase } from '../../hooks/useSupabase';
import { useSystemSettings } from '../../hooks/useSystemSettings';
import { cn, formatDate, formatPrice } from '../../lib/utils';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { OtpPinDisplay } from '../ui/OtpPinDisplay';
import type { Order } from '../../types/order';
import toast from 'react-hot-toast';
import { friendlyError } from '../../lib/messages';

export const BuyerSection: React.FC<{ order: Order; onChanged: () => void }> = ({ order, onChanged }) => {
  const { userProfile } = useSupabase();
  const { cancellationSettings } = useSystemSettings();

  const [otpRevealed, setOtpRevealed] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancellationBlockedMessage, setCancellationBlockedMessage] = useState<string | null>(null);

  const delivery = Array.isArray(order.delivery_assignment) 
    ? order.delivery_assignment[0] 
    : (order.delivery_assignment as any);
  const otp = delivery?.delivery_otp;

  const isPickup = order.delivery_mode === 'pickup' || order.delivery_mode === 'pickup_point';
  const isCashAtShop = order.payment_method === 'cash_at_shop';
  const isCod = order.payment_method === 'cod';
  const isOnlinePaid = !isCashAtShop && !isCod;

  // Scénario 3 : Retrait boutique + Payé en ligne (Séquestre) -> L'acheteur a un OTP de retrait
  const isPickupOnlinePaid = isPickup && isOnlinePaid && ['paid', 'confirmed'].includes(order.status);
  // Scénario 1 : Livraison coursier + Payé en ligne -> L'acheteur a un OTP de livraison
  const isCourierOnlinePaid = !isPickup && isOnlinePaid && ['paid', 'confirmed', 'in_transit'].includes(order.status);

  // Scénario 2 (COD) et Scénario 4 (Cash boutique) n'ont PAS d'OTP
  const showDeliveryOtp = (isPickupOnlinePaid || isCourierOnlinePaid) && !!otp;

  // Statut de la livraison
  const isDriverPickedUp = delivery && ['picked_up', 'in_transit', 'delivered', 'auto_released'].includes(delivery.status);
  const isDeliveryInProgressBeforePickup = delivery && ['pending_seller_confirmation', 'awaiting_pickup', 'accepted'].includes(delivery.status);

  // Annulation possible côté acheteur :
  // 1. Livraison coursier : tant que la commande est paid/pending ET que le livreur n'a PAS encore récupéré le colis
  // 2. Retrait boutique / Cash boutique : tant que la commande est paid/pending et non terminée
  const canCancel = !['cancelled', 'delivered', 'completed', 'disputed'].includes(order.status) && (
    (isPickup && ['paid', 'pending'].includes(order.status)) ||
    (!isPickup && (isDeliveryInProgressBeforePickup || (!delivery && ['paid', 'pending'].includes(order.status))))
  );

  // Vérifier si l'utilisateur approche ou a atteint la limite d'annulations payées
  const userConsecutiveCancellations = (userProfile as any)?.consecutive_cancellations || 0;
  const isLimitReached = isOnlinePaid && cancellationSettings?.enabled && userConsecutiveCancellations >= (cancellationSettings?.max_consecutive_cancellations || 3);

  const showDisputeBtn = !isPickup && !isCod && ['paid', 'in_transit', 'delivered'].includes(order.status) 
    && delivery 
    && delivery.status !== 'disputed' 
    && delivery.status !== 'cancelled';

  const handleCancelOrder = async () => {
    setCancelLoading(true);
    setCancellationBlockedMessage(null);
    try {
      const { data, error } = await (supabase as any).rpc('cancel_order_buyer', {
        p_order_id: order.id,
      });

      if (error) throw error;
      const result = data as { success: boolean; reason?: string; message?: string; is_online_paid?: boolean };

      if (!result.success) {
        if (result.reason === 'cancellation_limit_reached') {
          setCancellationBlockedMessage(result.message || 'Limite d\'annulations consécutives atteinte.');
          toast.error(result.message || 'Limite d\'annulations atteinte.');
        } else if (result.reason === 'already_picked_up') {
          toast.error('Le coursier a déjà récupéré votre colis.');
        } else {
          toast.error(result.message || result.reason || 'Annulation refusée');
        }
      } else {
        toast.success(result.message || (isOnlinePaid ? 'Commande annulée. Remboursement en cours.' : 'Réservation annulée.'));
        setShowCancelConfirm(false);
        onChanged();
      }
    } catch (err: unknown) {
      toast.error(friendlyError(err, 'Erreur lors de l\'annulation de la commande'));
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReportDispute = async () => {
    const reason = window.prompt("Quel est le problème avec votre commande ? (ex: Produit non conforme, Livreur injoignable, Retard important, etc.)");
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
  if (!showDeliveryOtp && order.status !== 'delivered' && !canCancel && !isPickup && !isCod && !isDriverPickedUp) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3.5">
        {/* Header simple & élégant */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center",
              isCashAtShop ? "bg-amber-50 text-amber-600" : isCod ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
            )}>
              {isPickup ? <Store className="w-4 h-4" /> : isCod ? <Truck className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900 leading-tight">
                {isCashAtShop ? 'Réservation Boutique' : isPickup ? 'Retrait Boutique (Payé)' : isCod ? 'Livraison avec Paiement Réception' : 'Commande Sécurisée'}
              </p>
              <p className="text-[11px] text-gray-400">
                {order.status === 'delivered' || order.status === 'completed'
                  ? 'Article reçu'
                  : isCashAtShop
                  ? 'Paiement en espèces sur place'
                  : isPickup
                  ? 'Retrait direct sur place'
                  : isCod
                  ? 'Paiement à la livraison'
                  : 'Livraison à domicile'}
              </p>
            </div>
          </div>
          <span className={cn(
            "text-[11px] font-bold px-2.5 py-1 rounded-full border",
            isCashAtShop
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : isCod
              ? "bg-blue-50 text-blue-700 border-blue-200"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          )}>
            {isCashAtShop ? 'Espèces boutique' : isCod ? 'Paiement livraison' : 'Payé en ligne'}
          </span>
        </div>

        {/* Contact Vendeur */}
        {order.seller_name && (
          <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white shadow-2xs flex items-center justify-center text-gray-600 flex-shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-gray-400">Vendeur</p>
                <p className="text-[13px] font-bold text-gray-900 truncate">{order.seller_name}</p>
              </div>
            </div>
          </div>
        )}

        {/* Info Retrait boutique */}
        {isPickup && order.status !== 'delivered' && order.status !== 'completed' && (
          <div className={cn(
            "flex items-start gap-2.5 p-3 rounded-xl border text-[12px] leading-snug",
            isCashAtShop
              ? "bg-amber-50/70 border-amber-100 text-amber-900"
              : "bg-emerald-50/70 border-emerald-100 text-emerald-950"
          )}>
            <Store className={cn("w-4 h-4 mt-0.5 flex-shrink-0", isCashAtShop ? "text-amber-600" : "text-emerald-600")} />
            <div>
              <p className="font-bold mb-0.5">
                {isCashAtShop ? 'Réservation en boutique (Paiement sur place)' : 'Retrait en boutique (Payé en ligne)'}
              </p>
              <p>
                {isCashAtShop
                  ? `Rendez-vous à la boutique du vendeur pour voir votre article et régler ${formatPrice(order.total_amount)} en espèces sur place.`
                  : `Votre paiement de ${formatPrice(order.total_amount)} est sécurisé en séquestre. Communiquez votre code secret ci-dessous au vendeur lors du retrait pour valider la remise.`}
              </p>
            </div>
          </div>
        )}

        {/* Info Paiement à la livraison (COD) */}
        {isCod && order.status !== 'delivered' && order.status !== 'completed' && (
          <div className="flex items-start gap-2.5 p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-[12px] text-blue-900 leading-snug">
            <Clock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold mb-0.5">Paiement à la livraison ({formatPrice(order.total_amount)})</p>
              <p>
                Préparez le montant en espèces ou Mobile Money à remettre lors de la réception de votre colis.
              </p>
            </div>
          </div>
        )}

        {/* Statut de transit coursier (colis déjà pris en charge) */}
        {isDriverPickedUp && order.status !== 'delivered' && order.status !== 'completed' && (
          <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-100 space-y-2">
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-blue-600 animate-pulse flex-shrink-0" />
              <div>
                <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Colis récupéré par le livreur</p>
                <p className="text-[13px] font-bold text-gray-900">
                  Le livreur est en route vers votre adresse
                </p>
              </div>
            </div>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              Le colis ayant déjà été récupéré chez le vendeur, l'annulation directe n'est plus possible. Si vous rencontrez un imprévu à la réception, utilisez le bouton de signalement ci-dessous.
            </p>
          </div>
        )}

        {/* Code OTP (Scénario 3 : Code de retrait boutique | Scénario 1 : Code de livraison coursier) */}
        {showDeliveryOtp && otp && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold text-gray-900">
                  {isPickup ? 'Code secret de retrait' : 'Code de livraison'}
                </p>
                <p className="text-[11px] text-gray-500">
                  {isPickup
                    ? 'À communiquer au vendeur après vérification de votre article'
                    : 'À donner au livreur à l\'arrivée'}
                </p>
              </div>
              <button
                onClick={() => setOtpRevealed(!otpRevealed)}
                className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-700 active:scale-90 transition-transform"
              >
                {otpRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <AnimatePresence mode="wait">
              {otpRevealed ? (
                <motion.div
                  key="revealed"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <OtpPinDisplay code={otp} accentColor="emerald" />
                </motion.div>
              ) : (
                <motion.div
                  key="hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 py-2"
                >
                  {otp.split('').map((_: string, i: number) => (
                    <div key={i} className="w-9 h-11 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-gray-400" />
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Section Annulation par l'acheteur */}
        {canCancel && (
          <div className="pt-2 border-t border-gray-100">
            {cancellationBlockedMessage || isLimitReached ? (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[12px] font-bold text-amber-900">
                      Limite d'annulations consécutives atteinte
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                      {cancellationBlockedMessage || cancellationSettings?.notice || 'Vous avez atteint la limite d\'annulations consécutives de commandes payées en ligne. Veuillez contacter le support pour annuler cette commande.'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => window.open('https://wa.me/2250700000000', '_blank')}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[12px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Contacter le support sur WhatsApp
                </button>
              </div>
            ) : !showCancelConfirm ? (
              <div className="space-y-1">
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full h-9 text-gray-400 hover:text-red-600 font-semibold text-[11px] flex items-center justify-center gap-1.5 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {isCashAtShop
                    ? 'Annuler ma réservation en boutique'
                    : isCod
                    ? 'Annuler la commande (Paiement à la livraison)'
                    : isPickup
                    ? 'Annuler le retrait en boutique'
                    : 'Annuler la commande (avant prise en charge coursier)'}
                </button>
                {isOnlinePaid && userConsecutiveCancellations > 0 && (
                  <p className="text-[10px] text-center text-gray-400">
                    Annulation(s) consécutive(s) payée(s) : {userConsecutiveCancellations} / {cancellationSettings?.max_consecutive_cancellations || 3}
                  </p>
                )}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-3.5 rounded-2xl border space-y-3",
                  isCashAtShop
                    ? "bg-slate-50 border-slate-200"
                    : isCod
                    ? "bg-blue-50/70 border-blue-200"
                    : "bg-red-50/90 border-red-200"
                )}
              >
                <div className="space-y-1.5">
                  <p className={cn(
                    "text-[13px] font-bold flex items-center gap-1.5",
                    isCashAtShop ? "text-slate-900" : isCod ? "text-blue-950" : "text-red-900"
                  )}>
                    <AlertTriangle className={cn("w-4 h-4", isCashAtShop ? "text-slate-600" : isCod ? "text-blue-600" : "text-red-600")} />
                    {isCashAtShop
                      ? 'Confirmer l\'annulation de la réservation ?'
                      : isCod
                      ? 'Confirmer l\'annulation de la livraison ?'
                      : 'Confirmer l\'annulation et le remboursement ?'}
                  </p>
                  <p className={cn(
                    "text-[12px] leading-relaxed",
                    isCashAtShop ? "text-slate-700" : isCod ? "text-blue-800" : "text-red-700"
                  )}>
                    {isCashAtShop
                      ? 'Aucun prélèvement n\'a été effectué (paiement en espèces sur place). L\'article sera simplement remis à disposition en boutique.'
                      : isCod
                      ? 'Aucun paiement n\'a été effectué. Le coursier ne sera pas envoyé à votre adresse.'
                      : `Le montant intégral de ${formatPrice(order.total_amount)} vous sera automatiquement remboursé vers votre numéro Mobile Money.`}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={cancelLoading}
                    className="flex-1 h-9 bg-white text-gray-700 border border-gray-200 rounded-lg text-[12px] font-semibold hover:bg-gray-50 transition-colors"
                  >
                    Conserver
                  </button>
                  <button
                    onClick={handleCancelOrder}
                    disabled={cancelLoading}
                    className={cn(
                      "flex-1 h-9 text-white rounded-lg text-[12px] font-bold shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors",
                      isCashAtShop
                        ? "bg-slate-800 hover:bg-slate-900"
                        : isCod
                        ? "bg-blue-700 hover:bg-blue-800"
                        : "bg-red-600 hover:bg-red-700"
                    )}
                  >
                    {cancelLoading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span>Annulation...</span>
                      </>
                    ) : isCashAtShop ? (
                      'Oui, annuler la réservation'
                    ) : (
                      'Oui, annuler la commande'
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {showDisputeBtn && (
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={handleReportDispute}
              disabled={confirmLoading}
              className="w-full py-2 px-3 bg-gray-50 hover:bg-amber-50 text-amber-700 border border-gray-200 rounded-lg text-[12px] font-bold active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Signaler un problème sur cette livraison
            </button>
          </div>
        )}

        {(order.status === 'delivered' || order.status === 'completed') && (
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-emerald-900">
                {isPickup ? 'Article récupéré en boutique' : 'Commande livrée avec succès'}
              </p>
              {delivery?.delivered_at && (
                <p className="text-[11px] text-emerald-700">Le {formatDate(delivery.delivered_at)}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
