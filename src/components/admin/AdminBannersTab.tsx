import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Image as ImageIcon,
  Eye,
  MousePointerClick,
  DollarSign,
  Edit2,
  Trash2,
  ExternalLink,
  Flame,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';
import { confirmDialog } from '../ui/ConfirmDialog';
import {
  AdminPageHeader,
  AdminStatGrid,
  AdminStatCard,
  AdminButton,
  AdminBadge,
  AdminEmpty,
} from './ui/AdminUI';
import { AdminBannerModal, type BannerFormData } from './AdminBannerModal';

interface PromoBannerRow extends BannerFormData {
  id: string;
  views_count: number;
  clicks_count: number;
  created_at: string;
  updated_at: string;
}

export const AdminBannersTab: React.FC = () => {
  const [banners, setBanners] = useState<PromoBannerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerFormData | null>(null);

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promo_banners')
        .select('*')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBanners(data || []);
    } catch {
      toast.error('Impossible de charger les affiches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const stats = useMemo(() => {
    const total = banners.length;
    const active = banners.filter((b) => b.is_active).length;
    const views = banners.reduce((sum, b) => sum + (b.views_count || 0), 0);
    const clicks = banners.reduce((sum, b) => sum + (b.clicks_count || 0), 0);
    const revenue = banners.reduce((sum, b) => sum + (Number(b.price_paid) || 0), 0);
    return { total, active, views, clicks, revenue };
  }, [banners]);

  const handleToggleActive = async (banner: PromoBannerRow) => {
    try {
      const nextState = !banner.is_active;
      const { error } = await supabase
        .from('promo_banners')
        .update({ is_active: nextState, updated_at: new Date().toISOString() })
        .eq('id', banner.id);

      if (error) throw error;
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, is_active: nextState } : b))
      );
      toast.success(nextState ? 'Affiche activée' : 'Affiche mise en veille');
    } catch {
      toast.error('Erreur lors du changement de statut');
    }
  };

  const handleDelete = async (banner: PromoBannerRow) => {
    const confirmed = await confirmDialog({
      title: 'Supprimer l’affiche',
      message: `Voulez-vous vraiment supprimer définitivement l'affiche « ${banner.title} » ?`,
      danger: true,
      confirmLabel: 'Supprimer',
      cancelLabel: 'Conserver',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase.from('promo_banners').delete().eq('id', banner.id);
      if (error) throw error;

      setBanners((prev) => prev.filter((b) => b.id !== banner.id));
      toast.success('Affiche supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleQuickExtend = async (banner: PromoBannerRow, days: number) => {
    try {
      const base = banner.ends_at && new Date(banner.ends_at) > new Date()
        ? new Date(banner.ends_at)
        : new Date();
      const nextEnd = new Date(base.getTime() + days * 86400000).toISOString();
      const { error } = await supabase
        .from('promo_banners')
        .update({ ends_at: nextEnd, is_active: true, updated_at: new Date().toISOString() })
        .eq('id', banner.id);
      if (error) throw error;
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, ends_at: nextEnd, is_active: true } : b))
      );
      toast.success(`Affiche prolongée de +${days}j`);
    } catch {
      toast.error('Erreur lors de la prolongation');
    }
  };

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (banner: PromoBannerRow) => {
    setEditingBanner(banner);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <AdminPageHeader
        title="Affiches & Carrousel d'accueil"
        description="Gérez les bannières HD de l'application mobile, monétisez les affiches sponsorisées et suivez les performances."
        actions={
          <AdminButton variant="primary" icon={Plus} onClick={handleOpenCreate}>
            Nouvelle affiche
          </AdminButton>
        }
      />

      {/* KPI Metrics */}
      <AdminStatGrid>
        <AdminStatCard
          label="Total affiches"
          value={stats.total}
          icon={ImageIcon}
          hint={`${stats.active} actuellement en ligne`}
        />
        <AdminStatCard
          label="Affichages cumulés"
          value={stats.views.toLocaleString('fr-FR')}
          icon={Eye}
          hint="Impressions totales dans l'application"
        />
        <AdminStatCard
          label="Clics générés"
          value={stats.clicks.toLocaleString('fr-FR')}
          icon={MousePointerClick}
          hint={
            stats.views > 0
              ? `Taux de clic moyen : ${((stats.clicks / stats.views) * 100).toFixed(1)} %`
              : 'Aucun clic enregistré'
          }
          tone="success"
        />
        <AdminStatCard
          label="Revenus sponsoring"
          value={`${formatPrice(stats.revenue)} F`}
          icon={DollarSign}
          hint="Facturé aux commerçants et partenaires"
          tone="warning"
        />
      </AdminStatGrid>

      {/* Liste des affiches */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-4">
          <h3 className="text-sm font-bold text-gray-900">
            Campagnes et affiches configurées ({banners.length})
          </h3>
        </div>

        {banners.length === 0 && !loading ? (
          <div className="p-8">
            <AdminEmpty
              icon={ImageIcon}
              title="Aucune affiche active"
              description="Créez votre première affiche pour promouvoir un service ou vendre un emplacement sponsorisé à un commerçant de Daloa."
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {banners.map((banner) => {
              const ctr = banner.views_count > 0 ? ((banner.clicks_count / banner.views_count) * 100).toFixed(1) : '0.0';
              return (
                <div
                  key={banner.id}
                  className="flex flex-col gap-4 p-5 transition-colors hover:bg-gray-50/80 md:flex-row md:items-center md:justify-between"
                >
                  {/* Visuel et infos de l'affiche */}
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="relative h-20 w-36 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="h-full w-full object-cover"
                      />
                      {banner.badge_text ? (
                        <span
                          style={{ backgroundColor: banner.badge_color || '#FF9800' }}
                          className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-black tracking-wider text-white uppercase shadow-sm"
                        >
                          {banner.badge_text}
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 truncate">{banner.title}</h4>
                        {banner.is_active ? (
                          <AdminBadge tone="success">En ligne</AdminBadge>
                        ) : (
                          <AdminBadge tone="neutral">En pause</AdminBadge>
                        )}
                        {banner.priority > 0 && (
                          <span className="flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                            <Flame size={12} /> Prio {banner.priority}
                          </span>
                        )}
                      </div>

                      {banner.subtitle ? (
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{banner.subtitle}</p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                          {banner.link_type}
                        </span>
                        {banner.ends_at ? (
                          <span className={`rounded-md px-1.5 py-0.5 font-bold ${
                            new Date(banner.ends_at) < new Date() ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                          }`}>
                            {new Date(banner.ends_at) < new Date() ? 'Expiré' : `Reste ${Math.ceil((new Date(banner.ends_at).getTime() - Date.now()) / 86400000)}j`}
                          </span>
                        ) : (
                          <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-gray-600">Permanent</span>
                        )}
                        {banner.sponsor_name && <span>Par : <strong className="text-gray-900">{banner.sponsor_name}</strong></span>}
                        {banner.price_paid > 0 && <span className="font-semibold text-emerald-700">{formatPrice(banner.price_paid)} F</span>}
                      </div>
                    </div>
                  </div>

                  {/* Compteurs & Actions */}
                  <div className="flex items-center justify-between gap-6 border-t border-gray-100 pt-3 md:border-t-0 md:pt-0">
                    <div className="flex items-center gap-4 text-xs tabular-nums text-gray-600">
                      <div className="text-center">
                        <p className="font-bold text-gray-900">{banner.views_count}</p>
                        <p className="text-[10px] text-gray-400">Vues</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-gray-900">{banner.clicks_count}</p>
                        <p className="text-[10px] text-gray-400">Clics</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-emerald-600">{ctr} %</p>
                        <p className="text-[10px] text-gray-400">CTR</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(banner)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                          banner.is_active
                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                        }`}
                      >
                        {banner.is_active ? 'Suspendre' : 'Publier'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickExtend(banner, 7)}
                        className="rounded-lg bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700 hover:bg-orange-100"
                        title="Prolonger de 7 jours"
                      >
                        +7j
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(banner)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                        title="Modifier"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(banner)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Création / Édition */}
      {isModalOpen && (
        <AdminBannerModal
          banner={editingBanner}
          onClose={() => setIsModalOpen(false)}
          onSaved={fetchBanners}
        />
      )}
    </div>
  );
};
