import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  FileText, 
  ShoppingBag,
  ExternalLink
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import type { Order } from '../../types/order';

interface PaymentSuccessMobileProps {
  transactionId: string;
  orderId?: string | null;
  order?: Order | null;
  amount?: number;
  paymentMethod?: string;
  onViewFullReceipt: () => void;
  type?: string;
}

export const PaymentSuccessMobile: React.FC<PaymentSuccessMobileProps> = ({
  transactionId,
  orderId,
  order,
  amount,
  paymentMethod = 'Mobile Money',
  onViewFullReceipt,
  type = 'order',
}) => {
  const navigate = useNavigate();
  const totalAmount = order?.total_amount ?? amount ?? 0;

  return (
    <div className="w-full px-4 py-8 max-w-lg mx-auto text-center">
      {/* Animation de succès */}
      <motion.div
        initial={{ scale: 0, rotate: -45 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5 shadow-sm"
      >
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </motion.div>

      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
        Paiement Confirmé ✓
      </span>

      <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
        Félicitations !
      </h1>
      <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
        Votre transaction a été enregistrée et consignée avec succès sur le séquestre DaloaPay.
      </p>

      {/* Carte Montant & Transaction */}
      <div className="my-6 bg-white border border-gray-200 rounded-2xl p-5 shadow-xs text-left">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          <span className="text-xs text-gray-500 font-medium">Montant Consigné</span>
          <span className="text-xl font-extrabold text-orange-600 font-mono tabular-nums">
            {formatPrice(totalAmount)}
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">Moyen de paiement :</span>
            <span className="font-semibold text-gray-800">{paymentMethod}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-500">Réf. transaction :</span>
            <span className="font-mono text-gray-800 tabular-nums">
              {transactionId.slice(0, 14)}...
            </span>
          </div>

          {orderId && (
            <div className="flex justify-between">
              <span className="text-gray-500">N° Commande :</span>
              <span className="font-mono font-bold text-gray-900">
                #{orderId.slice(0, 8).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Protection Séquestre Info */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-start gap-2.5 text-xs text-amber-800 bg-amber-50/70 p-3 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-snug">
            Vos fonds restent protégés. Le vendeur ne sera payé qu'après validation de votre code OTP à la livraison.
          </p>
        </div>
      </div>

      {/* Actions Mobiles */}
      <div className="space-y-3">
        {orderId ? (
          <button
            onClick={() => navigate(`/suivi/${orderId}`)}
            className="w-full h-13 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
          >
            Suivre ma commande en direct
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : type === 'seller_badge' ? (
          <button
            onClick={() => navigate('/profil')}
            className="w-full h-13 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
          >
            Accéder à mon profil vendeur
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={() => navigate('/')}
            className="w-full h-13 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-sm shadow-sm flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            Continuer mes achats
          </button>
        )}

        <button
          onClick={onViewFullReceipt}
          className="w-full h-12 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
        >
          <FileText className="w-4 h-4 text-gray-500" />
          Consulter / Imprimer le reçu officiel A4
        </button>

        <button
          onClick={() => navigate('/')}
          className="w-full py-2.5 text-gray-400 hover:text-gray-600 text-xs font-medium cursor-pointer"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
};
