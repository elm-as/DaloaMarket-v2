import React, { useEffect, useState, useCallback } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { SectionHeader } from '../components/ui/SectionHeader';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { ConversationItem } from '../components/chat/ConversationItem';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

interface Conversation {
  other_user: {
    id: string;
    full_name: string;
    avatar: string | null;
  };
  last_message: string;
  last_message_time: string;
  unread_count: number;
  listing_title: string;
  listing_id: string;
}

const MessagesPage: React.FC = () => {
  usePageTitle('Messages');
  const { user, isProfileComplete } = useSupabase();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user) return;
    const silent = opts?.silent ?? false;

    if (!silent) {
      setLoading(true);
      setError(null);
    }

    try {
      const currentUserId = user.id;

      const { data: allMessages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
        .order('created_at', { ascending: false }).limit(200);

      if (msgError) throw msgError;

      if (!allMessages || allMessages.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const conversationMap = new Map<string, {
        listing_id: string;
        other_user_id: string;
        last_message_time: string;
        messages: typeof allMessages;
      }>();

      for (const msg of allMessages) {
        const otherUserId = msg.sender_id === currentUserId ? msg.receiver_id : msg.sender_id;
        const key = `${msg.listing_id}:${otherUserId}`;

        const existing = conversationMap.get(key);
        if (!existing || new Date(msg.created_at) > new Date(existing.last_message_time)) {
          conversationMap.set(key, {
            listing_id: msg.listing_id,
            other_user_id: otherUserId,
            last_message_time: msg.created_at,
            messages: existing ? existing.messages : [],
          });
        }
        conversationMap.get(key)!.messages.push(msg);
      }

      const listingIds = new Set<string>();
      const userIds = new Set<string>();
      for (const [, conv] of conversationMap) {
        listingIds.add(conv.listing_id);
        userIds.add(conv.other_user_id);
      }

      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('id, title')
        .in('id', Array.from(listingIds));

      if (listingsError) throw listingsError;

      const listingMap = new Map((listings || []).map((l) => [l.id, l.title]));

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .in('id', Array.from(userIds));

      if (usersError) throw usersError;

      const userMap = new Map((users || []).map((u) => [u.id, u]));

      const result: Conversation[] = [];

      for (const [, conv] of conversationMap) {
        const otherUser = userMap.get(conv.other_user_id);
        if (!otherUser) continue;

        const unreadCount = conv.messages.filter(
          (m) => m.receiver_id === currentUserId && !m.read
        ).length;

        const lastMessage = conv.messages.reduce((latest, m) =>
          new Date(m.created_at) > new Date(latest.created_at) ? m : latest
        , conv.messages[0]);

        result.push({
          other_user: {
            id: otherUser.id,
            full_name: otherUser.full_name || 'Utilisateur',
            avatar: otherUser.avatar_url || null,
          },
          last_message: lastMessage.content,
          last_message_time: lastMessage.created_at,
          unread_count: unreadCount,
          listing_title: listingMap.get(conv.listing_id) || 'Annonce',
          listing_id: conv.listing_id,
        });
      }

      result.sort(
        (a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      );

      setConversations(result);
    } catch (err) {
      console.error('Error fetching conversations:', err);
      if (!silent) setError('Impossible de charger vos conversations.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && isProfileComplete) {
      fetchConversations();
    }
  }, [user, isProfileComplete, fetchConversations]);

  useEffect(() => {
    if (!user || !isProfileComplete) return;
    const tick = () => fetchConversations({ silent: true });
    const interval = window.setInterval(tick, 4000);
    const onFocus = () => tick();
    window.addEventListener('focus', onFocus);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user, isProfileComplete, fetchConversations]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`messages-list-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          fetchConversations({ silent: true });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `sender_id=eq.${user.id}`,
        },
        () => {
          fetchConversations({ silent: true });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <SectionHeader title="Messages" />
        <div className="px-4 space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.06 }}
              className="flex items-center gap-3 px-4 py-3"
            >
              <Skeleton width="48px" height="48px" rounded="full" />
              <div className="flex-1 space-y-2">
                <Skeleton width="60%" height="16px" />
                <Skeleton width="80%" height="12px" />
                <Skeleton width="40%" height="12px" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <SectionHeader title="Messages" />
        <ErrorState message={error} onRetry={fetchConversations} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto pb-4">
      <SectionHeader title="Messages" />

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="w-16 h-16 opacity-40" />}
          title="Aucune conversation"
          description="Lancez une discussion en contactant un vendeur"
        />
      ) : (
        <AnimatePresence>
          <div className="rounded-2xl shadow-[var(--elevation-2)] bg-white mx-4 overflow-hidden divide-y divide-gray-100 mb-4">
            {conversations.map((conv, index) => (
              <motion.div
                key={`${conv.listing_id}:${conv.other_user.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
              >
                <ConversationItem conversation={conv} />
              </motion.div>
            ))}
          </div>
          {/* Pied de liste */}
          <p className="text-center text-[11px] text-gray-400 pb-2">
            {conversations.length} conversation{conversations.length > 1 ? 's' : ''}
          </p>
        </AnimatePresence>
      )}
    </div>
  );
};

export default MessagesPage;
