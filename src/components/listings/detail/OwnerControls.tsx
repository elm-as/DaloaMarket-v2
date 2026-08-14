import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../ui/Button';

interface OwnerControlsProps {
  listingId: string;
  markingSold: boolean;
  onMarkSold: () => void;
  onDeleteRequest: () => void;
}

const OwnerControls: React.FC<OwnerControlsProps> = ({ listingId, markingSold, onMarkSold, onDeleteRequest }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-3xl p-5 border border-orange-200 shadow-lg space-y-3">
      <h3 className="text-sm font-bold text-gray-900">Gestion de votre annonce</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Button variant="filled" color="primary" size="md" loading={markingSold} onClick={onMarkSold}>
          Marquer comme vendu
        </Button>
        <Button variant="outlined" color="secondary" size="md" onClick={() => navigate(`/create-listing?id=${listingId}`)}>
          Modifier
        </Button>
      </div>
      <button
        onClick={onDeleteRequest}
        className="text-xs font-semibold text-red-500 hover:underline w-full text-center block pt-1"
      >
        Supprimer définitivement l'annonce
      </button>
    </div>
  );
};

export default OwnerControls;
