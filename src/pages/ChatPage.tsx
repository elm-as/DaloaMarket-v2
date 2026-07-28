import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';

import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Avatar } from '../components/profile/Avatar';
import { ChatBubble } from '../components/chat/ChatBubble';
import { ChatInput } from '../components/chat/ChatInput';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMessageRead } from '../contexts/MessageReadContext';
import { censorMessageContent } from '../lib/censor';
import { extractUuid, getSellerPath } from '../lib/utils';

interface Message {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
  _optimistic?: boolean; // flag pour les messages optimistes
}

interface OtherUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

const ChatPage: React.FC = () => {
  const { listingId, userId: otherUserId } = useParams<{ listingId: string; userId: string }>();
  const navigate = useNavigate();
  const { user } = useSupabase();

  const [messages, setMessages] = useState<Message[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [listingTitle, setListingTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const { refreshUnread } = useMessageRead();

  usePageTitle(otherUser?.full_name || 'Chat');

  const currentUserId = user?.id;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!currentUserId || !otherUserId || !listingId) return;

    setLoading(true);
    setError(null);

    try {
      let activeListingId = listingId;
      let activeOtherUserId = otherUserId;

      if (!extractUuid(activeListingId)) {
        const cleanId = activeListingId.split('-').pop()?.slice(0, 8) || activeListingId.slice(0, 8);
        const { data: listings } = await supabase
          .from('listings')
          .select('id')
          .neq('status', 'deleted')
          .order('created_at', { ascending: false })
          .limit(100);

        const found = listings?.find((l: any) => l.id.startsWith(cleanId));
        if (found) {
          activeListingId = found.id;
        }
      }

      if (!extractUuid(activeOtherUserId)) {
        const cleanId = activeOtherUserId.split('-').pop()?.slice(0, 8) || activeOtherUserId.slice(0, 8);
        const { data: users } = await supabase
          .from('users')
          .select('id')
          .limit(100);

        const found = users?.find((u: any) => u.id.startsWith(cleanId));
        if (found) {
          activeOtherUserId = found.id;
        }
      }

      if (!extractUuid(activeListingId) || !extractUuid(activeOtherUserId)) {
        setError('Impossible de charger la conversation.');
        setLoading(false);
        return;
      }

      if (activeListingId !== listingId || activeOtherUserId !== otherUserId) {
        navigate(`/messages/${activeListingId}/${activeOtherUserId}`, { replace: true });
      }

      const { data: msgs, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${currentUserId},receiver_id.eq.${activeOtherUserId}),and(sender_id.eq.${activeOtherUserId},receiver_id.eq.${currentUserId})`
        )
        .eq('listing_id', activeListingId)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      setMessages(msgs || []);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .eq('id', activeOtherUserId)
        .single();

      if (userError && userError.code !== 'PGRST116') throw userError;
      if (userData) setOtherUser(userData);

      const { data: listingData, error: listingError } = await supabase
        .from('listings')
        .select('title')
        .eq('id', activeListingId)
        .single();

      if (listingError && listingError.code !== 'PGRST116') throw listingError;
      if (listingData) setListingTitle(listingData.title);

      // Mark unread messages from this conversation as read
      const unreadIds = (msgs || [])
        .filter((m: Message) => m.receiver_id === currentUserId && !m.read)
        .map((m: Message) => m.id);

      if (unreadIds.length > 0) {
        const { error: markReadError } = await supabase
          .from('messages')
          .update({ read: true })
          .in('id', unreadIds);

        if (markReadError) {
          console.error('Error marking messages as read:', markReadError);
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              unreadIds.includes(m.id) ? { ...m, read: true } : m
            )
          );
        }
      }
      // On a lu des messages reçus → on rafraîchit le compteur
      refreshUnread();

    } catch (err) {
      console.error('Error fetching chat:', err);
      setError('Impossible de charger la conversation.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, otherUserId, listingId, refreshUnread, navigate]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Real-time subscription
  useEffect(() => {
    if (!currentUserId || !otherUserId || !listingId || !extractUuid(listingId) || !extractUuid(otherUserId)) return;

    const channel = supabase
      .channel(`chat:${listingId}:${currentUserId}:${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `listing_id=eq.${listingId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;

          const isRelevant =
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === otherUserId) ||
            (newMsg.sender_id === otherUserId && newMsg.receiver_id === currentUserId);

          if (isRelevant) {
            setMessages((prev) => {
              // Remplacer le message optimiste correspondant s'il existe,
              // sinon ajouter le message (cas où on n'a pas ajouté optimistiquement)
              const optimisticIndex = prev.findIndex(
                (m) =>
                  m._optimistic &&
                  m.sender_id === newMsg.sender_id &&
                  m.content === newMsg.content
              );

              if (optimisticIndex !== -1) {
                // Remplacer le message optimiste par le vrai message
                const updated = [...prev];
                updated[optimisticIndex] = newMsg;
                return updated;
              }

              // Message reçu de l'autre utilisateur — vérifier pas de doublon
              const alreadyExists = prev.some((m) => m.id === newMsg.id);
              if (alreadyExists) return prev;

              return [...prev, newMsg];
            });

            // Ne rafraîchir le compteur de non-lus que si c'est un message REÇU
            if (newMsg.receiver_id === currentUserId) {
              supabase
                .from('messages')
                .update({ read: true })
                .eq('id', newMsg.id)
                .then(({ error }) => {
                  if (error) console.error('Error marking message as read:', error);
                  refreshUnread();
                });
            }
            // Si c'est notre propre message (sender === currentUserId), on ne touche pas au compteur

            setTimeout(() => scrollToBottom('smooth'), 80);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, otherUserId, listingId, scrollToBottom, refreshUnread]);

  // Scroll to bottom on initial load (instant, pas smooth)
  useEffect(() => {
    if (!loading && messages.length > 0) {
      scrollToBottom('instant' as ScrollBehavior);
    }
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback(async (text: string) => {
    if (!currentUserId || !otherUserId || !listingId || sending || !text.trim()) return;

    setSending(true);

    const censoredText = censorMessageContent(text.trim());

    // --- OPTIMISTIC UPDATE ---
    // On génère un ID temporaire et on ajoute le message localement immédiatement
    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMsg: Message = {
      id: tempId,
      listing_id: listingId,
      sender_id: currentUserId,
      receiver_id: otherUserId,
      content: censoredText,
      created_at: new Date().toISOString(),
      read: false,
      _optimistic: true,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      const { data: insertedData, error: sendError } = await supabase
        .from('messages')
        .insert({
          listing_id: listingId,
          sender_id: currentUserId,
          receiver_id: otherUserId,
          content: censoredText,
          read: false,
        })
        .select()
        .single();

      if (sendError) {
        // En cas d'erreur, retirer le message optimiste
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        throw sendError;
      }

      if (insertedData) {
        setMessages((prev) => {
          const updated = [...prev];
          const idx = updated.findIndex((m) => m.id === tempId);
          if (idx !== -1) {
            updated[idx] = insertedData as Message;
          } else {
            // Check if realtime already added it
            const exists = updated.some(m => m.id === insertedData.id);
            if (!exists) {
              updated.push(insertedData as Message);
            }
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Remove optimistic message on generic error
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }, [currentUserId, otherUserId, listingId, sending, scrollToBottom]);

  // Group messages by date for day separators
  const messagesWithDates = messages.reduce<{ date: string; messages: Message[] }[]>((acc, msg) => {
    const msgDate = new Date(msg.created_at).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const lastGroup = acc[acc.length - 1];
    if (lastGroup && lastGroup.date === msgDate) {
      lastGroup.messages.push(msg);
    } else {
      acc.push({ date: msgDate, messages: [msg] });
    }

    return acc;
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-56px)]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <Button
            variant="text"
            color="secondary"
            size="sm"
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={() => navigate(-1)}
          >
            Retour
          </Button>
          <div className="animate-pulse flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-full bg-gray-200" />
            <div className="space-y-1.5">
              <div className="w-28 h-4 rounded bg-gray-200" />
              <div className="w-20 h-3 rounded bg-gray-200" />
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-56px)]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <Button
            variant="text"
            color="secondary"
            size="sm"
            icon={<ArrowLeft className="w-5 h-5" />}
            onClick={() => navigate(-1)}
          >
            Retour
          </Button>
          <span className="font-semibold text-gray-900">Chat</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <ErrorState message={error} onRetry={fetchMessages} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gray-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0 shadow-sm">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        {otherUser && (
          <Link
            to={getSellerPath(otherUser.id)}
            className="flex items-center gap-3 flex-1 min-w-0 active:scale-[0.97] transition-all"
          >
            <div className="relative">
              <Avatar
                src={otherUser.avatar_url}
                name={otherUser.full_name}
                size="md"
              />
              {/* Online indicator */}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-white rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {otherUser.full_name || 'Utilisateur'}
              </p>
              {listingTitle && (
                <p className="text-xs text-primary truncate">Re: {listingTitle}</p>
              )}
            </div>
          </Link>
        )}
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            icon={<MessageSquare className="w-16 h-16 opacity-40" />}
            title="Aucun message"
            description="Envoyez le premier message pour démarrer la conversation."
          />
        </div>
      ) : (
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        >
          <AnimatePresence initial={false}>
            {messagesWithDates.map((group) => (
              <motion.div
                key={group.date}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                {/* Day separator */}
                <div className="flex justify-center my-4">
                  <span className="text-xs bg-gray-200/60 text-gray-500 px-3 py-1 rounded-full font-medium">
                    {group.date}
                  </span>
                </div>

                {group.messages.map((msg, msgIndex) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18, delay: msgIndex * 0.01 }}
                  >
                    <ChatBubble
                      text={msg.content}
                      timestamp={msg.created_at}
                      isSent={msg.sender_id === currentUserId}
                      status={msg._optimistic ? 'sending' : msg.read ? 'read' : 'sent'}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div className="flex-shrink-0">
        <ChatInput onSend={handleSend} disabled={sending} />
      </div>
    </div>
  );
};

export default ChatPage;
