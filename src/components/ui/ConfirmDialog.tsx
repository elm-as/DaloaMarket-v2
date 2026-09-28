import { useEffect, useState } from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * Confirmation aux couleurs DaloaMarket, en remplacement de `window.confirm`.
 *
 * La boîte du navigateur (grise, titre « daloamarket.com indique… ») tranchait
 * avec le site sur des actions sensibles : suppression, maintenance, envoi de
 * notifications. S'utilise comme `confirm`, mais attendu :
 *
 *   if (!(await confirmDialog({ message: 'Supprimer ?', danger: true }))) return;
 *
 * `<ConfirmDialogHost />` est monté une fois à la racine (main.tsx).
 */

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Action destructive : bouton rouge. */
  danger?: boolean;
}

interface Demande extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let ouvrir: ((d: Demande) => void) | null = null;

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!ouvrir) {
      // Hôte absent (ne devrait pas arriver) : repli sur la boîte du navigateur.
      resolve(window.confirm(options.message));
      return;
    }
    ouvrir({ ...options, resolve });
  });
}

export function ConfirmDialogHost() {
  const [demande, setDemande] = useState<Demande | null>(null);

  useEffect(() => {
    ouvrir = (d) => setDemande(d);
    return () => {
      ouvrir = null;
    };
  }, []);

  useEffect(() => {
    if (!demande) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') repondre(false);
      if (e.key === 'Enter') repondre(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demande]);

  if (!demande) return null;

  function repondre(ok: boolean) {
    demande?.resolve(ok);
    setDemande(null);
  }

  const Icone = demande.danger ? AlertTriangle : HelpCircle;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-gray-900/55 p-5 animate-in fade-in duration-150"
      onClick={() => repondre(false)}
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-sm rounded-3xl bg-white px-5 pb-5 pt-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full ${
            demande.danger ? 'bg-red-50 text-red-500' : 'bg-orange-50 text-orange-500'
          }`}
        >
          <Icone className="h-7 w-7" />
        </div>
        <h2 id="confirm-title" className="text-base font-bold text-gray-900">
          {demande.title || (demande.danger ? 'Confirmer la suppression' : 'Confirmer')}
        </h2>
        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-gray-500">{demande.message}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => repondre(false)}
            className="h-12 flex-1 rounded-xl border border-gray-200 bg-gray-50 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            {demande.cancelLabel || 'Annuler'}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => repondre(true)}
            className={`h-12 flex-1 rounded-xl text-sm font-semibold text-white shadow-sm ${
              demande.danger ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {demande.confirmLabel || 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}
