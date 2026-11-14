import React from 'react';
import { MessageSquare, RotateCcw, X } from 'lucide-react';
import { LoadingSpinner } from '../../ui/LoadingSpinner';
import type { FeatureSeasonItem, FeatureSuggestionItem } from './adminFeatures.types';

interface AdminFeatureNoteModalProps {
  noteInput: string;
  onChangeNote: (val: string) => void;
  onClose: () => void;
  onSave: () => void;
}

export const AdminFeatureNoteModal: React.FC<AdminFeatureNoteModalProps> = ({
  noteInput,
  onChangeNote,
  onClose,
  onSave,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-sm">
    <div className="w-full max-w-md space-y-4 rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <MessageSquare className="h-4 w-4 text-amber-500" />
          Ajouter une note de l&apos;équipe Dev
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <label htmlFor="feature-admin-note" className="sr-only">
        Note de l&apos;équipe Dev
      </label>
      <textarea
        id="feature-admin-note"
        rows={3}
        value={noteInput}
        onChange={(e) => onChangeNote(e.target.value)}
        placeholder="Ex: Déployé dans la mise à jour v2.4"
        className="w-full rounded-xl border border-gray-200 p-3 text-xs font-medium outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
      />

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-[40px] rounded-xl px-3.5 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onSave}
          className="min-h-[40px] rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-primary-hover"
        >
          Enregistrer la note
        </button>
      </div>
    </div>
  </div>
);

interface AdminSeasonResetModalProps {
  activeSeason: FeatureSeasonItem | null;
  features: FeatureSuggestionItem[];
  newSeasonName: string;
  winnerFeatureId: string;
  winnerNote: string;
  isResetting: boolean;
  onChangeSeasonName: (val: string) => void;
  onChangeWinnerId: (val: string) => void;
  onChangeWinnerNote: (val: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const AdminSeasonResetModal: React.FC<AdminSeasonResetModalProps> = ({
  activeSeason,
  features,
  newSeasonName,
  winnerFeatureId,
  winnerNote,
  isResetting,
  onChangeSeasonName,
  onChangeWinnerId,
  onChangeWinnerNote,
  onClose,
  onSubmit,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm">
    <div className="max-h-[90dvh] w-full max-w-lg space-y-5 overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 sm:p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <RotateCcw className="h-5 w-5 shrink-0 text-amber-500" />
            Réinitialiser & Lancer une Nouvelle Saison
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Clôture la {activeSeason?.season_name || 'Saison 1'} et remet le formulaire à neuf.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="new-season-name" className="block text-xs font-bold text-slate-800">
            Nom de la nouvelle saison *
          </label>
          <input
            id="new-season-name"
            type="text"
            required
            value={newSeasonName}
            onChange={(e) => onChangeSeasonName(e.target.value)}
            placeholder="Ex: Saison 2 : Trimestre 2 2026"
            className="w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="winner-feature-select" className="block text-xs font-bold text-slate-800">
            Élire l&apos;Idée Gagnante pour le Hall of Fame (Optionnel)
          </label>
          <select
            id="winner-feature-select"
            value={winnerFeatureId}
            onChange={(e) => onChangeWinnerId(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
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
          <div className="space-y-1.5 rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <label htmlFor="winner-note-input" className="block text-xs font-bold text-amber-900">
              Message de félicitations / Note dev pour le gagnant
            </label>
            <input
              id="winner-note-input"
              type="text"
              value={winnerNote}
              onChange={(e) => onChangeWinnerNote(e.target.value)}
              className="w-full rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-medium outline-none"
            />
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <strong>Ce que cette action va faire :</strong>
          <ul className="mt-1 list-inside list-disc space-y-0.5">
            <li>Marquer la <strong>{activeSeason?.season_name || 'Saison 1'}</strong> comme archivée.</li>
            <li>Inscrire l&apos;idée gagnante au <strong>Hall of Fame</strong>.</li>
            <li>Créer la <strong>{newSeasonName}</strong> comme nouvelle saison active.</li>
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[42px] rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isResetting || !newSeasonName.trim()}
            className="flex min-h-[42px] items-center gap-2 rounded-2xl bg-[var(--color-primary)] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-50"
          >
            {isResetting && <LoadingSpinner />}
            Clôturer et Lancer {newSeasonName}
          </button>
        </div>
      </form>
    </div>
  </div>
);
