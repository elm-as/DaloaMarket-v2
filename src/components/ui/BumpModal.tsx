import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface BumpModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

export const BumpModal: React.FC<BumpModalProps> = ({ open, onClose, onConfirm, loading }) => (
  <Modal isOpen={open} onClose={onClose} size="sm">
    <motion.div className="text-center p-2" initial={{ scale:0.95 }} animate={{ scale:1 }}>
      <div className="mx-auto mb-4 w-14 h-14 rounded-full flex items-center justify-center" style={{ background:'var(--color-success-light, #d1fae5)' }}>
        <TrendingUp className="h-7 w-7" style={{ color:'var(--color-success, #10b981)' }} />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">Remonter cette annonce</h2>
      <p className="text-sm text-gray-500 mb-4">Votre annonce sera remontée en première position comme si elle venait d'être publiée.</p>
      <div className="text-2xl font-black text-[var(--color-success, #10b981)] mb-5">200 FCFA</div>
      <div className="flex gap-3">
        <Button variant="tonal" color="secondary" fullWidth onClick={onClose}>Annuler</Button>
        <Button variant="filled" color="success" fullWidth loading={loading} onClick={onConfirm}>Remonter maintenant</Button>
      </div>
    </motion.div>
  </Modal>
);