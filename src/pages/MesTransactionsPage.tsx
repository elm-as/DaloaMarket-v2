import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { cn, formatPrice, formatDate } from '../lib/utils';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { checkPaymentStatus } from '../lib/payment';
import toast from 'react-hot-toast';
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
  RefreshCw,
  Trash2,
  Copy,
  Check,
  MessageCircle,
  ChevronRight,
} from 'lucide-react';

interface Transaction {
  id: string;
  user_id: string;
  listing_id: string | null;
  type: 'boost' | 'bump' | 'seller_badge' | 'listing_pack_10' | 'credits_pack_5' | 'credits_pack_12' | 'credits_pack_30';
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  created_at: string;
  confirmed_at: string | null;
}

type TabKey = 'all' | 'pending' | 'confirmed';

const isOlderThan48h = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff > 48 * 60 * 60 * 1000;
};

const MesTransactionsPage: React.FC = () => {
  usePageTitle('Mes paiements');
  const navigate = useNavigate();
  const { user } = useSupabase();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);

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
      setError('Impossible de charger vos paiements.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Actions
  const handleVerify = async (tx: Transaction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setVerifyingId(tx.id);
    try {
      const res = await checkPaymentStatus(tx.id);
      if (res.status === 'paid') {
        toast.success('Paiement validé avec succès ! Avantages activés 🎉');
      } else if (res.status === 'failure') {
        toast.error('Le paiement n\'a pas abouti.');
      } else {
        toast('Paiement non encore détecté chez MoneyFusion. Vous pouvez relancer le paiement ou contacter le support.', { icon: 'ℹ️' });
      }
      await fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la vérification.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleResume = (tx: Transaction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (tx.type === 'seller_badge') {
      navigate('/devenir-pro');
    } else if (tx.type.includes('pack') || tx.type === 'listing_pack_10') {
      navigate('/acheter-pack-annonces');
    } else {
      navigate('/profile');
    }
  };

  // Suppression réelle et définitive d'une transaction non confirmée
  const handleDeleteTransaction = async (tx: Transaction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (tx.status === 'confirmed') {
      toast.error('Les paiements confirmés et certifiés ne peuvent pas être supprimés.');
      return;
    }

    if (!window.confirm('Supprimer définitivement cette transaction de votre historique ?')) return;

    setDeletingId(tx.id);
    try {
      // 1. Suppression directe
      const { error: delErr } = await supabase
        .from('monetization_transactions')
        .delete()
        .eq('id', tx.id)
        .eq('user_id', user!.id);

      if (delErr) {
        // 2. Fallback via RPC
        const { error: rpcErr } = await (supabase.rpc as any)('delete_monetization_transaction', {
          p_transaction_id: tx.id
        });
        if (rpcErr) throw delErr;
      }

      // Disparition immédiate de l'écran
      setTransactions(prev => prev.filter(t => t.id !== tx.id));
      if (selectedTx?.id === tx.id) setSelectedTx(null);
      toast.success('Transaction supprimée de votre historique.');
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error('Impossible de supprimer cette transaction.');
    } finally {
      setDeletingId(null);
    }
  };

  // Nettoyage de masse des tentatives abandonnées / expirées
  const handleCleanAllExpired = async () => {
    const deletable = transactions.filter(
      t => t.status === 'failed' || (t.status === 'pending' && isOlderThan48h(t.created_at))
    );
    if (deletable.length === 0) {
      toast('Aucune tentative expirée à nettoyer.', { icon: 'ℹ️' });
      return;
    }

    if (!window.confirm(`Supprimer définitivement les ${deletable.length} tentatives non payées ?`)) return;

    try {
      const ids = deletable.map(t => t.id);
      const { error: delErr } = await supabase
        .from('monetization_transactions')
        .delete()
        .in('id', ids)
        .eq('user_id', user!.id);

      if (delErr) {
        await (supabase.rpc as any)('clean_expired_monetization_transactions');
      }

      setTransactions(prev => prev.filter(t => !ids.includes(t.id)));
      toast.success('Historique nettoyé avec succès.');
    } catch (err) {
      console.error('Clean error:', err);
      toast.error('Erreur lors du nettoyage.');
    }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success('Référence copiée !');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getTypeConfig = (type: Transaction['type']) => {
    switch (type) {
      case 'seller_badge':
        return {
          label: 'Badge Pro Vendeur',
          desc: 'Pass Pro Vendeur & options exclusives',
          icon: <Star className="w-6 h-6" />,
          color: 'text-amber-600',
          bg: 'bg-amber-50',
        };
      case 'listing_pack_10':
      case 'credits_pack_5':
      case 'credits_pack_12':
      case 'credits_pack_30':
        return {
          label: "Pack d'annonces",
          desc: 'Crédits de publication',
          icon: <Package className="w-6 h-6" />,
          color: 'text-indigo-600',
          bg: 'bg-indigo-50',
        };
      case 'boost':
        return {
          label: "Boost d'annonce",
          desc: 'Mise en avant sponsorisée',
          icon: <Zap className="w-6 h-6" />,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
        };
      case 'bump':
        return {
          label: "Remontée d'annonce",
          desc: 'Repositionnement en tête',
          icon: <TrendingUp className="w-6 h-6" />,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
        };
      default:
        return {
          label: type,
          desc: 'Option payante',
          icon: <CreditCard className="w-6 h-6" />,
          color: 'text-gray-600',
          bg: 'bg-gray-50',
        };
    }
  };

  const getStatusConfig = (status: Transaction['status'], createdAt: string) => {
    if (status === 'confirmed') {
      return {
        label: 'Payé',
        color: 'success' as const,
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      };
    }
    if (status === 'pending') {
      if (isOlderThan48h(createdAt)) {
        return {
          label: 'Expiré',
          color: 'default' as const,
          icon: <Clock className="w-3.5 h-3.5" />,
        };
      }
      return {
        label: 'En attente',
        color: 'warning' as const,
        icon: <Clock className="w-3.5 h-3.5" />,
      };
    }
    return {
      label: 'Échoué',
      color: 'error' as const,
      icon: <XCircle className="w-3.5 h-3.5" />,
    };
  };

  const pendingCount = useMemo(() => transactions.filter(t => t.status === 'pending').length, [transactions]);
  const confirmedCount = useMemo(() => transactions.filter(t => t.status === 'confirmed').length, [transactions]);
  const expiredPendingCount = useMemo(
    () => transactions.filter(t => t.status === 'failed' || (t.status === 'pending' && isOlderThan48h(t.created_at))).length,
    [transactions]
  );

  const filteredTransactions = useMemo(() => {
    if (activeTab === 'pending') return transactions.filter(t => t.status === 'pending');
    if (activeTab === 'confirmed') return transactions.filter(t => t.status === 'confirmed');
    return transactions;
  }, [transactions, activeTab]);

  const tabs = [
    { key: 'all' as TabKey, label: 'Tous', count: transactions.length },
    { key: 'pending' as TabKey, label: 'En attente', count: pendingCount, isAlert: pendingCount > 0 },
    { key: 'confirmed' as TabKey, label: 'Réussis', count: confirmedCount },
  ];

  const renderHeader = () => (
    <div className="relative z-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-b-[32px] shadow-lg overflow-hidden">
      <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10" />
      <div className="absolute -bottom-14 -left-10 w-32 h-32 rounded-full bg-white/10" />
      
      <div className="relative px-4 pt-5 pb-12">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => navigate(-1)}
            className="min-w-[42px] min-h-[42px] inline-flex items-center justify-center rounded-2xl bg-white/15 hover:bg-white/25 active:scale-[0.97] transition-all text-white"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">Mes paiements</h1>
            <p className="text-xs font-medium text-orange-100">Historique des badges, packs et boosts</p>
          </div>
        </div>
      </div>

      {!loading && !error && (
        <div className="relative px-4 -mt-7 pb-4 max-w-2xl mx-auto">
          <div className="flex bg-white rounded-3xl p-1.5 gap-1 shadow-lg border border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 h-11 rounded-2xl text-[13px] font-bold transition-all duration-200',
                  activeTab === tab.key
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={cn(
                      'min-w-[19px] h-[19px] px-1 rounded-full text-[10px] font-black flex items-center justify-center transition-colors',
                      activeTab === tab.key
                        ? 'bg-white text-orange-600 shadow-2xs'
                        : tab.isAlert
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <motion.div
        className="min-h-screen bg-[var(--color-background)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {renderHeader()}
        <div className="min-h-[50vh] flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        className="min-h-screen bg-[var(--color-background)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {renderHeader()}
        <ErrorState message={error} onRetry={fetchTransactions} />
      </motion.div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-50/70 pb-safe pb-28"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {renderHeader()}

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-3">
        {/* Barre de nettoyage discrète si plusieurs vieilles tentatives */}
        {expiredPendingCount > 0 && (
          <div className="flex items-center justify-between p-3 bg-amber-50/90 rounded-2xl border border-amber-200 text-xs text-amber-900 shadow-xs">
            <span>{expiredPendingCount} tentative{expiredPendingCount > 1 ? 's' : ''} non payée{expiredPendingCount > 1 ? 's' : ''} ou échouée{expiredPendingCount > 1 ? 's' : ''}</span>
            <button
              onClick={handleCleanAllExpired}
              className="font-bold text-amber-800 hover:text-amber-950 underline ml-2"
            >
              Nettoyer
            </button>
          </div>
        )}

        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="w-16 h-16 opacity-40" />}
            title={activeTab === 'pending' ? 'Aucun paiement en attente' : 'Aucun paiement'}
            description={
              activeTab === 'pending'
                ? "Vous n'avez aucun paiement en cours de validation."
                : "Vos paiements pour les badges, boosts et packs apparaîtront ici."
            }
          />
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredTransactions.map((tx) => {
                const typeConfig = getTypeConfig(tx.type);
                const statusConfig = getStatusConfig(tx.status, tx.created_at);
                const isPending = tx.status === 'pending';
                const isConfirmed = tx.status === 'confirmed';
                const isVerifying = verifyingId === tx.id;
                const isDeleting = deletingId === tx.id;

                return (
                  <motion.div
                    key={tx.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-100 shadow-lg shadow-gray-200/50 hover:shadow-xl transition-all cursor-pointer select-none"
                    onClick={() => setSelectedTx(tx)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Icon */}
                        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-2xs', typeConfig.bg)}>
                          <span className={typeConfig.color}>{typeConfig.icon}</span>
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Chip
                              color={statusConfig.color}
                              size="sm"
                              icon={statusConfig.icon}
                            >
                              {statusConfig.label}
                            </Chip>
                          </div>
                          <h3 className="text-[15px] font-extrabold text-gray-900 truncate">
                            {typeConfig.label}
                          </h3>
                          <p className="text-[12px] text-gray-400 mt-0.5">
                            {formatDate(tx.created_at)}
                          </p>
                        </div>
                      </div>

                      {/* Amount + Chevron */}
                      <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                        <span className="font-extrabold text-orange-600 tabular-nums text-[15px]">
                          {formatPrice(tx.amount)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </div>

                    {/* Boutons d'action compacts uniquement sur les paiements non confirmés */}
                    {!isConfirmed && (
                      <div
                        className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2"
                        onClick={e => e.stopPropagation()}
                      >
                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={e => handleVerify(tx, e)}
                              disabled={isVerifying}
                              className="h-8 px-3 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                            >
                              {isVerifying ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5" />}
                              <span>Vérifier</span>
                            </button>

                            <button
                              type="button"
                              onClick={e => handleResume(tx, e)}
                              className="h-8 px-3.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 active:scale-95 transition-all"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Payer</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={e => handleDeleteTransaction(tx, e)}
                          disabled={isDeleting}
                          className="h-8 px-2.5 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 flex items-center gap-1 text-xs font-bold transition-colors ml-auto"
                          title="Supprimer définitivement"
                        >
                          {isDeleting ? <LoadingSpinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                          <span>Supprimer</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* MODAL DÉTAILS DU PAIEMENT */}
      <AnimatePresence>
        {selectedTx && (
          <Modal
            isOpen={!!selectedTx}
            onClose={() => setSelectedTx(null)}
            title="Détails du paiement"
          >
            <div className="space-y-4 pt-1">
              {/* Header Price & Status */}
              <div className="p-4 bg-gray-50 rounded-2xl text-center space-y-1">
                <p className="text-2xl font-black text-gray-900">
                  {formatPrice(selectedTx.amount)}
                </p>
                <div className="flex items-center justify-center pt-1">
                  <Chip
                    color={getStatusConfig(selectedTx.status, selectedTx.created_at).color}
                    size="sm"
                    icon={getStatusConfig(selectedTx.status, selectedTx.created_at).icon}
                  >
                    {getStatusConfig(selectedTx.status, selectedTx.created_at).label}
                  </Chip>
                </div>
              </div>

              {/* Transaction details */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Service</span>
                  <span className="font-bold text-gray-900 text-right">
                    {getTypeConfig(selectedTx.type).label}
                  </span>
                </div>

                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Date</span>
                  <span className="font-bold text-gray-900">
                    {formatDate(selectedTx.created_at)}
                  </span>
                </div>

                {selectedTx.confirmed_at && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Date de validation</span>
                    <span className="font-bold text-emerald-700">
                      {formatDate(selectedTx.confirmed_at)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500 font-medium">Référence</span>
                  <button
                    type="button"
                    onClick={() => copyId(selectedTx.id)}
                    className="font-mono font-bold text-gray-800 flex items-center gap-1 hover:text-orange-600 transition-colors"
                  >
                    <span>#{selectedTx.id.slice(0, 8).toUpperCase()}</span>
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {selectedTx.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleVerify(selectedTx)}
                      disabled={verifyingId === selectedTx.id}
                      className="flex-1 h-10 px-3 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {verifyingId === selectedTx.id ? <LoadingSpinner size="sm" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      <span>Vérifier statut</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResume(selectedTx)}
                      className="flex-1 h-10 px-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Finaliser l'achat</span>
                    </button>
                  </div>
                )}

                {selectedTx.status !== 'confirmed' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteTransaction(selectedTx)}
                    disabled={deletingId === selectedTx.id}
                    className="w-full h-10 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-red-200"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                    Supprimer cette transaction
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const message = encodeURIComponent(
                      `Bonjour support DaloaMarket, j'ai une question concernant mon paiement de ${formatPrice(selectedTx.amount)} pour ${getTypeConfig(selectedTx.type).label} (Réf: #${selectedTx.id.slice(0, 8).toUpperCase()}).`
                    );
                    window.open(`https://wa.me/2250700000000?text=${message}`, '_blank');
                  }}
                  className="w-full h-10 px-4 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-gray-200"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  Assistance WhatsApp
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MesTransactionsPage;