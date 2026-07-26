import React, { useState } from 'react';
import { Send, HelpCircle, Mail, MessageCircle, BookOpen, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { usePageTitle } from '../hooks/usePageTitle';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { SectionHeader } from '../components/ui/SectionHeader';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

interface HelpFormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export default function HelpPage() {
  usePageTitle('Aide & Support');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<HelpFormData>();

  const onSubmit = async (data: HelpFormData) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    toast.success("Message envoyé ! Nous vous répondrons dans les plus brefs délais.");
    reset();
    setLoading(false);
  };

  return (
    <div className="max-w-2xl lg:max-w-none mx-auto px-4 py-8 pb-20 lg:px-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 bg-white shadow-sm border border-gray-100 rounded-2xl p-2">
          <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">Aide & Support</h1>
        <p className="text-[var(--color-on-surface-variant)] mt-1">
          Une question ? Notre équipe est là pour vous aider.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card className="p-4 rounded-2xl shadow-elevation-1 text-center">
          <Mail size={24} className="text-[var(--color-primary)] mx-auto mb-2" />
          <p className="text-xs text-[var(--color-on-surface-variant)] mb-1">Email support</p>
          <p className="text-xs font-medium text-[var(--color-on-surface)] truncate">support@daloamarket.shop</p>
        </Card>
        <Link to="/faq" className="block">
          <Card className="p-4 rounded-2xl shadow-elevation-1 text-center hover:shadow-elevation-2 transition-shadow active:scale-[0.98]">
            <MessageCircle size={24} className="text-[var(--color-primary)] mx-auto mb-2" />
            <p className="text-sm font-medium text-[var(--color-on-surface)]">FAQ</p>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">Questions fréquentes</p>
          </Card>
        </Link>
        <Link to="/how-it-works" className="block">
          <Card className="p-4 rounded-2xl shadow-elevation-1 text-center hover:shadow-elevation-2 transition-shadow active:scale-[0.98]">
            <BookOpen size={24} className="text-[var(--color-primary)] mx-auto mb-2" />
            <p className="text-sm font-medium text-[var(--color-on-surface)]">Comment ça marche</p>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">Guide étape par étape</p>
          </Card>
        </Link>
        <Link to="/guide-vendeur" className="block">
          <Card className="p-4 rounded-2xl shadow-elevation-1 text-center hover:shadow-elevation-2 transition-shadow active:scale-[0.98] border border-amber-200/60 bg-amber-50/40">
            <Sparkles size={24} className="text-amber-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Guide Vendeur</p>
            <p className="text-xs text-amber-700 mt-0.5">Conseils & Règles d'or</p>
          </Card>
        </Link>
      </div>

      <Card className="p-6 rounded-2xl shadow-elevation-1">
        <SectionHeader title="Envoyez-nous un message" className="mb-4" />
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
              Nom
            </label>
            <input
              {...register('name', { required: 'Le nom est requis' })}
              type="text"
              className={cn(
                'w-full px-4 py-3 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all',
                errors.name ? 'border-red-500' : 'border-[var(--color-outline)]'
              )}
              placeholder="Votre nom"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
              Email
            </label>
            <input
              {...register('email', {
                required: "L'email est requis",
                pattern: { value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, message: 'Email invalide' },
              })}
              type="email"
              className={cn(
                'w-full px-4 py-3 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all',
                errors.email ? 'border-red-500' : 'border-[var(--color-outline)]'
              )}
              placeholder="votre@email.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
              Sujet
            </label>
            <input
              {...register('subject', { required: 'Le sujet est requis' })}
              type="text"
              className={cn(
                'w-full px-4 py-3 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all',
                errors.subject ? 'border-red-500' : 'border-[var(--color-outline)]'
              )}
              placeholder="Sujet de votre message"
            />
            {errors.subject && <p className="text-red-500 text-xs mt-1">{errors.subject.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-on-surface)] mb-1">
              Message
            </label>
            <textarea
              {...register('message', { required: 'Le message est requis' })}
              rows={4}
              className={cn(
                'w-full px-4 py-3 rounded-2xl border bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] transition-all resize-none',
                errors.message ? 'border-red-500' : 'border-[var(--color-outline)]'
              )}
              placeholder="Décrivez votre problème ou votre question..."
            />
            {errors.message && <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>}
          </div>

          <Button
            type="submit"
            color="primary"
            fullWidth
            loading={loading}
            disabled={loading}
            className="active:scale-[0.97]"
          >
            <Send size={18} className="mr-2" />
            Envoyer le message
          </Button>
        </form>
      </Card>
    </div>
  );
}