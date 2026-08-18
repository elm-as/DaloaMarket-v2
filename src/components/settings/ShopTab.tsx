import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Camera, Save, Store, Upload, Image as ImageIcon, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { friendlyError } from '../../lib/messages';
import { usePhase } from '../../contexts/PhaseContext';
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
  const { isPhase0 } = usePhase();
  const shopUnlocked = isPro || isPhase0;

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
      {/* ── Section Localisation — obligatoire pour la vente ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
            Emplacement GPS de la boutique
          </p>
          {locationSaving && (
            <span className="text-[11px] font-bold text-orange-600 flex items-center gap-1">
              <LoadingSpinner size="sm" /> Enregistrement...
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          Position requise pour calculer automatiquement les frais de livraison aux acheteurs.
        </p>
        <LocationPicker
          initialLat={shopLatitude}
          initialLng={shopLongitude}
          onLocationChange={(lat, lng) => {
            setShopLatitude(lat);
            setShopLongitude(lng);
            handleLocationSave(lat, lng);
          }}
          placeholder="Cliquez sur la carte pour placer votre boutique"
        />
        <p className="text-[10px] font-bold text-gray-400 mt-2.5">
          Coordonnées actuelles : {shopLatitude.toFixed(5)}, {shopLongitude.toFixed(5)} · Sauvegarde automatique
        </p>
      </div>

      {/* ── Section Personnalisation Vitrine (Réservée aux PRO) ── */}
      {shopUnlocked ? (
        <form onSubmit={handleSubmitShop(onShopSubmit)} className="space-y-4">
          {/* ── Identité de la boutique ── */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                Identité de la vitrine
              </p>
              {isPro && (
                <span className="text-[10px] font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  ⭐ Vendeur Pro
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-gray-700 mb-1.5">
                Nom commercial de la boutique
              </label>
              <input
                {...registerShop('shop_name')}
                className="w-full h-11 px-3.5 text-xs sm:text-sm font-semibold rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20"
                placeholder="Ex: Boutique Élégance Daloa"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-700 mb-1.5">
                Description & Activité
              </label>
              <textarea
                {...registerShop('shop_description')}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm font-medium rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 resize-none"
                rows={3}
                placeholder="Présentez votre boutique, vos spécialités et vos garanties..."
                maxLength={200}
              />
            </div>

            {/* Couleur thème */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-black text-gray-700">Couleur d'accentuation du profil</label>
                {selectedColor && (
                  <span
                    className="text-[11px] font-black px-2.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: selectedColor }}
                  >
                    {THEME_COLORS.find((c) => c.value === selectedColor)?.label.split(' ')[0] || 'Choisie'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5">
                {THEME_COLORS.map((tc) => {
                  const isColorSelected = selectedColor === tc.value;
                  return (
                    <label key={tc.value} className="cursor-pointer relative">
                      <input
                        type="radio"
                        value={tc.value}
                        {...registerShop('shop_theme_color')}
                        className="hidden peer"
                      />
                      <div
                        className={cn(
                          'w-9 h-9 rounded-2xl border-2 transition-all active:scale-90 flex items-center justify-center shadow-2xs',
                          isColorSelected
                            ? 'border-gray-900 ring-2 ring-offset-2 ring-orange-500 scale-105'
                            : 'border-transparent hover:scale-105'
                        )}
                        style={{ backgroundColor: tc.value }}
                        title={tc.label}
                      >
                        {isColorSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Bannière Uploader ── */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-5">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
              Bannière de couverture
            </p>
            <label className="block relative aspect-[3/1] bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden cursor-pointer active:scale-[0.99] transition-all group hover:border-orange-300">
              {shopBannerUrl ? (
                <img src={shopBannerUrl} alt="Bannière" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-1.5 p-3 text-center">
                  <Upload className="h-6 w-6 text-orange-500" />
                  <span className="text-xs font-bold text-gray-700">Choisir une bannière</span>
                  <span className="text-[10px] text-gray-400">Recommandé : 1500 × 500 px · Max 5 Mo</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="bg-white/95 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-extrabold text-gray-800 flex items-center gap-1.5 shadow-sm">
                  <Camera className="w-3.5 h-3.5 text-orange-600" /> Changer la bannière
                </div>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                className="hidden"
                disabled={uploadingBanner}
              />
              {uploadingBanner && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <LoadingSpinner size="md" />
                </div>
              )}
            </label>
          </div>

          {/* ── Logo boutique Uploader ── */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-5">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1">
              Logo de la vitrine
            </p>
            <p className="text-xs text-gray-500 mb-3.5">
              Distinct de votre avatar personnel — visible sur votre vitrine publique.
            </p>
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                <label className="relative flex items-center justify-center w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 cursor-pointer active:scale-95 transition-all group hover:border-orange-400 shadow-2xs">
                  {shopLogoUrl ? (
                    <img src={shopLogoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <ImageIcon className="h-6 w-6 text-orange-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo}
                  />
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                </label>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black text-gray-900">Logo carré de vitrine</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Format 400 × 400 recommandé · Max 5 Mo</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Cliquez sur le carré pour modifier</p>
              </div>
            </div>
          </div>

          {/* ── Bouton Enregistrer ── */}
          <button
            type="submit"
            disabled={shopSaving}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs sm:text-sm font-black shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {shopSaving ? <LoadingSpinner size="sm" className="text-white" /> : <Save className="w-4 h-4" />}
            <span>{shopSaving ? 'Enregistrement...' : 'Enregistrer la boutique'}</span>
          </button>
        </form>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-3">
            <Store className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-gray-900 mb-1">Personnalisation réservée aux PRO</h3>
          <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">
            Créez votre vitrine personnalisée avec bannière, logo et nom de boutique pour attirer plus de clients.
          </p>
          <button
            type="button"
            onClick={() => navigate('/devenir-pro')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black text-xs shadow-md shadow-orange-500/25 active:scale-95 transition-all"
          >
            <span>Devenir Vendeur Pro</span>
          </button>
        </div>
      )}
    </div>
  );
};
