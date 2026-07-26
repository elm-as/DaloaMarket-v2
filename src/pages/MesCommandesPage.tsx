import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, ShoppingBag, ChevronRight, Clock, Truck, CheckCircle, XCircle } from 'lucide-react';
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
  status: string;
  created_at: string;
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

function getStatusConfig(status: string): StatusConfig {
  switch (status) {
    case 'paid':
    case 'funded':
      return { label: 'Payée', color: 'primary', icon: <CheckCircle className="w-3.5 h-3.5" /> };
    case 'in_transit':
      return { label: 'En transit', color: 'warning', icon: <Truck className="w-3.5 h-3.5" /> };
    case 'delivered':
    case 'completed':
      return { label: 'Livrée', color: 'success', icon: <CheckCircle className="w-3.5 h-3.5" /> };
    case 'cancelled':
      return { label: 'Annulée', color: 'error', icon: <XCircle className="w-3.5 h-3.5" /> };
    case 'disputed':
      return { label: 'Litige', color: 'error', icon: <XCircle className="w-3.5 h-3.5" /> };
    default:
      return { label: 'En attente', color: 'default', icon: <Clock className="w-3.5 h-3.5" /> };
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
    // Les vendeurs ne voient pas les commandes 'pending' (non payées)
    return order.seller_id === user?.id && order.status !== 'pending';
  });

  const renderHeader = () => (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[var(--color-outline)]">
      <div className="px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Link
            to="/"
            className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-[0.97] transition-all"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5 text-[var(--color-on-surface)]" />
          </Link>
          <h1 className="text-[17px] font-semibold text-[var(--color-on-surface)]">
            Mes commandes
          </h1>
        </div>
      </div>
      {!loading && !error && (
        <div className="px-4 pb-3 max-w-2xl mx-auto">
          <div className="flex bg-[var(--color-surface-variant)] rounded-[var(--radius-lg)] p-1 gap-1">
            {TAB_FILTERS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 h-10 rounded-[var(--radius-md)] text-[14px] font-semibold transition-all duration-[var(--motion-fast)]',
                  activeTab === tab.key
                    ? 'bg-[var(--color-surface)] text-[var(--color-primary)] shadow-[var(--elevation-1)]'
                    : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]'
                )}
              >
                {tab.icon}
                {tab.label}
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
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[var(--color-outline)] px-4 py-3">
          <div className="flex items-center gap-3 max-w-2xl mx-auto">
            <Link
              to="/"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-[0.97] transition-all"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5 text-[var(--color-on-surface)]" />
            </Link>
            <h1 className="text-[17px] font-semibold text-[var(--color-on-surface)]">
              Mes commandes
            </h1>
          </div>
        </div>
        <ErrorState message={error} onRetry={fetchOrders} />
      </motion.div>
    );
  }
  return (
    <motion.div
      className="min-h-screen bg-[var(--color-background)] pb-safe pb-28"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {renderHeader()}

      <div className="px-4 py-4 max-w-2xl mx-auto">
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
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              return (
                <Card
                  key={order.id}
                  elevation={1}
                  padding="md"
                  onClick={() => navigate(`/suivi/${order.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {order.listing?.photos?.[0] ? (
                        <img
                          src={order.listing.photos[0]}
                          alt={order.listing.title}
                          className="w-14 h-14 object-cover rounded-xl bg-gray-100 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-[var(--color-surface-variant)] flex items-center justify-center flex-shrink-0 text-[var(--color-on-surface-variant)]">
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
                        <h3 className="text-[15px] font-semibold text-[var(--color-on-surface)] truncate mb-0.5">
                          {order.listing?.title || order.listing_title || 'Commande'}
                        </h3>
                        <p className="text-[12px] text-[var(--color-on-surface-variant)]">
                          {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-3 font-semibold text-[var(--color-on-surface)]">
                      <span>{formatPrice(order.total_amount)}</span>
                      <ChevronRight className="w-4 h-4 text-[var(--color-on-surface-variant)]" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default MesCommandesPage;