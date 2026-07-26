import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { checkPaymentStatus } from '../lib/payment';
import { useCart } from '../context/CartContext';

export default function PaymentReturnPage() {
  usePageTitle('Paiement');
  const navigate = useNavigate();
  const { user } = useSupabase();
  const { clearCart } = useCart();
  const [searchParams] = useSearchParams();
  // MoneyFusion renvoie parfois le param sous 'txid' au lieu de 'transactionId'
  const transactionId = searchParams.get('transactionId') || searchParams.get('txid') || searchParams.get('token');
  const type = searchParams.get('type') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const MAX_ATTEMPTS = 10; // 10 × 3s = 30s max d'attente

  const verifyPayment = async (currentAttempt = 0) => {
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
        // L'order_id est renvoyé par check-payment après création de la commande
        const orderId = result.order_id || null;
        setConfirmedOrderId(orderId);
        // Vider le panier après un paiement de commande réussi
        if (type === 'order' || !type) {
          clearCart();
        }
        // Redirection intelligente selon le type
        setTimeout(() => {
          if (type === 'order' && orderId) {
            navigate(`/suivi/${orderId}`);
          } else if (type === 'seller_badge') {
            navigate('/profil');
          } else if (type === 'listing_pack_10') {
            navigate('/publier');
          } else if (type && type.startsWith('credits_pack_')) {
            const credits = type.split('_')[2] || '0';
            navigate(`/acheter-pack?status=success&credits=${credits}`);
          } else {
            navigate('/');
          }
        }, 2000);
      } else if (result?.status === 'failure' || result?.status === 'not_paid') {
        setStatus('error');
        setErrorMessage(result?.message || "Le paiement n'a pas été confirmé.");
      } else {
        // Status pending ou unknown
        const next = currentAttempt + 1;
        setAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setStatus('error');
          setErrorMessage('Délai dépassé. Si vous avez été prélevé, contactez le support.');
          return;
        }
        setTimeout(() => verifyPayment(next), 3000);
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Erreur lors de la vérification du paiement.');
    }
  };

  useEffect(() => {
    verifyPayment(0);
  }, [transactionId, type]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <LoadingSpinner size="lg" />
        <p className="text-[var(--color-on-surface-variant)] text-lg">
          Vérification du paiement...
        </p>
        {attempts > 0 && (
          <p className="text-sm text-[var(--color-on-surface-variant)] opacity-60">
            Tentative {attempts}/{MAX_ATTEMPTS} — en attente de confirmation MoneyFusion
          </p>
        )}
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 rounded-2xl shadow-elevation-2 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle size={48} className="text-green-500" />
          </motion.div>
          <h1 className="text-2xl font-bold text-[var(--color-on-surface)] mb-2">
            Paiement confirmé
          </h1>
          <p className="text-[var(--color-on-surface-variant)] mb-6">
            Votre achat a bien été pris en compte.
          </p>
          <Button
            onClick={() => navigate('/')}
            color="primary"
            fullWidth
            className="active:scale-[0.97]"
          >
            Retour a l'accueil
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 rounded-2xl shadow-elevation-2 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6"
        >
          <XCircle size={48} className="text-red-500" />
        </motion.div>
        <h1 className="text-2xl font-bold text-[var(--color-on-surface)] mb-2">
          Paiement echoue
        </h1>
        <p className="text-[var(--color-on-surface-variant)] mb-2">
          {errorMessage || 'Une erreur est survenue lors du paiement.'}
        </p>
        <div className="flex flex-col gap-3 mt-6">
          <Button
            onClick={() => verifyPayment(0)}
            color="secondary"
            fullWidth
            className="active:scale-[0.97]"
          >
            Réessayer
          </Button>
          <Button
            onClick={() => navigate('/')}
            variant="outlined"
            fullWidth
            className="active:scale-[0.97]"
          >
            Retour
          </Button>
        </div>
      </Card>
    </div>
  );
}