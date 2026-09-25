import React, { useState } from 'react';
import { RefreshCw, CheckCircle2, Clock, AlertOctagon, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { ErrorState } from '../ui/ErrorState';
import { formatPrice } from '../../lib/utils';
import { isDriverDelivery } from './deliveries/types';
import { PayoutsTable } from './payouts/PayoutsTable';
import { FinancialAuditLogsTable } from './payouts/FinancialAuditLogsTable';
import { DriverPayoutsFlowTable } from './payouts/DriverPayoutsFlowTable';
import { CodReceivablesTable } from './payouts/CodReceivablesTable';
import { useAdminFinanceData } from './payouts/useAdminFinanceData';
import { runPayoutProcessing } from '../../lib/adminPayouts';
import {
  AdminPageHeader,
  AdminStatGrid,
  AdminStatCard,
  AdminTabs,
  AdminButton,
  AdminLoading,
} from './ui/AdminUI';

type PayoutView = 'payouts' | 'driver_flows' | 'cod' | 'audit';

/**
 * Versements : suivi des virements MoneyFusion, versements livreurs à régler
 * et journal d'audit. C'est le seul endroit où l'on relance les versements
 * (le bouton existait aussi dans la configuration) ; les litiges ont leur
 * propre page.
 */
export const AdminPayoutsTab: React.FC = () => {
  const { loading, refreshing, error, payouts, deliveries, auditLogs, stats, refresh, reload } = useAdminFinanceData();
  const [view, setView] = useState<PayoutView>('payouts');
  // Nombre de commissions COD à encaisser (mis à jour par l'onglet dédié).
  const [codCount, setCodCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { processed } = await runPayoutProcessing();
      toast.success(processed > 0 ? `${processed} versement${processed > 1 ? 's' : ''} traité${processed > 1 ? 's' : ''}` : 'Aucun versement en attente');
      reload();
    } catch (err: any) {
      toast.error(err.message || 'Impossible de contacter le serveur de paiement');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <AdminLoading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const driverToPay = deliveries.filter(
    (d) =>
      isDriverDelivery(d) &&
      d.status === 'delivered' &&
      (!d.driver_payout || (d.driver_payout.status !== 'paid' && d.driver_payout.status !== 'completed'))
  ).length;

  return (
    <div>
      <AdminPageHeader
        title="Versements"
        description="Virements Mobile Money aux vendeurs, aux livreurs et remboursements aux acheteurs."
        actions={
          <>
            <AdminButton icon={RefreshCw} loading={refreshing} onClick={refresh}>
              Actualiser
            </AdminButton>
            <AdminButton variant="primary" icon={Send} loading={syncing} onClick={handleSync}>
              Relancer les versements
            </AdminButton>
          </>
        }
      />

      <AdminStatGrid>
        <AdminStatCard
          label="Versé"
          icon={CheckCircle2}
          tone="success"
          value={formatPrice(stats.totalPaidAmount)}
          hint={`${stats.totalPaidCount} virement${stats.totalPaidCount > 1 ? 's' : ''}`}
        />
        <AdminStatCard
          label="En attente"
          icon={Clock}
          tone={stats.totalPendingCount > 0 ? 'warning' : 'neutral'}
          value={formatPrice(stats.totalPendingAmount)}
          hint={`${stats.totalPendingCount} à envoyer`}
        />
        <AdminStatCard
          label="Échecs"
          icon={AlertOctagon}
          tone={stats.totalFailedCount > 0 ? 'danger' : 'neutral'}
          value={formatPrice(stats.totalFailedAmount)}
          hint={`${stats.totalFailedCount} à reprendre`}
        />
        <AdminStatCard
          label="Dont vendeurs"
          value={formatPrice(stats.sellerPaidAmount)}
          hint={`+ livreurs ${formatPrice(stats.driverPaidAmount)} + remboursements acheteurs ${formatPrice(stats.refundPaidAmount)}`}
        />
      </AdminStatGrid>

      <AdminTabs<PayoutView>
        value={view}
        onChange={setView}
        tabs={[
          { key: 'payouts', label: 'Virements', count: stats.totalPendingCount + stats.totalFailedCount },
          { key: 'driver_flows', label: 'Livreurs à payer', count: driverToPay },
          { key: 'cod', label: 'Commissions à encaisser', count: codCount },
          { key: 'audit', label: 'Journal' },
        ]}
      />

      {view === 'payouts' && <PayoutsTable payouts={payouts} onRefresh={reload} />}
      {view === 'driver_flows' && <DriverPayoutsFlowTable deliveries={deliveries} payouts={payouts} onRefresh={reload} />}
      {view === 'cod' && <CodReceivablesTable onCountChange={setCodCount} />}
      {view === 'audit' && <FinancialAuditLogsTable logs={auditLogs} onRefresh={reload} />}
    </div>
  );
};
