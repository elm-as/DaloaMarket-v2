import React, { useEffect, useState, useCallback } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn, formatPrice, formatDate } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Star,
  Package,
  Zap,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  CreditCard,
} from 'lucide-react';

interface Transaction {
  id: string;
  user_id: string;
  listing_id: string | null;
  type: 'boost' | 'bump' | 'seller_badge' | 'listing_pack_10';
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  confirmed_at: string | null;
}

const MesTransactionsPage: React.FC = () => {
  usePageTitle('Mes paiements');
  const navigate = useNavigate();
  const { user } = useSupabase();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimTx, setClaimTx] = useState<string | null>(null);
  const [claimText, setClaimText] = useState('');
  const [claiming, setClaiming] = useState(false);

  const fetchTransactions = useCallback(async () => {
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
      setTransactions((data || []) as Transaction[]);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Impossible de charger vos transactions.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const getTypeConfig = (type: Transaction['type']) => {
    switch (type) {
      case 'seller_badge':
        return {
          label: 'Badge Pro Vendeur',
          icon: <Star className="w-5 h-5" />,
          color: 'text-amber-500',
          bg: 'bg-amber-50',
        };
      case 'listing_pack_10':
        return {
          label: "Pack d'annonces",
          icon: <Package className="w-5 h-5" />,
          color: 'text-indigo-500',
          bg: 'bg-indigo-50',
        };
      case 'boost':
        return {
          label: "Boost d'annonce",
          icon: <Zap className="w-5 h-5" />,
          color: 'text-blue-500',
          bg: 'bg-blue-50',
        };
      case 'bump':
        return {
          label: "Remontée d'annonce",
          icon: <TrendingUp className="w-5 h-5" />,
          color: 'text-emerald-500',
          bg: 'bg-emerald-50',
        };
      default:
        return {
          label: type,
          icon: <Package className="w-5 h-5" />,
          color: 'text-gray-500',
          bg: 'bg-gray-50',
        };
    }
  };

  const getStatusConfig = (status: Transaction['status']) => {
    switch (status) {
      case 'confirmed':
        return {
          label: 'Reussi',
          color: 'success' as const,
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        };
      case 'pending':
        return {
          label: 'En attente',
          color: 'warning' as const,
          icon: <Clock className="w-3.5 h-3.5" />,
        };
      case 'failed':
        return {
          label: 'Echoue',
          color: 'error' as const,
          icon: <XCircle className="w-3.5 h-3.5" />,
        };
      default:
        return {
          label: status,
          color: 'default' as const,
          icon: null,
        };
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Button
          variant="text"
          color="secondary"
          size="sm"
          icon={<ArrowLeft className="w-5 h-5" />}
          onClick={() => navigate(-1)}
        >
          Retour
        </Button>
        <h1 className="text-lg font-bold text-[var(--color-on-surface)]">
          Mes paiements
        </h1>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.06 }}
              >
                <Card elevation={1} padding="md" className="rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Skeleton width="48px" height="48px" rounded="lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton width="60%" height="16px" />
                      <Skeleton width="40%" height="14px" />
                    </div>
                    <div className="text-right space-y-2">
                      <Skeleton width="80px" height="16px" />
                      <Skeleton width="60px" height="22px" />
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchTransactions} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="w-16 h-16 opacity-40" />}
            title="Aucune transaction"
            description="Vos paiements pour les boosts, remontees, packs et badges Pro apparaitront ici."
          />
        ) : (
          <div className="space-y-3">
            {transactions.map((tx, index) => {
              const typeConfig = getTypeConfig(tx.type);
              const statusConfig = getStatusConfig(tx.status);

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.25,
                    delay: index * 0.05,
                    ease: [0.2, 0, 0, 1],
                  }}
                >
                  <Card elevation={1} padding="md" className="rounded-2xl">
                    <div className="flex items-center gap-3">
                      {/* Icon */}
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                          typeConfig.bg
                        )}
                      >
                        <span className={typeConfig.color}>{typeConfig.icon}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">
                          {typeConfig.label}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDate(tx.created_at)}
                        </p>
                        {tx.confirmed_at && (
                          <p className="text-xs text-gray-400">
                            Confirmé le {formatDate(tx.confirmed_at)}
                          </p>
                        )}
                      </div>

                      {/* Amount + Status */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">
                          {formatPrice(tx.amount)}
                        </p>
                        <div className="mt-1">
                          <Chip
                            color={statusConfig.color}
                            size="sm"
                            selected
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
    </div>
  );
};

export default MesTransactionsPage;