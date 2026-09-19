import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { checkPaymentStatus, type PaymentStatusResponse } from '../lib/payment';
import { useCart } from '../contexts/CartContext';
import { supabase } from '../lib/supabase';
import { PaymentReceiptA4 } from '../components/payment/PaymentReceiptA4';
import { PaymentSuccessMobile } from '../components/payment/PaymentSuccessMobile';
import type { Order } from '../types/order';

export default function PaymentReturnPage() {
  usePageTitle('Confirmation de paiement');
  const navigate = useNavigate();
  const { user } = useSupabase();
  const { clearCart } = useCart();
  const [searchParams] = useSearchParams();

  const transactionId = searchParams.get('transactionId') || searchParams.get('txid') || searchParams.get('token');
  const type = searchParams.get('type') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [paymentData, setPaymentData] = useState<PaymentStatusResponse | null>(null);
  const [orderDetails, setOrderDetails] = useState<Order | null>(null);
  const [showFullReceiptOnMobile, setShowFullReceiptOnMobile] = useState(false);

  const MAX_ATTEMPTS = 10; // 10 × 3s = 30s max

  const fetchOrderMetadata = async (orderId: string) => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();

      if (data) {
        const ord = data as Order;
        if (ord.listing_id) {
          const { data: listing } = await supabase
            .from('listings')
            .select('title')
            .eq('id', ord.listing_id)
            .maybeSingle();
          if (listing) ord.listing_title = listing.title;
        }
        if (ord.seller_id) {
          const { data: seller } = await supabase
            .from('users')
            .select('full_name, shop_name')
            .eq('id', ord.seller_id)
            .maybeSingle();
          if (seller) ord.seller_name = seller.shop_name || seller.full_name || undefined;
        }
        if (ord.buyer_id) {
          const { data: buyer } = await supabase
            .from('users')
            .select('full_name, phone')
            .eq('id', ord.buyer_id)
            .maybeSingle();
          if (buyer) {
            ord.buyer_name = buyer.full_name || undefined;
            ord.buyer_phone = buyer.phone || undefined;
          }
        }
        setOrderDetails(ord);
      }
    } catch {
      // Ignorer silencieusement si les métadonnées de commande sont indisponibles
    }
  };

  const verifyPayment = useCallback(async (currentAttempt = 0) => {
    if (!transactionId) {
      setStatus('error');
      setErrorMessage('Aucun identifiant de transaction trouvé.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const result = await checkPaymentStatus(transactionId);
      if (result?.status === 'paid') {
        setStatus('success');
        setPaymentData(result);

        if (type === 'order' || !type) {
          clearCart();
        }

        if (result.order_id) {
          await fetchOrderMetadata(result.order_id);
        }
      } else if (result?.status === 'failure' || result?.status === 'not_paid') {
        setStatus('error');
        setErrorMessage(result?.message || "Le paiement n'a pas été confirmé.");
      } else {
        const next = currentAttempt + 1;
        setAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setStatus('error');
          setErrorMessage('Délai dépassé. Si vous avez été débité, contactez le support DaloaMarket.');
          return;
        }
        setTimeout(() => verifyPayment(next), 3000);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Erreur lors de la vérification du paiement.');
    }
  }, [transactionId, type, clearCart]);

  useEffect(() => {
    verifyPayment(0);
  }, [verifyPayment]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 bg-gray-50">
        <LoadingSpinner size="lg" />
        <h2 className="text-xl font-bold text-gray-800">Vérification de la transaction...</h2>
        <p className="text-sm text-gray-500 max-w-sm text-center">
          Nous interrogeons le réseau de paiement Mobile Money pour certifier votre virement.
        </p>
        {attempts > 0 && (
          <p className="text-xs text-orange-600 font-mono font-medium">
            Tentative {attempts}/{MAX_ATTEMPTS} en cours
          </p>
        )}
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 py-12">
        <Card className="max-w-md w-full p-8 rounded-3xl shadow-sm text-center bg-white border border-gray-200">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4"
          >
            <XCircle size={36} className="text-red-600" />
          </motion.div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Paiement non confirmé
          </h1>
          <p className="text-xs text-gray-600 mb-6 leading-relaxed">
            {errorMessage || 'Une erreur est survenue lors de la validation du paiement.'}
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={() => verifyPayment(0)} color="primary" fullWidth>
              Réessayer la vérification
            </Button>
            <Button onClick={() => navigate('/')} variant="outlined" fullWidth>
              Retour à l'accueil
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Statut === 'success'
  return (
    <div className="min-h-screen bg-gray-50/60 pb-12">
      {/* Sur Mobile (< 1024px) */}
      <div className="block lg:hidden">
        {showFullReceiptOnMobile ? (
          <div>
            <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-2">
              <button
                onClick={() => setShowFullReceiptOnMobile(false)}
                className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <span className="text-sm font-bold text-gray-800">Retour au récapitulatif</span>
            </div>
            <PaymentReceiptA4
              transactionId={transactionId || 'TXN-DALOA'}
              orderId={paymentData?.order_id}
              order={orderDetails}
              amount={paymentData?.amount}
              paymentMethod={paymentData?.paymentMethod}
              confirmedAt={paymentData?.confirmedAt}
              type={type}
            />
          </div>
        ) : (
          <PaymentSuccessMobile
            transactionId={transactionId || 'TXN-DALOA'}
            orderId={paymentData?.order_id}
            order={orderDetails}
            amount={paymentData?.amount}
            paymentMethod={paymentData?.paymentMethod}
            onViewFullReceipt={() => setShowFullReceiptOnMobile(true)}
            type={type}
          />
        )}
      </div>

      {/* Sur Desktop (>= 1024px) : Reçu A4 direct avec options d'impression */}
      <div className="hidden lg:block">
        <PaymentReceiptA4
          transactionId={transactionId || 'TXN-DALOA'}
          orderId={paymentData?.order_id}
          order={orderDetails}
          amount={paymentData?.amount}
          paymentMethod={paymentData?.paymentMethod}
          confirmedAt={paymentData?.confirmedAt}
          type={type}
        />
      </div>
    </div>
  );
}