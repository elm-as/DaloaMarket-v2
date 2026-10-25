import React, { useState, useEffect } from 'react';
import { X, Upload, Loader2, Image as ImageIcon, Calendar, Clock, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { AdminButton, AdminField, adminInputClass } from './ui/AdminUI';

export interface BannerFormData {
  id?: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  badge_text: string | null;
  badge_color: string | null;
  link_type: 'express' | 'referral' | 'listing' | 'seller' | 'external' | string;
  link_target: string | null;
  seller_id?: string | null;
  sponsor_name: string | null;
  price_paid: number;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
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

export const AdminBannerModal: React.FC<{
  banner?: BannerFormData | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ banner, onClose, onSaved }) => {
  const [formData, setFormData] = useState<BannerFormData>({
    title: '', subtitle: '', image_url: '', badge_text: 'SPONSORISÉ', badge_color: '#FF9800',
    link_type: 'listing', link_target: '', sponsor_name: '', price_paid: 0, priority: 5,
    starts_at: new Date().toISOString(), ends_at: null, is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (banner) {
      setFormData({
        ...banner,
        subtitle: banner.subtitle || '',
        badge_text: banner.badge_text || '',
        badge_color: banner.badge_color || '#FF9800',
        link_target: banner.link_target || '',
        sponsor_name: banner.sponsor_name || '',
        starts_at: banner.starts_at || new Date().toISOString(),
        ends_at: banner.ends_at || null,
      });
    }
  }, [banner]);

  const applyDurationPack = (days: number, price: number) => {
    const base = formData.starts_at ? new Date(formData.starts_at) : new Date();
    const end = new Date(base.getTime() + days * 86400000);
    setFormData((prev) => ({
      ...prev,
      starts_at: base.toISOString(),
      ends_at: end.toISOString(),
      price_paid: price,
      badge_text: prev.badge_text || 'VEDETTE PRO',
    }));
    toast.success(`Pack ${days} jours appliqué (+${price} FCFA)`);
  };

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
      toast.error('Échec du téléversement');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.image_url.trim()) {
      toast.error('Le titre et l’image sont requis');
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
        starts_at: formData.starts_at || new Date().toISOString(),
        ends_at: formData.ends_at || null,
        is_active: formData.is_active,
        updated_at: new Date().toISOString(),
      };
      const query = formData.id
        ? supabase.from('promo_banners').update(payload).eq('id', formData.id)
        : supabase.from('promo_banners').insert(payload);
      const { error } = await query;
      if (error) throw error;
      toast.success(formData.id ? 'Affiche mise à jour' : 'Affiche créée avec succès');
      onSaved();
      onClose();
    } catch {
      toast.error('Erreur lors de l’enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const toLocalDateInput = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-xl flex-col rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
              <ImageIcon size={18} />
            </span>
            <h3 className="text-base font-bold text-gray-900">
              {formData.id ? 'Modifier l’affiche' : 'Nouvelle affiche carrousel'}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          {/* Raccourcis Setup Auto / Boost Supérieur */}
          <div className="rounded-2xl border border-orange-200 bg-orange-50/70 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles size={14} className="text-orange-600" />
              <p className="text-xs font-bold text-orange-950 uppercase tracking-wide">
                Setup rapide durée & boost VIP
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { days: 7, price: 3000, label: 'Pack 7J' },
                { days: 14, price: 5000, label: 'Pack 14J' },
                { days: 30, price: 10000, label: 'Pack 30J' },
              ].map((p) => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => applyDurationPack(p.days, p.price)}
                  className="rounded-xl border border-orange-200 bg-white p-2 text-center hover:border-orange-500 hover:bg-orange-50 transition-all"
                >
                  <p className="text-xs font-bold text-gray-900">{p.label}</p>
                  <p className="text-[11px] font-semibold text-orange-600">{p.price} F</p>
                </button>
              ))}
            </div>
          </div>

          <AdminField label="Titre principal *" hint="Max 60 caractères">
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Ex: Soldes High-Tech..." className={adminInputClass} maxLength={70} required />
          </AdminField>
          <AdminField label="Sous-titre descriptif">
            <input type="text" value={formData.subtitle || ''} onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })} placeholder="Ex: Jusqu'à -30%..." className={adminInputClass} maxLength={120} />
          </AdminField>

          {/* Image & Téléversement */}
          <div className="space-y-2">
            <AdminField label="Visuel de l'affiche (format 16:9 recommandé) *">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                  className={adminInputClass}
                />
                <label className="flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  <span>Upload</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </AdminField>

            {formData.image_url ? (
              <div className="relative h-28 w-full overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
                <img src={formData.image_url} alt="Aperçu" className="h-full w-full object-cover" />
                {formData.badge_text ? (
                  <span
                    style={{ backgroundColor: formData.badge_color || '#FF9800' }}
                    className="absolute left-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-extrabold text-white uppercase shadow"
                  >
                    {formData.badge_text}
                  </span>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Badge & Couleur */}
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Badge promo">
              <input
                type="text"
                value={formData.badge_text || ''}
                onChange={(e) => setFormData({ ...formData, badge_text: e.target.value.toUpperCase() })}
                placeholder="SPONSORISÉ"
                className={adminInputClass}
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
                      formData.badge_color === c.value ? 'scale-125 ring-2 ring-gray-900 ring-offset-2' : 'opacity-60'
                    }`}
                  />
                ))}
              </div>
            </AdminField>
          </div>

          {/* Dates de diffusion */}
          <div className="grid grid-cols-2 gap-3">
            <AdminField label="Date de début">
              <input
                type="date"
                value={toLocalDateInput(formData.starts_at)}
                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className={adminInputClass}
              />
            </AdminField>
            <AdminField label="Date d'expiration" hint="Vide = permanent">
              <input
                type="date"
                value={toLocalDateInput(formData.ends_at)}
                onChange={(e) => setFormData({ ...formData, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className={adminInputClass}
              />
            </AdminField>
          </div>

          {/* Redirection */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Action au clic">
              <select
                value={formData.link_type}
                onChange={(e) => setFormData({ ...formData, link_type: e.target.value })}
                className={adminInputClass}
              >
                {LINK_TYPES.map((lt) => (
                  <option key={lt.value} value={lt.value}>{lt.label}</option>
                ))}
              </select>
            </AdminField>
            {formData.link_type !== 'express' && formData.link_type !== 'referral' && (
              <AdminField label="Cible du lien">
                <input
                  type="text"
                  value={formData.link_target || ''}
                  onChange={(e) => setFormData({ ...formData, link_target: e.target.value })}
                  placeholder={LINK_TYPES.find((t) => t.value === formData.link_type)?.placeholder || 'ID ou URL'}
                  className={adminInputClass}
                />
              </AdminField>
            )}
          </div>

          {/* Facturation & Sponsoring */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <AdminField label="Commerçant">
              <input type="text" value={formData.sponsor_name || ''} onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })} placeholder="Boutique..." className={adminInputClass} />
            </AdminField>
            <AdminField label="Facturé (FCFA)">
              <input type="number" value={formData.price_paid || ''} onChange={(e) => setFormData({ ...formData, price_paid: Number(e.target.value) })} className={adminInputClass} />
            </AdminField>
            <AdminField label="Priorité">
              <input type="number" value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })} className={adminInputClass} />
            </AdminField>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
            <div>
              <p className="text-sm font-semibold text-gray-900">Activer l'affichage</p>
              <p className="text-xs text-gray-500">Visible sur le carrousel mobile</p>
            </div>
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-5 w-5 rounded text-orange-600 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <AdminButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Annuler
            </AdminButton>
            <AdminButton type="submit" variant="primary" loading={saving}>
              {formData.id ? 'Mettre à jour' : 'Enregistrer'}
            </AdminButton>
          </div>
        </form>
      </div>
    </div>
  );
};
