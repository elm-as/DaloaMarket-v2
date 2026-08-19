import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Package,
  ShoppingBag,
  ChevronRight,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  Store,
  CreditCard,
  Banknote,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatPrice, formatDate, cn } from '../lib/utils';
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

interface StatusStyle {
  label: string;
  badgeClass: string;
  dotClass: string;
  icon: React.ReactNode;
}

function getOrderStatusStyle(order: Order): StatusStyle {
  switch (order.status) {
    case 'paid':
    case 'funded':
      return {
        label: 'Payée (Séquestre)',
        badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
        dotClass: 'bg-blue-500',
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    case 'in_transit':
      return {
        label: 'En livraison',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dotClass: 'bg-amber-500 animate-pulse',
        icon: <Truck className="w-3 h-3" />,
      };
    case 'delivered':
    case 'completed':
      return {
        label: 'Livrée & Validée',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        dotClass: 'bg-emerald-500',
        icon: <CheckCircle2 className="w-3 h-3" />,
      };
    case 'cancelled':
      return {
        label: 'Annulée',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dotClass: 'bg-rose-500',
        icon: <XCircle className="w-3 h-3" />,
      };
    case 'disputed':
      return {
        label: 'Litige',
        badgeClass: 'bg-red-50 text-red-700 border-red-200/80',
        dotClass: 'bg-red-500',
        icon: <XCircle className="w-3 h-3" />,
      };
    case 'pending':
    default:
      if (order.payment_method === 'cash_at_shop') {
        return {
          label: 'Réservation boutique',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
          dotClass: 'bg-amber-500',
          icon: <Store className="w-3 h-3" />,
        };
      }
      if (order.payment_method === 'cod') {
        return {
          label: 'Paiement à la livraison',
          badgeClass: 'bg-orange-50 text-orange-800 border-orange-200/80',
          dotClass: 'bg-orange-500 animate-pulse',
          icon: <Truck className="w-3 h-3" />,
        };
      }
      return {
        label: 'En attente',
        badgeClass: 'bg-gray-50 text-gray-700 border-gray-200',
        dotClass: 'bg-gray-400',
        icon: <Clock className="w-3 h-3" />,
      };
  }
}

const TAB_FILTERS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'achats', label: 'Mes Achats', icon: <ShoppingBag className="w-4 h-4" /> },
  { key: 'ventes', label: 'Mes Ventes', icon: <Package className="w-4 h-4" /> },
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
    if (order.status !== 'pending') return true;
    return order.payment_method === 'cod' || order.payment_method === 'cash_at_shop';
  });

  // Compteurs actifs
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
      
      <div className="relative px-4 pt-5 pb-11 max-w-2xl lg:max-w-4xl mx-auto">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-white/15 hover:bg-white/25 active:scale-95 transition-all text-white"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold tracking-tight text-white leading-tight">Mes commandes</h1>
            <p className="text-xs font-medium text-orange-100">Suivi en direct de vos achats & ventes à Daloa</p>
          </div>
        </div>
      </div>

      {/* ── Tabs sélecteurs intégrés ── */}
      {!loading && !error && (
        <div className="relative px-4 -mt-6 pb-3 max-w-2xl lg:max-w-4xl mx-auto">
          <div className="flex bg-white rounded-2xl p-1 gap-1 shadow-md shadow-gray-200/50 border border-gray-100">
            {TAB_FILTERS.map((tab) => {
              const count = tab.key === 'achats' ? activePurchasesCount : activeSalesCount;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95',
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-extrabold shadow-sm'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span
                      className={cn(
                        'min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center',
                        isActive
                          ? 'bg-white text-orange-600 shadow-2xs'
                          : 'bg-orange-500 text-white'
                      )}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
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
      <div className="min-h-screen bg-gray-50/70">
        {renderHeader()}
        <div className="min-h-[50vh] flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/70">
        {renderHeader()}
        <div className="max-w-md mx-auto px-4 pt-10">
          <ErrorState message={error} onRetry={fetchOrders} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/70 pb-32">
      {renderHeader()}

      <div className="px-4 py-4 max-w-2xl lg:max-w-4xl mx-auto">
        {filteredOrders.length === 0 ? (
          <div className="pt-8">
            <EmptyState
              icon={
                activeTab === 'achats' ? (
                  <ShoppingBag className="w-12 h-12 text-orange-400 opacity-60" />
                ) : (
                  <Package className="w-12 h-12 text-orange-400 opacity-60" />
                )
              }
              title={activeTab === 'achats' ? 'Aucun achat pour le moment' : 'Aucune vente reçue'}
              description={
                activeTab === 'achats'
                  ? "Explorez le catalogue de DaloaMarket pour passer votre première commande !"
                  : "Partagez votre lien de boutique sur WhatsApp pour recevoir vos premières commandes."
              }
            />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filteredOrders.map((order, index) => {
                const statusStyle = getOrderStatusStyle(order);
                const isPickup = order.delivery_mode === 'pickup' || order.delivery_mode === 'pickup_point';
                const isCod = order.payment_method === 'cod';
                const title = order.listing?.title || order.listing_title || 'Commande';
                const photo = order.listing?.photos?.[0];

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.04 }}
                    onClick={() => navigate(`/suivi/${order.id}`)}
                    className="group bg-white rounded-3xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200/60 active:scale-[0.99] transition-all cursor-pointer overflow-hidden"
                  >
                    {/* ── Header ligne : Image + Infos + Prix ── */}
                    <div className="flex items-center gap-3.5">
                      {/* Photo produit */}
                      <div className="relative w-14 h-14 rounded-2xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100 shadow-2xs">
                        {photo ? (
                          <img
                            src={photo}
                            alt={title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-orange-50 text-orange-500">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      {/* Titre & Metadonnées compactes */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <h3 className="text-sm font-extrabold text-gray-900 truncate leading-snug">
                            {title}
                          </h3>
                          <span className="text-sm font-black text-gray-900 tabular-nums shrink-0">
                            {formatPrice(order.total_amount)}
                          </span>
                        </div>

                        {/* Ligne détails : Variante + Quantité + Date */}
                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5 font-medium truncate">
                          {order.variant_label ? (
                            <span className="font-bold text-orange-600 truncate">
                              {order.variant_label}
                              {order.quantity && order.quantity > 1 ? ` · x${order.quantity}` : ''}
                            </span>
                          ) : order.quantity && order.quantity > 1 ? (
                            <span className="font-bold text-gray-700">x{order.quantity}</span>
                          ) : null}
                          
                          {(order.variant_label || (order.quantity && order.quantity > 1)) && (
                            <span className="text-gray-300">•</span>
                          )}

                          <span className="text-gray-400">{formatDate(order.created_at)}</span>
                        </div>

                        {/* Mode de remise compact */}
                        <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-gray-400">
                          <span className="flex items-center gap-1">
                            {isPickup ? (
                              <>
                                <Store className="w-3 h-3 text-amber-500" />
                                <span>Retrait magasin</span>
                              </>
                            ) : (
                              <>
                                <Truck className="w-3 h-3 text-orange-500" />
                                <span>Livraison Daloa</span>
                              </>
                            )}
                          </span>

                          <span className="text-gray-200">|</span>

                          <span className="flex items-center gap-1">
                            {isCod ? (
                              <>
                                <Banknote className="w-3 h-3 text-emerald-500" />
                                <span>Paiement livraison</span>
                              </>
                            ) : (
                              <>
                                <CreditCard className="w-3 h-3 text-blue-500" />
                                <span>Payé en ligne</span>
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── Footer ligne : Badge Statut + Bouton Suivre ── */}
                    <div className="mt-3 pt-2.5 border-t border-gray-50 flex items-center justify-between gap-2">
                      {/* Statut Badge Pill */}
                      <div
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border',
                          statusStyle.badgeClass
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', statusStyle.dotClass)} />
                        <span>{statusStyle.label}</span>
                      </div>

                      {/* Action Suivre avec chevron */}
                      <div className="flex items-center gap-1 text-[11px] font-extrabold text-orange-600 group-hover:text-orange-700 transition-colors">
                        <span>Suivre la commande</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default MesCommandesPage;