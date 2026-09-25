import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../../lib/supabase';
import { fetchContactPhones } from '../../../lib/contacts';
import { cn, formatDate, formatPrice } from '../../../lib/utils';
import { AdminBadge, AdminButton, AdminEmpty, AdminTabs, AdminLoading } from '../ui/AdminUI';

interface Receivable {
  id: string;
  order_id: string;
  debtor_user_id: string;
  debtor_role: 'seller' | 'delivery' | string;
  seller_commission: number;
  delivery_commission: number;
  amount: number;
  status: 'outstanding' | 'settled' | string;
  created_at: string;
  settled_at: string | null;
  notes: string | null;
}

type View = 'outstanding' | 'settled';

/**
 * Commissions à encaisser sur les ventes payées à la livraison.
 *
 * L'argent passe de la main à la main : le livreur (ou le vendeur, en retrait
 * boutique) encaisse le total et doit reverser la commission DaloaMarket. La
 * base crée ces créances à chaque remise (record_cod_receivable) ; elles
 * n'apparaissaient nulle part. En phase 0 seule la part livraison (10 %) est due.
 */
export const CodReceivablesTable: React.FC<{ onCountChange?: (n: number) => void }> = ({ onCountChange }) => {
  const [view, setView] = useState<View>('outstanding');
  const [rows, setRows] = useState<Receivable[] | null>(null);
  const [names, setNames] = useState<Record<string, { name: string; phone: string | null }>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('cod_receivables')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) {
      toast.error('Impossible de charger les commissions à encaisser');
      setRows([]);
      return;
    }
    const list = (data || []) as Receivable[];
    setRows(list);
    onCountChange?.(list.filter((r) => r.status === 'outstanding').length);

    const ids = Array.from(new Set(list.map((r) => r.debtor_user_id)));
    if (ids.length > 0) {
      const [{ data: users }, phones] = await Promise.all([
        supabase.from('users').select('id, full_name, shop_name').in('id', ids),
        fetchContactPhones(ids),
      ]);
      const map: Record<string, { name: string; phone: string | null }> = {};
      for (const u of (users || []) as any[]) {
        map[u.id] = { name: u.shop_name || u.full_name || 'Utilisateur', phone: phones.get(u.id) || null };
      }
      setNames(map);
    }
  }, [onCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const settle = async (r: Receivable) => {
    setSavingId(r.id);
    try {
      const { data, error } = await (supabase.rpc as any)('settle_cod_receivable', { p_id: r.id });
      if (error) throw error;
      if (data && data.success === false) {
        throw new Error(data.reason === 'unauthorized' ? 'Action réservée à l’administration.' : 'Déjà réglée ou introuvable.');
      }
      toast.success('Commission marquée comme encaissée');
      setConfirmId(null);
      await load();
    } catch (err: any) {
      toast.error(err.message || 'Échec');
    } finally {
      setSavingId(null);
    }
  };

  if (rows == null) return <AdminLoading />;

  const outstanding = rows.filter((r) => r.status === 'outstanding');
  const visible = rows.filter((r) => r.status === view);
  const totalDue = outstanding.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <AdminTabs<View>
          value={view}
          onChange={setView}
          tabs={[
            { key: 'outstanding', label: 'À encaisser', count: outstanding.length },
            { key: 'settled', label: 'Encaissées' },
          ]}
        />
        <p className="text-sm text-gray-600">
          Total dû : <span className="font-semibold text-gray-900">{formatPrice(totalDue)}</span>
        </p>
      </div>

      {visible.length === 0 ? (
        <AdminEmpty
          icon={Wallet}
          title={view === 'outstanding' ? 'Rien à encaisser' : 'Aucune commission encaissée'}
          description="Les ventes payées à la livraison créent ici la commission à reverser à DaloaMarket."
        />
      ) : (
        <ul className="space-y-2">
          {visible.map((r) => {
            const who = names[r.debtor_user_id];
            const open = openId === r.id;
            return (
              <li key={r.id} className="rounded-xl border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(open ? null : r.id);
                    setConfirmId(null);
                  }}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                >
                  <AdminBadge tone={r.debtor_role === 'delivery' ? 'info' : 'accent'}>
                    {r.debtor_role === 'delivery' ? 'Livreur' : 'Vendeur'}
                  </AdminBadge>
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-800">{who?.name || '…'}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{formatPrice(r.amount)}</span>
                  <span className="hidden w-24 shrink-0 text-right text-xs text-gray-500 md:inline">{formatDate(r.created_at)}</span>
                  <ChevronDown size={16} className={cn('shrink-0 text-gray-400 transition-transform', open && 'rotate-180')} />
                </button>

                {open && (
                  <div className="space-y-3 border-t border-gray-100 px-3 py-3">
                    <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-xs">
                      <dt className="text-gray-500">Téléphone</dt>
                      <dd className="text-gray-900">{who?.phone || '—'}</dd>
                      <dt className="text-gray-500">Commande</dt>
                      <dd className="font-mono text-gray-900">#{r.order_id.slice(0, 8)}</dd>
                      <dt className="text-gray-500">Détail</dt>
                      <dd className="text-gray-900">
                        Commission vente {formatPrice(r.seller_commission)} · commission course {formatPrice(r.delivery_commission)}
                      </dd>
                      {r.settled_at && (
                        <>
                          <dt className="text-gray-500">Encaissée le</dt>
                          <dd className="text-gray-900">{formatDate(r.settled_at)}</dd>
                        </>
                      )}
                    </dl>

                    {r.status === 'outstanding' &&
                      (confirmId === r.id ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-3">
                          <span className="text-xs text-gray-700">
                            Confirmer que {formatPrice(r.amount)} ont été reçus ?
                          </span>
                          <AdminButton size="sm" variant="primary" loading={savingId === r.id} onClick={() => settle(r)}>
                            Confirmer
                          </AdminButton>
                          <AdminButton size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                            Annuler
                          </AdminButton>
                        </div>
                      ) : (
                        <AdminButton size="sm" variant="secondary" onClick={() => setConfirmId(r.id)}>
                          Marquer comme encaissée
                        </AdminButton>
                      ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
