import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../ui/Button';
import { ENABLE_BOOST, BOOST_PRICE, BOOST_DURATION_DAYS } from '../../../lib/featureFlags';
import { formatPrice, getListingPath } from '../../../lib/utils';
import { useSupabase } from '../../../hooks/useSupabase';
import { initiatePayment } from '../../../lib/payment';

interface ListingSuccessModalProps {
  show: boolean;
  onClose: () => void;
  isEditing: boolean;
  createdListingId: string | null;
}

export const ListingSuccessModal: React.FC<ListingSuccessModalProps> = ({
  show,
  onClose,
  isEditing,
  createdListingId,
}) => {
  const navigate = useNavigate();
  const { user, userProfile } = useSupabase();
  const [loadingBoost, setLoadingBoost] = useState(false);

  const handleClose = () => {
    onClose();
    if (createdListingId) {
      navigate(getListingPath(createdListingId));
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            {/* Close */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>

            <div className="p-6 pt-10 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, delay: 0.1 }}
              >
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-9 h-9 text-green-600" />
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <h2 className="text-xl font-bold mb-1" style={{ color: 'var(--color-on-surface)' }}>
                  Annonce {isEditing ? 'modifiée' : 'publiée'} !
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--color-on-surface-variant)' }}>
                  {isEditing ? 'Vos modifications ont été enregistrées.' : 'Votre annonce est maintenant en ligne.'}
                </p>
              </motion.div>

              {/* Boost upsell */}
              {ENABLE_BOOST && !isEditing && createdListingId && (
                <motion.div
                  className="rounded-2xl p-4 mb-5 text-left border-2"
                  style={{ borderColor: 'var(--color-primary-100)', background: 'var(--color-primary-50)' }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--gradient-primary)' }}>
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold mb-0.5" style={{ color: 'var(--color-on-surface)' }}>Boost votre annonce</h3>
                      <p className="text-xs leading-relaxed mb-2.5" style={{ color: 'var(--color-on-surface-variant)' }}>
                        Apparaît en tête des résultats pendant {BOOST_DURATION_DAYS} jours pour seulement {formatPrice(BOOST_PRICE)}.
                      </p>
                      <Button
                        variant="filled"
                        color="primary"
                        size="sm"
                        loading={loadingBoost}
                        icon={<Zap className="w-4 h-4" />}
                        onClick={async () => {
                          if (!user) {
                            toast.error('Vous devez être connecté.');
                            return;
                          }
                          setLoadingBoost(true);
                          try {
                            const payment = await initiatePayment({
                              type: 'boost',
                              metadata: { listing_id: createdListingId },
                              amount: BOOST_PRICE,
                              userId: user.id,
                              customerName: userProfile?.full_name || 'Client',
                              customerPhone: userProfile?.phone || '',
                            });
                            
                            if (payment?.paymentUrl) {
                              window.location.href = payment.paymentUrl;
                            } else {
                              toast.error('Erreur lors de l\'initialisation du paiement');
                            }
                          } catch (e) {
                            console.error(e);
                            toast.error('Erreur lors du paiement');
                          } finally {
                            setLoadingBoost(false);
                          }
                        }}
                      >
                        Booster pour {formatPrice(BOOST_PRICE)}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                <Button
                  variant="tonal"
                  color="primary"
                  fullWidth
                  onClick={handleClose}
                >
                  Voir mon annonce
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
