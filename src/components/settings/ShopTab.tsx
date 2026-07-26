import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Camera, Save, Store, Upload, Image as ImageIcon, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { friendlyError } from '../../lib/messages';
import { PHASE0_FREE_MODE } from '../../lib/featureFlags';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { LocationPicker } from '../ui/LocationPicker';
import { Avatar } from '../profile/Avatar';
import type { ShopFormData } from '../../types/settings';

const THEME_COLORS = [
  { value: '#FF7F00', label: 'Orange' },
  { value: '#0066CC', label: 'Bleu' },
  { value: '#10B981', label: 'Vert' },
  { value: '#8B5CF6', label: 'Violet' },
  { value: '#EF4444', label: 'Rouge' },
  { value: '#1F2937', label: 'Anthracite' },
];

export const ShopTab: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useSupabase();

  const [shopSaving, setShopSaving] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [shopBannerUrl, setShopBannerUrl] = useState<string | null>(null);
  const [shopLogoUrl, setShopLogoUrl] = useState<string | null>(null);
  const [shopLatitude, setShopLatitude] = useState<number>(6.8774);
  const [shopLongitude, setShopLongitude] = useState<number>(-6.4502);

  const {
    register: registerShop,
    handleSubmit: handleSubmitShop,
    reset: resetShop,
    watch: watchShop,
  } = useForm<ShopFormData>({
    defaultValues: {
      shop_name: '',
      shop_description: '',
      shop_theme_color: '#FF7F00',
    },
  });

  const selectedColor = watchShop('shop_theme_color');

  const isPro = userProfile?.pro_until
    ? new Date(userProfile.pro_until) > new Date()
    : false;
  const shopUnlocked = isPro || PHASE0_FREE_MODE;

  useEffect(() => {
    if (userProfile) {
      const up = userProfile as any;
      setShopBannerUrl(up.shop_banner_url || null);
      setShopLogoUrl(up.shop_logo_url || null);
      const lat = up.shop_latitude;
      const lng = up.shop_longitude;
      if (lat != null) setShopLatitude(lat);
      if (lng != null) setShopLongitude(lng);
      resetShop({
        shop_name: up.shop_name || '',
        shop_description: up.shop_description || '',
        shop_theme_color: up.shop_theme_color || '#FF7F00',
      });
    }
  }, [userProfile, resetShop]);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const fp = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(fp, file, { upsert: true });
    if (error) { toast.error('Erreur de téléversement'); return null; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fp);
    return data.publicUrl;
  }, [user]);

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingBanner(true);
    const url = await uploadFile(f);
    if (url) {
      setShopBannerUrl(url);
      await updateUserProfile({ shop_banner_url: url } as any);
      toast.success('Bannière mise à jour');
    }
    setUploadingBanner(false);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploadingLogo(true);
    const url = await uploadFile(f);
    if (url) {
      setShopLogoUrl(url);
      await updateUserProfile({ shop_logo_url: url } as any);
      toast.success('Logo mis à jour');
    }
    setUploadingLogo(false);
  };

  const [locationSaving, setLocationSaving] = useState(false);

  const handleLocationSave = useCallback(async (lat: number, lng: number) => {
    setLocationSaving(true);
    try {
      await updateUserProfile({
        shop_latitude: lat,
        shop_longitude: lng,
      } as any);
      toast.success('Position enregistrée');
    } catch (err: any) {
      toast.error(friendlyError(err));
    } finally {
      setLocationSaving(false);
    }
  }, [updateUserProfile]);

  const onShopSubmit = async (data: ShopFormData) => {
    setShopSaving(true);
    try {
      await updateUserProfile({
        shop_name: data.shop_name,
        shop_description: data.shop_description,
        shop_theme_color: data.shop_theme_color,
        shop_latitude: shopLatitude,
        shop_longitude: shopLongitude,
      } as any);
      toast.success('Boutique mise à jour !');
    } catch (err: any) {
      toast.error(friendlyError(err));
    } finally {
      setShopSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Section Localisation — accessible à tous les vendeurs (PRO et non-PRO) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Emplacement de la boutique
          </p>
          {locationSaving && (
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <LoadingSpinner size="sm" /> Enregistrement...
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Obligatoire pour vendre — détermine les frais de livraison selon la distance acheteur-vendeur.
        </p>
        <LocationPicker
          initialLat={shopLatitude}
          initialLng={shopLongitude}
          onLocationChange={(lat, lng) => {
            setShopLatitude(lat);
            setShopLongitude(lng);
            handleLocationSave(lat, lng);
          }}
          placeholder="Cliquez sur la carte pour définir l'emplacement"
        />
        <p className="text-[11px] text-gray-400 mt-3 leading-relaxed">
          Coordonnées : {shopLatitude.toFixed(5)}, {shopLongitude.toFixed(5)} &mdash; la position est sauvegardée automatiquement.
        </p>
      </div>

      {/* Section Cosmétique — réservée aux PRO */}
      {shopUnlocked ? (
        <>
          {/* Aperçu de la boutique */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-2">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Aperçu de votre vitrine
              </p>
              <div className="flex items-center gap-2">
                {isPro && user && (
                  <button
                    type="button"
                    onClick={() => {
                      const shopTitle = (userProfile as any)?.shop_name || userProfile?.full_name || 'Ma boutique DaloaMarket';
                      const shareText = `Découvrez ma boutique ${shopTitle} sur DaloaMarket !`;
                      const shareUrl = `${window.location.origin}/seller/${user.id}`;

                      if (navigator.share) {
                        navigator.share({
                          title: shopTitle,
                          text: shareText,
                          url: shareUrl,
                        }).catch(() => {
                          navigator.clipboard.writeText(shareUrl).then(
                            () => toast.success('Lien de votre boutique copié !'),
                            () => toast.error('Impossible de copier le lien')
                          );
                        });
                      } else {
                        navigator.clipboard.writeText(shareUrl).then(
                          () => toast.success('Lien de votre boutique copié !'),
                          () => toast.error('Impossible de copier le lien')
                        );
                      }
                    }}
                    className="text-xs font-bold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Partager ma boutique
                  </button>
                )}
                <span className="text-[10px] text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full">En direct</span>
              </div>
            </div>
            <div className="relative">
              {shopBannerUrl ? (
                <div className="h-24 w-full relative">
                  <img src={shopBannerUrl} alt="Banner preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20" />
                </div>
              ) : selectedColor ? (
                <div className="h-24 w-full opacity-20" style={{ backgroundColor: selectedColor }} />
              ) : (
                <div className="h-24 w-full opacity-10" style={{ background: 'var(--gradient-primary)' }} />
              )}

              <div className="relative px-4 pb-4 pt-12 flex flex-col items-center text-center">
                <div className="absolute -top-10">
                  <Avatar
                    src={shopLogoUrl || userProfile?.avatar_url}
                    name={watchShop('shop_name') || userProfile?.full_name || 'Boutique'}
                    size="lg"
                    className="ring-4 ring-white shadow-md"
                    style={selectedColor ? { borderColor: selectedColor } : undefined}
                  />
                </div>
                <h4 className="font-bold text-gray-900 mt-2 text-lg">
                  {watchShop('shop_name') || userProfile?.full_name || 'Nom de la boutique'}
                </h4>
                {watchShop('shop_description') && (
                  <p className="text-sm text-gray-500 mt-1 max-w-xs line-clamp-2">
                    {watchShop('shop_description')}
                  </p>
                )}
                <div className="mt-3">
                  <div
                    className="px-4 py-1.5 rounded-xl text-sm font-semibold text-white shadow-sm"
                    style={{ backgroundColor: selectedColor || 'var(--color-primary)' }}
                  >
                    Contacter
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bannière */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Bannière de la boutique
            </p>
            <label className="block relative aspect-[3/1] bg-gray-100 rounded-xl overflow-hidden cursor-pointer active:scale-[0.99] transition-transform group">
              {shopBannerUrl ? (
                <img src={shopBannerUrl} alt="Bannière" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <Upload className="h-7 w-7" />
                  <span className="text-sm font-medium">Ajouter une bannière</span>
                  <span className="text-xs text-gray-300">1500 × 500 recommandé</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-white/90 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> Changer
                </div>
              </div>
              <input type="file" accept="image/*" onChange={handleBannerUpload} className="hidden" disabled={uploadingBanner} />
              {uploadingBanner && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <LoadingSpinner size="md" />
                </div>
              )}
            </label>
          </div>

          {/* Logo boutique */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Logo de la boutique
              </p>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Distinct de votre photo de profil — s'affiche sur votre vitrine publique
            </p>
            <div className="flex items-center gap-4">
              <label className="relative block w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 cursor-pointer active:scale-[0.97] transition-transform group flex-shrink-0">
                {shopLogoUrl ? (
                  <img src={shopLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <ImageIcon className="h-7 w-7" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Camera className="w-5 h-5 text-white" />
                </div>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" disabled={uploadingLogo} />
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                )}
              </label>
              <div>
                <p className="text-sm font-medium text-gray-700">Logo boutique</p>
                <p className="text-xs text-gray-400 mt-0.5">Carré, 400 × 400 recommandé</p>
                <p className="text-[11px] text-gray-300 mt-1">Différent de votre avatar personnel</p>
              </div>
            </div>
          </div>

          {/* Formulaire nom / desc / couleur */}
          <form onSubmit={handleSubmitShop(onShopSubmit)} className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                Identité de la boutique
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la boutique</label>
                <input
                  {...registerShop('shop_name')}
                  className="w-full h-11 px-4 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  placeholder="Ex: ElmaShop"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  {...registerShop('shop_description')}
                  className="w-full px-4 py-3 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Décrivez votre boutique en quelques mots..."
                  maxLength={200}
                />
              </div>

              {/* Couleur thème */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Couleur d'accentuation</label>
                <div className="flex flex-wrap gap-3">
                  {THEME_COLORS.map((tc) => (
                    <label key={tc.value} className="cursor-pointer">
                      <input
                        type="radio"
                        value={tc.value}
                        {...registerShop('shop_theme_color')}
                        className="hidden peer"
                      />
                      <div
                        className={cn(
                          'w-9 h-9 rounded-full border-2 transition-all active:scale-90',
                          selectedColor === tc.value
                            ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-400 scale-110'
                            : 'border-transparent hover:scale-105'
                        )}
                        style={{ backgroundColor: tc.value }}
                        title={tc.label}
                      />
                    </label>
                  ))}
                </div>
                {selectedColor && (
                  <p className="text-xs text-gray-400 mt-2">
                    Couleur sélectionnée :{' '}
                    <span className="font-semibold" style={{ color: selectedColor }}>
                      {THEME_COLORS.find((c) => c.value === selectedColor)?.label || selectedColor}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              variant="filled"
              color="primary"
              size="md"
              fullWidth
              loading={shopSaving}
              icon={<Save className="w-4 h-4" />}
            >
              Enregistrer la boutique
            </Button>
          </form>
        </>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #fff3e0, #ffe0b2)' }}
          >
            <Store className="w-8 h-8 text-orange-400" />
          </div>
          <h3 className="font-bold text-gray-900 mb-1">Personnalisation réservée aux PRO</h3>
          <p className="text-sm text-gray-500 mb-5">
            Créez votre vitrine personnalisée avec bannière, logo et nom de boutique pour attirer plus de clients.
          </p>
          <Button color="primary" onClick={() => navigate('/become-pro')}>
            Devenir Pro
          </Button>
        </div>
      )}
    </div>
  );
};
