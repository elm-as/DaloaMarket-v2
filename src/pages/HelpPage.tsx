import React, { useState } from 'react';
import { Send, HelpCircle, Mail, MessageCircle, BookOpen, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { useSEO } from '../hooks/useSEO';
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
  useSEO('Aide & Support — Contacter l\'équipe DaloaMarket', {
    description: 'Besoin d\'aide sur DaloaMarket ? Contactez notre support client, posez vos questions ou consultez nos guides d\'utilisation.',
    canonical: 'https://daloamarket.com/help'
  });
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
    <div className="min-h-screen bg-gray-50/70 px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-6">
      <div className="mx-auto mb-5 max-w-3xl rounded-3xl bg-gradient-to-br from-orange-500 to-amber-600 px-5 py-6 text-center text-white shadow-lg shadow-orange-200/50">
        <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3 bg-white rounded-2xl p-2 shadow-lg">
          <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">Aide & Support</h1>
        <p className="mt-1 text-sm text-orange-100">
          Une question ? Notre équipe est là pour vous aider.
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3 mb-5">
        <Card className="p-3 sm:p-4 rounded-xl border border-[var(--color-primary-100)] shadow-none text-center">
          <Mail size={24} className="text-[var(--color-primary)] mx-auto mb-2" />
          <p className="text-xs text-[var(--color-on-surface-variant)] mb-1">Email support</p>
          <p className="text-xs font-medium text-[var(--color-on-surface)] truncate">support@daloamarket.com</p>
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
        <a href="https://tuto.daloamarket.com" target="_blank" rel="noopener noreferrer" className="block">
          <Card className="p-4 rounded-2xl shadow-elevation-1 text-center hover:shadow-elevation-2 transition-shadow active:scale-[0.98] border border-amber-200/60 bg-amber-50/40">
            <Sparkles size={24} className="text-amber-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Guide Vendeur</p>
            <p className="text-xs text-amber-700 mt-0.5">Tutoriels vidéo & Conseils</p>
          </Card>
        </a>
      </div>

      <Card className="mx-auto max-w-3xl p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50">
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
