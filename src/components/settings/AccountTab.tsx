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
  const [pushEnabled, setPushEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ('Notification' in window) {
      setPushEnabled(Notification.permission === 'granted');
    }
  }, []);

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

  const validatePayoutNumber = (value: string, formValues: AccountFormData) => {
    if (!formValues.payout_network && !value) return true;
    if (formValues.payout_network && !value) return 'Le numéro est requis pour le retrait';
    if (value) {
       const cleaned = value.replace(/\D/g, '');
       if (cleaned.startsWith('225') && cleaned.length === 13) return true;
       if (cleaned.length === 10) return true;
       return 'Numéro invalide (ex: 0701020304)';
    }
    return true;
  };

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop();
    const fp = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(fp, file, { upsert: true });
    if (error) { toast.error('Erreur de téléversement'); return null; }
    const { data } = supabase.storage.from('avatars').getPublicUrl(fp);
    return data.publicUrl;
  }, [user]);

  const handleAvatarUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith('image/')) { toast.error('Sélectionnez une image.'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5 Mo."); return; }
    setUploading(true);
    const url = await uploadFile(file);
    if (url) {
      setAvatarUrl(url);
      await updateUserProfile({ avatar_url: url });
      toast.success('Photo de profil mise à jour !');
    }
    setUploading(false);
  }, [user, uploadFile, updateUserProfile]);

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
      toast.success('Profil mis à jour !');
    } catch (err: any) {
      toast.error(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePush = async () => {
    if (pushEnabled) {
      setPushEnabled(false);
      toast.success('Notifications désactivées.');
    } else {
      if (!('Notification' in window)) {
        toast.error('Notifications non supportées sur ce navigateur.');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm === 'granted') { setPushEnabled(true); toast.success('Notifications activées !'); }
      else toast.error('Permission refusée.');
    }
  };

  return (
    <form onSubmit={handleSubmitAccount(onAccountSubmit)} className="space-y-4">
      {/* Photo de profil */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">
          Photo de profil
        </p>
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <Avatar
              src={avatarUrl}
              name={userProfile?.full_name}
              size="xl"
              className="ring-4 ring-white shadow-md"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-md hover:opacity-90 active:scale-95 transition-all"
              aria-label="Changer la photo"
            >
              {uploading ? <LoadingSpinner size="sm" className="text-white" /> : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {userProfile?.full_name || 'Utilisateur'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Appuyez sur l'icône pour changer
            </p>
            <p className="text-[11px] text-gray-300 mt-1">Max 5 Mo · JPG, PNG, WEBP</p>
          </div>
        </div>
      </div>

      {/* Informations */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Informations personnelles
        </p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
          <input
            type="text"
            {...registerAccount('full_name', {
              required: 'Le nom est requis.',
              minLength: { value: 2, message: 'Minimum 2 caractères.' },
            })}
            className={cn(
              'w-full h-11 px-4 text-sm rounded-xl border bg-white text-gray-900 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
              accountErrors.full_name ? 'border-red-400' : 'border-gray-200'
            )}
            placeholder="Votre nom complet"
          />
          {accountErrors.full_name && (
            <p className="text-xs text-red-500 mt-1">{accountErrors.full_name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
          <input
            type="tel"
            {...registerAccount('phone', { validate: validatePhone })}
            className={cn(
              'w-full h-11 px-4 text-sm rounded-xl border bg-white text-gray-900 placeholder-gray-400 outline-none transition-all focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
              accountErrors.phone ? 'border-red-400' : 'border-gray-200'
            )}
            placeholder="Ex: 0701020304"
          />
          {accountErrors.phone && (
            <p className="text-xs text-red-500 mt-1">{accountErrors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Quartier</label>
          <select
            {...registerAccount('district', { required: 'Sélectionnez votre quartier.' })}
            className={cn(
              'w-full h-11 px-4 text-sm rounded-xl border bg-white text-gray-900 outline-none transition-all focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent',
              accountErrors.district ? 'border-red-400' : 'border-gray-200'
            )}
          >
            <option value="">Sélectionnez votre quartier</option>
            {DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          {accountErrors.district && (
            <p className="text-xs text-red-500 mt-1">{accountErrors.district.message}</p>
          )}
        </div>

        {/* Email readonly */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-gray-400 font-normal">
              <Lock className="w-3 h-3" /> Non modifiable
            </span>
          </label>
          <input
            type="email"
            value={user?.email || ''}
            disabled
            className="w-full h-11 px-4 text-sm rounded-xl border border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed outline-none"
          />
        </div>
      </div>

      {/* Coordonnées de paiement (Retraits) */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Coordonnées de paiement (Retraits)</h3>
          <p className="text-xs text-gray-500 mt-1">Configurez le réseau et le numéro de téléphone pour recevoir vos gains de ventes.</p>
        </div>
        <Link
          to="/settings/payout"
          className="flex-shrink-0 px-4 py-2.5 bg-gray-50 text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:scale-[0.98] transition-all text-xs font-bold rounded-xl flex items-center gap-1"
        >
          Configurer
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Notifications PWA */}
      <PwaNotificationSettings />

      {/* Save button */}
      <Button
        type="submit"
        variant="filled"
        color="primary"
        size="md"
        fullWidth
        loading={saving}
        icon={<Save className="w-4 h-4" />}
      >
        Enregistrer les modifications
      </Button>
    </form>
  );
};
