import React from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ExpressRouteContactsSectionProps {
  districts: string[];
  pickupDistrict: string;
  setPickupDistrict: (v: string) => void;
  pickupAddress: string;
  setPickupAddress: (v: string) => void;
  senderPhone: string;
  onSenderPhoneChange: (v: string) => void;
  senderPhoneInvalid?: boolean;
  senderPhoneRef: React.RefObject<HTMLInputElement>;
  dropoffDistrict: string;
  setDropoffDistrict: (v: string) => void;
  dropoffAddress: string;
  setDropoffAddress: (v: string) => void;
  recipientName: string;
  setRecipientName: (v: string) => void;
  recipientPhone: string;
  onRecipientPhoneChange: (v: string) => void;
  recipientPhoneInvalid?: boolean;
  recipientPhoneRef: React.RefObject<HTMLInputElement>;
}

const fieldClass =
  'w-full min-h-[48px] rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600/20';

export const ExpressRouteContactsSection: React.FC<ExpressRouteContactsSectionProps> = ({
  districts,
  pickupDistrict,
  setPickupDistrict,
  pickupAddress,
  setPickupAddress,
  senderPhone,
  onSenderPhoneChange,
  senderPhoneInvalid,
  senderPhoneRef,
  dropoffDistrict,
  setDropoffDistrict,
  dropoffAddress,
  setDropoffAddress,
  recipientName,
  setRecipientName,
  recipientPhone,
  onRecipientPhoneChange,
  recipientPhoneInvalid,
  recipientPhoneRef,
}) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
      <MapPin className="h-4 w-4 text-orange-600 shrink-0" />
      <h2>1. Trajet & contacts</h2>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <fieldset className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
        <legend className="px-1 text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-orange-600 inline-block" aria-hidden="true" />
          Départ (Ramassage)
        </legend>

        <div className="space-y-1">
          <label htmlFor="express-pickup-district" className="block text-xs font-semibold text-slate-700">
            Quartier de départ
          </label>
          <select
            id="express-pickup-district"
            name="pickup_district"
            value={pickupDistrict}
            onChange={(e) => setPickupDistrict(e.target.value)}
            className={fieldClass}
          >
            {districts.map((d) => (
              <option key={`p-${d}`} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="express-pickup-address" className="block text-xs font-semibold text-slate-700">
            Repère exact (optionnel)
          </label>
          <input
            id="express-pickup-address"
            name="pickup_address"
            type="text"
            autoComplete="street-address"
            value={pickupAddress}
            onChange={(e) => setPickupAddress(e.target.value)}
            placeholder="Ex : Face pharmacie, carrefour..."
            className={fieldClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="express-sender-phone" className="block text-xs font-semibold text-slate-700">
            Téléphone expéditeur <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <input
            ref={senderPhoneRef}
            id="express-sender-phone"
            name="sender_phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            aria-required="true"
            aria-invalid={senderPhoneInvalid || undefined}
            value={senderPhone}
            onChange={(e) => onSenderPhoneChange(e.target.value)}
            placeholder="Ex : 07 00 00 00 00"
            className={cn(
              fieldClass,
              'tabular-nums font-medium',
              senderPhoneInvalid && 'border-red-500 focus:border-red-600',
            )}
          />
        </div>
      </fieldset>

      <fieldset className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-3">
        <legend className="px-1 text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-600 inline-block" aria-hidden="true" />
          Arrivée (Destinataire)
        </legend>

        <div className="space-y-1">
          <label htmlFor="express-dropoff-district" className="block text-xs font-semibold text-slate-700">
            Quartier d&apos;arrivée
          </label>
          <select
            id="express-dropoff-district"
            name="dropoff_district"
            value={dropoffDistrict}
            onChange={(e) => setDropoffDistrict(e.target.value)}
            className={fieldClass}
          >
            {districts.map((d) => (
              <option key={`d-${d}`} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label htmlFor="express-dropoff-address" className="block text-xs font-semibold text-slate-700">
            Repère exact (optionnel)
          </label>
          <input
            id="express-dropoff-address"
            name="dropoff_address"
            type="text"
            autoComplete="street-address"
            value={dropoffAddress}
            onChange={(e) => setDropoffAddress(e.target.value)}
            placeholder="Ex : Portail bleu, école..."
            className={fieldClass}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="express-recipient-phone" className="block text-xs font-semibold text-slate-700">
            Téléphone destinataire <span className="text-red-600" aria-hidden="true">*</span>
          </label>
          <input
            ref={recipientPhoneRef}
            id="express-recipient-phone"
            name="recipient_phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            aria-required="true"
            aria-invalid={recipientPhoneInvalid || undefined}
            value={recipientPhone}
            onChange={(e) => onRecipientPhoneChange(e.target.value)}
            placeholder="Ex : 05 00 00 00 00"
            className={cn(
              fieldClass,
              'tabular-nums font-medium',
              recipientPhoneInvalid && 'border-red-500 focus:border-red-600',
            )}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="express-recipient-name" className="block text-xs font-semibold text-slate-700">
            Nom du destinataire (optionnel)
          </label>
          <input
            id="express-recipient-name"
            name="recipient_name"
            type="text"
            autoComplete="name"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="Ex : Koffi Aya"
            className={fieldClass}
          />
        </div>
      </fieldset>
    </div>
  </section>
);
