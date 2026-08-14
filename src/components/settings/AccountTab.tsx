import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Camera, Save, Bell, BellOff, Lock, ChevronRight } from 'lucide-react';
import { useSupabase } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import { cn, DISTRICTS } from '../../lib/utils';
import { friendlyError } from '../../lib/messages';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { Avatar } from '../profile/Avatar';
import { PwaNotificationSettings } from '../ui/PwaNotificationSettings';
import type { AccountFormData } from '../../types/settings';

export const AccountTab: React.FC = () => {
  const { user, userProfile, updateUserProfile } = useSupabase();

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: registerAccount,
    handleSubmit: handleSubmitAccount,
    formState: { errors: accountErrors },
    setValue: setAccountValue,
  } = useForm<AccountFormData>({
    defaultValues: {
      full_name: '',
      phone: '',
      district: '',
      payout_network: '',
      payout_number: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      setAccountValue('full_name', userProfile.full_name || '');
      setAccountValue('phone', userProfile.phone || '');
      setAccountValue('district', userProfile.district || '');
      const up = userProfile as any;
      setAccountValue('payout_network', up.payout_network || '');
      setAccountValue('payout_number', up.payout_number || '');
      setAvatarUrl(userProfile.avatar_url || null);
    }
  }, [userProfile, setAccountValue]);

  const validatePhone = (value: string) => {
    if (!value) return true;
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('225') && cleaned.length === 13) return true;
    if (cleaned.length === 10) return true;
    return 'Numéro ivoirien attendu (ex: 0701020304)';
  };

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const fp = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(fp, file, { upsert: true });
    if (error) {
      toast.error('Erreur de téléversement');
      return null;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fp);
    return data.publicUrl;
  }, [user]);

  const handleAvatarUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !user) return;
      if (!file.type.startsWith('image/')) {
        toast.error('Sélectionnez une image.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Max 5 Mo.');
        return;
      }
      setUploading(true);
      const url = await uploadFile(file);
      if (url) {
        setAvatarUrl(url);
        await updateUserProfile({ avatar_url: url });
        toast.success('Photo de profil mise à jour !');
      }
      setUploading(false);
    },
    [user, uploadFile, updateUserProfile]
  );

  const onAccountSubmit = async (data: AccountFormData) => {
    setSaving(true);
    try {
      const { error } = await updateUserProfile({
        full_name: data.full_name,
        phone: data.phone || null,
        district: data.district || null,
        payout_network: data.payout_network || null,
        payout_number: data.payout_number || null,
      } as any);
      if (error) throw error;
      toast.success('Profil mis à jour avec succès !');
    } catch (err: any) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmitAccount(onAccountSubmit)} className="space-y-4">
      {/* ── Photo de profil ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-5">
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
          Photo de profil
        </p>
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <Avatar
              src={avatarUrl}
              name={userProfile?.full_name}
              size="xl"
              className="ring-4 ring-orange-50 shadow-md"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
              aria-label="Changer la photo"
            >
              {uploading ? (
                <LoadingSpinner size="sm" className="text-white" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900">
              {userProfile?.full_name || 'Utilisateur'}
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">
              Cliquez sur l'appareil photo pour modifier
            </p>
            <p className="text-[10px] text-gray-300 mt-0.5">Format JPG, PNG, WEBP · Max 5 Mo</p>
          </div>
        </div>
      </div>

      {/* ── Informations personnelles ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-5 space-y-4">
        <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
          Informations personnelles
        </p>

        <div>
          <label className="block text-xs font-black text-gray-700 mb-1.5">Nom complet</label>
          <input
            type="text"
            {...registerAccount('full_name', {
              required: 'Le nom est requis.',
              minLength: { value: 2, message: 'Minimum 2 caractères.' },
            })}
            className={cn(
              'w-full h-11 px-3.5 text-xs sm:text-sm font-semibold rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20',
              accountErrors.full_name ? 'border-red-400 ring-1 ring-red-400' : ''
            )}
            placeholder="Votre nom complet"
          />
          {accountErrors.full_name && (
            <p className="text-[11px] text-red-500 mt-1 font-bold">{accountErrors.full_name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-black text-gray-700 mb-1.5">Numéro de téléphone</label>
          <input
            type="tel"
            {...registerAccount('phone', { validate: validatePhone })}
            className={cn(
              'w-full h-11 px-3.5 text-xs sm:text-sm font-semibold rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20',
              accountErrors.phone ? 'border-red-400 ring-1 ring-red-400' : ''
            )}
            placeholder="Ex: 0701020304"
          />
          {accountErrors.phone && (
            <p className="text-[11px] text-red-500 mt-1 font-bold">{accountErrors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-black text-gray-700 mb-1.5">Quartier à Daloa</label>
          <select
            {...registerAccount('district', { required: 'Sélectionnez votre quartier.' })}
            className={cn(
              'w-full h-11 px-3.5 text-xs sm:text-sm font-semibold rounded-2xl border border-gray-200 bg-gray-50/50 text-gray-900 outline-none transition-all focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20',
              accountErrors.district ? 'border-red-400 ring-1 ring-red-400' : ''
            )}
          >
            <option value="">Sélectionnez votre quartier</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {accountErrors.district && (
            <p className="text-[11px] text-red-500 mt-1 font-bold">{accountErrors.district.message}</p>
          )}
        </div>

        {/* Email readonly */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-black text-gray-700">Adresse e-mail</label>
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-bold">
              <Lock className="w-3 h-3" /> Fixe
            </span>
          </div>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full h-11 px-3.5 text-xs sm:text-sm font-medium rounded-2xl border border-gray-100 bg-gray-100 text-gray-400 cursor-not-allowed outline-none"
          />
        </div>
      </div>

      {/* ── Coordonnées de paiement (Retraits) ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-5 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-black text-gray-900">Coordonnées de retrait Mobile Money</h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Numéro Wave, Orange, MTN ou Moov pour recevoir vos gains
          </p>
        </div>
        <Link
          to="/settings/payout"
          className="flex-shrink-0 px-3.5 py-2 bg-orange-50 text-orange-600 hover:bg-orange-100 active:scale-95 transition-all text-xs font-extrabold rounded-2xl flex items-center gap-1"
        >
          <span>Gérer</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── Notifications PWA ── */}
      <PwaNotificationSettings />

      {/* ── Save CTA ── */}
      <button
        type="submit"
        disabled={saving}
        className="w-full h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs sm:text-sm font-black shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
      >
        {saving ? <LoadingSpinner size="sm" className="text-white" /> : <Save className="w-4 h-4" />}
        <span>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
      </button>
    </form>
  );
};
