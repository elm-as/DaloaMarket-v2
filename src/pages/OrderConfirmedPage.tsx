import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, MapPin, Package, ShieldCheck, Store, Truck, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatPrice, formatDate } from '../lib/utils';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Button } from '../components/ui/Button';

interface ConfirmedOrderRow {
  id: string;
  total_amount: number;
  delivery_fee: number | null;
  payment_method: string | null;
  delivery_mode: string | null;
  delivery_address: string | null;
  status: string;
  created_at: string;
  listing?: {
    id: string;
    title: string;
    price: number;
    photos: string[] | null;
  } | null;
  seller?: {
    id: string;
    full_name: string | null;
    shop_name: string | null;
    district: string | null;
    phone: string | null;
  } | null;
}

const OrderConfirmedPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useSupabase();
  usePageTitle('Commande confirmée');

  const [order, setOrder] = useState<ConfirmedOrderRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId || !user?.id) {
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select(
            'id, total_amount, delivery_fee, payment_method, delivery_mode, delivery_address, status, created_at, listing:listings(id, title, price, photos), seller:users!orders_seller_id_fkey(id, full_name, shop_name, district, phone)'
          )
          .eq('id', orderId)
          .maybeSingle();

        if (mounted && !error && data) {
          setOrder(data as unknown as ConfirmedOrderRow);
        }
      } catch (err) {
        console.warn('OrderConfirmedPage load warning:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [orderId, user?.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/70">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const shortRef = orderId ? orderId.slice(0, 8).toUpperCase() : '--------';
  const isPickup = order?.delivery_mode === 'pickup' || order?.payment_method === 'cash_at_shop';
  const sellerDisplayName = order?.seller?.shop_name || order?.seller?.full_name || 'Vendeur DaloaMarket';
  const photoUrl = order?.listing?.photos?.[0] || '';

  return (
    <div className="min-h-screen bg-gray-50/70 py-8 px-4">
      <div className="mx-auto max-w-xl space-y-4">
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="inline-block rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                {isPickup ? 'Réservation enregistrée' : 'Commande enregistrée'}
              </span>
              <h1 className="mt-1 text-lg font-bold text-gray-900">
                Merci pour votre commande
              </h1>
              <p className="mt-0.5 text-xs text-gray-600">
                Référence :{' '}
                <span className="font-mono font-bold text-gray-900 tabular-nums">
                  #{shortRef}
                </span>
                {order?.created_at ? ` · ${formatDate(order.created_at)}` : ''}
              </p>
            </div>
          </div>

          {order && (
            <div className="mt-5 space-y-4 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-3">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-200">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={order.listing?.title || 'Article'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-gray-900">
                    {order.listing?.title || 'Article commandé'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Vendeur : <span className="font-semibold text-gray-800">{sellerDisplayName}</span>
                    {order.seller?.district ? ` (${order.seller.district})` : ''}
                  </p>
                </div>
                <div className="text-right tabular-nums font-mono">
                  <span className="text-sm font-bold text-gray-900">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800">
                    {isPickup ? (
                      <Store className="h-3.5 w-3.5 text-orange-600" />
                    ) : (
                      <Truck className="h-3.5 w-3.5 text-orange-600" />
                    )}
                    <span>{isPickup ? 'Retrait en boutique' : 'Livraison à domicile'}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-600">
                    {isPickup
                      ? `Boutique située à ${order.seller?.district || 'Daloa'}`
                      : order.delivery_address || 'Daloa'}
                  </p>
                </div>

                <div className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-center gap-1.5 font-bold text-gray-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Prochaine étape</span>
                  </div>
                  <p className="mt-1 text-[11px] text-gray-600">
                    Le vendeur confirme la disponibilité, puis votre code de remise s’affiche dans le suivi.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            {orderId && (
              <Button
                variant="filled"
                color="primary"
                size="md"
                onClick={() => navigate(`/suivi/${orderId}`)}
                className="flex-1 rounded-xl font-bold text-xs"
              >
                <span>Suivre ma commande</span>
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            <Link
              to="/mes-commandes"
              className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Mes commandes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmedPage;
