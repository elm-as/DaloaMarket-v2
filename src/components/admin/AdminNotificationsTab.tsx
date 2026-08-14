import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Send, Bell, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { SectionHeader } from '../ui/SectionHeader';
import { EmptyState } from '../ui/EmptyState';
import { formatDate } from '../../lib/utils';
import { broadcastPushNotification } from '../../lib/pushNotifications';

export const AdminNotificationsTab: React.FC = () => {
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [notifUrl, setNotifUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [notifHistory, setNotifHistory] = useState<any[]>([]);

  const fetchNotifHistory = useCallback(async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
    setNotifHistory(data || []);
  }, []);

  useEffect(() => {
    fetchNotifHistory();
  }, [fetchNotifHistory]);

  const sendNotification = async () => {
    if (!notifTitle || !notifBody) {
      toast.error('Titre et corps requis');
      return;
    }
    setLoading(true);
    try {
      const res = await broadcastPushNotification({
        title: notifTitle,
        body: notifBody,
        url: notifUrl || '/',
      });

      if (res && res.success) {
        toast.success(
          res.sent && res.sent > 0
            ? `Notification diffusée sur ${res.sent} appareil(s) !`
            : 'Notification enregistrée et diffusée !'
        );
        setNotifTitle('');
        setNotifBody('');
        setNotifUrl('');
        fetchNotifHistory();
      } else {
        // Fallback local en cas d'indisponibilité du serveur
        const { error: err } = await supabase.from('notifications').insert({
          title: notifTitle,
          body: notifBody,
          url: notifUrl || null,
        });
        if (err) throw err;
        toast.success('Notification enregistrée dans la base');
        setNotifTitle('');
        setNotifBody('');
        setNotifUrl('');
        fetchNotifHistory();
      }
    } catch (err: any) {
      console.error('Erreur diffusion notification:', err);
      toast.error("Erreur lors de l'envoi de la notification");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-xl font-bold text-[var(--color-on-surface)] mb-6">Notifications push</h2>
      <Card className="p-5 mb-8 rounded-2xl shadow-elevation-1">
        <SectionHeader title="Envoyer une notification push à tous les utilisateurs" />
        <div className="space-y-4 mt-3">
          <input
            type="text"
            placeholder="Titre"
            value={notifTitle}
            onChange={(e) => setNotifTitle(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 rounded-2xl border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)]"
          />
          <textarea
            placeholder="Corps du message"
            value={notifBody}
            onChange={(e) => setNotifBody(e.target.value)}
            disabled={loading}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)] resize-none"
          />
          <input
            type="url"
            placeholder="URL de destination (optionnel, ex: /electronique)"
            value={notifUrl}
            onChange={(e) => setNotifUrl(e.target.value)}
            disabled={loading}
            className="w-full px-4 py-3 rounded-2xl border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)]"
          />
          <Button onClick={sendNotification} fullWidth disabled={loading} className="active:scale-[0.97]">
            <Send size={18} className="mr-2" />
            {loading ? 'Diffusion en cours...' : 'Envoyer à tous les abonnés'}
          </Button>
        </div>
      </Card>

      <SectionHeader title="Historique" />
      {notifHistory.length === 0 ? (
        <EmptyState title="Aucune notification envoyée" />
      ) : (
        <div className="space-y-2 mt-3">
          {notifHistory.map((n) => (
            <Card key={n.id} className="p-4 rounded-2xl flex items-start gap-3 shadow-elevation-1">
              <Bell size={18} className="text-[var(--color-primary)] mt-1" />
              <div className="flex-1">
                <p className="font-medium text-[var(--color-on-surface)]">{n.title}</p>
                <p className="text-sm text-[var(--color-on-surface-variant)]">{n.body}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-[var(--color-on-surface-variant)]">
                  <Clock size={12} />
                  {formatDate(n.created_at)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
};
