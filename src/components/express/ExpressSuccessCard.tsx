import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, KeyRound, MessageCircle, ArrowRight, MapPin } from 'lucide-react';
import { formatPrice } from '../../lib/utils';

export interface ExpressSuccessCardProps {
  orderId: string;
  deliveryFee: number;
  pickupOtp: string;
  deliveryOtp: string;
  senderName: string;
  recipientName: string;
  recipientPhone: string;
  pickupDistrict: string;
  dropoffDistrict: string;
  packageTypeLabel: string;
  payerRole: 'sender' | 'recipient';
}

export const ExpressSuccessCard: React.FC<ExpressSuccessCardProps> = ({
  orderId,
  deliveryFee,
  pickupOtp,
  deliveryOtp,
  senderName,
  recipientName,
  recipientPhone,
  pickupDistrict,
  dropoffDistrict,
  packageTypeLabel,
  payerRole,
}) => {
  const navigate = useNavigate();

  const buildWhatsAppShareUrl = (): string => {
    const cleanPhone = recipientPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('225') ? cleanPhone : `225${cleanPhone}`;
    const payerLine =
      payerRole === 'sender'
        ? `Frais de livraison (${deliveryFee} FCFA) déjà réglés par l'expéditeur.`
        : `Frais de livraison à régler au coursier : ${deliveryFee} FCFA.`;

    const text = [
      `Bonjour ${recipientName},`,
      `${senderName} vous envoie un colis (${packageTypeLabel}) via *DaloaDelivery Express*.`,
      ``,
      `Trajet : ${pickupDistrict} -> ${dropoffDistrict}`,
      payerLine,
      ``,
      `*Code secret de réception (OTP) : ${deliveryOtp}*`,
      `Communiquez ce code au coursier uniquement à la remise du colis.`,
      ``,
      `Suivre la course : https://daloamarket.com/suivi/${orderId}`,
    ].join('\n');

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <div>
            <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-black text-emerald-700 uppercase">
              Course Express Publiée
            </span>
            <h1 className="text-lg font-black text-gray-900 mt-0.5">
              Les coursiers de Daloa sont alertés !
            </h1>
          </div>
        </div>

        <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100 space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-1.5 font-semibold text-gray-700">
              <MapPin className="h-3.5 w-3.5 text-orange-600" />
              {pickupDistrict} → {dropoffDistrict}
            </span>
            <span className="font-black text-gray-900 tabular-nums">{formatPrice(deliveryFee)}</span>
          </div>
          <p className="text-xs text-gray-500">
            {payerRole === 'sender'
              ? "Vous réglerez le coursier en espèces au ramassage du colis."
              : `Le destinataire (${recipientName}) réglera ${formatPrice(deliveryFee)} à la réception.`}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-center gap-1.5 text-amber-800 text-xs font-extrabold">
              <KeyRound className="h-3.5 w-3.5" />
              <span>Code Ramassage (Expéditeur)</span>
            </div>
            <p className="mt-2 text-2xl font-black tracking-widest text-amber-950 font-mono tabular-nums">
              {pickupOtp}
            </p>
            <p className="mt-1 text-[11px] text-amber-800">
              À donner au coursier quand il récupère le colis chez vous.
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
            <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-extrabold">
              <KeyRound className="h-3.5 w-3.5" />
              <span>Code Réception (Destinataire)</span>
            </div>
            <p className="mt-2 text-2xl font-black tracking-widest text-emerald-950 font-mono tabular-nums">
              {deliveryOtp}
            </p>
            <p className="mt-1 text-[11px] text-emerald-800">
              À transmettre à {recipientName} pour réceptionner le colis.
            </p>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <a
            href={buildWhatsAppShareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 text-xs sm:text-sm font-black text-white shadow-sm hover:bg-emerald-700 transition-all"
          >
            <MessageCircle className="h-4 w-4" />
            <span>Envoyer le code de réception à {recipientName} sur WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={() => navigate(`/suivi/${orderId}`)}
            className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-gray-200 bg-white px-4 text-xs font-extrabold text-gray-800 hover:bg-gray-50 transition-all"
          >
            <span>Suivre la course en direct</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

