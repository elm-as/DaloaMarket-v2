import React, { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSystemSettings } from '../../../hooks/useSystemSettings';
import {
  AdminPageHeader,
  AdminSection,
  AdminToggleRow,
  AdminField,
  AdminButton,
  AdminBadge,
  AdminLoading,
  adminInputClass,
} from '../ui/AdminUI';
import { saveSystemSetting } from './saveSystemSetting';

/**
 * Maintenance générale : coupe l'accès aux sites et aux apps derrière un écran
 * d'information. Séparée des autres réglages : c'est un interrupteur
 * d'urgence, pas une configuration du modèle économique.
 */
export const AdminMaintenanceSettings: React.FC = () => {
  const { maintenance, loading, refreshSettings } = useSystemSettings();

  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');
  const [reopening, setReopening] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(maintenance.enabled);
    setMessage(maintenance.message || '');
    setReopening(maintenance.expected_reopening || '');
  }, [maintenance]);

  const dirty =
    enabled !== maintenance.enabled ||
    message !== (maintenance.message || '') ||
    reopening !== (maintenance.expected_reopening || '');

  const handleSave = async () => {
    if (enabled && !maintenance.enabled) {
      const ok = window.confirm(
        'Activer la maintenance coupe immédiatement l’accès à DaloaMarket et DaloaDelivery pour tous les utilisateurs (sauf l’administration). Continuer ?'
      );
      if (!ok) return;
    }
    setSaving(true);
    try {
      await saveSystemSetting('maintenance_mode', {
        enabled,
        message: message.trim(),
        expected_reopening: reopening || null,
      });
      toast.success(enabled ? 'Maintenance activée' : 'Maintenance désactivée');
      refreshSettings();
    } catch (err: any) {
      toast.error(err.message || 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <AdminLoading />;

  return (
    <div>
      <AdminPageHeader
        title="Maintenance"
        description="Coupe l’accès aux sites et aux applications le temps d’une intervention."
      />

      <AdminSection
        icon={Wrench}
        title="Mode maintenance"
        description="Les administrateurs gardent l’accès pendant la maintenance."
        aside={
          maintenance.enabled ? <AdminBadge tone="danger">Active</AdminBadge> : <AdminBadge tone="success">Inactive</AdminBadge>
        }
        footer={
          <AdminButton variant={enabled ? 'danger' : 'primary'} loading={saving} disabled={!dirty} onClick={handleSave}>
            Enregistrer
          </AdminButton>
        }
      >
        <AdminToggleRow
          label="Activer la maintenance"
          description="Les visiteurs voient le message ci-dessous à la place du site et des apps."
          checked={enabled}
          onChange={setEnabled}
        />
        <AdminField label="Message affiché" htmlFor="maint-message">
          <textarea
            id="maint-message"
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="DaloaMarket est en maintenance pour une amélioration technique. Nous revenons très vite."
            className={adminInputClass}
          />
        </AdminField>
        <AdminField label="Réouverture prévue" hint="Facultatif. Affichée aux visiteurs." htmlFor="maint-reopening">
          <input
            id="maint-reopening"
            type="datetime-local"
            value={reopening}
            onChange={(e) => setReopening(e.target.value)}
            className={adminInputClass}
          />
        </AdminField>
      </AdminSection>
    </div>
  );
};
