import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Clock, CheckCircle, XCircle, TrendingUp, Phone, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatPrice, formatDate, cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import toast from 'react-hot-toast';

interface Payout {
  id: string;
  user_id: string;
  listing_id: string | null;
  type: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  confirmed_at: string | null;
}

interface StatusConfig {
  label: string;
  color: 'default' | 'primary' | 'success' | 'error' | 'warning';
  icon: React.ReactNode;
}

function getStatusConfig(status: Payout['status']): StatusConfig {
  switch (status) {
    case 'confirmed':
      return { label: 'Complété', color: 'success', icon: <CheckCircle className="w-3.5 h-3.5" /> };
    case 'pending':
      return { label: 'En attente', color: 'warning', icon: <Clock className="w-3.5 h-3.5" /> };
    case 'failed':
      return { label: 'Échoué', color: 'error', icon: <XCircle className="w-3.5 h-3.5" /> };
    default:
      return { label: 'Inconnu', color: 'default', icon: <Clock className="w-3.5 h-3.5" /> };
  }
}

const MesRevenusPage: React.FC = () => {
  usePageTitle('Mes revenus');
  const { user, userProfile, updateUserProfile } = useSupabase();

  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSetupOpen, setPhoneSetupOpen] = useState(false);

  const fetchPayouts = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('monetization_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPayouts((data || []) as Payout[]);
    } catch (err) {
      console.error('Error fetching payouts:', err);
      setError('Impossible de charger vos revenus.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPayouts();
  }, [fetchPayouts]);

  useEffect(() => {
    if (userProfile) {
      const phone = (userProfile as Record<string, unknown>).mobile_money_phone as string | undefined;
      if (phone) {
        setMobileMoneyPhone(phone);
      } else {
        setPhoneSetupOpen(true);
      }
    }
  }, [userProfile]);

  const pendingTotal = payouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const completedTotal = payouts
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPayouts = payouts.length;
  const successfulPayouts = payouts.filter((p) => p.status === 'confirmed').length;
  const reliabilityScore = totalPayouts > 0 ? Math.round((successfulPayouts / totalPayouts) * 100) : 100;

  const handleSavePhone = async () => {
    const cleaned = mobileMoneyPhone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      toast.error('Veuillez entrer un numéro valide.');
      return;
    }
    setSavingPhone(true);
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ mobile_money_phone: mobileMoneyPhone } as any)
        .eq('id', user!.id);

      if (updateError) throw updateError;
      await updateUserProfile({} as any);
      setPhoneSetupOpen(false);
      toast.success('Numéro Mobile Money enregistré.');
    } catch (err) {
      console.error('Error saving phone:', err);
      toast.error("Impossible d'enregistrer le numéro.");
    } finally {
      setSavingPhone(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto pb-12 pt-8">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-[var(--color-on-surface)]">Mes revenus</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto pb-12 pt-8">
        <div className="px-4 py-3">
          <h1 className="text-lg font-bold text-[var(--color-on-surface)]">Mes revenus</h1>
        </div>
        <ErrorState message={error} onRetry={fetchPayouts} />
      </div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-2xl mx-auto pb-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
    >
      <div className="px-4 py-3">
        <h1 className="text-lg font-bold text-[var(--color-on-surface)]">Mes revenus</h1>
      </div>

      {phoneSetupOpen && (
        <motion.div
          className="px-4 mb-4"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card elevation={1} padding="md" className="border-l-4 border-l-[var(--color-warning)]">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-[var(--color-on-surface)] mb-1">
                  Configurer votre retrait
                </h3>
                <p className="text-xs text-[var(--color-on-surface-variant)] mb-3">
                  Ajoutez votre numéro Mobile Money pour recevoir vos revenus.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Phone className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
                    </div>
                    <input
                      type="tel"
                      value={mobileMoneyPhone}
                      onChange={(e) => setMobileMoneyPhone(e.target.value)}
                      placeholder="+225 01 23 45 67 89"
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)] placeholder:text-[var(--color-on-surface-variant)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    />
                  </div>
                  <Button
                    size="sm"
                    color="primary"
                    onClick={handleSavePhone}
                    loading={savingPhone}
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Card elevation={1} padding="md">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-warning-50)]">
                <Clock className="w-4 h-4 text-[var(--color-warning)]" />
              </div>
              <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">
                En attente
              </span>
            </div>
            <p className="text-lg font-bold text-[var(--color-on-surface)]">
              {formatPrice(pendingTotal)}
            </p>
          </Card>

          <Card elevation={1} padding="md">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-success-50)]">
                <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
              </div>
              <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">
                Complété
              </span>
            </div>
            <p className="text-lg font-bold text-[var(--color-on-surface)]">
              {formatPrice(completedTotal)}
            </p>
          </Card>
        </div>

        <div className="mt-3">
          <Card elevation={1} padding="md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary-50)]">
                  <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">
                  Fiabilité
                </span>
              </div>
              <span className="text-sm font-bold text-[var(--color-on-surface)]">
                {reliabilityScore}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--color-surface-variant)] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-[var(--color-primary)]"
                initial={{ width: 0 }}
                animate={{ width: `${reliabilityScore}%` }}
                transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
              />
            </div>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-2">
              {successfulPayouts} paiement{successfulPayouts !== 1 ? 's' : ''} réussi{successfulPayouts !== 1 ? 's' : ''} sur {totalPayouts}
            </p>
          </Card>
        </div>
      </div>

      <div className="px-4">
        <h2 className="text-sm font-semibold text-[var(--color-on-surface)] mb-3">
          Historique des revenus
        </h2>

        {payouts.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="w-16 h-16 opacity-40" />}
            title="Aucun revenu"
            description="Vos revenus de ventes, boosts et badges apparaîtront ici."
          />
        ) : (
          <div className="space-y-3">
            {payouts.map((payout, index) => {
              const statusConfig = getStatusConfig(payout.status);
              return (
                <motion.div
                  key={payout.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                >
                  <Card elevation={1} padding="md">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0',
                            payout.status === 'confirmed' && 'bg-[var(--color-success-50)]',
                            payout.status === 'pending' && 'bg-[var(--color-warning-50)]',
                            payout.status === 'failed' && 'bg-[var(--color-error-50)]'
                          )}
                        >
                          <DollarSign
                            className={cn(
                              'w-5 h-5',
                              payout.status === 'confirmed' && 'text-[var(--color-success)]',
                              payout.status === 'pending' && 'text-[var(--color-warning)]',
                              payout.status === 'failed' && 'text-[var(--color-error)]'
                            )}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--color-on-surface)] truncate">
                            {formatPrice(payout.amount)}
                          </p>
                          <p className="text-xs text-[var(--color-on-surface-variant)]">
                            {formatDate(payout.created_at)}
                          </p>
                        </div>
                      </div>
                      <Chip
                        color={statusConfig.color}
                        size="sm"
                        icon={statusConfig.icon}
                      >
                        {statusConfig.label}
                      </Chip>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MesRevenusPage;
