import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { User, Phone, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSupabase } from '../../hooks/useSupabase';
import { supabase } from '../../lib/supabase';
import { friendlyError } from '../../lib/messages';
import { isDisposableEmail } from '../../lib/antiSpam';
import { trackCompleteRegistration } from '../../lib/analytics';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export interface RegisterFormValues {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  cguAccepted: boolean;
}

export const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { signUp } = useSupabase();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>();

  const onSubmit = async (data: RegisterFormValues) => {
    if (data.password !== data.confirmPassword) {
      setAuthError('Les mots de passe ne correspondent pas.');
      return;
    }

    if (isDisposableEmail(data.email)) {
      setAuthError('Les adresses email temporaires ou jetables ne sont pas autorisées.');
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      const res = await signUp(data.email.trim(), data.password, {
        full_name: data.fullName.trim(),
        name: data.fullName.trim(),
        phone: data.phone.trim(),
        role: 'buyer',
      });

      if (res.error) throw res.error;

      if (res.user?.id) {
        try {
          await supabase
            .from('users')
            .update({
              full_name: data.fullName.trim(),
              phone: data.phone.trim(),
              role: 'buyer',
            } as any)
            .eq('id', res.user.id);
        } catch {
          // Géré par le trigger Supabase en amont
        }
      }

      trackCompleteRegistration({ content_name: 'Register' });
      toast.success('Compte créé avec succès ! Bienvenue sur DaloaMarket.');
      navigate('/');
    } catch (err: any) {
      setAuthError(friendlyError(err));
      toast.error('Échec de l’inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError(friendlyError(err));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="w-full">
      {authError && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm font-medium">
          {authError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Nom complet */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1.5 pl-1">
            Nom et prénoms
          </label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              {...register('fullName', {
                required: 'Veuillez saisir votre nom complet',
                minLength: { value: 3, message: 'Minimum 3 caractères' },
              })}
              type="text"
              autoComplete="name"
              placeholder="Ex: Kouamé Jean"
              className={cn(
                'w-full pl-12 pr-4 py-3 rounded-2xl border bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-medium',
                errors.fullName ? 'border-red-500' : 'border-gray-200'
              )}
            />
          </div>
          {errors.fullName && <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.fullName.message}</p>}
        </div>

        {/* Téléphone WhatsApp */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1.5 pl-1">
            Numéro de téléphone (WhatsApp)
          </label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              {...register('phone', {
                required: 'Numéro de téléphone requis',
                pattern: {
                  value: /^(\+?225|0)[0-9]{9,10}$/,
                  message: 'Numéro ivoirien attendu (ex: 0701020304)',
                },
              })}
              type="tel"
              autoComplete="tel"
              placeholder="0701020304"
              className={cn(
                'w-full pl-12 pr-4 py-3 rounded-2xl border bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-medium',
                errors.phone ? 'border-red-500' : 'border-gray-200'
              )}
            />
          </div>
          {errors.phone && <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.phone.message}</p>}
        </div>

        {/* Adresse Email */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1.5 pl-1">
            Adresse Email
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              {...register('email', {
                required: "L'adresse email est requise",
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Adresse email invalide',
                },
              })}
              type="email"
              autoComplete="email"
              placeholder="votre@email.com"
              className={cn(
                'w-full pl-12 pr-4 py-3 rounded-2xl border bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-medium',
                errors.email ? 'border-red-500' : 'border-gray-200'
              )}
            />
          </div>
          {errors.email && <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.email.message}</p>}
        </div>

        {/* Mot de passe */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1.5 pl-1">
            Mot de passe <span className="font-normal text-gray-400">(6+ caractères)</span>
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              {...register('password', {
                required: 'Le mot de passe est requis',
                minLength: { value: 6, message: 'Le mot de passe doit contenir 6 caractères minimum' },
              })}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className={cn(
                'w-full pl-12 pr-12 py-3 rounded-2xl border bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-medium',
                errors.password ? 'border-red-500' : 'border-gray-200'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.password.message}</p>}
        </div>

        {/* Confirmation mot de passe */}
        <div>
          <label className="block text-sm font-bold text-gray-900 mb-1.5 pl-1">
            Confirmer le mot de passe
          </label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              {...register('confirmPassword', {
                required: 'Veuillez confirmer votre mot de passe',
              })}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              className={cn(
                'w-full pl-12 pr-12 py-3 rounded-2xl border bg-gray-50 focus:bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm font-medium',
                errors.confirmPassword ? 'border-red-500' : 'border-gray-200'
              )}
            />
          </div>
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.confirmPassword.message}</p>}
        </div>

        {/* CGU */}
        <div className="py-1">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('cguAccepted', {
                required: 'Vous devez accepter les conditions générales',
              })}
              className="mt-0.5 w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500 accent-orange-500 cursor-pointer"
            />
            <span className="text-xs text-gray-600 leading-normal">
              J'accepte sans réserve les{' '}
              <Link to="/terms" className="text-orange-600 underline font-semibold" target="_blank">
                Conditions Générales d'Utilisation
              </Link>{' '}
              et la politique de confidentialité de DaloaMarket.
            </span>
          </label>
          {errors.cguAccepted && <p className="text-xs text-red-500 mt-1 pl-1">{errors.cguAccepted.message}</p>}
        </div>

        <Button
          type="submit"
          color="primary"
          fullWidth
          loading={loading}
          disabled={loading}
          className="py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl active:scale-[0.98] transition-all shadow-md mt-2 flex items-center justify-center gap-2"
        >
          <UserPlus size={18} />
          Créer mon compte
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-white text-gray-500 font-medium">ou continuer avec</span>
        </div>
      </div>

      <button
        type="button"
        disabled={googleLoading || loading}
        onClick={handleGoogleAuth}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl border border-gray-200 bg-white text-gray-700 font-bold text-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
      >
        <svg width="20" height="20" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        </svg>
        S'inscrire avec Google
      </button>

      <p className="mt-6 text-center text-sm font-medium text-gray-500">
        Vous avez déjà un compte ?{' '}
        <Link to="/login" className="text-orange-600 font-bold hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
};
