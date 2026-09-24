import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Send, Bell, History } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { broadcastPushNotification } from '../../lib/pushNotifications';
import { NOTIFICATION_TEMPLATES } from './notifications/notificationTemplates';
import {
  AdminPageHeader,
  AdminSection,
  AdminField,
  AdminButton,
  AdminBadge,
  AdminEmpty,
  adminInputClass,
} from './ui/AdminUI';

type Audience = 'all' | 'market' | 'delivery';

const AUDIENCES: { value: Audience; label: string }[] = [
  { value: 'all', label: 'Tout le monde (DaloaMarket et DaloaDelivery)' },
  { value: 'market', label: 'DaloaMarket (acheteurs et vendeurs)' },
  { value: 'delivery', label: 'DaloaDelivery (livreurs)' },
];

const QUICK_LINKS = [
  { label: 'Accueil', url: '/' },
  { label: 'Publier', url: '/create-listing' },
  { label: 'Ma boutique', url: '/profile?tab=shop' },
  { label: 'Chaîne WhatsApp', url: 'https://whatsapp.com/channel/0029Vb94o2vJENy5kkADR42U' },
  { label: 'Espace livreur', url: 'https://delivery.daloamarket.com/dashboard' },
];

const TITLE_MAX = 65;
const BODY_MAX = 180;

/**
 * Notifications : un formulaire, un aperçu, l'historique.
 *
 * Remplace l'ancien « studio » (simulateur de téléphone, trois onglets) dont
 * le choix d'audience n'était jamais transmis et qui, en cas d'échec d'envoi,
 * enregistrait quand même la notification et affichait un succès.
 */
export const AdminNotificationsTab: React.FC = () => {
  const [audience, setAudience] = useState<Audience>('all');
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    setHistory(data || []);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const templatesByCategory = useMemo(() => {
    const groups = new Map<string, typeof NOTIFICATION_TEMPLATES>();
    for (const t of NOTIFICATION_TEMPLATES) {
      groups.set(t.categoryLabel, [...(groups.get(t.categoryLabel) || []), t]);
    }
    return [...groups.entries()];
  }, []);

  const selectedTemplate = NOTIFICATION_TEMPLATES.find((t) => t.id === templateId);

  const applyTemplate = (id: string) => {
    setTemplateId(id);
    const t = NOTIFICATION_TEMPLATES.find((tpl) => tpl.id === id);
    if (!t) return;
    setTitle(t.title);
    setBody(t.body);
    setUrl(t.url);
    setAudience(t.audience || 'market');
  };

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    const target = AUDIENCES.find((a) => a.value === audience)?.label || '';
    if (!window.confirm(`Envoyer cette notification à : ${target} ?`)) return;

    setSending(true);
    try {
      const res = await broadcastPushNotification({
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || '/',
        appType: audience === 'all' ? undefined : audience,
      });
      if (!res?.success) {
        throw new Error(res?.message || res?.error || 'Le serveur a refusé l’envoi.');
      }
      toast.success(
        res.sent && res.sent > 0
          ? `Notification envoyée sur ${res.sent} appareil${res.sent > 1 ? 's' : ''}`
          : 'Notification enregistrée (aucun appareil abonné pour cette audience)'
      );
      setTitle('');
      setBody('');
      setUrl('');
      setTemplateId('');
      fetchHistory();
    } catch (err: any) {
      toast.error(err.message || 'Envoi impossible');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Notifications"
        description="Message envoyé sur les téléphones et navigateurs abonnés."
      />

      <AdminSection
        icon={Bell}
        title="Nouvelle notification"
        footer={
          <AdminButton variant="primary" icon={Send} loading={sending} disabled={!canSend} onClick={handleSend}>
            Envoyer
          </AdminButton>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
          <div>
            <AdminField label="Destinataires" htmlFor="notif-audience">
              <select
                id="notif-audience"
                value={audience}
                onChange={(e) => setAudience(e.target.value as Audience)}
                className={adminInputClass}
              >
                {AUDIENCES.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </AdminField>

            <AdminField
              label="Partir d’un modèle"
              hint={selectedTemplate ? `Moment conseillé : ${selectedTemplate.recommendedTime}` : 'Facultatif.'}
              htmlFor="notif-template"
            >
              <select
                id="notif-template"
                value={templateId}
                onChange={(e) => applyTemplate(e.target.value)}
                className={adminInputClass}
              >
                <option value="">Aucun</option>
                {templatesByCategory.map(([category, templates]) => (
                  <optgroup key={category} label={category}>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </AdminField>

            <AdminField label={`Titre (${title.length}/${TITLE_MAX})`} htmlFor="notif-title">
              <input
                id="notif-title"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                className={adminInputClass}
              />
            </AdminField>

            <AdminField label={`Message (${body.length}/${BODY_MAX})`} htmlFor="notif-body">
              <textarea
                id="notif-body"
                rows={3}
                value={body}
                maxLength={BODY_MAX}
                onChange={(e) => setBody(e.target.value)}
                className={adminInputClass}
              />
            </AdminField>

            <AdminField label="Lien ouvert au clic" hint="Chemin du site (ex. /create-listing) ou adresse complète." htmlFor="notif-url">
              <input
                id="notif-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="/"
                className={adminInputClass}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_LINKS.map((l) => (
                  <button
                    key={l.url}
                    type="button"
                    onClick={() => setUrl(l.url)}
                    className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </AdminField>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-[var(--color-on-surface)]">Aperçu</p>
            <div className="rounded-2xl bg-gray-100 p-3">
              <div className="flex gap-2.5 rounded-xl bg-white p-3 shadow-sm">
                <img src="/android-chrome-192x192.png" alt="" className="h-8 w-8 shrink-0 rounded-lg" />
                <div className="min-w-0">
                  <p className="text-[11px] text-gray-400">
                    {audience === 'delivery' ? 'DaloaDelivery' : 'DaloaMarket'} · maintenant
                  </p>
                  <p className="truncate text-sm font-semibold text-gray-900">{title || 'Titre de la notification'}</p>
                  <p className="line-clamp-3 text-xs text-gray-600">{body || 'Le message apparaît ici.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminSection>

      <AdminSection icon={History} title="Historique" description="Les 30 derniers envois." bodyClassName="p-0">
        {history.length === 0 ? (
          <div className="p-5">
            <AdminEmpty title="Aucune notification envoyée" />
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {history.map((n) => (
              <li key={n.id} className="flex items-start justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-gray-500">{n.body}</p>
                  {n.url && <p className="mt-0.5 truncate text-xs text-gray-400">{n.url}</p>}
                </div>
                <AdminBadge>{formatDate(n.created_at)}</AdminBadge>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
};
