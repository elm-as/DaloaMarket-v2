import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Ban, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BanUserModalProps {
  isOpen: boolean;
  userEmail: string;
  userName?: string | null;
  userIp?: string | null;
  onClose: () => void;
  onConfirm: (reason: string, banIpAlso: boolean) => Promise<void>;
}

const PRESET_REASONS = [
  'Spam ou annonces frauduleuses',
  'Comportement inapproprié ou irrespectueux',
  'Tentative d\'escroquerie ou non-livraison',
  'Usurpation d\'identité',
  'Non-respect des conditions générales',
];

export const BanUserModal: React.FC<BanUserModalProps> = ({
  isOpen,
  userEmail,
  userName,
  userIp,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState('');
  const [banIpAlso, setBanIpAlso] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    setLoading(true);
    try {
      await onConfirm(reason.trim(), banIpAlso);
      setReason('');
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

          <div className="flex items-center gap-3 text-red-500 mb-4">
            <div className="p-2 bg-red-500/10 rounded-xl">
              <Ban size={24} />
            </div>
            <div>
              <h2 className="font-bold text-lg text-[var(--color-on-surface)]">
                Bannir l'utilisateur
              </h2>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                {userName ? `${userName} (${userEmail})` : userEmail}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-on-surface)] mb-1.5 uppercase tracking-wider">
                Motif du bannissement (sera visible par l'utilisateur)
              </label>

              {/* Suggestions rapides */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {PRESET_REASONS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setReason(preset)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                      reason === preset
                        ? 'bg-red-500/10 border-red-500/30 text-red-600 font-semibold'
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
                placeholder="Précisez la raison détaillée du bannissement..."
                className="w-full p-3 rounded-xl bg-[var(--color-background)] border border-[var(--color-outline)] text-sm text-[var(--color-on-surface)] focus:ring-2 focus:ring-red-500 outline-none resize-none"
                required
              />
            </div>

            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/80 rounded-xl p-3">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-red-800 dark:text-red-300">
                <input
                  type="checkbox"
                  checked={banIpAlso}
                  onChange={(e) => setBanIpAlso(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 accent-red-600 cursor-pointer"
                />
                <span>
                  Bannir également l'adresse IP {userIp ? `(${userIp})` : ''}
                </span>
              </label>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-700">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <p>
                L'utilisateur sera immédiatement déconnecté et redirigé vers la page de bannissement.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
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
                className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {loading ? 'Bannissement...' : 'Confirmer le bannissement'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default BanUserModal;
