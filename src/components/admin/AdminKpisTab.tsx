import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ShoppingBag, Package, AlertTriangle, ShieldAlert, MessageSquare, Banknote, Lightbulb, BadgeCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ErrorState } from '../ui/ErrorState';
import { useAdminPendingCounts } from '../../hooks/useAdminPendingCounts';
import { AdminPageHeader, AdminStatGrid, AdminStatCard, AdminSection, AdminLoading } from './ui/AdminUI';

/**
 * Tableau de bord : les chiffres clés (le style de référence de l'admin) et
 * ce qui attend une action, chaque ligne menant à la page qui la traite.
 */
export const AdminKpisTab: React.FC = () => {
  const navigate = useNavigate();
  const { counts } = useAdminPendingCounts(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState({ users: 0, listings: 0, orders: 0, reports: 0 });

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }),
      ]);
      const getCount = (result: PromiseSettledResult<any>) =>
        result.status === 'fulfilled' ? result.value.count || 0 : 0;
      setKpis({
        users: getCount(results[0]),
        listings: getCount(results[1]),
        orders: getCount(results[2]),
        reports: getCount(results[3]),
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKpis();
  }, [fetchKpis]);

  if (loading) return <AdminLoading />;
  if (error) return <ErrorState message={error} onRetry={fetchKpis} />;

  const todo = [
    { label: 'Litiges à arbitrer', count: counts.litiges, icon: ShieldAlert, path: '/admin/litiges', tone: 'danger' as const },
    { label: 'Signalements à examiner', count: counts.signalements, icon: AlertTriangle, path: '/admin/reports', tone: 'warning' as const },
    { label: 'Versements en attente', count: counts.payouts_en_attente, icon: Banknote, path: '/admin/versements', tone: 'warning' as const },
    { label: 'Avis sans réponse', count: counts.avis_sans_reponse, icon: MessageSquare, path: '/admin/feedbacks', tone: 'neutral' as const },
    { label: 'Idées à trier', count: counts.suggestions, icon: Lightbulb, path: '/admin/features', tone: 'neutral' as const },
    { label: 'Pièces livreurs à vérifier (site DaloaDelivery)', count: counts.kyc_a_verifier, icon: BadgeCheck, path: null, tone: 'neutral' as const },
  ].filter((t) => t.count > 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Tableau de bord" />

      <AdminStatGrid>
        <AdminStatCard label="Utilisateurs" icon={Users} value={kpis.users} onClick={() => navigate('/admin/users')} />
        <AdminStatCard label="Annonces en ligne" icon={ShoppingBag} value={kpis.listings} onClick={() => navigate('/admin/listings')} />
        <AdminStatCard label="Commandes" icon={Package} value={kpis.orders} onClick={() => navigate('/admin/livraisons')} />
        <AdminStatCard label="Signalements" icon={AlertTriangle} value={kpis.reports} onClick={() => navigate('/admin/reports')} />
      </AdminStatGrid>

      <AdminSection title="À traiter" bodyClassName="p-0">
        {todo.length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-500">Rien en attente.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {todo.map((t) => {
              const Icon = t.icon;
              const content = (
                <>
                  <span className="flex items-center gap-3">
                    <Icon
                      size={18}
                      className={t.tone === 'danger' ? 'text-red-600' : t.tone === 'warning' ? 'text-amber-600' : 'text-gray-500'}
                    />
                    <span className="text-sm text-gray-800">{t.label}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-gray-900">{t.count}</span>
                </>
              );
              return (
                <li key={t.label}>
                  {t.path ? (
                    <button
                      onClick={() => navigate(t.path!)}
                      className="flex w-full items-center justify-between px-5 py-3 text-left hover:bg-gray-50"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between px-5 py-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </AdminSection>
    </div>
  );
};
