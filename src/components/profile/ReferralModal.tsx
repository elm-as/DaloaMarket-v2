import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Copy, Check, Share2, Users, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { formatPrice, cn } from '../../lib/utils';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  onProfileUpdated?: () => void;
}

interface ReferralEntry {
  referred_user_id: string;
  referee_name?: string;
  status: 'pending' | 'rewarded' | 'expired';
  bonus_amount: number;
  created_at: string;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  onProfileUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string>(userProfile?.referral_code || '');
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const daloaCashBalance = Number(userProfile?.daloa_cash_balance || 0);

  const fetchOrCreateReferralData = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);

    try {
      let code = userProfile?.referral_code;
      if (!code) {
        const { data: generated, error: genError } = await supabase.rpc('generate_user_referral_code');
        if (!genError && generated) {
          code = generated as string;
          setReferralCode(code);
          onProfileUpdated?.();
        }
      } else {
        setReferralCode(code);
      }

      const { data: refList, error: listError } = await supabase.rpc('get_user_referrals');
      if (!listError && refList && Array.isArray(refList)) {
        setReferrals(refList as unknown as ReferralEntry[]);
      }
    } catch (err) {
      console.error('Error fetching referrals:', err);
    } finally {
      setLoading(false);
    }
  }, [isOpen, userProfile?.referral_code, onProfileUpdated]);

  useEffect(() => {
    fetchOrCreateReferralData();
  }, [fetchOrCreateReferralData]);

  const referralLink = referralCode
    ? `https://daloamarket.com/register?ref=${referralCode}`
    : 'https://daloamarket.com';

  const handleCopy = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Lien de parrainage copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  const handleShareWhatsApp = () => {
    if (!referralCode) return;
    const shareText = `🎁 *Cadeau DaloaMarket !*\nInscris-toi avec mon code *${referralCode}* et profite de *500 FCFA offerts* sur ta 1ère livraison à Daloa !\n\n👉 Clique ici :\n${referralLink}`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Parrainage & Daloa Cash" size="md">
      <div className="space-y-4 pt-1">
        {/* Solde Daloa Cash */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 p-5 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-xl" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-100">
                Ma Cagnotte Daloa Cash
              </p>
              <h2 className="mt-1 text-3xl font-black tabular-nums tracking-tight">
                {formatPrice(daloaCashBalance)}
              </h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md">
              <Gift className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="mt-3 text-xs text-emerald-100 leading-snug">
            Déductible directement sur vos frais de livraison lors de vos commandes sur DaloaMarket.
          </p>
        </div>

        {/* Mon Code Parrain */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Mon Code Parrain
            </span>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> 500 F par filleul
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl bg-gray-50 p-3 border border-gray-100">
            <span className="font-mono text-base font-black tracking-widest text-gray-900">
              {referralCode || 'Génération…'}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 active:scale-95 transition-all"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              <span>{copied ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>

          <Button
            variant="filled"
            color="primary"
            fullWidth
            onClick={handleShareWhatsApp}
            className="rounded-xl bg-[#25D366] hover:bg-[#20ba59] font-bold text-white shadow-sm flex items-center justify-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            <span>Inviter sur WhatsApp</span>
          </Button>
        </div>

        {/* Règles du programme */}
        <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4 text-xs space-y-2 text-orange-950">
          <p className="font-extrabold text-orange-900 flex items-center gap-1.5">
            <Gift className="h-4 w-4 text-orange-600" />
            Comment ça marche ?
          </p>
          <ul className="space-y-1.5 text-gray-700 text-[11px] leading-relaxed">
            <li>
              <span className="font-bold text-gray-900">1. Partagez</span> votre lien avec vos proches à Daloa.
            </li>
            <li>
              <span className="font-bold text-gray-900">2. Votre filleul</span> gagne 500 FCFA de remise sur sa 1ère livraison.
            </li>
            <li>
              <span className="font-bold text-gray-900">3. Vous recevez</span> 500 FCFA crédités dans votre cagnotte dès sa commande livrée.
            </li>
          </ul>
        </div>

        {/* Historique des filleuls */}
        <div className="space-y-2">
          <h3 className="text-xs font-extrabold text-gray-900 flex items-center gap-1.5 uppercase tracking-wider">
            <Users className="h-4 w-4 text-gray-500" />
            Mes Filleuls ({referrals.length})
          </h3>

          {loading ? (
            <p className="text-xs text-gray-400 py-2 text-center">Chargement…</p>
          ) : referrals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-center">
              <p className="text-xs font-medium text-gray-500">
                Aucun ami invité pour le moment.
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Partagez votre lien WhatsApp ci-dessus pour commencer à cagnotter !
              </p>
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {referrals.map((ref, idx) => (
                <div
                  key={ref.referred_user_id || idx}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 text-xs shadow-2xs"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {ref.referee_name || 'Ami invité'}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      Inscrit avec votre code
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[10px] font-extrabold',
                      ref.status === 'rewarded'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    )}
                  >
                    {ref.status === 'rewarded' ? '+500 F Reçu ✓' : 'En attente 1ère commande'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
