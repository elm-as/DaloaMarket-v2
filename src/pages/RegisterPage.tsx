import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, ShieldCheck, Truck, Zap, PackageOpen } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { friendlyError } from '../lib/messages';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { trackCompleteRegistration } from '../lib/analytics';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  cguAccepted: boolean;
}

export default function RegisterPage() {
  usePageTitle('Inscription');
  const { user, signUp } = useSupabase();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  if (user) {
    return <Navigate to="/" replace />;
  }

  const onSubmit = async (data: RegisterFormData) => {
    if (data.password !== data.confirmPassword) {
      setAuthError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    setAuthError(null);
    try {
      const { error } = await signUp(data.email, data.password);
      if (error) throw error;
      trackCompleteRegistration({ content_name: 'Register' });
    } catch (err: any) {
      setAuthError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch bg-white rounded-3xl overflow-hidden shadow-elevation-2 border border-gray-100 p-2 lg:p-4">
        
        {/* Left Side: Premium Marketing Panel */}
        <div className="hidden lg:flex lg:col-span-6 flex-col justify-between p-8 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white relative overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/3 blur-xl" />
          
          <div className="relative z-10">
            {/* Header / Brand */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-white rounded-2xl p-1.5 flex items-center justify-center shadow-md">
                <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-200">Plateforme Locale</span>
                <h2 className="text-xl font-black tracking-tight leading-none text-white">DaloaMarket</h2>
              </div>
            </div>

            {/* Title / Slogan */}
            <h3 className="text-3xl font-extrabold leading-tight text-white mb-6">
              Vendez plus vite,<br />Achetez en toute confiance.
            </h3>

            {/* Features list */}
            <div className="space-y-5">
              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Paiement Sécurisé (Escrow)</h4>
                  <p className="text-xs text-orange-100 mt-0.5 leading-relaxed">
                    Les fonds sont bloqués de manière sécurisée et ne sont libérés au vendeur qu'après confirmation de la livraison par code OTP.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Livraison Intégrée avec DaloaDelivery</h4>
                  <p className="text-xs text-orange-100 mt-0.5 leading-relaxed">
                    Un service de livraison rapide et fiable à Daloa pour acheminer vos produits directement chez vos acheteurs.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Boosts d'Annonces & Comptes Pro</h4>
                  <p className="text-xs text-orange-100 mt-0.5 leading-relaxed">
                    Profitez de frais réduits à 2,5% de commission pour les vendeurs PRO et de boosts d'annonces pour maximiser votre visibilité.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                  <PackageOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Annonces Gratuites & Illimitées</h4>
                  <p className="text-xs text-orange-100 mt-0.5 leading-relaxed">
                    Publiez autant de produits que vous le souhaitez sans frais initiaux ni limites d'annonces.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer of Left panel */}
          <div className="relative z-10 mt-8 pt-6 border-t border-white/20 flex justify-between items-center text-xs text-orange-200">
            <span>© 2026 DaloaMarket</span>
            <span>Développé par ELMAS</span>
          </div>
        </div>

        {/* Right Side: Onboarding Registration Form */}
        <div className="col-span-1 lg:col-span-6 p-6 lg:p-8 flex flex-col justify-center">
          <div className="text-center lg:text-left mb-6">
            {/* Logo visible only on mobile */}
            <div className="lg:hidden w-16 h-16 flex items-center justify-center mx-auto mb-4 overflow-hidden bg-white border border-gray-100 rounded-2xl p-2 shadow-sm">
              <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-2xl font-extrabold text-[var(--color-on-surface)]">Créer un compte</h1>
            <p className="text-sm text-[var(--color-on-surface-variant)] mt-1">
              Rejoignez la plus grande communauté d'achat et vente de Daloa.
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-[var(--color-on-surface)] mb-1.5 pl-1">
                Adresse Email
              </label>
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
                className={cn(
                  'w-full px-4 py-3 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all text-sm font-medium',
                  errors.email ? 'border-red-500' : 'border-[var(--color-outline)]'
                )}
                placeholder="Ex: konan@gmail.com"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--color-on-surface)] mb-1.5 pl-1">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Le mot de passe est requis',
                    minLength: { value: 6, message: 'Le mot de passe doit contenir 6 caractères minimum' },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={cn(
                    'w-full px-4 py-3 pr-12 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all text-sm font-medium',
                    errors.password ? 'border-red-500' : 'border-[var(--color-outline)]'
                  )}
                  placeholder="Choisissez un mot de passe sécurisé"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors active:scale-95"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--color-on-surface)] mb-1.5 pl-1">
                Confirmer le mot de passe
              </label>
              <input
                {...register('confirmPassword', {
                  required: 'Veuillez confirmer votre mot de passe',
                  validate: (val) => val === watch('password') || 'Les mots de passe ne correspondent pas',
                })}
                type="password"
                autoComplete="new-password"
                className={cn(
                  'w-full px-4 py-3 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all text-sm font-medium',
                  errors.confirmPassword ? 'border-red-500' : 'border-[var(--color-outline)]'
                )}
                placeholder="Confirmez à nouveau le mot de passe"
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-xs mt-1.5 pl-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div className="py-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('cguAccepted', {
                    required: 'Vous devez accepter les conditions générales',
                  })}
                  className="mt-0.5 w-5 h-5 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] cursor-pointer"
                />
                <span className="text-xs text-[var(--color-on-surface-variant)] leading-normal">
                  J'accepte sans réserve les{' '}
                  <Link to="/terms" className="text-[var(--color-primary)] underline font-semibold hover:text-[var(--color-primary-dark)]" target="_blank">
                    Conditions Générales d'Utilisation
                  </Link>{' '}
                  et la politique de confidentialité de DaloaMarket.
                </span>
              </label>
              {errors.cguAccepted && (
                <p className="text-xs text-[var(--color-error)] mt-1.5 ml-8 pl-0.5">
                  {errors.cguAccepted.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              color="primary"
              fullWidth
              loading={loading}
              disabled={loading}
              className="py-3.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-bold rounded-2xl active:scale-[0.98] transition-all shadow-md mt-2 flex items-center justify-center gap-2"
            >
              <UserPlus size={18} />
              Créer mon compte
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--color-on-surface-variant)] mt-6">
            Déjà inscrit sur DaloaMarket ?{' '}
            <Link to="/login" className="text-[var(--color-primary)] font-bold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}