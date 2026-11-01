import React, { useState, useEffect } from 'react';
import { Tag, Check, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { formatPrice, cn } from '../../lib/utils';

export interface AppliedPromoCode {
  code: string;
  discountAmount: number;
  onlineOnly: boolean;
  minOrderAmount: number;
  description?: string | null;
}

interface PromoCodeInputBoxProps {
  orderSubtotal: number;
  paymentMethod: 'online' | 'cod' | 'cash_at_shop';
  appliedPromo: AppliedPromoCode | null;
  onApplyPromo: (promo: AppliedPromoCode | null) => void;
}

export const PromoCodeInputBox: React.FC<PromoCodeInputBoxProps> = ({
  orderSubtotal,
  paymentMethod,
  appliedPromo,
  onApplyPromo,
}) => {
  const [code, setCode] = useState('');
  const [validating, setValidating] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Si l'acheteur passe en paiement espèces alors que le code exige le paiement en ligne
  useEffect(() => {
    if (appliedPromo?.onlineOnly && paymentMethod !== 'online') {
      onApplyPromo(null);
      toast.error('Le code promo a été retiré car il est réservé au paiement Mobile Money en ligne.');
    }
  }, [paymentMethod, appliedPromo, onApplyPromo]);

  const handleValidate = async () => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) return;

    setValidating(true);
    setErrorText(null);
    try {
      const { data: rpcRes, error: rpcErr } = await (supabase as any).rpc('validate_promo_code', {
        p_code: cleanCode,
        p_order_subtotal: orderSubtotal,
        p_payment_method: paymentMethod,
      });

      if (!rpcErr && rpcRes) {
        if (!rpcRes.valid) {
          setErrorText(rpcRes.message || 'Code promo invalide.');
          return;
        }
        const discount = Math.min(orderSubtotal, Number(rpcRes.discount_amount || 0));
        onApplyPromo({
          code: rpcRes.code || cleanCode,
          discountAmount: discount,
          onlineOnly: Boolean(rpcRes.online_only),
          minOrderAmount: Number(rpcRes.min_order_amount || 0),
          description: rpcRes.description || null,
        });
        toast.success(`Code ${cleanCode} appliqué (-${formatPrice(discount)})`);
        return;
      }

      // Repli en lecture directe sur la table promo_codes si la RPC n'est pas encore déployée
      const { data: row, error: tableErr } = await (supabase.from('promo_codes' as any) as any)
        .select('*')
        .ilike('code', cleanCode)
        .eq('is_active', true)
        .maybeSingle();

      if (tableErr || !row) {
        setErrorText('Code promo introuvable ou expiré.');
        return;
      }

      if (row.online_only && paymentMethod !== 'online') {
        setErrorText('Ce code promo est valable uniquement avec le paiement Mobile Money en ligne.');
        return;
      }

      if (orderSubtotal < Number(row.min_order_amount || 0)) {
        setErrorText(`Commande minimum de ${formatPrice(Number(row.min_order_amount))} requise.`);
        return;
      }

      const rawDiscount =
        row.discount_type === 'percent'
          ? Math.round((orderSubtotal * Number(row.discount_value)) / 100)
          : Number(row.discount_value);
      const cappedDiscount = row.max_discount_amount
        ? Math.min(rawDiscount, Number(row.max_discount_amount))
        : rawDiscount;
      const finalDiscount = Math.min(orderSubtotal, Math.max(0, cappedDiscount));

      onApplyPromo({
        code: cleanCode,
        discountAmount: finalDiscount,
        onlineOnly: Boolean(row.online_only),
        minOrderAmount: Number(row.min_order_amount || 0),
        description: row.description || null,
      });
      toast.success(`Code ${cleanCode} appliqué (-${formatPrice(finalDiscount)})`);
    } catch {
      setErrorText('Impossible de vérifier ce code promo.');
    } finally {
      setValidating(false);
    }
  };

  if (appliedPromo) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Check className="h-3.5 w-3.5 stroke-[3]" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold text-emerald-950">
              Code <span className="font-mono">{appliedPromo.code}</span> appliqué
            </p>
            <p className="truncate text-[11px] font-semibold text-emerald-700 tabular-nums">
              Réduction immédiate de -{formatPrice(appliedPromo.discountAmount)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onApplyPromo(null);
            setCode('');
          }}
          className="inline-flex h-7 items-center gap-1 rounded-xl border border-emerald-200 bg-white px-2.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50"
        >
          <X className="h-3 w-3" /> Retirer
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-gray-50/60 p-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (errorText) setErrorText(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleValidate();
              }
            }}
            placeholder="Code promo (ex: DALOA1000)"
            maxLength={24}
            className={cn(
              'h-9 w-full rounded-xl border bg-white pl-8 pr-3 text-xs font-bold uppercase tracking-wider text-gray-900 placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-gray-400 focus:outline-none',
              errorText ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-orange-500'
            )}
          />
        </div>
        <button
          type="button"
          disabled={!code.trim() || validating}
          onClick={handleValidate}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-3.5 text-xs font-extrabold text-white transition-all hover:bg-gray-800 active:scale-95 disabled:opacity-40"
        >
          {validating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          <span>Appliquer</span>
        </button>
      </div>
      {errorText && <p className="mt-1.5 text-[11px] font-semibold text-red-600">{errorText}</p>}
    </div>
  );
};

