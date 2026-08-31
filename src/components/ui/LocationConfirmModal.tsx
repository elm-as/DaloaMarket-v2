import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Store, Truck, AlertCircle, ShieldCheck, CheckCircle2, X } from 'lucide-react';

interface LocationConfirmModalProps {
  isOpen: boolean;
  pendingCoords: { lat: number; lng: number } | null;
  userType: 'seller' | 'buyer';
  isBlocked: boolean;
  isSuperOrAdmin: boolean;
  distanceFromCenter: number;
  isPendingInDaloa: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const LocationConfirmModal: React.FC<LocationConfirmModalProps> = ({
  isOpen,
  pendingCoords,
  userType,
  isBlocked,
  isSuperOrAdmin,
  distanceFromCenter,
  isPendingInDaloa,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !pendingCoords) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1050] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
        />

        {/* Modal Card */}
        <motion.div
          className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-gray-100 overflow-hidden text-center z-10"
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
        >
          {/* Bouton fermeture */}
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icône principale */}
          <div
            className={`mx-auto w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg mb-4 text-white ${
              isBlocked
                ? 'bg-gradient-to-tr from-red-500 to-rose-600 shadow-red-500/25'
                : 'bg-gradient-to-tr from-orange-500 to-amber-500 shadow-orange-500/25'
            }`}
          >
            {isBlocked ? (
              <AlertCircle className="w-7 h-7" />
            ) : userType === 'seller' ? (
              <Store className="w-7 h-7" />
            ) : (
              <Truck className="w-7 h-7" />
            )}
          </div>

          {/* Titre & Message */}
          {isBlocked ? (
            <>
              <h3 className="text-lg font-black text-gray-900 mb-2 leading-tight">
                Position hors de Daloa
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Votre position actuelle est située à environ <strong>{Math.round(distanceFromCenter)} km</strong> de Daloa.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-left mb-5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-red-900">
                  <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>Règle de proximité DaloaMarket :</span>
                </div>
                <p className="text-[11px] text-red-800 leading-tight">
                  DaloaMarket est une marketplace locale 100% dédiée à la ville de Daloa. Seuls les commerçants et artisans physiquement basés à Daloa peuvent ouvrir une boutique.
                </p>
              </div>
            </>
          ) : userType === 'seller' ? (
            <>
              <h3 className="text-lg font-black text-gray-900 mb-2 leading-tight">
                Définir l'emplacement de votre boutique ?
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Vous êtes sur le point d'enregistrer cette position comme l'adresse officielle de votre boutique.
              </p>

              {/* Badge Admin bypass si applicable */}
              {isSuperOrAdmin && !isPendingInDaloa && (
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 text-left mb-4 flex items-start gap-2 text-purple-900 text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold">Mode Fondateur / Admin actif</p>
                    <p className="text-purple-700 leading-tight">
                      Position détectée hors Daloa ({Math.round(distanceFromCenter)} km), exception accordée pour vos tests.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-orange-50/80 border border-orange-200/70 rounded-2xl p-3 text-left mb-5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-orange-900">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span>Impact sur vos ventes :</span>
                </div>
                <p className="text-[11px] text-orange-800 leading-tight pl-5">
                  Les frais de livraison et les trajets des coursiers DaloaDelivery seront calculés à partir de cet endroit.
                </p>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-black text-gray-900 mb-2 leading-tight">
                Confirmer ce lieu de livraison ?
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">
                Cette position sera utilisée comme repère géographique pour votre livreur.
              </p>
              <div className="bg-blue-50/80 border border-blue-200/70 rounded-2xl p-3 text-left mb-5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-blue-900">
                  <Truck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Précision pour le livreur :</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-tight pl-5">
                  Complétez également le champ texte avec vos repères de quartier (pharmacie, portail, etc.).
                </p>
              </div>
            </>
          )}

          {/* Badge coordonnées */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 text-[11px] font-bold text-gray-700 mb-6">
            <span className={`w-2 h-2 rounded-full ${isPendingInDaloa ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>GPS : {pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {!isBlocked && (
              <button
                type="button"
                onClick={onConfirm}
                className="w-full h-11 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-extrabold text-xs shadow-md shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {userType === 'seller' ? 'Confirmer la position de ma boutique' : 'Confirmer ce lieu de livraison'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onCancel}
              className="w-full h-10 rounded-2xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-bold text-xs active:scale-95 transition-all"
            >
              {isBlocked ? 'Fermer' : 'Annuler'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default LocationConfirmModal;
