import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePageTitle } from '../hooks/usePageTitle';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function EmailConfirmedPage() {
  usePageTitle('Email confirmé');

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full"
      >
        <Card className="p-8 rounded-2xl shadow-elevation-2 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle size={48} className="text-green-500" />
          </motion.div>
          <h1 className="text-2xl font-bold text-[var(--color-on-surface)] mb-2">
            Email confirmé
          </h1>
          <p className="text-[var(--color-on-surface-variant)] mb-8">
            Votre adresse email a été vérifiée avec succès.
          </p>
          <Link to="/login">
            <Button color="primary" fullWidth className="active:scale-[0.97]">
              Continuer
              <ArrowRight size={18} className="ml-2" />
            </Button>
          </Link>
        </Card>
      </motion.div>
    </div>
  );
}