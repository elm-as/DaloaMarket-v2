import React, { useState, useEffect, useCallback } from 'react';
import { 
  Lightbulb, 
  ThumbsUp, 
  CheckCircle, 
  Clock, 
  XCircle, 
  RefreshCw, 
  Trash2, 
  Trophy, 
  Crown, 
  Sparkles, 
  RotateCcw, 
  Plus, 
  X, 
  User, 
  Calendar,
  MessageSquare
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface FeatureSuggestionItem {
  id: string;
  created_at: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'planned' | 'completed' | 'rejected' | 'under_review';
  upvotes_count: number;
  author_ip: string | null;
  author_name?: string;
  season_name?: string;
  is_hall_of_fame?: boolean;
  admin_notes?: string;
}

interface FeatureSeasonItem {
  id: string;
  season_number: number;
  season_name: string;
  status: 'active' | 'archived';
  started_at: string;
}

export function AdminFeaturesTab() {
  const [features, setFeatures] = useState<FeatureSuggestionItem[]>([]);
  const [seasons, setSeasons] = useState<FeatureSeasonItem[]>([]);
  const [activeSeason, setActiveSeason] = useState<FeatureSeasonItem | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [seasonFilter, setSeasonFilter] = useState<string>('all');
  const [showHallOfFameOnly, setShowHallOfFameOnly] = useState<boolean>(false);

  // Season Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [winnerFeatureId, setWinnerFeatureId] = useState('');
  const [winnerNote, setWinnerNote] = useState('Sélectionnée et ajoutée au Hall of Fame ! 🏆');
  const [isResetting, setIsResetting] = useState(false);

  // Admin note editing modal/state
  const [editingNoteFeatureId, setEditingNoteFeatureId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');

  const fetchFeaturesAndSeasons = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch features
      const { data: featureData, error: featureError } = await (supabase as any)
        .from('feature_suggestions')
        .select('*')
        .order('upvotes_count', { ascending: false });

      if (featureError) throw featureError;
      setFeatures(featureData || []);

      // 2. Fetch seasons
      const { data: seasonData, error: seasonError } = await (supabase as any)
        .from('feature_seasons')
        .select('*')
        .order('season_number', { ascending: false });

      if (!seasonError && seasonData && seasonData.length > 0) {
        setSeasons(seasonData);
        const active = seasonData.find((s: FeatureSeasonItem) => s.status === 'active') || seasonData[0];
        setActiveSeason(active);
        const nextNum = (active?.season_number || seasonData.length) + 1;
        setNewSeasonName(`Saison ${nextNum}`);
      } else {
        // Fallback default
        setActiveSeason({
          id: 'default',
          season_number: 1,
          season_name: 'Saison 1',
          status: 'active',
          started_at: new Date().toISOString()
        });
        setNewSeasonName('Saison 2');
      }
    } catch (err: any) {
      console.error('Error fetching feature suggestions:', err);
      toast.error('Erreur lors du chargement des fonctionnalités');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeaturesAndSeasons();
  }, [fetchFeaturesAndSeasons]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from('feature_suggestions')
        .update({ status: newStatus })
        .eq('id', id);

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
      if (!currentHof) {
        updates.status = 'completed';
      }
      const { error } = await (supabase as any)
        .from('feature_suggestions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success(!currentHof ? '🏆 Ajouté au Hall of Fame !' : 'Retiré du Hall of Fame');
      fetchFeaturesAndSeasons();
    } catch (err: any) {
      console.error('Error toggling Hall of Fame:', err);
      toast.error('Erreur lors de la modification');
    }
  };

  const saveAdminNote = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('feature_suggestions')
        .update({ admin_notes: noteInput })
        .eq('id', id);

      if (error) throw error;
      toast.success('Note dev enregistrée !');
      setEditingNoteFeatureId(null);
      setNoteInput('');
      fetchFeaturesAndSeasons();
    } catch (err: any) {
      console.error('Error saving admin note:', err);
      toast.error('Échec de la sauvegarde');
    }
  };

  const deleteFeature = async (id: string) => {
    if (!window.confirm('Supprimer définitivement cette idée de fonctionnalité ?')) return;
    try {
      const { error } = await (supabase as any)
        .from('feature_suggestions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Fonctionnalité supprimée');
      setFeatures((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      console.error('Error deleting feature:', err);
      toast.error('Échec de la suppression');
    }
  };

  // Season Reset Handler
  const handleResetSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeasonName.trim()) return;

    setIsResetting(true);
    try {
      const currentSeasonName = activeSeason ? activeSeason.season_name : 'Saison 1';

      // 1. Archive current season in feature_seasons table
      if (activeSeason && activeSeason.id !== 'default') {
        await (supabase as any)
          .from('feature_seasons')
          .update({ status: 'archived', ended_at: new Date().toISOString() })
          .eq('id', activeSeason.id);
      }

      // 2. Insert new active season into feature_seasons
      const nextNum = (activeSeason?.season_number || seasons.length || 1) + 1;
      await (supabase as any)
        .from('feature_seasons')
        .insert({
          season_number: nextNum,
          season_name: newSeasonName.trim(),
          status: 'active',
          started_at: new Date().toISOString(),
          winner_feature_id: winnerFeatureId || null
        });

      // 3. Mark the winner feature as Hall of Fame winner
      if (winnerFeatureId) {
        await (supabase as any)
          .from('feature_suggestions')
          .update({
            is_hall_of_fame: true,
            status: 'completed',
            admin_notes: winnerNote,
            completed_at: new Date().toISOString()
          })
          .eq('id', winnerFeatureId);
      }

      toast.success(`🎉 Saison clôturée ! La ${newSeasonName} est maintenant active.`);
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
    (f) => !f.season_name || f.season_name === (activeSeason?.season_name || 'Saison 1')
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
      {/* Season Control Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 rounded-2xl p-6 text-white shadow-lg border border-slate-700 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-black uppercase tracking-wider border border-amber-500/30">
                Saison Active
              </span>
              <span className="text-xs text-slate-300 font-bold">
                {currentSeasonFeaturesCount} idée{currentSeasonFeaturesCount > 1 ? 's' : ''} soumise{currentSeasonFeaturesCount > 1 ? 's' : ''}
              </span>
            </div>

            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
              {activeSeason?.season_name || 'Saison 1'} — Boîte à Idées & Upvotes
            </h2>

            <p className="text-xs text-slate-300 max-w-xl">
              Gérez les suggestions de la communauté, élisez les gagnants pour le Hall of Fame et clôturez la saison active pour en lancer une nouvelle.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsResetModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black shadow-md shadow-orange-500/30 flex items-center gap-2 transition-all active:scale-95 shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser & Nouvelle Saison
            </button>
            <button
              onClick={fetchFeaturesAndSeasons}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setShowHallOfFameOnly(!showHallOfFameOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
              showHallOfFameOnly
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            Hall of Fame Only
          </button>

          <span className="text-xs text-gray-400 font-medium">| Statut :</span>
          {['all', 'pending', 'planned', 'completed', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${
                statusFilter === st
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'all' ? 'Tous' : st === 'pending' ? 'En attente' : st === 'planned' ? 'Planifié' : st === 'completed' ? 'Réalisé' : 'Rejeté'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {seasons.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium">Saison :</span>
              <select
                value={seasonFilter}
                onChange={(e) => setSeasonFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 bg-gray-50 text-gray-700 outline-none"
              >
                <option value="all">Toutes les saisons</option>
                {seasons.map((s) => (
                  <option key={s.id} value={s.season_name}>
                    {s.season_name} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium">Catégorie :</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-gray-200 bg-gray-50 text-gray-700 outline-none"
            >
              <option value="all">Toutes</option>
              <option value="general">Général</option>
              <option value="market">Vendeurs</option>
              <option value="delivery">Livraison</option>
              <option value="payment">Paiement</option>
              <option value="app">Application</option>
            </select>
          </div>
        </div>
      </div>

      {/* Features List */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : filteredFeatures.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-sm">
          <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-gray-800">Aucune fonctionnalité trouvée</h3>
          <p className="text-xs text-gray-500 mt-1">Aucune idée suggérée ne correspond à ces critères.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFeatures.map((item, index) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                item.is_hall_of_fame || item.status === 'completed'
                  ? 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-300/40'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-start gap-4 flex-1">
                {/* Vote Counter */}
                <div className="flex flex-col items-center justify-center min-w-[54px] p-2 bg-amber-50 border border-amber-200/60 rounded-2xl text-amber-700 font-bold shrink-0">
                  <ThumbsUp className="w-4 h-4 fill-amber-500 text-amber-500 mb-0.5" />
                  <span className="text-sm">{item.upvotes_count || 0}</span>
                  <span className="text-[9px] uppercase font-semibold text-amber-600">Votes</span>
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.is_hall_of_fame && (
                      <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-200 fill-amber-200" /> Hall of Fame
                      </span>
                    )}

                    <h4 className="text-sm font-bold text-gray-900">{item.title}</h4>
                    
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-semibold uppercase">
                      {item.category}
                    </span>

                    {item.season_name && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {item.season_name}
                      </span>
                    )}

                    {index === 0 && !item.is_hall_of_fame && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        🏆 N°1 Top Vote
                      </span>
                    )}
                  </div>

                  {item.description && (
                    <p className="text-xs text-gray-600 leading-relaxed">{item.description}</p>
                  )}

                  {/* Author & Admin Note display */}
                  <div className="pt-1 flex items-center gap-3 flex-wrap text-[11px] text-gray-500">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <User className="w-3 h-3 text-amber-500" />
                      Proposé par : {item.author_name || 'Membre DaloaMarket'}
                    </span>

                    <span>• Proposée {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: fr })}</span>

                    {item.admin_notes && (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-bold border border-emerald-200 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Note dev : {item.admin_notes}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions & Status */}
              <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center flex-wrap">
                {/* Hall of Fame toggle */}
                <button
                  onClick={() => toggleHallOfFame(item.id, !!item.is_hall_of_fame)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1 ${
                    item.is_hall_of_fame
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                  title="Promouvoir au Hall of Fame"
                >
                  <Trophy className="w-3.5 h-3.5" />
                  {item.is_hall_of_fame ? 'Au HOF' : '+ HOF'}
                </button>

                {/* Edit Note Button */}
                <button
                  onClick={() => {
                    setEditingNoteFeatureId(item.id);
                    setNoteInput(item.admin_notes || '');
                  }}
                  className="p-1.5 rounded-xl text-gray-500 hover:text-slate-900 hover:bg-gray-100 transition-colors"
                  title="Ajouter/modifier la note dev"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                {/* Status selector */}
                <select
                  value={item.status}
                  onChange={(e) => updateStatus(item.id, e.target.value)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border border-gray-200 bg-gray-50 text-gray-700 outline-none"
                >
                  <option value="pending">En attente</option>
                  <option value="planned">Planifiée</option>
                  <option value="completed">Réalisée</option>
                  <option value="rejected">Rejetée</option>
                </select>

                <button
                  onClick={() => deleteFeature(item.id)}
                  className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Admin Note Modal ─── */}
      {editingNoteFeatureId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-500" />
                Ajouter une note de l'équipe Dev
              </h3>
              <button
                onClick={() => setEditingNoteFeatureId(null)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <textarea
              rows={3}
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Ex: Déployé dans la mise à jour v2.4 du 15 Mars ! Merci @Kouassi"
              className="w-full p-3 rounded-xl border border-gray-200 text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEditingNoteFeatureId(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                onClick={() => saveAdminNote(editingNoteFeatureId)}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover"
              >
                Enregistrer la note
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Season Reset Modal ─── */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-amber-500" />
                  Réinitialiser & Lancer une Nouvelle Saison
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clôture la {activeSeason?.season_name || 'Saison 1'} et remet le formulaire à neuf.
                </p>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetSeason} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Nom de la nouvelle saison *
                </label>
                <input
                  type="text"
                  required
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  placeholder="Ex: Saison 2 — Trimestre 2 2026"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 block">
                  Élire l'Idée Gagnante pour le Hall of Fame (Optionnel) 🏆
                </label>
                <select
                  value={winnerFeatureId}
                  onChange={(e) => setWinnerFeatureId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none bg-white"
                >
                  <option value="">-- Aucune idée sélectionnée --</option>
                  {features.map((f) => (
                    <option key={f.id} value={f.id}>
                      [{f.upvotes_count} votes] {f.title} (par {f.author_name || 'Anonyme'})
                    </option>
                  ))}
                </select>
              </div>

              {winnerFeatureId && (
                <div className="space-y-1.5 bg-amber-50 p-3 rounded-2xl border border-amber-200">
                  <label className="text-xs font-bold text-amber-900 block">
                    Message de Félicitations / Note dev pour le Gagnant
                  </label>
                  <input
                    type="text"
                    value={winnerNote}
                    onChange={(e) => setWinnerNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 bg-white text-xs font-medium outline-none"
                  />
                </div>
              )}

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs leading-relaxed">
                ℹ️ <strong>Ce que cette action va faire :</strong>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>Marquer la <strong>{activeSeason?.season_name || 'Saison 1'}</strong> comme archivée.</li>
                  <li>Inscrire l'idée gagnante au <strong>Hall of Fame 🏆</strong>.</li>
                  <li>Créer la <strong>{newSeasonName}</strong> comme nouvelle saison active pour les futurs formulaires.</li>
                </ul>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !newSeasonName.trim()}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black shadow-md hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 flex items-center gap-2"
                >
                  {isResetting && <LoadingSpinner />}
                  Clôturer et Lancer {newSeasonName}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
