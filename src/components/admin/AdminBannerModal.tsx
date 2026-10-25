import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import {
  AdminButton,
  AdminField,
  adminInputClass,
} from './ui/AdminUI';

export interface BannerFormData {
  id?: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  badge_text: string | null;
  badge_color: string | null;
  link_type: 'express' | 'referral' | 'listing' | 'seller' | 'external' | string;
  link_target: string | null;
  sponsor_name: string | null;
  price_paid: number;
  priority: number;
  is_active: boolean;
}

const COLOR_PRESETS = [
  { label: 'Orange', value: '#FF9800' }, { label: 'Vert', value: '#16A34A' },
  { label: 'Rouge', value: '#DC2626' }, { label: 'Bleu', value: '#2563EB' }, { label: 'Violet', value: '#7C3AED' },
];

const LINK_TYPES: { value: BannerFormData['link_type']; label: string; placeholder: string }[] = [
  { value: 'express', label: 'Coursier Express (Course interne)', placeholder: 'Automatique (/express)' },
  { value: 'referral', label: 'Parrainage Daloa Cash', placeholder: 'Automatique (/profile/referral)' },
  { value: 'listing', label: 'Annonce spécifique (ID)', placeholder: 'Ex: e2b4f981-...' },
  { value: 'seller', label: 'Boutique vendeur (ID)', placeholder: 'Ex: 9c011bfa-...' },
  { value: 'external', label: 'Lien Web externe', placeholder: 'Ex: https://...' },
];

interface AdminBannerModalProps {
  banner?: BannerFormData | null;
  onClose: () => void;
  onSaved: () => void;
}

export const AdminBannerModal: React.FC<AdminBannerModalProps> = ({
  banner,
  onClose,
  onSaved,
}) => {
  const [formData, setFormData] = useState<BannerFormData>({
    title: '', subtitle: '', image_url: '', badge_text: 'SPONSORISÉ', badge_color: '#FF9800',
    link_type: 'listing', link_target: '', sponsor_name: '', price_paid: 0, priority: 5, is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (banner) {
      setFormData(banner);
    }
  }, [banner]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      setFormData((prev) => ({ ...prev, image_url: data.publicUrl }));
      toast.success('Affiche téléversée');
    } catch {
      toast.error('Échec du téléversement de l’affiche');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Le titre de l’affiche est requis');
      return;
    }
    if (!formData.image_url.trim()) {
      toast.error('L’image de l’affiche est requise');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        subtitle: formData.subtitle?.trim() || null,
        image_url: formData.image_url.trim(),
        badge_text: formData.badge_text?.trim() || null,
        badge_color: formData.badge_color || '#FF9800',
        link_type: formData.link_type,
        link_target: formData.link_target?.trim() || null,
        sponsor_name: formData.sponsor_name?.trim() || null,
        price_paid: Number(formData.price_paid) || 0,
        priority: Number(formData.priority) || 0,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (formData.id) {
        const { error } = await supabase.from('promo_banners').update(payload).eq('id', formData.id);
        if (error) throw error;
        toast.success('Affiche mise à jour avec succès');
      } else {
        const { error } = await supabase.from('promo_banners').insert(payload);
        if (error) throw error;
        toast.success('Nouvelle affiche créée avec succès');
      }

      onSaved();
      onClose();
    } catch {
      toast.error('Erreur lors de l’enregistrement de l’affiche');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl bg-white shadow-2xl">
        {/* En-tête */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <ImageIcon size={18} />
            </span>
            <h3 className="text-base font-bold text-gray-900">
              {formData.id ? 'Modifier l’affiche promotionnelle' : 'Nouvelle affiche carrousel'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corps de formulaire */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <AdminField label="Titre principal de l’affiche *" hint="Court et percutant (max 60 car.)">
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Soldes High-Tech chez Boutique Alpha"
              className={adminInputClass}
              maxLength={70}
              required
            />
          </AdminField>

          <AdminField label="Sous-titre descriptif" hint="Précision ou offre spéciale">
            <input
              type="text"
              value={formData.subtitle || ''}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="Ex: Jusqu'à -30% sur tous les smartphones neufs"
              className={adminInputClass}
              maxLength={120}
            />
          </AdminField>

          {/* Image & Téléversement */}
          <div className="space-y-2">
            <AdminField label="Visuel de l'affiche (format 16:9 recommandé) *">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className={adminInputClass}
                />
                <label className="flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  <span>Téléverser</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </AdminField>

            {formData.image_url ? (
              <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                <img src={formData.image_url} alt="Aperçu" className="h-full w-full object-cover" />
                {formData.badge_text ? (
                  <span
                    style={{ backgroundColor: formData.badge_color || '#FF9800' }}
                    className="absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white uppercase shadow"
                  >
                    {formData.badge_text}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Badge & Couleur */}
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Badge promo" hint="Ex: SPONSORISÉ, PROMO, FLASH">
              <input
                type="text"
                value={formData.badge_text || ''}
                onChange={(e) => setFormData({ ...formData, badge_text: e.target.value.toUpperCase() })}
                placeholder="SPONSORISÉ"
                className={adminInputClass}
                maxLength={20}
              />
            </AdminField>

            <AdminField label="Couleur du badge">
              <div className="flex items-center gap-2 pt-1">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, badge_color: c.value })}
                    style={{ backgroundColor: c.value }}
                    className={`h-7 w-7 rounded-full transition-transform ${
                      formData.badge_color === c.value ? 'scale-125 ring-2 ring-gray-900 ring-offset-2' : 'opacity-70'
                    }`}
                    title={c.label}
                  />
                ))}
              </div>
            </AdminField>
          </div>

          {/* Redirection */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Action au clic">
              <select
                value={formData.link_type}
                onChange={(e) =>
                  setFormData({ ...formData, link_type: e.target.value as BannerFormData['link_type'] })
                }
                className={adminInputClass}
              >
                {LINK_TYPES.map((lt) => (
                  <option key={lt.value} value={lt.value}>
                    {lt.label}
                  </option>
                ))}
              </select>
            </AdminField>

            {formData.link_type !== 'express' && formData.link_type !== 'referral' ? (
              <AdminField label="Cible du lien">
                <input
                  type="text"
                  value={formData.link_target || ''}
                  onChange={(e) => setFormData({ ...formData, link_target: e.target.value })}
                  placeholder={
                    LINK_TYPES.find((t) => t.value === formData.link_type)?.placeholder || 'ID ou URL cible'
                  }
                  className={adminInputClass}
                />
              </AdminField>
            ) : null}
          </div>

          {/* Monétisation et sponsoring */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3">
            <p className="mb-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
              Facturation & Monétisation de l’affiche
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <AdminField label="Nom du commerçant">
                <input
                  type="text"
                  value={formData.sponsor_name || ''}
                  onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
                  placeholder="Ex: Boutique Yaoundé"
                  className={adminInputClass}
                />
              </AdminField>

              <AdminField label="Montant facturé (FCFA)">
                <input
                  type="number"
                  value={formData.price_paid || ''}
                  onChange={(e) => setFormData({ ...formData, price_paid: Number(e.target.value) })}
                  placeholder="5000"
                  className={adminInputClass}
                />
              </AdminField>

              <AdminField label="Priorité d'affichage">
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                  placeholder="10"
                  className={adminInputClass}
                />
              </AdminField>
            </div>
          </div>

          {/* Activation */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Activer l'affichage</p>
              <p className="text-xs text-gray-500">Visible immédiatement sur l'application mobile DaloaMarket</p>
            </div>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-5 w-5 rounded text-orange-600 focus:ring-orange-500"
            />
          </div>

          {/* Pied de formulaire */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <AdminButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Annuler
            </AdminButton>
            <AdminButton type="submit" variant="primary" loading={saving}>
              {formData.id ? 'Mettre à jour' : 'Créer l’affiche'}
            </AdminButton>
          </div>
        </form>
      </div>
    </div>
  );
};
