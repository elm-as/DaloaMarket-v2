import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

interface MessageReadContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  decrementUnread: (amount: number) => void;
  refreshUnread: () => Promise<void>;
}

const MessageReadContext = createContext<MessageReadContextType | undefined>(undefined);

export const useMessageRead = (): MessageReadContextType => {
  const ctx = useContext(MessageReadContext);
  if (!ctx) throw new Error('useMessageRead must be inside MessageReadProvider');
  return ctx;
};

export const MessageReadProvider: React.FC<{
  children: React.ReactNode;
  userId: string | undefined;
  supabaseClient: any;
}> = ({ children, userId, supabaseClient }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const inFlightRef = useRef(false);

  const refreshUnread = useCallback(async () => {
    if (!userId) { setUnreadCount(0); return; }
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const { count, error } = await supabaseClient
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('read', false);
      if (error) {
        console.error('refreshUnread failed', error);
      } else if (count !== null) {
        setUnreadCount(count);
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [userId, supabaseClient]);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    refreshUnread();
    const interval = window.setInterval(() => {
      refreshUnread();
    }, 4000);
    return () => window.clearInterval(interval);
  }, [userId, refreshUnread]);

  const decrementUnread = useCallback((amount: number) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  return (
    <MessageReadContext.Provider value={{ unreadCount, setUnreadCount, decrementUnread, refreshUnread }}>
      {children}
    </MessageReadContext.Provider>
  );
};
