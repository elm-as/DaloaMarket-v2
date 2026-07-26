import React from 'react';
import { Ban } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePageTitle } from '../hooks/usePageTitle';

export default function BannedPage() {
  usePageTitle('Compte suspendu');

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-8"
        >
          <Ban size={52} className="text-red-500" />
        </motion.div>
        <h1 className="text-2xl font-bold text-[var(--color-on-surface)] mb-4">
          Compte suspendu
        </h1>
        <p className="text-[var(--color-on-surface-variant)] mb-2 leading-relaxed">
          Votre compte a été suspendu pour non-respect des conditions d'utilisation.
        </p>
        <p className="text-[var(--color-on-surface-variant)] text-sm">
          Contactez le support si vous pensez qu'il s'agit d'une erreur.
        </p>
      </motion.div>
    </div>
  );
}