import React, { useState, useEffect, useCallback } from 'react';
import { Send, Bell, History, Sparkles, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatDate } from '../../lib/utils';
import { broadcastPushNotification } from '../../lib/pushNotifications';
import { useCustomTemplates } from './notifications/useCustomTemplates';
import { NotificationTemplateSelector } from './notifications/NotificationTemplateSelector';
import type { NotificationTemplate } from './notifications/notificationTemplates.types';
import {
  AdminPageHeader,
  AdminSection,
  AdminField,
  AdminButton,
  AdminBadge,
  AdminEmpty,
  adminInputClass,
} from './ui/AdminUI';
import { confirmDialog } from '../../components/ui/ConfirmDialog';

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

export const AdminNotificationsTab: React.FC = () => {
  const [audience, setAudience] = useState<Audience>('all');
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const { allTemplates, saveTemplate, deleteTemplate } = useCustomTemplates();

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

  const handleApplyTemplate = (t: NotificationTemplate) => {
    setTemplateId(t.id);
    setTitle(t.title);
    setBody(t.body);
    setUrl(t.url);
    setAudience(t.audience || 'all');
    toast.success(`Modèle « ${t.title} » appliqué`);
  };

  const handleSaveCurrentAsTemplate = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Veuillez renseigner un titre et un message');
      return;
    }
    const tpl = await saveTemplate({
      title: title.trim(),
      body: body.trim(),
      url: url.trim() || '/',
      audience,
      category: 'custom',
      categoryLabel: 'Modèles Personnalisés',
      recommendedTime: 'À tout moment',
    });
    if (tpl) {
      setTemplateId(tpl.id);
    }
  };

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending;

  const handleSend = async () => {
    if (!canSend) return;
    const target = AUDIENCES.find((a) => a.value === audience)?.label || '';
    if (
      !(await confirmDialog({
        title: 'Envoyer la notification ?',
        message: `Destinataires : ${target}`,
        confirmLabel: 'Envoyer',
      }))
    )
      return;

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
    <div className="space-y-6">
      <AdminPageHeader
        title="Notifications"
        description="Diffusions de messages en direct sur les téléphones et navigateurs."
      />

      {/* Sélecteur de Modèles en 1 Clic & Création depuis l'Admin */}
      <AdminSection
        icon={Sparkles}
        title="Modèles de notifications (1-Clic & Personnalisables)"
        description="Choisissez un modèle prédéfini ou créez vos propres modèles enregistrés."
      >
        <NotificationTemplateSelector
          allTemplates={allTemplates}
          selectedTemplateId={templateId}
          onSelectTemplate={handleApplyTemplate}
          onSaveCustomTemplate={saveTemplate}
          onDeleteCustomTemplate={deleteTemplate}
          currentFormState={{ title, body, url, audience }}
        />
      </AdminSection>

      {/* Formulaire d'envoi et d'édition */}
      <AdminSection
        icon={Bell}
        title="Rédiger & Diffuser la notification"
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              disabled={!title.trim() || !body.trim()}
              onClick={handleSaveCurrentAsTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-40 transition-colors"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Enregistrer ce message comme modèle
            </button>
            <AdminButton variant="primary" icon={Send} loading={sending} disabled={!canSend} onClick={handleSend}>
              Diffuser maintenant
            </AdminButton>
          </div>
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1fr,280px]">
          <div className="space-y-3">
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

            <AdminField label={`Titre (${title.length}/${TITLE_MAX})`} htmlFor="notif-title">
              <input
                id="notif-title"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nouveaux arrivages à Daloa"
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
                placeholder="Rédigez votre message d'alerte..."
                className={adminInputClass}
              />
            </AdminField>

            <AdminField
              label="Lien de redirection au clic"
              hint="Chemin sur le site (ex. /create-listing) ou URL externe."
              htmlFor="notif-url"
            >
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
                    className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </AdminField>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-[var(--color-on-surface)]">Aperçu direct</p>
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
