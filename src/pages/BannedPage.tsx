import React, { useState, useEffect } from 'react';
import { Ban, Send, ShieldCheck, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePageTitle } from '../hooks/usePageTitle';
import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function BannedPage() {
  usePageTitle('Compte suspendu');
  const { user, userProfile, refreshUserProfile } = useSupabase();
  const navigate = useNavigate();

  const [appealReason, setAppealReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [showAppealForm, setShowAppealForm] = useState(false);

  // Auto-redirect if unbanned
  useEffect(() => {
    if (userProfile && !userProfile.banned) {
      navigate('/', { replace: true });
    }
  }, [userProfile, navigate]);

  // Real-time listener for ban status changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`user-ban-status-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.new && payload.new.banned === false) {
            toast.success('Votre compte a été réactivé ! Redirection...');
            await refreshUserProfile();
            window.location.href = '/';
          } else if (payload.new) {
            await refreshUserProfile();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refreshUserProfile]);

  const handleManualCheck = async () => {
    if (!user?.id) return;
    setCheckingStatus(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('banned, ban_reason, ban_appeal_status, ban_appeal_reason')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        if (!data.banned) {
          toast.success('Votre compte est actif ! Redirection...');
          await refreshUserProfile();
          window.location.href = '/';
          return;
        }
        await refreshUserProfile();
        toast.error('Votre compte est toujours suspendu.');
      }
    } catch {
      toast.error('Erreur lors de la vérification');
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim()) {
      toast.error('Veuillez saisir le motif de votre contestation');
      return;
    }

    if (!user?.id) {
      toast.error('Utilisateur non identifié');
      return;
    }

    setSubmitting(true);
    try {
      const { error: rpcError } = await supabase.rpc('submit_ban_appeal', {
        p_reason: appealReason.trim(),
      });

      if (rpcError) {
        // Fallback update if RPC not applied yet
        const { error: updateError } = await supabase
          .from('users')
          .update({
            ban_appeal_reason: appealReason.trim(),
            ban_appeal_status: 'pending',
            ban_appealed_at: new Date().toISOString(),
          } as any)
          .eq('id', user.id);

        if (updateError) throw updateError;
      }

      toast.success('Votre demande de contestation a été transmise');
      await refreshUserProfile();
      setShowAppealForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Impossible d\'envoyer la contestation');
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = userProfile?.ban_appeal_status === 'pending';

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-lg w-full bg-[var(--color-surface)] border border-[var(--color-outline-variant)] rounded-2xl p-6 sm:p-8 shadow-xl text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6 text-red-500"
        >
          <Ban size={44} />
        </motion.div>

        <h1 className="text-2xl font-bold text-[var(--color-on-surface)] mb-2">
          Compte suspendu
        </h1>
        
        <p className="text-[var(--color-on-surface-variant)] text-sm mb-6 leading-relaxed">
          Accès restreint suite au non-respect des règles de la communauté DaloaMarket.
        </p>

        {/* Motif du ban */}
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6 text-left">
          <div className="flex items-center gap-2 text-red-600 font-semibold text-xs uppercase tracking-wider mb-1">
            <AlertCircle size={16} />
            Motif de la suspension
          </div>
          <p className="text-sm font-medium text-[var(--color-on-surface)]">
            {userProfile?.ban_reason || 'Non-respect des conditions d\'utilisation de la plateforme.'}
          </p>
        </div>

        {/* Status de la contestation ou Formulaire */}
        <div className="space-y-4 text-left">
          {isPending ? (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-600 font-semibold text-xs uppercase tracking-wider mb-2">
                <Clock size={16} />
                Contestation en cours d'examen
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)] mb-2">
                Votre demande a bien été transmise à notre équipe de modération.
              </p>
              <div className="bg-[var(--color-background)] rounded-lg p-3 text-xs text-[var(--color-on-surface)] border border-[var(--color-outline-variant)]">
                <span className="font-semibold">Votre message :</span> "{userProfile?.ban_appeal_reason}"
              </div>
            </div>
          ) : (
            <>
              {!showAppealForm ? (
                <button
                  onClick={() => setShowAppealForm(true)}
                  className="w-full py-3 px-4 bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] hover:bg-opacity-90 font-medium rounded-xl text-sm transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck size={18} />
                  Contester cette décision
                </button>
              ) : (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  onSubmit={handleSubmitAppeal}
                  className="bg-[var(--color-background)] border border-[var(--color-outline-variant)] rounded-xl p-4 space-y-3"
                >
                  <label className="block text-xs font-semibold text-[var(--color-on-surface)] uppercase tracking-wider">
                    Explication de votre contestation
                  </label>
                  <textarea
                    rows={4}
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    placeholder="Expliquez pourquoi vous pensez qu'il s'agit d'une erreur ou ce qui s'est passé..."
                    className="w-full p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-outline)] text-sm text-[var(--color-on-surface)] focus:ring-2 focus:ring-[var(--color-primary)] outline-none resize-none"
                    required
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowAppealForm(false)}
                      className="px-3 py-2 text-xs font-medium text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)] rounded-lg"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send size={14} />
                      {submitting ? 'Envoi...' : 'Envoyer ma contestation'}
                    </button>
                  </div>
                </motion.form>
              )}
            </>
          )}
        </div>

        {/* Bouton de vérification manuelle pour la PWA */}
        <div className="mt-8 pt-6 border-t border-[var(--color-outline-variant)] flex flex-col items-center gap-3">
          <button
            onClick={handleManualCheck}
            disabled={checkingStatus}
            className="inline-flex items-center gap-2 text-xs font-medium text-[var(--color-primary)] hover:underline disabled:opacity-50"
          >
            <RefreshCw size={14} className={checkingStatus ? 'animate-spin' : ''} />
            {checkingStatus ? 'Vérification...' : 'Vérifier si mon compte a été débanni'}
          </button>

          <p className="text-[xs] text-[var(--color-on-surface-variant)] opacity-70">
            Une fois débloqué par un administrateur, l'application se déverrouille automatiquement.
          </p>
        </div>
      </motion.div>
    </div>
  );
}