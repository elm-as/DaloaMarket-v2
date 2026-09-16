import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Flag, X, Eye, Repeat } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlagUserModalProps {
  isOpen: boolean;
  userEmail: string;
  userName?: string | null;
  /** Motif déjà enregistré, pour le ré-éditer plutôt que le retaper. */
  currentReason?: string | null;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void>;
  /** Disponible uniquement sur un compte deja signale. */
  onRemove?: () => Promise<void>;
}

const PRESET_REASONS = [
  'Plaintes reçues, non confirmées',
  'Comportement suspect à surveiller',
  'Litige de livraison en cours',
  'Annonces douteuses',
  'Signalé par un autre utilisateur',
];

/**
 * Signalement d'un compte — surveiller sans bloquer.
 *
 * Volontairement distincte de `BanUserModal` : ici rien n'est bloqué, le motif
 * n'est pas montré à l'utilisateur, et le point important à faire comprendre à
 * l'administrateur est que le signalement **suit la personne** si elle supprime
 * puis recrée son compte.
 */
export const FlagUserModal: React.FC<FlagUserModalProps> = ({
  isOpen,
  userEmail,
  userName,
  currentReason,
  onClose,
  onConfirm,
  onRemove,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Le motif existant est rechargé à chaque ouverture : on modifie un
  // signalement, on ne repart pas de zéro.
  useEffect(() => {
    if (isOpen) setReason(currentReason || '');
  }, [isOpen, currentReason]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setLoading(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-3xl p-6 max-w-md w-full shadow-2xl relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 text-orange-500 mb-4">
            <div className="p-2 bg-orange-500/10 rounded-xl">
              <Flag size={24} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-[var(--color-on-surface)]">
                {currentReason ? 'Modifier le signalement' : 'Signaler le compte'}
              </h2>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                {userName ? `${userName} (${userEmail})` : userEmail}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-on-surface)] mb-1.5 uppercase tracking-wider">
                Motif du signalement (interne, jamais montré à l'utilisateur)
              </label>

              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {PRESET_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                      reason === preset
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-600 font-semibold'
                        : 'border-[var(--color-outline-variant)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ce que vous avez observé, et pourquoi ce compte mérite une surveillance..."
                className="w-full p-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-outline)] text-sm text-[var(--color-on-surface)] focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                required
              />
            </div>

            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-start gap-2 text-xs text-orange-800">
              <Repeat size={16} className="shrink-0 mt-0.5" />
              <p>
                Le signalement suit la personne : si elle supprime son compte puis
                s'en recrée un avec les mêmes identifiants, le nouveau sera marqué
                automatiquement et apparaîtra dans « Réinscriptions ».
              </p>
            </div>

            <div className="bg-[var(--color-surface-variant)] border border-[var(--color-outline-variant)] rounded-xl p-3 flex items-start gap-2 text-xs text-[var(--color-on-surface-variant)]">
              <Eye size={16} className="shrink-0 mt-0.5" />
              <p>
                Aucun blocage : l'utilisateur continue d'accéder normalement à son
                compte et n'est pas informé. Pour l'empêcher d'agir, utilisez
                « Bannir ».
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              {onRemove ? (
                <button
                  type="button"
                  disabled={removing || loading}
                  onClick={async () => {
                    setRemoving(true);
                    try {
                      await onRemove();
                      onClose();
                    } finally {
                      setRemoving(false);
                    }
                  }}
                  className="px-4 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 rounded-xl border border-orange-200 transition-colors disabled:opacity-50"
                >
                  {removing ? 'Retrait...' : 'Retirer le signalement'}
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] rounded-xl"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading || !reason.trim()}
                className="px-4 py-2 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? 'Enregistrement...' : currentReason ? 'Mettre à jour' : 'Signaler le compte'}
              </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default FlagUserModal;
