import React, { useState, useMemo } from 'react';
import { Sparkles, Plus, Search, Check, Trash2, Edit2, Bookmark, X } from 'lucide-react';
import type { NotificationTemplate } from './notificationTemplates.types';
import { adminInputClass, AdminButton, AdminBadge } from '../ui/AdminUI';
import { confirmDialog } from '../../ui/ConfirmDialog';

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
    audience: 'all' | 'market' | 'delivery';
  };
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
  const [filterCategory, setFilterCategory] = useState<'all' | 'custom' | 'growth' | 'market' | 'delivery'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  // Formulaire d'édition / création de modèle
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftUrl, setDraftUrl] = useState('/');
  const [draftAudience, setDraftAudience] = useState<'all' | 'market' | 'delivery'>('all');
  const [draftCategoryLabel, setDraftCategoryLabel] = useState('Modèles Personnalisés');
  const [draftTime, setDraftTime] = useState('À tout moment');
  const [saving, setSaving] = useState(false);

  const openCreateModal = (tplToEdit?: NotificationTemplate | null) => {
    if (tplToEdit) {
      setEditingTemplate(tplToEdit);
      setDraftTitle(tplToEdit.title);
      setDraftBody(tplToEdit.body);
      setDraftUrl(tplToEdit.url);
      setDraftAudience(tplToEdit.audience || 'all');
      setDraftCategoryLabel(tplToEdit.categoryLabel);
      setDraftTime(tplToEdit.recommendedTime);
    } else if (currentFormState && (currentFormState.title || currentFormState.body)) {
      setEditingTemplate(null);
      setDraftTitle(currentFormState.title);
      setDraftBody(currentFormState.body);
      setDraftUrl(currentFormState.url || '/');
      setDraftAudience(currentFormState.audience || 'all');
      setDraftCategoryLabel('Modèles Personnalisés');
      setDraftTime('À tout moment');
    } else {
      setEditingTemplate(null);
      setDraftTitle('');
      setDraftBody('');
      setDraftUrl('/');
      setDraftAudience('all');
      setDraftCategoryLabel('Modèles Personnalisés');
      setDraftTime('À tout moment');
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
        categoryLabel: draftCategoryLabel.trim() || 'Modèles Personnalisés',
        title: draftTitle.trim(),
        body: draftBody.trim(),
        url: draftUrl.trim() || '/',
        audience: draftAudience,
        recommendedTime: draftTime.trim() || 'À tout moment',
      });
      setIsModalOpen(false);
      setEditingTemplate(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!(await confirmDialog({ title: 'Supprimer ce modèle ?', message: `« ${title} » sera retiré des modèles.`, confirmLabel: 'Supprimer' }))) return;
    await onDeleteCustomTemplate(id);
  };

  const filteredTemplates = useMemo(() => {
    return allTemplates.filter((t) => {
      if (filterCategory === 'custom' && !t.isCustom) return false;
      if (filterCategory === 'growth' && t.category !== 'diversity' && t.category !== 'first_order' && t.category !== 'whatsapp' && t.category !== 'survey') return false;
      if (filterCategory === 'market' && t.audience === 'delivery') return false;
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
      {/* Barre d'outils filtres et action création */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
              filterCategory === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Tous ({allTemplates.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('custom')}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-colors ${
              filterCategory === 'custom' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Bookmark className="h-3 w-3" />
            Mes modèles ({allTemplates.filter((t) => t.isCustom).length})
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('growth')}
            className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
              filterCategory === 'growth' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🔥 Croissance
          </button>
          <button
            type="button"
            onClick={() => setFilterCategory('delivery')}
            className={`rounded-lg px-2.5 py-1 font-medium transition-colors ${
              filterCategory === 'delivery' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            🛵 Livreurs
          </button>
        </div>

        <button
          type="button"
          onClick={() => openCreateModal()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Nouveau modèle
        </button>
      </div>

      {/* Recherche rapide */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un modèle de notification..."
          className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs placeholder-gray-400 focus:border-gray-900 focus:outline-none"
        />
      </div>

      {/* Liste dense des modèles en 1 clic */}
      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 divide-y divide-gray-100">
        {filteredTemplates.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">Aucun modèle correspondant.</p>
        ) : (
          filteredTemplates.map((t) => {
            const isSelected = selectedTemplateId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => onSelectTemplate(t)}
                className={`group flex items-start justify-between gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-50 border border-amber-300'
                    : 'bg-white hover:bg-gray-50 border border-transparent hover:border-gray-200'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-xs text-gray-900 truncate">{t.title}</span>
                    {t.isCustom ? (
                      <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800">
                        Perso
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400">· {t.categoryLabel}</span>
                    )}
                    <span className="text-[10px] text-gray-400">
                      ({t.audience === 'delivery' ? 'Livreurs' : t.audience === 'market' ? 'Market' : 'Tous'})
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-gray-600 mt-0.5 leading-relaxed">{t.body}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  {t.isCustom && (
                    <>
                      <button
                        type="button"
                        title="Modifier ce modèle"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreateModal(t);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Supprimer"
                        onClick={(e) => handleDelete(e, t.id, t.title)}
                        className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-md"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-100 text-gray-700 group-hover:bg-gray-900 group-hover:text-white'
                    }`}
                  >
                    {isSelected ? <Check className="h-3 w-3" /> : 'Utiliser'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Créer / Éditer Modèle */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-amber-600" />
                <h3 className="text-sm font-bold text-gray-900">
                  {editingTemplate ? 'Modifier le modèle' : 'Enregistrer un nouveau modèle'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Titre de la notification (max 65)</label>
                <input
                  type="text"
                  maxLength={65}
                  required
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="Ex: Arrivage frais ce week-end à Daloa !"
                  className={adminInputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Message (max 180)</label>
                <textarea
                  rows={3}
                  maxLength={180}
                  required
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  placeholder="Ex: Découvrez les nouveautés publiées par nos vendeurs locaux. Livraison rapide à domicile."
                  className={adminInputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Audience cible</label>
                  <select
                    value={draftAudience}
                    onChange={(e) => setDraftAudience(e.target.value as any)}
                    className={adminInputClass}
                  >
                    <option value="all">Tous (DaloaMarket & Delivery)</option>
                    <option value="market">Acheteurs & Vendeurs (Market)</option>
                    <option value="delivery">Livreurs (Delivery)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Lien de redirection</label>
                  <input
                    type="text"
                    value={draftUrl}
                    onChange={(e) => setDraftUrl(e.target.value)}
                    placeholder="/"
                    className={adminInputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Annuler
                </button>
                <AdminButton variant="primary" loading={saving} disabled={!draftTitle.trim() || !draftBody.trim()}>
                  {editingTemplate ? 'Mettre à jour' : 'Enregistrer le modèle'}
                </AdminButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

