import React from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { ErrorState } from '../ui/ErrorState';
import { DisputeSettlementSection } from './payouts/DisputeSettlementSection';
import { useAdminFinanceData } from './payouts/useAdminFinanceData';
import { AdminPageHeader, AdminStatGrid, AdminStatCard, AdminButton, AdminLoading } from './ui/AdminUI';

/**
 * Litiges : seul endroit où l'on arbitre une course contestée (livrer de
 * force, rembourser en partie ou en totalité). Les mêmes boutons existaient
 * aussi sur les cartes de la page Livraisons, avec un comportement différent.
 */
export const AdminDisputesTab: React.FC = () => {
  const { loading, refreshing, error, disputes, refresh, reload } = useAdminFinanceData();

  if (loading) return <AdminLoading />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const open = disputes.filter((d) => d.status === 'disputed').length;
  const resolved = disputes.filter((d) => Boolean((d as any).resolved_at)).length;

  return (
    <div>
      <AdminPageHeader
        title="Litiges"
        description="Courses contestées par un acheteur, un vendeur ou un livreur. Arbitrage attendu sous 48 h."
        actions={
          <AdminButton icon={RefreshCw} loading={refreshing} onClick={refresh}>
            Actualiser
          </AdminButton>
        }
      />
      <AdminStatGrid>
        <AdminStatCard label="À arbitrer" icon={ShieldAlert} tone={open > 0 ? 'danger' : 'neutral'} value={open} />
        <AdminStatCard label="Arbitrés" value={resolved} />
      </AdminStatGrid>
      <DisputeSettlementSection disputes={disputes} onDisputeResolved={reload} />
    </div>
  );
};
