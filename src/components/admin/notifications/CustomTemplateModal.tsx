import React, { useState, useEffect } from 'react';
import { Bookmark, X } from 'lucide-react';
import type { NotificationAudience, NotificationTemplate } from './notificationTemplates.types';
import { adminInputClass, AdminButton } from '../ui/AdminUI';

interface CustomTemplateModalProps {
  isOpen: boolean;
  editingTemplate: NotificationTemplate | null;
  initialDraft?: {
    title: string;
    body: string;
    url: string;
    audience: NotificationAudience;
  };
  onClose: () => void;
  onSave: (draft: Omit<NotificationTemplate, 'id' | 'isCustom'> & { id?: string }) => Promise<unknown>;
}

export const CustomTemplateModal: React.FC<CustomTemplateModalProps> = ({
  isOpen,
  editingTemplate,
  initialDraft,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [audience, setAudience] = useState<NotificationAudience>('all');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingTemplate) {
      setTitle(editingTemplate.title);
      setBody(editingTemplate.body);
      setUrl(editingTemplate.url);
      setAudience(editingTemplate.audience || 'all');
      return;
    }
    setTitle(initialDraft?.title || '');
    setBody(initialDraft?.body || '');
    setUrl(initialDraft?.url || '/');
    setAudience(initialDraft?.audience || 'all');
  }, [isOpen, editingTemplate, initialDraft]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    try {
      await onSave({
        id: editingTemplate?.id,
        category: 'custom',
        categoryLabel: 'Modèles Personnalisés',
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || '/',
        audience,
        recommendedTime: 'À tout moment',
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-stone-200 bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-[var(--color-primary)]" />
            <h3 className="text-sm font-bold text-stone-900">
              {editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle de notification'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="text-stone-400 hover:text-stone-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700">Titre (max 65)</label>
            <input
              type="text"
              maxLength={65}
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Arrivage frais ce week-end à Daloa"
              className={adminInputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-stone-700">Message (max 180)</label>
            <textarea
              rows={3}
              maxLength={180}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Rédigez le texte du modèle..."
              className={adminInputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value as NotificationAudience)}
                className={adminInputClass}
              >
                <option value="all">Tout le monde</option>
                <option value="market">DaloaMarket (Tous)</option>
                <option value="dormant">Inactifs (0 annonce / 0 achat)</option>
                <option value="active_seller">Vendeurs actifs (Annonces en ligne)</option>
                <option value="seller_no_promo">Vendeurs sans promo</option>
                <option value="buyer_cancelled">Acheteurs (relance)</option>
                <option value="delivery">DaloaDelivery (Livreurs)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-stone-700">Lien au clic</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="/"
                className={adminInputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-stone-100 pt-3">
            <AdminButton type="button" variant="ghost" size="sm" onClick={onClose}>
              Annuler
            </AdminButton>
            <AdminButton
              type="submit"
              variant="primary"
              size="sm"
              loading={saving}
              disabled={!title.trim() || !body.trim()}
            >
              {editingTemplate ? 'Enregistrer' : 'Créer le modèle'}
            </AdminButton>
          </div>
        </form>
      </div>
    </div>
  );
};
