import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, Ban, Trash2, Plus, Clock, RefreshCw, AlertOctagon } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatDate } from '../../lib/utils';

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
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Bannissement d'Adresses IP</h2>
            <p className="text-xs text-gray-500">
              Bloquez directement les adresses IP suspectes pour empêcher la création de faux comptes spams.
            </p>
          </div>
        </div>
        <Button
          variant="outlined"
          size="sm"
          onClick={fetchBannedIps}
          disabled={loading}
          className="gap-2 text-xs"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualiser
        </Button>
      </div>

      {/* Formulaire de bannissement rapide */}
      <form onSubmit={handleAddBan} className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-3">
        <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
          <Plus size={16} className="text-red-500" />
          Bannir une nouvelle adresse IP
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Adresse IP *</label>
            <input
              type="text"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="Ex: 197.234.12.89"
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl font-mono focus:ring-2 focus:ring-red-500 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Raison du ban</label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Ex: Spam création de comptes test"
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Durée du ban</label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-medium"
            >
              <option value="">Permanente (Sans expiration)</option>
              <option value="1">1 Jour (24h)</option>
              <option value="7">7 Jours (1 semaine)</option>
              <option value="30">30 Jours (1 mois)</option>
              <option value="90">90 Jours (3 mois)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            color="primary"
            size="sm"
            loading={addingBan}
            disabled={addingBan || !newIp.trim()}
            className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-4 rounded-xl gap-2 shadow-sm"
          >
            <Ban size={14} />
            Bannir cette IP
          </Button>
        </div>
      </form>

      {/* Liste des IP bannie */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-800 flex items-center justify-between">
          <span>Adresses IP Bannies ({bannedIps.length})</span>
        </h3>

        {bannedIps.length === 0 ? (
          <div className="text-center py-8 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <AlertOctagon className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
            <p className="text-xs text-gray-500 font-medium">Aucune adresse IP n'est actuellement bannie.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-100 text-gray-600 font-bold uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Adresse IP</th>
                  <th className="px-4 py-3">Raison</th>
                  <th className="px-4 py-3">Bannie le</th>
                  <th className="px-4 py-3">Expiration</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white font-medium text-gray-800">
                {bannedIps.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-red-600">
                      {item.ip_address}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.reason || 'Bannie manuellement'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500">
                      {item.expires_at ? (
                        <span className="flex items-center gap-1 text-amber-600">
                          <Clock size={12} />
                          {formatDate(item.expires_at)}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-red-500 uppercase">Permanente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleUnbanIp(item.ip_address)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors"
                        title="Débannir l'IP"
                      >
                        <Trash2 size={13} />
                        Débannir
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
