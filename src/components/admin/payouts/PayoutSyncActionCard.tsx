import React, { useState } from 'react';
import { RefreshCw, ShieldAlert, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { supabase } from '../../../lib/supabase';

interface PayoutSyncActionCardProps {
  onSyncCompleted: () => void;
}

export const PayoutSyncActionCard: React.FC<PayoutSyncActionCardProps> = ({ onSyncCompleted }) => {
  const [syncing, setSyncing] = useState(false);
  const [retryFailed, setRetryFailed] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    date: Date;
    processed: number;
    message?: string;
  } | null>(null);

  const handleTriggerPayoutSync = async () => {
    setSyncing(true);
    try {
      const apiUrl = import.meta.env.VITE_PAYMENT_API_URL || 'https://api.daloamarket.com';
      const { data: sess } = await supabase.auth.getSession();
      const accessToken = sess.session?.access_token;
      if (!accessToken) {
        throw new Error('Session expirée, veuillez vous reconnecter.');
      }

      const params = new URLSearchParams();
      params.append('force', 'true');
      if (retryFailed) {
        params.append('retry_failed', 'true');
      }

      const res = await fetch(`${apiUrl}/process-payouts?${params.toString()}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        const count = data.processed || 0;
        setLastSyncResult({
          date: new Date(),
          processed: count,
          message: data.message,
        });
        toast.success(`Synchronisation terminée : ${count} versement(s) traité(s)`);
        onSyncCompleted();
      } else {
        toast.error(data.message || 'Erreur lors de la synchronisation des versements');
      }
    } catch (err: any) {
      toast.error(err.message || 'Impossible de contacter le serveur Railway de paiement');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-sm bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white tracking-wide">Actions de Secours & Resync Payouts</h2>
            <p className="text-xs text-slate-400">En cas d'échec de webhook, forcez la vérification des versements.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 hover:bg-slate-800">
            <input
              type="checkbox"
              checked={retryFailed}
              onChange={(e) => setRetryFailed(e.target.checked)}
              className="rounded border-slate-600 text-amber-500 focus:ring-amber-400 w-3.5 h-3.5 bg-slate-900"
            />
            <span>Réinjecter aussi les échecs</span>
          </label>

          <Button
            onClick={handleTriggerPayoutSync}
            disabled={syncing}
            size="sm"
            className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-500/10 px-4 py-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronisation...' : 'Forcer Sync Payouts'}
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-300 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 leading-relaxed">
        <div className="flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p>
            Cette commande interpelle directement le serveur Railway pour re-vérifier chaque transaction de versement en attente et retenter l'envoi vers MoneyFusion sans bloquer les vendeurs.
          </p>
        </div>

        {lastSyncResult && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 shrink-0 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="font-mono tabular-nums">
              Synchro à {lastSyncResult.date.toLocaleTimeString('fr-FR')} : {lastSyncResult.processed} traité(s)
            </span>
          </div>
        )}
      </div>
    </Card>
  );
};
