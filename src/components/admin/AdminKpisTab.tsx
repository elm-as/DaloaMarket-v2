import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, ShoppingBag, AlertTriangle, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';

export const AdminKpisTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState({ users: 0, listings: 0, reports: 0, transactions: 0 });

  const fetchKpis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }),
        supabase.from('monetization_transactions').select('*', { count: 'exact', head: true }),
      ]);
      const getCount = (result: PromiseSettledResult<any>) =>
        result.status === 'fulfilled' ? (result.value.count || 0) : 0;
      setKpis({
        users: getCount(results[0]),
        listings: getCount(results[1]),
        reports: getCount(results[2]),
        transactions: getCount(results[3]),
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

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={fetchKpis} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-xl font-bold text-[var(--color-on-surface)] mb-6">Tableau de bord</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Utilisateurs', value: kpis.users, icon: Users, color: 'text-blue-500' },
          { label: 'Annonces', value: kpis.listings, icon: ShoppingBag, color: 'text-green-500' },
          { label: 'Signalements', value: kpis.reports, icon: AlertTriangle, color: 'text-orange-500' },
          { label: 'Transactions', value: kpis.transactions, icon: TrendingUp, color: 'text-purple-500' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-5 rounded-2xl shadow-elevation-1">
              <div className="flex items-center gap-3 mb-2">
                <Icon size={24} className={kpi.color} />
                <span className="text-sm text-[var(--color-on-surface-variant)]">{kpi.label}</span>
              </div>
              <p className="text-3xl font-bold text-[var(--color-on-surface)]">{kpi.value}</p>
            </Card>
          );
        })}
      </div>
    </motion.div>
  );
};
