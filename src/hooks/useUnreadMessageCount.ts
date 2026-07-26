import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useUnreadMessageCount(userId: string | undefined): number {
  const [unreadCount, setUnreadCount] = useState(0);
  const lastFetchRef = useRef(0);

  const fetchUnread = useCallback(async (uid: string) => {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', uid)
      .eq('read', false);
    if (!error && count !== null) {
      setUnreadCount(count);
    }
    lastFetchRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;
    let interval: ReturnType<typeof setInterval>;

    const tick = () => {
      if (cancelled) return;
      fetchUnread(userId);
    };

    tick();

    interval = setInterval(tick, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, fetchUnread]);

  return unreadCount;
}
