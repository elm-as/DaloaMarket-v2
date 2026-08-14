import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface OrderCountContextType {
  activeOrderCount: number;
  activePurchasesCount: number;
  activeSalesCount: number;
  refreshOrderCount: () => Promise<void>;
}

const OrderCountContext = createContext<OrderCountContextType | undefined>(undefined);

export const useOrderCount = (): OrderCountContextType => {
  const ctx = useContext(OrderCountContext);
  if (!ctx) throw new Error('useOrderCount must be inside OrderCountProvider');
  return ctx;
};

export const OrderCountProvider: React.FC<{
  children: React.ReactNode;
  userId: string | undefined;
  supabaseClient: any;
}> = ({ children, userId, supabaseClient }) => {
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [activePurchasesCount, setActivePurchasesCount] = useState(0);
  const [activeSalesCount, setActiveSalesCount] = useState(0);
  const inFlightRef = useRef(false);

  const refreshOrderCount = useCallback(async () => {
    if (!userId) {
      setActiveOrderCount(0);
      setActivePurchasesCount(0);
      setActiveSalesCount(0);
      return;
    }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      // Récupérer les commandes où l'utilisateur est acheteur ou vendeur
      const { data, error } = await supabaseClient
        .from('orders')
        .select('id, buyer_id, seller_id, status, payment_method')
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);

      if (!error && Array.isArray(data)) {
        let purchases = 0;
        let sales = 0;

        data.forEach((order) => {
          // Condition de commande active / en cours :
          // 1. Payée ou en livraison (paid, funded, in_transit)
          // 2. Ou en attente pour Cash boutique / Paiement à la livraison
          const isOngoing =
            ['paid', 'funded', 'in_transit'].includes(order.status) ||
            (order.status === 'pending' && ['cash_at_shop', 'cod'].includes(order.payment_method));

          if (isOngoing) {
            if (order.buyer_id === userId) purchases++;
            if (order.seller_id === userId) sales++;
          }
        });

        setActivePurchasesCount(purchases);
        setActiveSalesCount(sales);
        setActiveOrderCount(purchases + sales);
      }
    } catch {
      // silently ignore
    } finally {
      inFlightRef.current = false;
    }
  }, [userId, supabaseClient]);

  useEffect(() => {
    if (!userId) {
      setActiveOrderCount(0);
      setActivePurchasesCount(0);
      setActiveSalesCount(0);
      return;
    }
    refreshOrderCount();
    // Poll every 25s
    const interval = window.setInterval(refreshOrderCount, 25_000);
    return () => window.clearInterval(interval);
  }, [userId, refreshOrderCount]);

  return (
    <OrderCountContext.Provider
      value={{
        activeOrderCount,
        activePurchasesCount,
        activeSalesCount,
        refreshOrderCount,
      }}
    >
      {children}
    </OrderCountContext.Provider>
  );
};
