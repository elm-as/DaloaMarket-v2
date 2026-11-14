import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Flag, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import { cn, formatDate } from '../../lib/utils';
import { AdminPageHeader, AdminScrollTableContainer } from './ui/AdminUI';

export const AdminReportsTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reports, setReports] = useState<any[]>([]);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('reports')
        .select('*, reporter:users!reports_reporter_id_fkey(id, full_name, shop_name, avatar_url), listing:listings(*)')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setReports(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const resolveReport = async (id: string) => {
    const { error: err } = await supabase.from('reports').update({ status: 'resolved' }).eq('id', id);
    if (err) { toast.error('Erreur'); return; }
    toast.success('Signale marque comme resolu');
    fetchReports();
  };

  const dismissReport = async (id: string) => {
    const { error: err } = await supabase.from('reports').update({ status: 'dismissed' }).eq('id', id);
    if (err) { toast.error('Erreur'); return; }
    toast.success('Signale rejete');
    fetchReports();
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={fetchReports} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <AdminPageHeader title="Signalements" description="Annonces et comptes signalés par les utilisateurs." />
      {reports.length === 0 ? (
        <EmptyState title="Aucun signalement" icon={<Flag size={48} />} />
      ) : (
        <>
          <ul className="space-y-3 md:hidden" aria-label="Liste des signalements">
            {reports.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-stone-200 bg-white p-3.5 space-y-2.5 text-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700">
                      {r.type || 'N/A'}
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        r.status === 'resolved'
                          ? 'bg-green-100 text-green-700'
                          : r.status === 'dismissed'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-yellow-100 text-yellow-700'
                      )}
                    >
                      {r.status || 'pending'}
                    </span>
                  </div>
                  <span className="text-xs text-stone-500 whitespace-nowrap tabular-nums">
                    {formatDate(r.created_at)}
                  </span>
                </div>

                {r.detail && (
                  <p className="text-xs text-stone-700 line-clamp-2">{r.detail}</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-600 pt-1 border-t border-stone-100">
                  <span>
                    Signaleur : <strong className="text-stone-900">{r.reporter?.full_name || 'N/A'}</strong>
                  </span>
                  {r.listing && (
                    <Link
                      to={`/listings/${r.listing.id}`}
                      className="font-semibold text-[var(--color-primary)] underline"
                    >
                      Voir l'annonce
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => resolveReport(r.id)}
                    className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 active:scale-[0.98]"
                  >
                    <CheckCircle size={15} />
                    Résoudre
                  </button>
                  <button
                    type="button"
                    onClick={() => dismissReport(r.id)}
                    className="flex-1 min-h-[40px] inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 active:scale-[0.98]"
                  >
                    <XCircle size={15} />
                    Rejeter
                  </button>
                </div>
              </li>
            ))}
          </ul>

          <AdminScrollTableContainer label="Signalements" className="hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-outline)] text-left">
                  <th className="p-3 font-medium text-[var(--color-on-surface-variant)]">Type</th>
                  <th className="p-3 font-medium text-[var(--color-on-surface-variant)]">Detail</th>
                  <th className="p-3 font-medium text-[var(--color-on-surface-variant)]">Signaleur</th>
                  <th className="p-3 font-medium text-[var(--color-on-surface-variant)]">Annonce</th>
                  <th className="p-3 font-medium text-[var(--color-on-surface-variant)]">Statut</th>
                  <th className="p-3 font-medium text-[var(--color-on-surface-variant)]">Date</th>
                  <th className="p-3 font-medium text-[var(--color-on-surface-variant)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--color-outline)]">
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-surface-variant)]">
                        {r.type || 'N/A'}
                      </span>
                    </td>
                    <td className="p-3 max-w-[200px] truncate">{r.detail || '-'}</td>
                    <td className="p-3">{r.reporter?.full_name || 'N/A'}</td>
                    <td className="p-3">
                      {r.listing ? (
                        <Link to={`/listings/${r.listing.id}`} className="text-[var(--color-primary)] underline">
                          Voir
                        </Link>
                      ) : '-'}
                    </td>
                    <td className="p-3">
                      <span className={cn(
                        'px-2 py-0.5 rounded-full text-xs',
                        r.status === 'resolved' ? 'bg-green-100 text-green-700' :
                        r.status === 'dismissed' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      )}>
                        {r.status || 'pending'}
                      </span>
                    </td>
                    <td className="p-3 whitespace-nowrap tabular-nums">{formatDate(r.created_at)}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => resolveReport(r.id)}
                          className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 active:scale-[0.97]"
                          title="Résoudre"
                          aria-label="Résoudre le signalement"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissReport(r.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 active:scale-[0.97]"
                          title="Rejeter"
                          aria-label="Rejeter le signalement"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminScrollTableContainer>
        </>
      )}
    </motion.div>
  );
};
