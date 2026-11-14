import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import {
  broadcastPushNotification,
  sendSegmentedPushCampaign,
  type SegmentedCampaignResponse,
  type CampaignSegment,
} from '../../../lib/pushNotifications';
import { triggerBehavioralNudges } from '../../../lib/engagementSignals';
import { confirmDialog } from '../../../components/ui/ConfirmDialog';
import { useCustomTemplates } from './useCustomTemplates';
import {
  AUDIENCES,
  BODY_MAX,
  SEGMENT_AUDIENCES,
  TITLE_MAX,
} from './notificationComposerConfig';
import type {
  NotificationAudience,
  NotificationTemplate,
} from './notificationTemplates.types';

export function useAdminNotificationsComposer() {
  const [audience, setAudience] = useState<NotificationAudience>('all');
  const [templateId, setTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/');
  const [focusedField, setFocusedField] = useState<'title' | 'body'>('body');
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [campaignPreview, setCampaignPreview] = useState<SegmentedCampaignResponse | null>(null);
  const [runningNudges, setRunningNudges] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const { allTemplates, saveTemplate, deleteTemplate } = useCustomTemplates();
  const isSegmentedAudience = SEGMENT_AUDIENCES.has(audience as CampaignSegment);

  const fetchHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (error) {
      console.warn('[AdminNotificationsTab] Historique indisponible:', error.message);
      return;
    }
    setHistory(data || []);
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    setCampaignPreview(null);
  }, [audience, title, body, url]);

  const handleRunBehavioralNudges = async () => {
    setRunningNudges(true);
    try {
      const res = await triggerBehavioralNudges(false);
      if (!res.ok) throw new Error(res.error || 'Échec relances automatiques');
      if (res.skippedReason) {
        toast(`Relances en pause (${res.skippedReason})`);
      } else {
        const total =
          (res.stats?.reviewNudgesSent || 0) +
          (res.stats?.priceDropNudgesSent || 0) +
          (res.stats?.lowStockNudgesSent || 0);
        toast.success(
          total > 0
            ? `${total} relance(s) comportementale(s) envoyée(s)`
            : 'Aucune nouvelle relance comportementale à envoyer'
        );
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors des relances automatiques');
    } finally {
      setRunningNudges(false);
    }
  };

  const handleApplyTemplate = (t: NotificationTemplate) => {
    setTemplateId(t.id);
    setTitle(t.title);
    setBody(t.body);
    setUrl(t.url);
    setAudience(t.audience || 'all');
    toast.success(`Modèle « ${t.title} » chargé`);
  };

  const handleInsertVariable = (token: string) => {
    const appendToken = (prev: string, maxLen: number) => {
      const next = `${prev}${prev.endsWith(' ') || !prev ? '' : ' '}${token}`;
      return next.slice(0, maxLen);
    };
    if (focusedField === 'title') {
      setTitle((prev) => appendToken(prev, TITLE_MAX));
      return;
    }
    setBody((prev) => appendToken(prev, BODY_MAX));
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

  const handlePreviewTarget = async () => {
    if (!title.trim() || !body.trim()) return;
    setPreviewing(true);
    try {
      const res = isSegmentedAudience
        ? await sendSegmentedPushCampaign({
            segment: audience as CampaignSegment,
            title: title.trim(),
            body: body.trim(),
            url: url.trim() || '/',
            dryRun: true,
          })
        : await broadcastPushNotification({
            title: title.trim(),
            body: body.trim(),
            url: url.trim() || '/',
            appType: audience === 'all' ? undefined : (audience as 'market' | 'delivery'),
            dryRun: true,
          });
      if (!res.success) {
        throw new Error(res.message || res.error || 'Aperçu indisponible');
      }
      setCampaignPreview(res);
      toast.success(`${res.recipientsCount ?? 0} destinataire(s) abonné(s) détecté(s)`);
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
    const confirmed = await confirmDialog({
      title: isSegmentedAudience
        ? 'Lancer cette campagne personnalisée ?'
        : 'Diffuser cette notification ?',
      message: `Cible : ${target?.label} (${target?.sub})`,
      confirmLabel: 'Diffuser maintenant',
    });
    if (!confirmed) return;

    setSending(true);
    try {
      const res = isSegmentedAudience
        ? await sendSegmentedPushCampaign({
            segment: audience as CampaignSegment,
            title: title.trim(),
            body: body.trim(),
            url: url.trim() || '/',
            dryRun: false,
          })
        : await broadcastPushNotification({
            title: title.trim(),
            body: body.trim(),
            url: url.trim() || '/',
            appType: audience === 'all' ? undefined : (audience as 'market' | 'delivery'),
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

  return {
    audience,
    setAudience,
    templateId,
    title,
    setTitle,
    body,
    setBody,
    url,
    setUrl,
    setFocusedField,
    sending,
    previewing,
    campaignPreview,
    runningNudges,
    history,
    allTemplates,
    saveTemplate,
    deleteTemplate,
    canSend,
    handleRunBehavioralNudges,
    handleApplyTemplate,
    handleInsertVariable,
    handleSaveCurrentAsTemplate,
    handlePreviewTarget,
    handleSend,
  };
}
