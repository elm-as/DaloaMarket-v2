import React from 'react';
import { motion } from 'framer-motion';
import { Wrench, Clock, ShieldAlert, Mail, RefreshCw, MapPin } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface MaintenancePageProps {
  message?: string;
  expectedReopening?: string | null;
  isAdminViewing?: boolean;
}

export default function MaintenancePage({
  message = "DaloaMarket est actuellement en maintenance planifiée pour l'amélioration et l'optimisation de nos services.",
  expectedReopening,
  isAdminViewing = false,
}: MaintenancePageProps) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decorative Blur Elements */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[var(--color-primary-100)] opacity-40 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-amber-100 opacity-40 blur-3xl rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-xl w-full relative z-10"
      >
        {isAdminViewing && (
          <div className="mb-4 bg-amber-500/10 border border-amber-500/30 text-amber-800 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>Aperçu Mode Maintenance (Visible uniquement par l'Équipe Admin)</span>
            </div>
          </div>
        )}

        <Card className="p-8 sm:p-10 rounded-3xl text-center shadow-elevation-3 border border-gray-100 bg-white/90 backdrop-blur-md">
          {/* Logo DaloaMarket */}
          <div className="w-20 h-20 bg-white shadow-md border border-gray-100 rounded-2xl p-2.5 mx-auto mb-6 flex items-center justify-center">
            <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
          </div>

          {/* Badge Maintenance */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--color-primary-50)] border border-[var(--color-primary-200)] text-[var(--color-primary-700)] text-xs font-bold uppercase tracking-wider mb-4">
            <Wrench className="w-3.5 h-3.5 text-[var(--color-primary)] animate-pulse" />
            <span>Maintenance en cours</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-on-surface)] mb-3">
            Nous améliorons votre plateforme !
          </h1>

          <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed mb-6 max-w-md mx-auto">
            {message}
          </p>

          {/* Estimated Reopening Box */}
          {expectedReopening && (
            <div className="bg-[var(--color-surface-variant)] border border-[var(--color-outline)] rounded-2xl p-4 mb-6 text-left flex items-center gap-3.5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary-100)] flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-[var(--color-primary)]" />
              </div>
              <div>
                <p className="text-xs text-[var(--color-on-surface-variant)] font-semibold">Réouverture estimée :</p>
                <p className="text-sm font-extrabold text-[var(--color-on-surface)]">
                  {new Date(expectedReopening).toLocaleString('fr-FR', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Footer Contacts & Reload Button */}
          <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
            <div className="flex flex-col sm:flex-row items-center gap-3 text-left">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span className="font-medium">support@daloamarket.shop</span>
              </div>
              <span className="hidden sm:inline text-gray-300">•</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                <span className="font-medium">Daloa, Côte d'Ivoire</span>
              </div>
            </div>

            <Button
              variant="outlined"
              size="sm"
              onClick={() => window.location.reload()}
              className="border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-50)] font-semibold shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Actualiser
            </Button>
          </div>
        </Card>

        {/* Copyright */}
        <p className="text-center text-xs text-[var(--color-on-surface-variant)] mt-6">
          © {new Date().getFullYear()} DaloaMarket — La marketplace ivoirienne de proximité.
        </p>
      </motion.div>
    </div>
  );
}
