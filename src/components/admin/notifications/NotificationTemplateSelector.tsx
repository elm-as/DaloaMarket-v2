import React, { useState, useMemo } from 'react';
import { Plus, Search, Check, Trash2, Edit2, Bookmark, X } from 'lucide-react';
import type { NotificationTemplate, NotificationAudience } from './notificationTemplates.types';
import { adminInputClass, AdminButton } from '../ui/AdminUI';
import { confirmDialog } from '../../ui/ConfirmDialog';
import { cn } from '../../../lib/utils';

interface Props {
  allTemplates: NotificationTemplate[];
  selectedTemplateId?: string;
  onSelectTemplate: (template: NotificationTemplate) => void;
  onSaveCustomTemplate: (draft: Omit<NotificationTemplate, 'id' | 'isCustom'> & { id?: string }) => Promise<any>;
  onDeleteCustomTemplate: (id: string) => Promise<any>;
  currentFormState?: {
    title: string;
    body: string;
    url: string;
    audience: NotificationAudience;
  };
}

type CategoryFilter = 'all' | 'segmented' | 'custom' | 'growth' | 'delivery';

function formatAudienceBadgeLabel(audience?: NotificationAudience): string {
  switch (audience) {
    case 'dormant':
      return 'Inactifs (0 annonce / 0 achat)';
    case 'active_seller':
      return 'Vendeurs actifs';
    case 'seller_no_promo':
      return 'Vendeurs sans promo';
    case 'buyer_cancelled':
      return 'Acheteurs (relance)';
    case 'delivery':
      return 'Livreurs';
    case 'market':
      return 'Market';
    default:
      return 'Tous';
  }
}

export const NotificationTemplateSelector: React.FC<Props> = ({
  allTemplates,
  selectedTemplateId,
  onSelectTemplate,
  onSaveCustomTemplate,
  onDeleteCustomTemplate,
  currentFormState,
}) => {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<CategoryFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftUrl, setDraftUrl] = useState('/');
  const [draftAudience, setDraftAudience] = useState<NotificationAudience>('all');
  const [saving, setSaving] = useState(false);

  const openCreateModal = (tplToEdit?: NotificationTemplate | null) => {
    if (tplToEdit) {
      setEditingTemplate(tplToEdit);
      setDraftTitle(tplToEdit.title);
      setDraftBody(tplToEdit.body);
      setDraftUrl(tplToEdit.url);
      setDraftAudience(tplToEdit.audience || 'all');
    } else if (currentFormState && (currentFormState.title || currentFormState.body)) {
      setEditingTemplate(null);
      setDraftTitle(currentFormState.title);
      setDraftBody(currentFormState.body);
      setDraftUrl(currentFormState.url || '/');
      setDraftAudience(currentFormState.audience || 'all');
    } else {
      setEditingTemplate(null);
      setDraftTitle('');
      setDraftBody('');
      setDraftUrl('/');
      setDraftAudience('all');
    }
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim() || !draftBody.trim()) return;
    setSaving(true);
    try {
      await onSaveCustomTemplate({
        id: editingTemplate?.id,
        category: 'custom',
        categoryLabel: 'Modèles Personnalisés',
        title: draftTitle.trim(),
        body: draftBody.trim(),
        url: draftUrl.trim() || '/',
        audience: draftAudience,
        recommendedTime: 'À tout moment',
      });
      setIsModalOpen(false);
      setEditingTemplate(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (
      !(await confirmDialog({
        title: 'Supprimer ce modèle ?',
        message: `« ${title} » sera retiré de vos modèles enregistrés.`,
        confirmLabel: 'Supprimer',
      }))
    )
      return;
    await onDeleteCustomTemplate(id);
  };

  const customCount = useMemo(() => allTemplates.filter((t) => t.isCustom).length, [allTemplates]);

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((t) => {
      if (filterCategory === 'segmented' && t.category !== 'segmented' && t.audience !== 'dormant' && t.audience !== 'active_seller') return false;
      if (filterCategory === 'custom' && !t.isCustom) return false;
      if (
        filterCategory === 'growth' &&
        t.category !== 'segmented' &&
        t.category !== 'diversity' &&
        t.category !== 'first_order' &&
        t.category !== 'whatsapp' &&
        t.category !== 'survey'
      )
        return false;
      if (filterCategory === 'delivery' && t.audience !== 'delivery' && t.category !== 'drivers') return false;

      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.body.toLowerCase().includes(q) ||
        t.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [allTemplates, filterCategory, search]);

  return (
    <div className="space-y-3">
      {/* Filtres par catégorie + bouton Nouveau */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-xs">
          {[
            { key: 'all' as const, label: `Tous (${allTemplates.length})` },
            { key: 'segmented' as const, label: 'Ciblés' },
            { key: 'custom' as const, label: `Perso (${customCount})` },
            { key: 'growth' as const, label: 'Croissance' },
            { key: 'delivery' as const, label: 'Livreurs' },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterCategory(tab.key)}
              className={cn(
                'shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                filterCategory === tab.key
                  ? 'bg-stone-900 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => openCreateModal()}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
        >
          <Plus size={13} />
          Créer
        </button>
      </div>

      {/* Recherche rapide */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="Filtrer les modèles..."
          className="w-full rounded-lg border border-stone-200 bg-stone-50/60 py-1.5 pl-8 pr-3 text-xs text-stone-900 placeholder-stone-400 focus:border-stone-400 focus:bg-white focus:outline-none"
        />
      </div>

      {/* Liste scrollable des modèles en 1 clic */}
      <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
        {filteredTemplates.length === 0 ? (
          <p className="py-8 text-center text-xs text-stone-400">Aucun modèle trouvé.</p>
        ) : (
          filteredTemplates.map((t) => {
            const isSelected = selectedTemplateId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onSelectTemplate(t)}
                className={cn(
                  'group relative flex items-start justify-between gap-2.5 rounded-lg border p-2.5 cursor-pointer transition-all',
                  isSelected
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary-50)]/40'
                    : 'border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/60'
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="truncate text-xs font-semibold text-stone-900">{t.title}</span>
                    {t.isCustom && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                        Perso
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-stone-500">{t.body}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-stone-400">
                    <span>
                      Cible : {formatAudienceBadgeLabel(t.audience)}
                    </span>
                    <span>·</span>
                    <span className="truncate font-mono">{t.url}</span>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {t.isCustom && (
                    <>
                      <button
                        type="button"
                        title="Modifier"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateModal(t);
                        }}
                        className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        title="Supprimer"
                        onClick={(e) => handleDelete(e, t.id, t.title)}
                        className="rounded p-1 text-stone-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                  <span
                    className={cn(
                      'inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition-colors',
                      isSelected
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-stone-100 text-stone-700 group-hover:bg-stone-900 group-hover:text-white'
                    )}
                  >
                    {isSelected ? <Check size={12} /> : 'Choisir'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modale de création / édition de modèle */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-stone-200 bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-[var(--color-primary)]" />
                <h3 className="text-sm font-bold text-stone-900">
                  {editingTemplate ? 'Modifier le modèle' : 'Nouveau modèle de notification'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-stone-700">Titre (max 65)</label>
                <input
                  type="text"
                  maxLength={65}
                  required
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
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
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  placeholder="Rédigez le texte du modèle..."
                  className={adminInputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Audience</label>
                  <select
                    value={draftAudience}
                    onChange={(e) => setDraftAudience(e.target.value as any)}
                    className={adminInputClass}
                  >
                    <option value="all">Tout le monde</option>
                    <option value="market">DaloaMarket (Tous)</option>
                    <option value="dormant">Inactifs (0 annonce / 0 achat)</option>
                    <option value="active_seller">Vendeurs actifs (Annonces en ligne)</option>
                    <option value="delivery">DaloaDelivery (Livreurs)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-stone-700">Lien au clic</label>
                  <input
                    type="text"
                    value={draftUrl}
                    onChange={(e) => setDraftUrl(e.target.value)}
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="/"
                    className={adminInputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-stone-100 pt-3">
                <AdminButton type="button" variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </AdminButton>
                <AdminButton
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={saving}
                  disabled={!draftTitle.trim() || !draftBody.trim()}
                >
                  {editingTemplate ? 'Enregistrer' : 'Créer le modèle'}
                </AdminButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
