import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePageTitle } from '../hooks/usePageTitle';
import { Button } from '../components/ui/Button';

export default function NotFoundPage() {
  usePageTitle('Page introuvable');

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-24 h-24 rounded-full bg-[var(--color-surface-variant)] flex items-center justify-center mx-auto mb-8"
        >
          <FileQuestion size={48} className="text-[var(--color-on-surface-variant)]" />
        </motion.div>

        <h1 className="text-6xl font-bold text-[var(--color-primary)] mb-2">404</h1>
        <h2 className="text-xl font-semibold text-[var(--color-on-surface)] mb-2">
          Page introuvable
        </h2>
        <p className="text-[var(--color-on-surface-variant)] mb-8">
          La page que vous cherchez n'existe pas ou a été déplacée.
        </p>

        <Link to="/">
          <Button color="primary" className="active:scale-[0.97]">
            <ArrowLeft size={18} className="mr-2" />
            Retour a l'accueil
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}