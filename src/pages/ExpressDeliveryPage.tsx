import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { DALOA_DISTRICT_COORDINATES } from '../lib/daloaGeo';
import { haversineDistance, calculateDeliveryFee } from '../lib/delivery';
import { formatPrice, cn } from '../lib/utils';
import { ExpressSuccessCard } from '../components/express/ExpressSuccessCard';
import { ExpressRouteContactsSection } from '../components/express/ExpressRouteContactsSection';
import { EXPRESS_PACKAGE_TYPES, ExpressPackageSection } from '../components/express/ExpressPackageSection';

const DALOA_DISTRICTS: string[] = Object.keys(DALOA_DISTRICT_COORDINATES);

interface CreatedExpressRun {
  orderId: string;
  deliveryFee: number;
  pickupOtp: string;
  deliveryOtp: string;
}

const ExpressDeliveryPage: React.FC = () => {
  usePageTitle('Coursier Express Daloa');
  const navigate = useNavigate();
  const { user, userProfile } = useSupabase();

  const [packageType, setPackageType] = useState<string>('parcel');
  const [packageDescription, setPackageDescription] = useState('');
  const [isSealed, setIsSealed] = useState(true);
  const [isFragile, setIsFragile] = useState(false);

  const [pickupDistrict, setPickupDistrict] = useState('Commerce');
  const [pickupAddress, setPickupAddress] = useState('');
  const [senderPhone, setSenderPhone] = useState('');

  const [dropoffDistrict, setDropoffDistrict] = useState('Lobia');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [payerRole, setPayerRole] = useState<'sender' | 'recipient'>('sender');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [invalidField, setInvalidField] = useState<'senderPhone' | 'recipientPhone' | null>(null);
  const [createdRun, setCreatedRun] = useState<CreatedExpressRun | null>(null);

  const senderPhoneRef = useRef<HTMLInputElement>(null);
  const recipientPhoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile?.district) {
      setPickupDistrict((prev) => (prev === 'Commerce' ? userProfile.district || prev : prev));
    }
    if (userProfile?.phone) {
      setSenderPhone((prev) => (prev ? prev : userProfile.phone || ''));
    }
  }, [userProfile?.district, userProfile?.phone]);

  const quote = useMemo(() => {
    const pPoint = DALOA_DISTRICT_COORDINATES[pickupDistrict] || DALOA_DISTRICT_COORDINATES.Commerce;
    const dPoint = DALOA_DISTRICT_COORDINATES[dropoffDistrict] || DALOA_DISTRICT_COORDINATES.Lobia;
    const rawDist = haversineDistance(pPoint, dPoint);
    const roadKm = Math.max(0.8, Math.round(rawDist * 1.3 * 10) / 10);
    const deliveryFee = calculateDeliveryFee(roadKm);
    return {
      roadKm,
      deliveryFee,
      pCoords: { lat: pPoint.latitude, lng: pPoint.longitude },
      dCoords: { lat: dPoint.latitude, lng: dPoint.longitude },
    };
  }, [pickupDistrict, dropoffDistrict]);

  const packageTypeLabel =
    EXPRESS_PACKAGE_TYPES.find((pt) => pt.id === packageType)?.label || 'Colis standard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setInvalidField(null);

    if (!user) {
      toast.error('Connectez-vous pour commander un coursier.');
      navigate('/login');
      return;
    }
    if (!senderPhone.trim()) {
      const msg = "Indiquez le téléphone de l'expéditeur pour le ramassage.";
      setFormError(msg);
      setInvalidField('senderPhone');
      senderPhoneRef.current?.focus();
      return;
    }
    if (!recipientPhone.trim()) {
      const msg = 'Indiquez le téléphone du destinataire pour la remise.';
      setFormError(msg);
      setInvalidField('recipientPhone');
      recipientPhoneRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const discreteDescription =
        [
          isSealed ? '[Scellé]' : null,
          isFragile ? '[Fragile]' : null,
          packageDescription.trim() || null,
        ]
          .filter(Boolean)
          .join(' ') || 'Colis scellé standard';

      const resolvedSenderName = userProfile?.full_name?.trim() || 'Expéditeur';
      const { data, error } = await (supabase as any).rpc('create_express_delivery_run', {
        p_pickup_district: pickupDistrict,
        p_pickup_address: pickupAddress.trim() || 'Centre',
        p_pickup_lat: quote.pCoords.lat,
        p_pickup_lng: quote.pCoords.lng,
        p_dropoff_district: dropoffDistrict,
        p_dropoff_address: dropoffAddress.trim() || 'Centre',
        p_dropoff_lat: quote.dCoords.lat,
        p_dropoff_lng: quote.dCoords.lng,
        p_package_type: packageType,
        p_package_description: discreteDescription,
        p_sender_name: resolvedSenderName,
        p_sender_phone: senderPhone.trim(),
        p_recipient_name: recipientName.trim() || 'Destinataire',
        p_recipient_phone: recipientPhone.trim(),
        p_payer_role: payerRole,
        p_payment_method: payerRole === 'recipient' ? 'cod' : 'cash',
        p_road_km: quote.roadKm,
      });

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.reason || 'Impossible de créer la course express.');
      }

      toast.success('Course Express publiée');
      setCreatedRun({
        orderId: data.order_id,
        deliveryFee: Number(data.delivery_fee || quote.deliveryFee),
        pickupOtp: String(data.pickup_otp || ''),
        deliveryOtp: String(data.delivery_otp || ''),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la réservation';
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (createdRun) {
    return (
      <ExpressSuccessCard
        orderId={createdRun.orderId}
        deliveryFee={createdRun.deliveryFee}
        pickupOtp={createdRun.pickupOtp}
        deliveryOtp={createdRun.deliveryOtp}
        senderName={userProfile?.full_name || 'Expéditeur'}
        recipientName={recipientName || 'Destinataire'}
        recipientPhone={recipientPhone}
        pickupDistrict={pickupDistrict}
        dropoffDistrict={dropoffDistrict}
        packageTypeLabel={packageTypeLabel}
        payerRole={payerRole}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 pb-16">
      <div className="mb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Retour"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 id="express-page-title" className="text-lg sm:text-xl font-bold text-slate-900">
            Coursier Express Daloa
          </h1>
          <p className="text-xs text-slate-500">
            Livraison directe entre quartiers, en quelques minutes.
          </p>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-900 px-4 py-3 text-white">
        <div className="flex items-center gap-2 min-w-0 text-xs sm:text-sm font-semibold">
          <span className="truncate">{pickupDistrict}</span>
          <ArrowRight className="h-3.5 w-3.5 text-orange-400 shrink-0" />
          <span className="truncate">{dropoffDistrict}</span>
          <span className="text-slate-400 font-normal tabular-nums shrink-0">· ~{quote.roadKm} km</span>
        </div>
        <span className="text-base sm:text-lg font-extrabold text-orange-400 tabular-nums shrink-0">
          {formatPrice(quote.deliveryFee)}
        </span>
      </div>

      <form onSubmit={handleSubmit} noValidate aria-labelledby="express-page-title" className="space-y-4">
        {formError && (
          <div
            role="alert"
            aria-live="polite"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700"
          >
            {formError}
          </div>
        )}

        <ExpressRouteContactsSection
          districts={DALOA_DISTRICTS}
          pickupDistrict={pickupDistrict}
          setPickupDistrict={setPickupDistrict}
          pickupAddress={pickupAddress}
          setPickupAddress={setPickupAddress}
          senderPhone={senderPhone}
          onSenderPhoneChange={(v) => {
            setSenderPhone(v);
            if (invalidField === 'senderPhone') {
              setInvalidField(null);
              setFormError('');
            }
          }}
          senderPhoneInvalid={invalidField === 'senderPhone'}
          senderPhoneRef={senderPhoneRef}
          dropoffDistrict={dropoffDistrict}
          setDropoffDistrict={setDropoffDistrict}
          dropoffAddress={dropoffAddress}
          setDropoffAddress={setDropoffAddress}
          recipientName={recipientName}
          setRecipientName={setRecipientName}
          recipientPhone={recipientPhone}
          onRecipientPhoneChange={(v) => {
            setRecipientPhone(v);
            if (invalidField === 'recipientPhone') {
              setInvalidField(null);
              setFormError('');
            }
          }}
          recipientPhoneInvalid={invalidField === 'recipientPhone'}
          recipientPhoneRef={recipientPhoneRef}
        />

        <ExpressPackageSection
          packageType={packageType}
          onPackageTypeChange={setPackageType}
          packageDescription={packageDescription}
          onPackageDescriptionChange={setPackageDescription}
          isSealed={isSealed}
          onToggleSealed={() => setIsSealed((v) => !v)}
          isFragile={isFragile}
          onToggleFragile={() => setIsFragile((v) => !v)}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
          <fieldset className="space-y-2.5">
            <legend className="text-sm font-bold text-slate-900">3. Qui paie la livraison ?</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: 'sender' as const, label: 'Je paie au départ', hint: 'En espèces au ramassage' },
                { id: 'recipient' as const, label: 'Le destinataire paie', hint: 'À la remise du colis' },
              ].map((opt) => {
                const active = payerRole === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={cn(
                      'flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors focus-within:ring-2 focus-within:ring-orange-600/30',
                      active ? 'border-orange-600 bg-orange-50/70' : 'border-slate-200 bg-white hover:bg-slate-50',
                    )}
                  >
                    <input
                      type="radio"
                      name="payer_role"
                      value={opt.id}
                      checked={active}
                      onChange={() => setPayerRole(opt.id)}
                      className="h-4 w-4 accent-orange-600 shrink-0"
                    />
                    <span>
                      <span className="block text-xs font-bold text-slate-900">{opt.label}</span>
                      <span className="block text-[11px] text-slate-500">{opt.hint}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex items-center gap-2 text-xs text-slate-600">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Double code secret OTP généré (ramassage + réception).</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60 transition-colors tabular-nums"
          >
            <Bike className="h-4 w-4" />
            <span>
              {submitting ? 'Publication en cours...' : `Commander un coursier · ${formatPrice(quote.deliveryFee)}`}
            </span>
          </button>
        </section>
      </form>
    </div>
  );
};

export default ExpressDeliveryPage;
