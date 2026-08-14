import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, ShoppingBag, ChevronRight, Clock, Truck, CheckCircle, XCircle, Store } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatPrice, formatDate, cn } from '../lib/utils';
import { Card } from '../components/ui/Card';
import { Chip } from '../components/ui/Chip';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';

interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  listing_title?: string;
  total_amount: number;
  product_amount: number;
  delivery_fee?: number;
  delivery_mode?: string;
  payment_method?: string;
  status: string;
  created_at: string;
  variant_id?: string | null;
  variant_label?: string | null;
  unit_price?: number | null;
  quantity?: number;
  listing?: {
    title: string;
    photos: string[];
  };
}

type TabKey = 'achats' | 'ventes';

interface StatusConfig {
  label: string;
  color: 'default' | 'primary' | 'success' | 'error' | 'warning';
  icon: React.ReactNode;
}

function getStatusConfig(order: Order): StatusConfig {
  switch (order.status) {
    case 'paid':
    case 'funded':
      return { label: 'Payée (Séquestre)', color: 'primary', icon: <CheckCircle className="w-3.5 h-3.5" /> };
    case 'in_transit':
      return { label: 'En livraison', color: 'warning', icon: <Truck className="w-3.5 h-3.5" /> };
    case 'delivered':
    case 'completed':
      return { label: 'Livrée / Reçue', color: 'success', icon: <CheckCircle className="w-3.5 h-3.5" /> };
    case 'cancelled':
      return { label: 'Annulée', color: 'error', icon: <XCircle className="w-3.5 h-3.5" /> };
    case 'disputed':
      return { label: 'Litige', color: 'error', icon: <XCircle className="w-3.5 h-3.5" /> };
    case 'pending':
    default:
      if (order.payment_method === 'cash_at_shop') {
        return { label: 'Réservation boutique', color: 'warning', icon: <Store className="w-3.5 h-3.5" /> };
      }
      if (order.payment_method === 'cod') {
        return { label: 'Paiement à la livraison', color: 'warning', icon: <Truck className="w-3.5 h-3.5" /> };
      }
      return { label: 'Paiement en attente', color: 'default', icon: <Clock className="w-3.5 h-3.5" /> };
  }
}

const TAB_FILTERS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'achats', label: 'Achats', icon: <ShoppingBag className="w-4 h-4" /> },
  { key: 'ventes', label: 'Ventes', icon: <Package className="w-4 h-4" /> },
];

const MesCommandesPage: React.FC = () => {
  usePageTitle('Mes commandes');
  const navigate = useNavigate();
  const { user } = useSupabase();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('achats');

  const fetchOrders = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          listing:listings (
            title,
            photos
          )
        `)
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setOrders((data || []) as Order[]);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Impossible de charger vos commandes.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'achats') return order.buyer_id === user?.id;
    if (order.seller_id !== user?.id) return false;
    // Les vendeurs voient les commandes payées, ainsi que les commandes COD et réservations en boutique
    if (order.status !== 'pending') return true;
    return order.payment_method === 'cod' || order.payment_method === 'cash_at_shop';
  });

  // Commandes actives en cours (exclut livrées, annulées, litiges)
  const activePurchasesCount = orders.filter((o) =>
    o.buyer_id === user?.id && (
      ['paid', 'funded', 'in_transit'].includes(o.status) ||
      (o.status === 'pending' && ['cash_at_shop', 'cod'].includes(o.payment_method || ''))
    )
  ).length;

  const activeSalesCount = orders.filter((o) =>
    o.seller_id === user?.id && (
      ['paid', 'funded', 'in_transit'].includes(o.status) ||
      (o.status === 'pending' && ['cash_at_shop', 'cod'].includes(o.payment_method || ''))
    )
  ).length;

  const renderHeader = () => (
    <div className="relative z-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-b-[32px] shadow-lg overflow-hidden">
      <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10" />
      <div className="absolute -bottom-14 -left-10 w-32 h-32 rounded-full bg-white/10" />
      <div className="relative px-4 pt-5 pb-12">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link
            to="/"
            className="min-w-[42px] min-h-[42px] inline-flex items-center justify-center rounded-2xl bg-white/15 hover:bg-white/25 active:scale-[0.97] transition-all"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">Mes commandes</h1>
            <p className="text-xs font-medium text-orange-100">Suivez vos achats et vos ventes</p>
          </div>
        </div>
      </div>
      {!loading && !error && (
        <div className="relative px-4 -mt-7 pb-4 max-w-2xl mx-auto">
          <div className="flex bg-white rounded-3xl p-1.5 gap-1 shadow-lg border border-gray-100">
            {TAB_FILTERS.map((tab) => {
              const count = tab.key === 'achats' ? activePurchasesCount : activeSalesCount;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 h-11 rounded-2xl text-[14px] font-bold transition-all duration-[var(--motion-fast)]',
                    activeTab === tab.key
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-md'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={cn(
                        'min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] font-black flex items-center justify-center transition-colors',
                        activeTab === tab.key
                          ? 'bg-white text-orange-600 shadow-2xs'
                          : 'bg-orange-500 text-white shadow-2xs'
                      )}
                    >
                      {count > 99 ? '99+' : count}
                    </motion.span>
                  )}
                </button>
              );
            })}
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
        <div className="min-h-[60vh] flex items-center justify-center">
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
        <ErrorState message={error} onRetry={fetchOrders} />
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

      <div className="px-4 py-5 max-w-2xl lg:max-w-5xl mx-auto">
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={activeTab === 'achats' ? <ShoppingBag className="w-16 h-16 opacity-40" /> : <Package className="w-16 h-16 opacity-40" />}
            title={activeTab === 'achats' ? 'Aucun achat' : 'Aucune vente'}
            description={
              activeTab === 'achats'
                ? "Vous n'avez pas encore passé de commande."
                : "Vous n'avez pas encore reçu de commande."
            }
          />
        ) : (
          <>
            {/* MOBILE LIST VIEW */}
            <div className="space-y-3 lg:hidden">
              {filteredOrders.map((order) => {
                const statusConfig = getStatusConfig(order);
                return (
                  <Card
                    key={order.id}
                    elevation={2}
                    padding="md"
                    className="rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 active:scale-[0.99] transition-transform"
                    onClick={() => navigate(`/suivi/${order.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {order.listing?.photos?.[0] ? (
                          <img
                            src={order.listing.photos[0]}
                            alt={order.listing.title}
                            className="w-16 h-16 object-cover rounded-2xl bg-gray-100 flex-shrink-0 shadow-sm"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center flex-shrink-0 text-orange-500">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                        )}
                        
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1.5">
                            <Chip
                              color={statusConfig.color}
                              size="sm"
                              icon={statusConfig.icon}
                            >
                              {statusConfig.label}
                            </Chip>
                          </div>
                          <h3 className="text-[15px] font-extrabold text-gray-900 truncate mb-0.5">
                            {order.listing?.title || order.listing_title || 'Commande'}
                          </h3>
                          {order.variant_label && (
                            <p className="text-[11px] font-extrabold text-orange-600 mb-0.5">Taille : {order.variant_label}{order.quantity && order.quantity > 1 ? ` · x${order.quantity}` : ''}</p>
                          )}
                          <p className="text-[12px] text-[var(--color-on-surface-variant)]">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2 font-extrabold text-orange-600">
                        <span className="tabular-nums text-sm">{formatPrice(order.total_amount)}</span>
                        <ChevronRight className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* DESKTOP DATA TABLE VIEW */}
            <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">N° Commande</th>
                    <th className="px-5 py-3.5">Article</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Statut</th>
                    <th className="px-5 py-3.5 text-right">Montant</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredOrders.map((order) => {
                    const statusConfig = getStatusConfig(order);
                    return (
                      <tr key={order.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-5 py-4 font-mono text-xs font-bold text-gray-500">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3 min-w-0">
                            {order.listing?.photos?.[0] ? (
                              <img
                                src={order.listing.photos[0]}
                                alt=""
                                className="w-10 h-10 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400">
                                <ShoppingBag className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <span className="font-semibold text-gray-900 truncate max-w-xs block">
                                {order.listing?.title || order.listing_title || 'Commande'}
                              </span>
                              {order.variant_label && (
                                <span className="text-[11px] font-bold text-orange-600">Taille : {order.variant_label}{order.quantity && order.quantity > 1 ? ` · x${order.quantity}` : ''}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-gray-600 text-xs">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-5 py-4">
                          <Chip
                            color={statusConfig.color}
                            size="sm"
                            icon={statusConfig.icon}
                          >
                            {statusConfig.label}
                          </Chip>
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-gray-900 tabular-nums">
                          {formatPrice(order.total_amount)}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => navigate(`/suivi/${order.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-50 text-[var(--color-primary)] font-bold text-xs rounded-lg hover:bg-orange-100 transition-colors"
                          >
                            Suivre <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default MesCommandesPage;