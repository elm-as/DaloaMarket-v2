import React, { useEffect, useState } from 'react';
import { CreditCard, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSystemSettings, type PaymentConfig } from '../../../hooks/useSystemSettings';
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

const STATUS_OPTIONS: { value: PaymentConfig['status']; label: string }[] = [
  { value: 'normal', label: 'Opérationnel' },
  { value: 'degraded', label: 'Dégradé (lenteurs chez un opérateur)' },
  { value: 'down', label: 'Indisponible (paiement en ligne coupé)' },
];

const STATUS_BADGE: Record<PaymentConfig['status'], React.ReactNode> = {
  normal: <AdminBadge tone="success">Opérationnel</AdminBadge>,
  degraded: <AdminBadge tone="warning">Dégradé</AdminBadge>,
  down: <AdminBadge tone="danger">Indisponible</AdminBadge>,
};

/**
 * Règles de paiement : état de la passerelle MoneyFusion et limite
 * d'annulations des commandes payées en ligne. La resynchronisation des
 * versements, qui figurait aussi ici, n'existe plus qu'à la page Versements.
 */
export const AdminPaymentSettings: React.FC = () => {
  const { paymentConfig, cancellationSettings, loading, refreshSettings } = useSystemSettings();

  const [status, setStatus] = useState<PaymentConfig['status']>('normal');
  const [notice, setNotice] = useState('');
  const [codOnly, setCodOnly] = useState(false);
  const [savingPay, setSavingPay] = useState(false);

  const [cancelEnabled, setCancelEnabled] = useState(true);
  const [cancelMax, setCancelMax] = useState(3);
  const [cancelNotice, setCancelNotice] = useState('');
  const [savingCancel, setSavingCancel] = useState(false);

  useEffect(() => {
    setStatus(paymentConfig.status || 'normal');
    setNotice(paymentConfig.notice || '');
    setCodOnly(Boolean(paymentConfig.disable_online_payments));
  }, [paymentConfig]);

  useEffect(() => {
    setCancelEnabled(cancellationSettings?.enabled ?? true);
    setCancelMax(cancellationSettings?.max_consecutive_cancellations ?? 3);
    setCancelNotice(cancellationSettings?.notice ?? '');
  }, [cancellationSettings]);

  const payDirty =
    status !== (paymentConfig.status || 'normal') ||
    notice !== (paymentConfig.notice || '') ||
    codOnly !== Boolean(paymentConfig.disable_online_payments);

  const cancelDirty =
    cancelEnabled !== (cancellationSettings?.enabled ?? true) ||
    cancelMax !== (cancellationSettings?.max_consecutive_cancellations ?? 3) ||
    cancelNotice !== (cancellationSettings?.notice ?? '');

  const savePayment = async () => {
    setSavingPay(true);
    try {
      await saveSystemSetting('payment_settings', {
        status,
        notice: notice.trim(),
        disable_online_payments: codOnly,
        force_cod_only: codOnly,
      });
      toast.success('Réglages de paiement enregistrés');
      refreshSettings();
    } catch (err: any) {
      toast.error(err.message || 'Enregistrement impossible');
    } finally {
      setSavingPay(false);
    }
  };

  const saveCancellation = async () => {
    setSavingCancel(true);
    try {
      await saveSystemSetting('cancellation_settings', {
        enabled: cancelEnabled,
        max_consecutive_cancellations: Math.max(1, Math.floor(cancelMax) || 3),
        notice: cancelNotice.trim(),
      });
      toast.success('Règle d’annulation enregistrée');
      refreshSettings();
    } catch (err: any) {
      toast.error(err.message || 'Enregistrement impossible');
    } finally {
      setSavingCancel(false);
    }
  };

  if (loading) return <AdminLoading />;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Paiements"
        description="État du paiement en ligne et règles appliquées aux acheteurs."
      />

      <AdminSection
        icon={CreditCard}
        title="Paiement en ligne (MoneyFusion)"
        description="Wave, Orange Money, MTN et Moov."
        aside={STATUS_BADGE[paymentConfig.status || 'normal']}
        footer={
          <AdminButton variant="primary" loading={savingPay} disabled={!payDirty} onClick={savePayment}>
            Enregistrer
          </AdminButton>
        }
      >
        <AdminField label="État de la passerelle" htmlFor="pay-status">
          <select
            id="pay-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as PaymentConfig['status'])}
            className={adminInputClass}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField
          label="Message aux acheteurs"
          hint="Affiché au moment de payer. Laisser vide si tout fonctionne."
          htmlFor="pay-notice"
        >
          <textarea
            id="pay-notice"
            rows={2}
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            placeholder="Le réseau MTN MoMo subit des lenteurs. Privilégiez Wave ou Orange."
            className={adminInputClass}
          />
        </AdminField>
        <AdminToggleRow
          label="Paiement à la livraison uniquement"
          description="Coupe le paiement en ligne : les acheteurs paient en espèces à la livraison ou en boutique."
          checked={codOnly}
          onChange={setCodOnly}
        />
      </AdminSection>

      <AdminSection
        icon={Ban}
        title="Annulations répétées"
        description="Limite les annulations d’un acheteur sur des commandes payées en ligne, qui coûtent des frais de remboursement."
        aside={cancellationSettings?.enabled ? <AdminBadge tone="success">Active</AdminBadge> : <AdminBadge>Inactive</AdminBadge>}
        footer={
          <AdminButton variant="primary" loading={savingCancel} disabled={!cancelDirty} onClick={saveCancellation}>
            Enregistrer
          </AdminButton>
        }
      >
        <AdminToggleRow
          label="Appliquer la limite"
          description="Au-delà, l’acheteur doit passer par le support pour annuler."
          checked={cancelEnabled}
          onChange={setCancelEnabled}
        />
        <AdminField label="Annulations consécutives autorisées" htmlFor="cancel-max">
          <input
            id="cancel-max"
            type="number"
            min={1}
            max={20}
            value={cancelMax}
            onChange={(e) => setCancelMax(Number(e.target.value))}
            className={`${adminInputClass} max-w-[120px]`}
          />
        </AdminField>
        <AdminField label="Message affiché une fois la limite atteinte" htmlFor="cancel-notice">
          <textarea
            id="cancel-notice"
            rows={2}
            value={cancelNotice}
            onChange={(e) => setCancelNotice(e.target.value)}
            className={adminInputClass}
          />
        </AdminField>
      </AdminSection>
    </div>
  );
};
