import React from 'react';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';

interface DeleteListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  deleting: boolean;
  onConfirm: () => void;
}

const DeleteListingModal: React.FC<DeleteListingModalProps> = ({ isOpen, onClose, deleting, onConfirm }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Supprimer l'annonce ?">
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Cette action est définitive et supprimera l'annonce.</p>
      <div className="flex gap-2">
        <Button variant="outlined" color="secondary" size="md" fullWidth onClick={onClose}>
          Annuler
        </Button>
        <Button variant="filled" color="error" size="md" fullWidth loading={deleting} onClick={onConfirm}>
          Supprimer
        </Button>
      </div>
    </div>
  </Modal>
);

export default DeleteListingModal;
