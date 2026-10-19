import React, { useEffect, useState, useCallback } from 'react';
import { CreditCard, Ban, Activity, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSystemSettings, type PaymentConfig } from '../../../hooks/useSystemSettings';
import { getPaymentNetworks, type PaymentNetworkInfo } from '../../../lib/payment';
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

  const [provider, setProvider] = useState<'saspay' | 'moneyfusion'>('saspay');
  const [status, setStatus] = useState<PaymentConfig['status']>('normal');
  const [notice, setNotice] = useState('');
  const [codOnly, setCodOnly] = useState(false);
  const [savingPay, setSavingPay] = useState(false);

  const [networks, setNetworks] = useState<PaymentNetworkInfo[]>([]);
  const [loadingNetworks, setLoadingNetworks] = useState(false);

  const [cancelEnabled, setCancelEnabled] = useState(true);
  const [cancelMax, setCancelMax] = useState(3);
  const [cancelNotice, setCancelNotice] = useState('');
  const [savingCancel, setSavingCancel] = useState(false);

  const loadNetworks = useCallback(async () => {
    setLoadingNetworks(true);
    try {
      const list = await getPaymentNetworks();
      setNetworks(list);
    } finally {
      setLoadingNetworks(false);
    }
  }, []);

  useEffect(() => {
    loadNetworks();
  }, [loadNetworks]);

  useEffect(() => {
    setProvider(paymentConfig.provider || 'saspay');
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
    provider !== (paymentConfig.provider || 'saspay') ||
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
        provider,
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
        title="Passerelle & Paiements en ligne"
        description="Configuration du prestataire de paiement actif et disponibilité du service."
        aside={STATUS_BADGE[paymentConfig.status || 'normal']}
        footer={
          <AdminButton variant="primary" loading={savingPay} disabled={!payDirty} onClick={savePayment}>
            Enregistrer les réglages
          </AdminButton>
        }
      >
        <AdminField label="Prestataire actif" hint="Bascule en direct sans redémarrage serveur">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setProvider('saspay')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                provider === 'saspay'
                  ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-500'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 text-sm">SasPay</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Actif / Recommandé</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Wave, Orange, MTN, Moov, Djamo • Reprise de panier • Webhooks HMAC</p>
            </button>

            <button
              type="button"
              onClick={() => setProvider('moneyfusion')}
              className={`p-3.5 rounded-xl border text-left transition-all ${
                provider === 'moneyfusion'
                  ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-500'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 text-sm">MoneyFusion</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">Secours</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Passerelle alternative historique</p>
            </button>
          </div>
        </AdminField>

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
        icon={Activity}
        title="Surveillance des réseaux télécoms (CI)"
        description="État en direct de chaque opérateur Mobile Money retourné par SasPay"
        aside={
          <button
            type="button"
            onClick={loadNetworks}
            disabled={loadingNetworks}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 active:scale-95 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingNetworks ? 'animate-spin' : ''}`} />
            <span>Rafraîchir</span>
          </button>
        }
      >
        {networks.length === 0 ? (
          <p className="text-xs text-gray-500 italic">Chargement de l'état des réseaux...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {networks.map((n) => (
              <div
                key={n.code}
                className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/80 shadow-2xs"
              >
                <span className="text-xs font-bold text-gray-800">{n.name}</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    n.isActive
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      n.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {n.isActive ? 'Opérationnel' : 'Maintenance'}
                </span>
              </div>
            ))}
          </div>
        )}
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
