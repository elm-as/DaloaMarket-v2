import React, { useState, useEffect, useCallback } from 'react';
import { Send, Bell, Sparkles, Bookmark, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import {
  broadcastPushNotification,
  sendSegmentedPushCampaign,
  type SegmentedCampaignResponse,
} from '../../lib/pushNotifications';
import { useCustomTemplates } from './notifications/useCustomTemplates';
import { NotificationTemplateSelector } from './notifications/NotificationTemplateSelector';
import { NotificationBroadcastHistory } from './notifications/NotificationBroadcastHistory';
import type {
  NotificationTemplate,
  NotificationAudience,
} from './notifications/notificationTemplates.types';
import {
  AdminPageHeader,
  AdminSection,
  AdminField,
  AdminButton,
  adminInputClass,
} from './ui/AdminUI';
import { confirmDialog } from '../../components/ui/ConfirmDialog';

const AUDIENCES: { value: NotificationAudience; label: string; sub: string; isSegmented?: boolean }[] = [
  { value: 'all', label: 'Tout le monde', sub: 'Market & Delivery' },
  { value: 'market', label: 'DaloaMarket', sub: 'Acheteurs & Vendeurs' },
  { value: 'delivery', label: 'DaloaDelivery', sub: 'Livreurs uniquement' },
  { value: 'dormant', label: '🎯 Inactifs (0 annonce / 0 achat)', sub: 'Perso avec $nom', isSegmented: true },
  { value: 'active_seller', label: '🎯 Vendeurs actifs', sub: 'Perso avec $nom & $lien', isSegmented: true },
];

const QUICK_LINKS = [
  { label: 'Accueil', url: '/' },
  { label: 'Publier', url: '/publier' },
  { label: 'Ma boutique', url: '/profile?tab=shop' },
  { label: 'Pack Crédits', url: '/acheter-pack' },
  { label: 'Chaîne WhatsApp', url: 'https://whatsapp.com/channel/0029Vb94o2vJENy5kkADR42U' },
  { label: 'Espace livreur', url: 'https://delivery.daloamarket.com/dashboard' },
];

const DYNAMIC_VARIABLES = [
  { token: '$nom', label: '$nom (Prénom)' },
  { token: '$lien', label: '$lien (Lien boutique)' },
  { token: '$numero', label: '$numero (WhatsApp support)' },
  { token: '$chaine', label: '$chaine (Chaîne WA)' },
];

const TITLE_MAX = 65;
const BODY_MAX = 200;

function formatSamplePreviewText(text: string): string {
  return text
    .replace(/\{nom\}|\$nom\b/gi, 'Kouamé')
    .replace(/\{lien\}|\$lien\b/gi, 'daloamarket.com/shop/kouame-mode')
    .replace(/\{chaine(?:\s*wa)?\}|\$chaine(?:\s*wa)?\b/gi, 'whatsapp.com/channel/0029...')
    .replace(/\{\+?numero(?:\s*wa)?\}|\$\+?numero(?:\s*wa)?\b/gi, '+225 07 04 16 33 61');
}

export const AdminNotificationsTab: React.FC = () => {
  const [audience, setAudience] = useState<NotificationAudience>('all');
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [campaignPreview, setCampaignPreview] = useState<SegmentedCampaignResponse | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const { allTemplates, saveTemplate, deleteTemplate } = useCustomTemplates();
  const isSegmentedAudience = audience === 'dormant' || audience === 'active_seller';

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

  useEffect(() => {
    setCampaignPreview(null);
  }, [audience, title, body, url]);

  const handleApplyTemplate = (t: NotificationTemplate) => {
    setTemplateId(t.id);
    setTitle(t.title);
    setBody(t.body);
    setUrl(t.url);
    setAudience(t.audience || 'all');
    toast.success(`Modèle « ${t.title} » chargé`);
  };

  const handleInsertVariable = (token: string) => {
    setBody((prev) => `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}${token}`);
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
    if (tpl) setTemplateId(tpl.id);
  };

  const handlePreviewSegment = async () => {
    if (!isSegmentedAudience || !title.trim() || !body.trim()) return;
    setPreviewing(true);
    try {
      const res = await sendSegmentedPushCampaign({
        segment: audience,
        title: title.trim(),
        body: body.trim(),
        url: url.trim() || '/',
        dryRun: true,
      });
      if (!res.success) {
        throw new Error(res.message || res.error || 'Aperçu indisponible');
      }
      setCampaignPreview(res);
      toast.success(`${res.recipientsCount || 0} destinataire(s) trouvé(s) dans ce segment`);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la simulation');
    } finally {
      setPreviewing(false);
    }
  };

  const canSend = title.trim().length > 0 && body.trim().length > 0 && !sending;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSend) return;
    const target = AUDIENCES.find((a) => a.value === audience);
    if (
      !(await confirmDialog({
        title: isSegmentedAudience ? 'Lancer cette campagne personnalisée ?' : 'Diffuser cette notification ?',
        message: `Cible : ${target?.label} (${target?.sub})`,
        confirmLabel: 'Diffuser maintenant',
      }))
    )
      return;

    setSending(true);
    try {
      const res = isSegmentedAudience
        ? await sendSegmentedPushCampaign({
            segment: audience,
            title: title.trim(),
            body: body.trim(),
            url: url.trim() || '/',
            dryRun: false,
          })
        : await broadcastPushNotification({
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
          : 'Aucun appareil actif ciblé'
      );
      setTitle('');
      setBody('');
      setUrl('/');
      setTemplateId('');
      setCampaignPreview(null);
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
        description="Studio de rédaction, campagnes segmentées ($nom, $lien) et bibliothèque de modèles en 1 clic."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr,390px]">
        <AdminSection
          icon={Bell}
          title="Rédiger & Diffuser"
          description="Composez votre message ou cliquez sur un modèle à droite pour pré-remplir."
          footer={
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                disabled={!title.trim() || !body.trim()}
                onClick={handleSaveCurrentAsTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-600 hover:text-stone-900 disabled:opacity-40 transition-colors"
              >
                <Bookmark size={14} className="text-[var(--color-primary)]" />
                Sauvegarder en modèle
              </button>
              <div className="flex items-center gap-2">
                {isSegmentedAudience && (
                  <AdminButton
                    type="button"
                    variant="secondary"
                    icon={Eye}
                    loading={previewing}
                    disabled={!canSend}
                    onClick={handlePreviewSegment}
                  >
                    Tester la cible
                  </AdminButton>
                )}
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
            </div>
          }
        >
          <form onSubmit={handleSend} className="space-y-3">
            <fieldset>
              <legend className="mb-1.5 block text-xs font-semibold text-stone-700">
                Audience ou segment cible
              </legend>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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

            {isSegmentedAudience && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900">
                <p className="font-semibold">Variables dynamiques disponibles (remplacées pour chaque personne) :</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {DYNAMIC_VARIABLES.map((v) => (
                    <button
                      key={v.token}
                      type="button"
                      onClick={() => handleInsertVariable(v.token)}
                      className="rounded border border-amber-300 bg-white px-2 py-0.5 font-mono text-[11px] font-medium text-amber-900 hover:bg-amber-100"
                    >
                      + {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                placeholder="Ex: Tchaii $nom 😒"
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

            <AdminField label="Lien d'ouverture au clic" htmlFor="notif-url">
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

            {campaignPreview && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs space-y-2">
                <p className="font-bold text-emerald-900">
                  Cible estimée : {campaignPreview.recipientsCount ?? 0} utilisateur(s) abonné(s) aux notifications
                </p>
                {campaignPreview.samples && campaignPreview.samples.length > 0 && (
                  <div className="space-y-1.5">
                    {campaignPreview.samples.map((s) => (
                      <div key={s.userId} className="rounded border border-emerald-200/80 bg-white p-2">
                        <p className="font-bold text-stone-900">{s.title}</p>
                        <p className="mt-0.5 text-stone-600">{s.body}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                      {formatSamplePreviewText(title) || 'Titre de votre notification'}
                    </p>
                    <p className="mt-0.5 line-clamp-3 text-xs text-stone-600">
                      {formatSamplePreviewText(body) || 'Le contenu de votre message apparaîtra ici en temps réel.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </AdminSection>

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

      <NotificationBroadcastHistory
        history={history}
        onReuseNotification={({ title: t, body: b, url: u }) => {
          setTitle(t);
          setBody(b);
          setUrl(u);
          toast.success('Message rechargé dans l’éditeur');
        }}
      />
    </div>
  );
};
