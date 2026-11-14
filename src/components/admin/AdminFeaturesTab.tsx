import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, RefreshCw, Trophy, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { AdminPageHeader, AdminButton } from './ui/AdminUI';
import { confirmDialog } from '../../components/ui/ConfirmDialog';
import type { FeatureSeasonItem, FeatureSuggestionItem } from './features/adminFeatures.types';
import { AdminFeatureNoteModal, AdminSeasonResetModal } from './features/AdminFeatureModals';
import { AdminFeatureCard } from './features/AdminFeatureCard';

const STATUS_OPTIONS = [
  { key: 'all', label: 'Tous' },
  { key: 'pending', label: 'En attente' },
  { key: 'planned', label: 'Planifié' },
  { key: 'completed', label: 'Réalisé' },
  { key: 'rejected', label: 'Rejeté' },
];

export function AdminFeaturesTab() {
  const [features, setFeatures] = useState<FeatureSuggestionItem[]>([]);
  const [seasons, setSeasons] = useState<FeatureSeasonItem[]>([]);
  const [activeSeason, setActiveSeason] = useState<FeatureSeasonItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [showHallOfFameOnly, setShowHallOfFameOnly] = useState<boolean>(false);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [winnerFeatureId, setWinnerFeatureId] = useState('');
  const [winnerNote, setWinnerNote] = useState('Sélectionnée et ajoutée au Hall of Fame !');
  const [isResetting, setIsResetting] = useState(false);

  const [editingNoteFeatureId, setEditingNoteFeatureId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const fetchFeaturesAndSeasons = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: featureData, error: featureError }, { data: seasonData, error: seasonError }] = await Promise.all([
        (supabase as any).from('feature_suggestions').select('*').order('upvotes_count', { ascending: false }),
        (supabase as any).from('feature_seasons').select('*').order('season_number', { ascending: false }),
      ]);
      if (featureError) throw featureError;
      setFeatures(featureData || []);

      if (!seasonError && seasonData && seasonData.length > 0) {
        setSeasons(seasonData);
        const active = seasonData.find((s: FeatureSeasonItem) => s.status === 'active') || seasonData[0];
        setActiveSeason(active);
        const nextNum = (active?.season_number || seasonData.length) + 1;
        setNewSeasonName(`Saison ${nextNum}`);
      } else {
        setActiveSeason({ id: 'default', season_number: 1, season_name: 'Saison 1', status: 'active', started_at: new Date().toISOString() });
        setNewSeasonName('Saison 2');
      }
    } catch (err: any) {
      console.error('Error fetching feature suggestions:', err);
      toast.error('Erreur lors du chargement des fonctionnalités');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFeaturesAndSeasons(); }, [fetchFeaturesAndSeasons]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any).from('feature_suggestions').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
      toast.success(`Statut mis à jour : ${newStatus}`);
      fetchFeaturesAndSeasons();
    } catch (err: any) {
      console.error('Error updating status:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const toggleHallOfFame = async (id: string, currentHof: boolean) => {
    try {
      const updates: any = { is_hall_of_fame: !currentHof };
      if (!currentHof) updates.status = 'completed';
      const { error } = await (supabase as any).from('feature_suggestions').update(updates).eq('id', id);
      if (error) throw error;
      toast.success(!currentHof ? 'Ajouté au Hall of Fame' : 'Retiré du Hall of Fame');
      fetchFeaturesAndSeasons();
    } catch (err: any) {
      console.error('Error toggling Hall of Fame:', err);
      toast.error('Erreur lors de la modification');
    }
  };

  const saveAdminNote = async (id: string) => {
    try {
      const { error } = await (supabase as any).from('feature_suggestions').update({ admin_notes: noteInput }).eq('id', id);
      if (error) throw error;
      toast.success('Note dev enregistrée');
      setEditingNoteFeatureId(null);
      setNoteInput('');
      fetchFeaturesAndSeasons();
    } catch (err: any) {
      console.error('Error saving admin note:', err);
      toast.error('Échec de la sauvegarde');
    }
  };

  const deleteFeature = async (id: string) => {
    if (!(await confirmDialog({ message: 'Supprimer définitivement cette idée de fonctionnalité ?', confirmLabel: 'Supprimer', danger: true }))) return;
    try {
      const { error } = await (supabase as any).from('feature_suggestions').delete().eq('id', id);
      if (error) throw error;
      toast.success('Fonctionnalité supprimée');
      setFeatures((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      console.error('Error deleting feature:', err);
      toast.error('Échec de la suppression');
    }
  };

  const handleResetSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonName.trim()) return;
    setIsResetting(true);
    try {
      if (activeSeason && activeSeason.id !== 'default') {
        await (supabase as any).from('feature_seasons').update({ status: 'archived', ended_at: new Date().toISOString() }).eq('id', activeSeason.id);
      }
      const nextNum = (activeSeason?.season_number || seasons.length || 1) + 1;
      await (supabase as any).from('feature_seasons').insert({
        season_number: nextNum,
        season_name: newSeasonName.trim(),
        status: 'active',
        started_at: new Date().toISOString(),
        winner_feature_id: winnerFeatureId || null,
      });
      if (winnerFeatureId) {
        await (supabase as any).from('feature_suggestions').update({
          is_hall_of_fame: true,
          status: 'completed',
          admin_notes: winnerNote,
          completed_at: new Date().toISOString(),
        }).eq('id', winnerFeatureId);
      }
      toast.success(`Saison clôturée. ${newSeasonName} est maintenant active.`);
      setIsResetModalOpen(false);
      setWinnerFeatureId('');
      fetchFeaturesAndSeasons();
    } catch (err: any) {
      console.error('Error resetting season:', err);
      toast.error('Erreur lors du reset de saison');
    } finally {
      setIsResetting(false);
    }
  };

  const currentSeasonFeaturesCount = features.filter(
    (f) => !f.season_name || f.season_name === (activeSeason?.season_name || 'Saison 1'),
  ).length;

  const filteredFeatures = features.filter((item) => {
    if (showHallOfFameOnly && !item.is_hall_of_fame && item.status !== 'completed') return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
    if (seasonFilter !== 'all' && item.season_name !== seasonFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Idées"
        description={`${activeSeason?.season_name || 'Saison 1'} · ${currentSeasonFeaturesCount} idée${currentSeasonFeaturesCount > 1 ? 's' : ''} soumise${currentSeasonFeaturesCount > 1 ? 's' : ''}`}
        actions={
          <>
            <AdminButton icon={RefreshCw} onClick={fetchFeaturesAndSeasons}>Actualiser</AdminButton>
            <AdminButton variant="primary" icon={RotateCcw} onClick={() => setIsResetModalOpen(true)}>Clôturer la saison</AdminButton>
          </>
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-3.5 sm:p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            type="button"
            onClick={() => setShowHallOfFameOnly(!showHallOfFameOnly)}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
              showHallOfFameOnly ? 'border-amber-500 bg-amber-500 text-white shadow-sm' : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Trophy className="h-3.5 w-3.5" />
            Hall of Fame
          </button>

          {STATUS_OPTIONS.map((st) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setStatusFilter(st.key)}
              className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === st.key ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          {seasons.length > 0 && (
            <select
              aria-label="Filtrer par saison"
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="w-full sm:w-auto rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 outline-none"
            >
              <option value="all">Toutes les saisons</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.season_name}>{s.season_name} ({s.status})</option>
              ))}
            </select>
          )}
          <select
            aria-label="Filtrer par catégorie"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 outline-none"
          >
            <option value="all">Toutes catégories</option>
            <option value="general">Général</option>
            <option value="market">Vendeurs</option>
            <option value="delivery">Livraison</option>
            <option value="payment">Paiement</option>
            <option value="app">Application</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : filteredFeatures.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center shadow-sm">
          <Lightbulb className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-sm font-bold text-gray-800">Aucune fonctionnalité trouvée</h3>
          <p className="mt-1 text-xs text-gray-500">Aucune idée suggérée ne correspond à ces critères.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeatures.map((item, index) => (
            <AdminFeatureCard
              key={item.id}
              item={item}
              isTopVote={index === 0 && !item.is_hall_of_fame}
              onToggleHallOfFame={toggleHallOfFame}
              onEditNote={(selected) => {
                setEditingNoteFeatureId(selected.id);
                setNoteInput(selected.admin_notes || '');
              }}
              onUpdateStatus={updateStatus}
              onDelete={deleteFeature}
            />
          ))}
        </div>
      )}

      {editingNoteFeatureId && (
        <AdminFeatureNoteModal
          noteInput={noteInput}
          onChangeNote={setNoteInput}
          onClose={() => setEditingNoteFeatureId(null)}
          onSave={() => saveAdminNote(editingNoteFeatureId)}
        />
      )}

      {isResetModalOpen && (
        <AdminSeasonResetModal
          activeSeason={activeSeason}
          features={features}
          newSeasonName={newSeasonName}
          winnerFeatureId={winnerFeatureId}
          winnerNote={winnerNote}
          isResetting={isResetting}
          onChangeSeasonName={setNewSeasonName}
          onChangeWinnerId={setWinnerFeatureId}
          onChangeWinnerNote={setWinnerNote}
          onClose={() => setIsResetModalOpen(false)}
          onSubmit={handleResetSeason}
        />
      )}
    </div>
  );
}
