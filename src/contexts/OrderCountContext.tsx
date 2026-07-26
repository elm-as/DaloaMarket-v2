import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface OrderCountContextType {
  activeOrderCount: number;
  refreshOrderCount: () => Promise<void>;
}

const OrderCountContext = createContext<OrderCountContextType | undefined>(undefined);

export const useOrderCount = (): OrderCountContextType => {
  const ctx = useContext(OrderCountContext);
  if (!ctx) throw new Error('useOrderCount must be inside OrderCountProvider');
  return ctx;
};

/** Statuses that represent active/in-progress orders worth badging */
const ACTIVE_STATUSES = ['paid', 'funded', 'in_transit'];

export const OrderCountProvider: React.FC<{
  children: React.ReactNode;
  userId: string | undefined;
  supabaseClient: any;
}> = ({ children, userId, supabaseClient }) => {
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const inFlightRef = useRef(false);

  const refreshOrderCount = useCallback(async () => {
    if (!userId) { setActiveOrderCount(0); return; }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const { count, error } = await supabaseClient
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
        .in('status', ACTIVE_STATUSES);

      if (!error && count !== null) {
        setActiveOrderCount(count);
      }
    } catch {
      // silently ignore — badge stays at previous value
    } finally {
      inFlightRef.current = false;
    }
  }, [userId, supabaseClient]);

  useEffect(() => {
    if (!userId) {
      setActiveOrderCount(0);
      return;
    }
    refreshOrderCount();
    // Poll every 30s — orders change less frequently than messages
    const interval = window.setInterval(refreshOrderCount, 30_000);
    return () => window.clearInterval(interval);
  }, [userId, refreshOrderCount]);

  return (
    <OrderCountContext.Provider value={{ activeOrderCount, refreshOrderCount }}>
      {children}
    </OrderCountContext.Provider>
  );
};
