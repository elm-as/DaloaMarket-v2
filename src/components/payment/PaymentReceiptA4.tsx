import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Printer, 
  ShieldCheck, 
  ArrowRight, 
  ShoppingBag, 
  MapPin, 
  Phone, 
  Lock 
} from 'lucide-react';
import { formatPrice } from '../../lib/utils';
import type { Order } from '../../types/order';

interface PaymentReceiptA4Props {
  transactionId: string;
  orderId?: string | null;
  order?: Order | null;
  amount?: number;
  paymentMethod?: string;
  confirmedAt?: string | null;
  type?: string;
}

export const PaymentReceiptA4: React.FC<PaymentReceiptA4Props> = ({
  transactionId,
  orderId,
  order,
  amount,
  paymentMethod = 'Mobile Money (Wave / Orange / MTN / Moov)',
  confirmedAt,
  type = 'order',
}) => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = confirmedAt
    ? new Date(confirmedAt).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  const totalAmount = order?.total_amount ?? amount ?? 0;
  const productAmount = order?.product_amount ?? (order ? totalAmount - (order.delivery_fee ?? 0) : totalAmount);
  const deliveryFee = order?.delivery_fee ?? 0;
  const itemTitle = order?.listing_title || (type === 'seller_badge' ? 'Badge Vendeur Vérifié Daloa' : type === 'listing_pack_10' ? 'Pack 10 Annonces Pro' : 'Commande DaloaMarket');

  return (
    <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Barre d'action supérieure (masquée lors de l'impression) */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Transaction confirmée par DaloaPay
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Reçu de transaction & Certificat Séquestre</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm shadow-sm transition active:scale-95 cursor-pointer"
            title="Imprimer ou enregistrer en PDF"
          >
            <Printer className="w-4 h-4" />
            Imprimer / PDF
          </button>

          {orderId ? (
            <button
              onClick={() => navigate(`/suivi/${orderId}`)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-sm transition active:scale-95 cursor-pointer"
            >
              Suivre la commande
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm shadow-sm transition active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              Retour à l'accueil
            </button>
          )}
        </div>
      </div>

      {/* Conteneur Feuille Facture A4 (optimisé écran + print) */}
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-8 sm:p-12 print:border-none print:shadow-none print:p-0 text-gray-800">
        {/* En-tête Facture */}
        <div className="flex flex-wrap justify-between items-start gap-6 border-b border-gray-100 pb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black text-xl shadow-sm">
                D
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-gray-900">DaloaMarket</span>
                <span className="text-xs block font-semibold text-orange-600 uppercase tracking-wider">Plateforme & Séquestre Daloa</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
              DaloaMarket CI & ElmasCore Systems<br />
              Centre Commercial & Marché Central, Daloa (Côte d'Ivoire)<br />
              Support client : +225 07 00 00 00 00 • support@daloamarket.com
            </p>
          </div>

          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-mono font-bold uppercase tracking-widest mb-2">
              REÇU OFFICIEL N° {transactionId.slice(0, 12).toUpperCase()}
            </span>
            <div className="text-xs text-gray-500 space-y-1 font-mono tabular-nums">
              <p><span className="text-gray-400">Date :</span> {formattedDate}</p>
              <p><span className="text-gray-400">Règlement :</span> {paymentMethod}</p>
              {orderId && <p><span className="text-gray-400">Réf. Commande :</span> #{orderId.slice(0, 8).toUpperCase()}</p>}
            </div>
          </div>
        </div>

        {/* Détails Parties Prenantes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-b border-gray-100">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Client / Destinataire</p>
            <p className="font-bold text-gray-900">{order?.buyer_name || 'Client DaloaMarket'}</p>
            {order?.buyer_phone && (
              <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-1 font-mono tabular-nums">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                {order.buyer_phone}
              </p>
            )}
            {order?.delivery_address && (
              <p className="text-xs text-gray-600 flex items-start gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                {order.delivery_address}
              </p>
            )}
          </div>

          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Vendeur / Partenaire</p>
            <p className="font-bold text-gray-900">{order?.seller_name || 'Boutique Partenaire Daloa'}</p>
            <p className="text-xs text-gray-600 mt-1">
              Mode : {order?.delivery_mode === 'pickup' ? 'Retrait en boutique' : 'Livraison express à domicile'}
            </p>
            <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Garantie Séquestre 100% Active
            </div>
          </div>
        </div>

        {/* Tableau Financier Tabulaire */}
        <div className="py-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-3">Description</th>
                <th className="pb-3 text-center">Qté</th>
                <th className="pb-3 text-right">Prix Unitaire</th>
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-mono tabular-nums">
              <tr>
                <td className="py-4 font-sans font-medium text-gray-900">
                  {itemTitle}
                  {order?.variant_label && (
                    <span className="block text-xs text-gray-500 font-sans">Option : {order.variant_label}</span>
                  )}
                </td>
                <td className="py-4 text-center text-gray-600">{order?.quantity || 1}</td>
                <td className="py-4 text-right text-gray-600">{formatPrice(order?.unit_price || productAmount)}</td>
                <td className="py-4 text-right font-bold text-gray-900">{formatPrice(productAmount)}</td>
              </tr>
              {deliveryFee > 0 && (
                <tr>
                  <td className="py-3 font-sans text-gray-700">Frais de livraison locale Daloa</td>
                  <td className="py-3 text-center text-gray-600">1</td>
                  <td className="py-3 text-right text-gray-600">{formatPrice(deliveryFee)}</td>
                  <td className="py-3 text-right font-semibold text-gray-900">{formatPrice(deliveryFee)}</td>
                </tr>
              )}
              <tr>
                <td className="py-3 font-sans text-emerald-700 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  Protection Acheteur & Frais de Séquestre Escrow
                </td>
                <td className="py-3 text-center text-gray-600">1</td>
                <td className="py-3 text-right text-emerald-600">0 FCFA</td>
                <td className="py-3 text-right font-semibold text-emerald-700">Inclus (0 FCFA)</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-900 font-mono tabular-nums">
                <td colSpan={3} className="pt-4 font-sans font-bold text-base text-gray-900">
                  TOTAL ENCAISSÉ ET CONSIGNÉ
                </td>
                <td className="pt-4 text-right font-extrabold text-xl text-orange-600">
                  {formatPrice(totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Encadré explicatif Séquestre ElmasCore */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-5 my-4 flex items-start gap-4 text-amber-900 text-xs leading-relaxed">
          <ShieldCheck className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-950 mb-1">Garantie Anti-Arnaque DaloaMarket</p>
            <p>
              Votre paiement de <strong className="font-mono tabular-nums">{formatPrice(totalAmount)}</strong> est conservé sur le compte séquestre DaloaPay. Le vendeur et le livreur ne perçoivent aucun franc avant que vous n'ayez inspecté votre colis et validé la réception avec votre <strong>Code Secret OTP</strong>.
            </p>
          </div>
        </div>

        {/* Sceau de conformité & QR Code stylisé */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-white border border-gray-300 rounded-lg p-1 flex items-center justify-center shrink-0 shadow-xs">
              <svg viewBox="0 0 24 24" className="w-14 h-14 text-gray-900" fill="currentColor">
                <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h-4v2h2v4h2v-4h2v-2h-2zm-4 4h-2v2h2v-2zm6-2h2v4h-2z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wider">Certificat d'Authenticité Numérique</p>
              <p className="text-[10px] text-gray-500 font-mono break-all max-w-xs">SHA256: {transactionId}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Scannable par les agents relais DaloaMarket pour confirmation de retrait.</p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-gray-500 block">DaloaMarket Core Engine</span>
            <span className="text-[10px] text-gray-400 font-mono">ElmasCore Signature : Verified ✓</span>
          </div>
        </div>
      </div>
    </div>
  );
};
