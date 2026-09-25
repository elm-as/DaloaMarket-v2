import React, { useEffect, useState } from 'react';
import { Wallet, MessageCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { formatPrice } from '../../lib/utils';

/**
 * Commission à reverser à DaloaMarket sur ce qui a été encaissé en espèces
 * (paiement à la livraison, retrait boutique). La base enregistre ces créances
 * (`cod_receivables`) ; rien ne les montrait au vendeur ou au livreur concerné.
 */
export const CodDebtBanner: React.FC<{ userId?: string | null; role: 'seller' | 'delivery' }> = ({ userId, role }) => {
  const [debt, setDebt] = useState({ count: 0, total: 0 });

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (supabase as any)
      .from('cod_receivables')
      .select('amount')
      .eq('debtor_user_id', userId)
      .eq('status', 'outstanding')
      .then(({ data }: { data: { amount: number | null }[] | null }) => {
        if (!alive || !data) return;
        setDebt({ count: data.length, total: data.reduce((s, r) => s + (Number(r.amount) || 0), 0) });
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  if (debt.count <= 0 || debt.total <= 0) return null;
  const noun = role === 'delivery' ? 'course' : 'vente';
  const plural = debt.count > 1 ? 's' : '';

  return (
    <div className="mb-3 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-900">{formatPrice(debt.total)} à reverser à DaloaMarket</p>
        <p className="mt-0.5 text-xs text-amber-800">
          Commission sur {debt.count} {noun}{plural} encaissée{plural} en espèces. Réglez-la par Mobile Money au
          service DaloaMarket (+225 07 04 16 33 61).
        </p>
      </div>
      <a
        href="https://wa.me/2250704163361"
        target="_blank"
        rel="noreferrer"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100"
      >
        <MessageCircle className="h-3.5 w-3.5" /> Service
      </a>
    </div>
  );
};
