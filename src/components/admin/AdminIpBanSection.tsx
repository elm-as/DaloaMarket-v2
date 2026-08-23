import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Ban, Trash2, Plus, Clock, RefreshCw, AlertOctagon, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { cn, formatDate } from '../../lib/utils';

interface BannedIpRecord {
  id: string;
  ip_address: string;
  reason: string | null;
  created_at: string;
  expires_at: string | null;
  banned_by: string | null;
}

export const AdminIpBanSection: React.FC = () => {
  const [bannedIps, setBannedIps] = useState<BannedIpRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingBan, setAddingBan] = useState(false);

  // Form states
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [durationDays, setDurationDays] = useState<number | ''>('');

  const fetchBannedIps = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('banned_ips')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBannedIps((data as BannedIpRecord[]) || []);
    } catch (err: any) {
      console.error('Error fetching banned IPs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBannedIps();
  }, [fetchBannedIps]);

  const handleAddBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIp.trim()) {
      toast.error('Veuillez saisir une adresse IP valide');
      return;
    }

    setAddingBan(true);
    try {
      const pDuration = durationDays !== '' ? Number(durationDays) : null;
      const { error } = await (supabase.rpc as any)('ban_ip', {
        p_ip: newIp.trim(),
        p_reason: newReason.trim() || 'Banni manuellement par administrateur',
        p_duration_days: pDuration,
      });

      if (error) throw error;

      toast.success(`L'adresse IP ${newIp.trim()} a été bannie avec succès.`);
      setNewIp('');
      setNewReason('');
      setDurationDays('');
      fetchBannedIps();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du bannissement IP');
    } finally {
      setAddingBan(false);
    }
  };

  const handleUnbanIp = async (ipAddress: string) => {
    try {
      const { error } = await (supabase.rpc as any)('unban_ip', { p_ip: ipAddress });
      if (error) throw error;

      toast.success(`L'adresse IP ${ipAddress} a été débannie.`);
      fetchBannedIps();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du débannissement');
    }
  };

  return (
    <Card className="p-6 rounded-3xl border border-gray-200/80 shadow-xs bg-white space-y-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h2 className="text-sm font-black text-gray-900">Bannissement d'Adresses IP</h2>
            <p className="text-xs text-gray-500">
              Bloquez directement les adresses IP suspectes pour empêcher la création de faux comptes et les attaques spam.
            </p>
          </div>
        </div>

        <Button
          variant="outlined"
          size="sm"
          onClick={fetchBannedIps}
          disabled={loading}
          className="rounded-xl text-xs font-bold gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Actualiser</span>
        </Button>
      </div>

      {/* Formulaire de bannissement rapide (Compact et Responsive PC) */}
      <form onSubmit={handleAddBan} className="bg-gray-50/80 p-4 rounded-2xl border border-gray-200/80 space-y-3">
        <h3 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
          <Plus size={14} className="text-red-500 stroke-[3]" />
          Bannir une nouvelle adresse IP
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* IP Input */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-gray-700 mb-1">Adresse IP *</label>
            <input
              type="text"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="Ex: 197.234.12.89"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl font-mono text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
              required
            />
          </div>

          {/* Reason Input */}
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-gray-700 mb-1">Raison du ban</label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Ex: Spam création de comptes test"
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl font-medium text-gray-900 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
            />
          </div>

          {/* Duration Select */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">Durée</label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-2.5 py-2 text-xs sm:text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-bold text-gray-800"
            >
              <option value="">Permanente</option>
              <option value="1">24 Heures</option>
              <option value="7">7 Jours</option>
              <option value="30">30 Jours</option>
              <option value="90">90 Jours</option>
            </select>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-2">
            <Button
              type="submit"
              color="primary"
              size="sm"
              loading={addingBan}
              disabled={addingBan || !newIp.trim()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black text-xs py-2 px-3 rounded-xl gap-1.5 shadow-xs"
            >
              <Ban size={13} />
              <span>Bannir cette IP</span>
            </Button>
          </div>
        </div>
      </form>

      {/* Liste des adresses IP bannies */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
            Adresses IP Actuellement Bannies ({bannedIps.length})
          </h3>
        </div>

        {bannedIps.length === 0 ? (
          <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto mb-1.5 opacity-70" />
            <p className="text-xs text-gray-500 font-medium">Aucune adresse IP n'est actuellement bannie du système.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200/80 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 font-extrabold uppercase tracking-wider border-b border-gray-200/80">
                <tr>
                  <th className="px-4 py-3">Adresse IP</th>
                  <th className="px-4 py-3">Motif du Bannissement</th>
                  <th className="px-4 py-3">Date du Ban</th>
                  <th className="px-4 py-3">Durée / Expiration</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white font-medium text-gray-800">
                {bannedIps.map((item) => (
                  <tr key={item.id} className="hover:bg-red-50/20 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-red-600">
                      {item.ip_address}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {item.reason || 'Bannie manuellement par administrateur'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {item.expires_at ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Clock size={11} />
                          {formatDate(item.expires_at)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 uppercase">
                          Permanente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleUnbanIp(item.ip_address)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-extrabold text-xs transition-colors border border-emerald-200 active:scale-95"
                        title="Débannir l'adresse IP"
                      >
                        <Trash2 size={12} />
                        <span>Débannir</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
};
