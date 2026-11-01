import React, { useState, useEffect, useCallback } from 'react';
import { Send, Bell, History, Sparkles, Bookmark, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { cn, formatDate } from '../../lib/utils';
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

const AUDIENCES: { value: Audience; label: string; sub: string }[] = [
  { value: 'all', label: 'Tout le monde', sub: 'Market & Delivery' },
  { value: 'market', label: 'DaloaMarket', sub: 'Acheteurs & Vendeurs' },
  { value: 'delivery', label: 'DaloaDelivery', sub: 'Livreurs uniquement' },
];

const QUICK_LINKS = [
  { label: 'Accueil', url: '/' },
  { label: 'Publier', url: '/create-listing' },
  { label: 'Ma boutique', url: '/profile?tab=shop' },
  { label: 'Pack Crédits', url: '/acheter-pack' },
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
  const [url, setUrl] = useState('/');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const { allTemplates, saveTemplate, deleteTemplate } = useCustomTemplates();

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
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
    toast.success(`Modèle « ${t.title} » chargé`);
  };

  const handleSaveCurrentAsTemplate = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Renseignez un titre et un message avant d’enregistrer le modèle');
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

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSend) return;
    const target = AUDIENCES.find((a) => a.value === audience);
    if (
      !(await confirmDialog({
        title: 'Diffuser cette notification ?',
        message: `Cible : ${target?.label} (${target?.sub})`,
        confirmLabel: 'Diffuser maintenant',
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
          ? `Envoyée sur ${res.sent} appareil${res.sent > 1 ? 's' : ''}`
          : 'Notification enregistrée'
      );
      setTitle('');
      setBody('');
      setUrl('/');
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
        title="Notifications Push"
        description="Studio de rédaction et bibliothèque de modèles en 1 clic pour les téléphones et navigateurs."
      />

      {/* Studio 2 colonnes : Rédaction à gauche, Modèles 1-clic à droite */}
      <div className="grid gap-6 lg:grid-cols-[1fr,390px]">
        {/* Colonne Gauche : Rédaction & Aperçu direct */}
        <AdminSection
          icon={Bell}
          title="Rédiger & Diffuser"
          description="Composez votre message ou cliquez sur un modèle à droite pour pré-remplir."
          footer={
            <div className="flex w-full items-center justify-between gap-2">
              <button
                type="button"
                disabled={!title.trim() || !body.trim()}
                onClick={handleSaveCurrentAsTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 disabled:opacity-40 transition-colors"
              >
                <Bookmark size={14} className="text-[var(--color-primary)]" />
                Sauvegarder en modèle
              </button>
              <AdminButton
                variant="primary"
                icon={Send}
                loading={sending}
                disabled={!canSend}
                onClick={() => handleSend()}
              >
                Diffuser maintenant
              </AdminButton>
            </div>
          }
        >
          <form onSubmit={handleSend} className="space-y-3">
            <fieldset>
              <legend className="mb-1.5 block text-xs font-semibold text-stone-700">
                Audience cible
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {AUDIENCES.map((a) => {
                  const selected = audience === a.value;
                  return (
                    <label
                      key={a.value}
                      className={cn(
                        'flex cursor-pointer flex-col rounded-lg border p-2.5 transition-all',
                        selected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary-50)]/40 ring-1 ring-[var(--color-primary)]'
                          : 'border-stone-200 bg-white hover:bg-stone-50'
                      )}
                    >
                      <input
                        type="radio"
                        name="notif-audience"
                        value={a.value}
                        checked={selected}
                        onChange={() => setAudience(a.value)}
                        className="sr-only"
                      />
                      <span className="text-xs font-bold text-stone-900">{a.label}</span>
                      <span className="mt-0.5 text-[10px] text-stone-500">{a.sub}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <AdminField
              label="Titre de la notification"
              rightLabel={`${title.length}/${TITLE_MAX}`}
              htmlFor="notif-title"
            >
              <input
                id="notif-title"
                name="title"
                value={title}
                maxLength={TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Nouveaux arrivages à Daloa"
                className={adminInputClass}
              />
            </AdminField>

            <AdminField
              label="Message"
              rightLabel={`${body.length}/${BODY_MAX}`}
              htmlFor="notif-body"
            >
              <textarea
                id="notif-body"
                name="body"
                rows={3}
                value={body}
                maxLength={BODY_MAX}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Rédigez un message clair et direct..."
                className={adminInputClass}
              />
            </AdminField>

            <AdminField
              label="Lien d'ouverture au clic"
              htmlFor="notif-url"
            >
              <input
                id="notif-url"
                name="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="/"
                className={adminInputClass}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {QUICK_LINKS.map((l) => (
                  <button
                    key={l.url}
                    type="button"
                    onClick={() => setUrl(l.url)}
                    className={cn(
                      'rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors',
                      url === l.url
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </AdminField>

            {/* Aperçu Téléphone intégré */}
            <div className="pt-2">
              <p className="mb-1.5 text-xs font-semibold text-stone-500">Aperçu sur téléphone</p>
              <div className="rounded-xl border border-stone-200/80 bg-stone-100/80 p-3">
                <div className="flex items-start gap-3 rounded-lg bg-white p-3 shadow-2xs border border-stone-200/60">
                  <img
                    src="/android-chrome-192x192.png"
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-lg border border-stone-100"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-[11px] text-stone-400">
                      <span className="font-semibold text-stone-600">
                        {audience === 'delivery' ? 'DaloaDelivery' : 'DaloaMarket'}
                      </span>
                      <span>maintenant</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs font-bold text-stone-900">
                      {title || 'Titre de votre notification'}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-stone-600">
                      {body || 'Le contenu de votre message apparaîtra ici en temps réel.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </AdminSection>

        {/* Colonne Droite : Bibliothèque de modèles 1-Clic */}
        <AdminSection
          icon={Sparkles}
          title="Modèles rapides (1-Clic)"
          description="Cliquez sur un modèle pour remplir l'éditeur."
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
      </div>

      {/* Historique des diffusions avec bouton Réutiliser */}
      <AdminSection
        icon={History}
        title="Historique des diffusions"
        description="Les 20 dernières notifications envoyées."
        bodyClassName="p-0"
      >
        {history.length === 0 ? (
          <div className="p-5">
            <AdminEmpty title="Aucune notification envoyée" />
          </div>
        ) : (
          <ul className="divide-y divide-stone-100">
            {history.map((n) => (
              <li
                key={n.id}
                className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-stone-50/60 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-semibold text-stone-900">{n.title}</p>
                    {n.url && (
                      <span className="hidden sm:inline truncate font-mono text-[11px] text-stone-400">
                        {n.url}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-stone-500">{n.body}</p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <AdminBadge>{formatDate(n.created_at)}</AdminBadge>
                  <button
                    type="button"
                    onClick={() => {
                      setTitle(n.title || '');
                      setBody(n.body || '');
                      setUrl(n.url || '/');
                      toast.success('Message rechargé dans l’éditeur');
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-stone-200 bg-white px-2 py-1 text-[11px] font-medium text-stone-600 hover:bg-stone-100"
                    title="Réutiliser ce message"
                  >
                    <RotateCcw size={11} />
                    Réutiliser
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminSection>
    </div>
  );
};
