import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Clock, CheckCircle, XCircle, TrendingUp, Phone, AlertTriangle, Package, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSupabase } from '../hooks/useSupabase';
import { useSEO } from '../hooks/useSEO';
import { formatPrice, formatDate, cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import toast from 'react-hot-toast';

export interface RevenueItem {
  id: string;
  title: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  date: string;
  type: 'sale' | 'payout';
}

interface StatusConfig {
  label: string;
  color: 'default' | 'primary' | 'success' | 'error' | 'warning';
  icon: React.ReactNode;
}

function getStatusConfig(status: RevenueItem['status']): StatusConfig {
  switch (status) {
    case 'confirmed':
      return { label: 'Encaissé', color: 'success', icon: <CheckCircle className="w-3.5 h-3.5" /> };
    case 'pending':
      return { label: 'En séquestre', color: 'warning', icon: <Clock className="w-3.5 h-3.5" /> };
    case 'failed':
      return { label: 'Annulé', color: 'error', icon: <XCircle className="w-3.5 h-3.5" /> };
    default:
      return { label: 'Inconnu', color: 'default', icon: <Clock className="w-3.5 h-3.5" /> };
  }
}

const MesRevenusPage: React.FC = () => {
  useSEO('Mes revenus — Portefeuille Vendeur', {
    description: 'Suivez vos gains de ventes d\'annonces, vos fonds sous séquestre Escrow et configurez votre numéro de retrait Mobile Money.',
    canonical: 'https://daloamarket.com/mes-revenus',
  });

  const { user, userProfile, updateUserProfile } = useSupabase();

  const [revenues, setRevenues] = useState<RevenueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSetupOpen, setPhoneSetupOpen] = useState(false);

  const fetchRevenues = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch Seller Orders (sales)
      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          product_amount,
          variant_label,
          quantity,
          status,
          created_at,
          listing:listings (
            title
          )
        `)
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (ordersErr) throw ordersErr;

      // 2. Fetch Direct Payouts if available
      const { data: payoutsData } = await (supabase as any)
        .from('payouts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      const items: RevenueItem[] = [];

      // Process Orders into Revenue Items
      (ordersData || []).forEach((order: any) => {
        // Exclude unpaid draft orders
        if (order.status === 'pending') return;

        let status: RevenueItem['status'] = 'pending';
        if (order.status === 'delivered' || order.status === 'completed') {
          status = 'confirmed';
        } else if (order.status === 'cancelled' || order.status === 'refunded') {
          status = 'failed';
        }

        const listingTitle = order.listing?.title || 'Vente d\'article';
        const variantSuffix = order.variant_label ? ` · Taille : ${order.variant_label}${order.quantity && order.quantity > 1 ? ` · x${order.quantity}` : ''}` : '';
        const saleAmount = order.product_amount || (order.total_amount ? order.total_amount : 0);

        items.push({
          id: `order-${order.id}`,
          title: `${listingTitle}${variantSuffix}`,
          amount: Number(saleAmount),
          status,
          date: order.created_at,
          type: 'sale',
        });
      });

      // Process Payouts
      (payoutsData || []).forEach((payout: any) => {
        let status: RevenueItem['status'] = 'pending';
        if (payout.status === 'paid' || payout.status === 'completed' || payout.status === 'confirmed') {
          status = 'confirmed';
        } else if (payout.status === 'failed') {
          status = 'failed';
        }

        items.push({
          id: `payout-${payout.id}`,
          title: payout.type === 'commission' ? 'Versement commission' : 'Versement Vendeur',
          amount: Number(payout.amount),
          status,
          date: payout.created_at,
          type: 'payout',
        });
      });

      // Sort by date descending
      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRevenues(items);
    } catch (err) {
      console.error('Error fetching revenues:', err);
      setError('Impossible de charger vos revenus.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRevenues();
  }, [fetchRevenues]);

  useEffect(() => {
    if (userProfile) {
      const phone = (userProfile as Record<string, unknown>).mobile_money_phone as string | undefined || (userProfile as Record<string, unknown>).payout_number as string | undefined;
      if (phone) {
        setMobileMoneyPhone(phone);
      } else {
        setPhoneSetupOpen(true);
      }
    }
  }, [userProfile]);

  const pendingTotal = revenues
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const completedTotal = revenues
    .filter((p) => p.status === 'confirmed')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalRevenues = revenues.filter(r => r.status !== 'failed').length;
  const successfulRevenues = revenues.filter((p) => p.status === 'confirmed').length;
  const reliabilityScore = totalRevenues > 0 ? Math.round((successfulRevenues / totalRevenues) * 100) : 100;

  const handleSavePhone = async () => {
    const cleaned = mobileMoneyPhone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      toast.error('Veuillez entrer un numéro valide à 10 chiffres (ex: 0700000000).');
      return;
    }
    setSavingPhone(true);
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          mobile_money_phone: mobileMoneyPhone,
          payout_number: mobileMoneyPhone,
        } as any)
        .eq('id', user!.id);

      if (updateError) throw updateError;
      await updateUserProfile({} as any);
      setPhoneSetupOpen(false);
      toast.success('Numéro Mobile Money enregistré avec succès.');
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
        <ErrorState message={error} onRetry={fetchRevenues} />
      </div>
    );
  }

  return (
    <motion.div
      className="w-full max-w-2xl lg:max-w-5xl mx-auto pb-20 bg-gray-50/70 min-h-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
    >
      <div className="relative overflow-hidden px-5 pt-6 pb-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-b-[32px] shadow-lg">
        <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10" />
        <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-orange-100">Portefeuille vendeur</p>
        <h1 className="relative mt-1 text-2xl font-extrabold tracking-tight text-white">Mes revenus</h1>
      </div>

      {phoneSetupOpen && (
        <motion.div
          className="relative z-10 px-4 -mt-7 mb-4"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card elevation={2} padding="md" className="rounded-3xl border border-amber-100 shadow-lg shadow-amber-100/50">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-[var(--color-warning)]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-[var(--color-on-surface)] mb-1">
                  Configurer votre numéro de retrait Mobile Money
                </h3>
                <p className="text-xs text-[var(--color-on-surface-variant)] mb-3">
                  Ajoutez votre numéro Orange Money, Wave ou MTN MoMo pour recevoir automatiquement vos paiements.
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
                      placeholder="+225 07 00 00 00 00"
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

      <div className="relative z-10 px-4 mt-5 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <Card elevation={2} padding="md" className="rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-warning-50)]">
                <Clock className="w-4 h-4 text-[var(--color-warning)]" />
              </div>
              <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">
                En séquestre (OTP)
              </span>
            </div>
            <p className="text-lg font-extrabold text-orange-600">
              {formatPrice(pendingTotal)}
            </p>
          </Card>

          <Card elevation={2} padding="md" className="rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-success-50)]">
                <CheckCircle className="w-4 h-4 text-[var(--color-success)]" />
              </div>
              <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">
                Encaissé
              </span>
            </div>
            <p className="text-lg font-extrabold text-orange-600">
              {formatPrice(completedTotal)}
            </p>
          </Card>
        </div>

        <div className="mt-3">
          <Card elevation={2} padding="md" className="rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-primary-50)]">
                  <TrendingUp className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">
                  Fiabilité des ventes
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
              {successfulRevenues} vente{successfulRevenues !== 1 ? 's' : ''} encaissée{successfulRevenues !== 1 ? 's' : ''} sur {totalRevenues}
            </p>
          </Card>
        </div>
      </div>

      <div className="px-4">
        <h2 className="text-sm font-extrabold text-[var(--color-on-surface)] mb-3">
          Historique des ventes & versements
        </h2>

        {revenues.length === 0 ? (
          <EmptyState
            icon={<DollarSign className="w-16 h-16 opacity-40" />}
            title="Aucun revenu de vente"
            description="Vos gains sur les ventes d'articles apparaîtront ici dès qu'un acheteur passera commande."
          />
        ) : (
          <div className="space-y-3">
            {revenues.map((item, index) => {
              const statusConfig = getStatusConfig(item.status);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                >
                  <Card elevation={2} padding="md" className="rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0',
                            item.status === 'confirmed' && 'bg-[var(--color-success-50)]',
                            item.status === 'pending' && 'bg-[var(--color-warning-50)]',
                            item.status === 'failed' && 'bg-[var(--color-error-50)]'
                          )}
                        >
                          {item.type === 'payout' ? (
                            <ShieldCheck
                              className={cn(
                                'w-5 h-5',
                                item.status === 'confirmed' && 'text-[var(--color-success)]',
                                item.status === 'pending' && 'text-[var(--color-warning)]',
                                item.status === 'failed' && 'text-[var(--color-error)]'
                              )}
                            />
                          ) : (
                            <Package
                              className={cn(
                                'w-5 h-5',
                                item.status === 'confirmed' && 'text-[var(--color-success)]',
                                item.status === 'pending' && 'text-[var(--color-warning)]',
                                item.status === 'failed' && 'text-[var(--color-error)]'
                              )}
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--color-on-surface)] truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-[var(--color-on-surface-variant)]">
                            {formatDate(item.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-extrabold text-[var(--color-on-surface)]">
                          +{formatPrice(item.amount)}
                        </p>
                        <div className="mt-1 flex justify-end">
                          <Chip
                            color={statusConfig.color}
                            size="sm"
                            icon={statusConfig.icon}
                          >
                            {statusConfig.label}
                          </Chip>
                        </div>
                      </div>
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
