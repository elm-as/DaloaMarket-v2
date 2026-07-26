import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface BoostModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const BoostModal: React.FC<BoostModalProps> = ({ open, onClose, onConfirm, loading }) => (
  <Modal isOpen={open} onClose={onClose} size="sm">
    <motion.div className="text-center p-2" initial={{ scale:0.95 }} animate={{ scale:1 }}>
      <div className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center" style={{ background:'var(--color-primary-50)' }}>
        <Zap className="h-7 w-7" style={{ color:'var(--color-primary)' }} />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Booster cette annonce</h2>
      <p className="text-sm text-gray-500 mb-4">Votre annonce apparaîtra en tête des résultats pendant <strong>7 jours</strong>.</p>
      <div className="text-2xl font-black text-[var(--color-primary)] mb-5">500 FCFA</div>
      <div className="flex gap-3">
        <Button variant="tonal" color="primary" fullWidth onClick={onClose}>Annuler</Button>
        <Button variant="filled" color="primary" fullWidth loading={loading} onClick={onConfirm}>Booster maintenant</Button>
      </div>
    </motion.div>
  </Modal>
);