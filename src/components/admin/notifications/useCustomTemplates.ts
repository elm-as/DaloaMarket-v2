import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { NOTIFICATION_TEMPLATES } from './notificationTemplates';
import type { NotificationTemplate } from './notificationTemplates.types';

const STORAGE_KEY = 'daloa_admin_custom_notification_templates';
const SETTING_KEY = 'admin_custom_notification_templates';

export function useCustomTemplates() {
  const [customTemplates, setCustomTemplates] = useState<NotificationTemplate[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  const fetchCustomTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle();

      if (error || !data?.value || !Array.isArray(data.value)) return;
      const parsed = data.value as unknown as NotificationTemplate[];
      setCustomTemplates(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // repli transparent sur le cache local
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomTemplates();
  }, [fetchCustomTemplates]);

  const persistTemplates = async (updated: NotificationTemplate[]): Promise<boolean> => {
    setCustomTemplates(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      const { error } = await supabase
        .from('system_settings')
        .upsert({
          key: SETTING_KEY,
          value: updated as unknown as any,
          updated_at: new Date().toISOString(),
        });
      if (error) {
        console.warn('[useCustomTemplates]: Synchronisation distante échouée, sauvegarde locale active', error);
      }
      return true;
    } catch (e: any) {
      toast.error('Erreur de sauvegarde locale du modèle');
      return false;
    }
  };

  const saveTemplate = async (
    draft: Omit<NotificationTemplate, 'id' | 'isCustom'> & { id?: string }
  ): Promise<NotificationTemplate | null> => {
    const isEdit = Boolean(draft.id);
    const templateId = draft.id || `custom_${Date.now()}`;
    const newTemplate: NotificationTemplate = {
      ...draft,
      id: templateId,
      isCustom: true,
      category: 'custom',
      categoryLabel: draft.categoryLabel || 'Modèles Personnalisés',
      recommendedTime: draft.recommendedTime || 'À tout moment',
      audience: draft.audience || 'all',
    };

    const nextList = isEdit
      ? customTemplates.map((t) => (t.id === templateId ? newTemplate : t))
      : [newTemplate, ...customTemplates];

    const ok = await persistTemplates(nextList);
    if (!ok) return null;
    toast.success(isEdit ? 'Modèle mis à jour avec succès' : 'Nouveau modèle enregistré');
    return newTemplate;
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    const nextList = customTemplates.filter((t) => t.id !== id);
    const ok = await persistTemplates(nextList);
    if (ok) {
      toast.success('Modèle supprimé');
    }
    return ok;
  };

  const allTemplates = useMemo(() => {
    return [...customTemplates, ...NOTIFICATION_TEMPLATES];
  }, [customTemplates]);

  return {
    customTemplates,
    allTemplates,
    loading,
    saveTemplate,
    deleteTemplate,
    refreshTemplates: fetchCustomTemplates,
  };
}
