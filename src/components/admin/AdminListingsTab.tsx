import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, FileText, CheckCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { EmptyState } from '../ui/EmptyState';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorState } from '../ui/ErrorState';
import { Button } from '../ui/Button';
import { cn, formatPrice, formatDate } from '../../lib/utils';

export const AdminListingsTab: React.FC = () => {
  const ITEMS_PER_PAGE = 50;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [listingSearch, setListingSearch] = useState('');
  const [listingPage, setListingPage] = useState(0);
  const [listingTotal, setListingTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'sold' | 'deleted'>('all');

  const fetchListings = useCallback(async (page = 0) => {
    setLoading(true);
    setError(null);
    try {
      const from = page * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      const { data, count, error: err } = await supabase
        .from('listings')
        .select('*, user:users!listings_user_id_fkey(*)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (err) throw err;

      setListings(data || []);
      setListingTotal(count || 0);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erreur de chargement des annonces : ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchListings(0);
  }, [fetchListings]);

  const goToListingPage = (page: number) => {
    setListingPage(page);
    fetchListings(page);
  };

  const deleteListing = async (id: string) => {
    if (!confirm('Supprimer cette annonce ?')) return;
    const { error: err } = await supabase.from('listings').update({ status: 'deleted' }).eq('id', id);
    if (err) { toast.error('Erreur'); return; }
    toast.success('Annonce supprimée');
    fetchListings(listingPage);
  };

  const markSold = async (id: string) => {
    const { error: err } = await supabase.from('listings').update({ status: 'sold' }).eq('id', id);
    if (err) { toast.error('Erreur'); return; }
    toast.success('Annonce marquee comme vendue');
    fetchListings(listingPage);
  };

  if (loading && listings.length === 0) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  if (error) return <ErrorState message={error} onRetry={() => fetchListings(listingPage)} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-xl font-bold text-[var(--color-on-surface)] mb-6">Gestion des annonces</h2>
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-on-surface-variant)]" />
        <input
          type="text"
          placeholder="Rechercher une annonce..."
          value={listingSearch}
          onChange={(e) => setListingSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[var(--color-outline)] bg-[var(--color-surface)] text-[var(--color-on-surface)]"
        />
      </div>

      {/* Onglets de filtrage par statut */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {(['all', 'active', 'sold', 'deleted'] as const).map((s) => {
          const count = s === 'all' 
            ? listings.length 
            : listings.filter((l) => l.status === s || (s === 'active' && !l.status)).length;
          
          const label = s === 'all' ? 'Toutes' : s === 'active' ? 'Actives' : s === 'sold' ? 'Vendues' : 'Supprimées';
          const isActive = statusFilter === s;
          
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97]',
                isActive 
                  ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] font-bold' 
                  : 'bg-[var(--color-surface-variant)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-outline-variant)]'
              )}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>
      {listings.length === 0 ? (
        <EmptyState title="Aucune annonce" icon={<FileText size={48} />} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-outline)] text-left">
                  <th className="p-3">Titre</th>
                  <th className="p-3">Vendeur</th>
                  <th className="p-3">Prix</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings
                  .filter((l) => {
                    const matchesSearch = l.title?.toLowerCase().includes(listingSearch.toLowerCase());
                    const matchesStatus = statusFilter === 'all' 
                      ? true 
                      : (statusFilter === 'active' ? (l.status === 'active' || !l.status) : l.status === statusFilter);
                    return matchesSearch && matchesStatus;
                  })
                  .map((l) => (
                    <tr key={l.id} className="border-b border-[var(--color-outline)]">
                      <td className="p-3 max-w-[200px] truncate">
                        <Link to={`/listings/${l.id}`} className="text-[var(--color-primary)] hover:underline">
                          {l.title}
                        </Link>
                      </td>
                      <td className="p-3">{l.user?.full_name || 'N/A'}</td>
                      <td className="p-3">{formatPrice(l.price)}</td>
                      <td className="p-3">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs uppercase font-bold tracking-wider text-[10px]',
                          l.status === 'sold' ? 'bg-red-50 text-red-700 border border-red-100' :
                          l.status === 'deleted' ? 'bg-gray-100 text-gray-700' :
                          'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        )}>
                          {l.status === 'sold' ? 'Vendu' : l.status === 'deleted' ? 'Supprimé' : 'Actif'}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap">{formatDate(l.created_at)}</td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => markSold(l.id)}
                            className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 active:scale-[0.97]"
                            title="Marquer vendue"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            onClick={() => deleteListing(l.id)}
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 active:scale-[0.97]"
                            title="Supprimer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <span className="text-sm text-[var(--color-on-surface-variant)]">
              {listingTotal} annonces au total
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outlined"
                onClick={() => goToListingPage(listingPage - 1)}
                disabled={listingPage === 0}
              >
                Precedent
              </Button>
              <Button
                size="sm"
                variant="outlined"
                onClick={() => goToListingPage(listingPage + 1)}
                disabled={(listingPage + 1) * ITEMS_PER_PAGE >= listingTotal}
              >
                Suivant
              </Button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};
