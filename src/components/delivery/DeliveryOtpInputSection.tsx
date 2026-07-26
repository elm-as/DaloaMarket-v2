import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, XCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { OtpPinInput } from './OtpPinInput';
import type { Order } from '../../types/order';

export type RpcResult = { success: boolean; reason?: string; status?: string; attempts?: number };
interface DeliveryOtpInputSectionProps {
  order: Order;
  onSuccess: () => void;
}

export const DeliveryOtpInputSection: React.FC<DeliveryOtpInputSectionProps> = ({ order, onSuccess }) => {
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(order.delivery_assignment?.[0]?.delivery_otp_attempts || 0);

  const handleSubmit = async () => {
    if (code.length !== 6) return;
    setSending(true);
    setError(false);
    try {
      const { data, error: rpcError } = await supabase.rpc('verify_delivery_otp', {
        p_order_id: order.id,
        p_code: code,
      });
      if (rpcError) throw rpcError;
      const result = data as RpcResult;
      if (result.success) {
        toast.success('Livraison confirmée !');
        onSuccess();
      } else {
        setError(true);
        setTimeout(() => setError(false), 600);
        if (result.reason === 'locked') {
          toast.error('Trop de tentatives. Contactez le support.');
        } else {
          setAttempts(result.attempts || attempts + 1);
          toast.error(`Code incorrect. ${5 - (result.attempts || attempts + 1)} tentative(s) restante(s).`);
        }
        setCode('');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSending(false);
    }
  };

  if (attempts >= 5) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-5"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-500" />
          </div>
          <h4 className="font-bold text-red-800 text-[15px]">Code bloqué</h4>
        </div>
        <p className="text-[13px] text-red-600 leading-relaxed">
          Trop de tentatives incorrectes. Contactez le support pour résoudre la situation.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.1 }}
    >
      <div className="rounded-2xl overflow-hidden border border-[var(--color-primary-200)] shadow-sm">
        <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-400)] px-5 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-[15px] leading-tight">
              {order.delivery_mode === 'pickup' ? "Vérification du retrait en boutique" : "Vérification de livraison"}
            </p>
            <p className="text-white/80 text-[12px]">Code à 6 chiffres de l'acheteur</p>
          </div>
        </div>

        <div className="bg-white p-5 space-y-4">
          <OtpPinInput
            length={6}
            value={code}
            onChange={setCode}
            disabled={sending}
            error={error}
          />

          {attempts > 0 && (
            <p className="text-center text-[12px] text-red-500 font-medium">
              {5 - attempts} tentative(s) restante(s)
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={code.length !== 6 || sending}
            className="w-full h-12 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-400)] text-white rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.97] transition-all shadow-md shadow-[var(--color-primary)]/25 disabled:opacity-50 disabled:active:scale-100"
          >
            {sending ? <LoadingSpinner size="sm" /> : <CheckCircle className="w-5 h-5" />}
            Confirmer la livraison
          </button>
        </div>
      </div>
    </motion.div>
  );
};
