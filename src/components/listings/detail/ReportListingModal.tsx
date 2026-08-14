import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';

interface ReportListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  submitting: boolean;
  onSubmit: (reason: string) => Promise<boolean>;
}

const ReportListingModal: React.FC<ReportListingModalProps> = ({ isOpen, onClose, submitting, onSubmit }) => {
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleSubmit = async () => {
    const success = await onSubmit(reason);
    if (success) {
      setReason('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Signaler cette annonce">
      <div className="space-y-4">
        <p className="text-xs text-gray-500">
          Aidez-nous à garder DaloaMarket sûr. Indiquez la raison du signalement. Pour tout autre problème ou besoin
          d'assistance, contactez directement l'
          <Link to="/help" className="text-primary hover:underline font-bold">
            Aide &amp; Support
          </Link>
          .
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex: Contenu inapproprié, fausse annonce..."
          className="w-full min-h-[100px] p-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#FF7F00]"
        />
        <div className="flex gap-2">
          <Button variant="outlined" color="secondary" size="md" fullWidth onClick={handleClose}>
            Annuler
          </Button>
          <Button
            variant="filled"
            color="error"
            size="md"
            fullWidth
            disabled={!reason.trim()}
            loading={submitting}
            onClick={handleSubmit}
          >
            Signaler
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ReportListingModal;
