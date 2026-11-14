import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  Check,
  FileText,
  KeyRound,
  Package,
  Shield,
  Utensils,
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

const DALOA_DISTRICTS: string[] = Object.keys(DALOA_DISTRICT_COORDINATES);

const PACKAGE_TYPES = [
  { id: 'parcel', label: 'Colis standard', Icon: Package },
  { id: 'document', label: 'Pli / Document', Icon: FileText },
  { id: 'food', label: 'Repas / Courses', Icon: Utensils },
  { id: 'keys_urgent', label: 'Clés / Urgent', Icon: KeyRound },
] as const;

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

  const [pickupDistrict, setPickupDistrict] = useState(userProfile?.district || 'Commerce');
  const [pickupAddress, setPickupAddress] = useState('');
  const [senderName, setSenderName] = useState(userProfile?.full_name || '');
  const [senderPhone, setSenderPhone] = useState(userProfile?.phone || '');

  const [dropoffDistrict, setDropoffDistrict] = useState('Lobia');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [payerRole, setPayerRole] = useState<'sender' | 'recipient'>('sender');

  const [submitting, setSubmitting] = useState(false);
  const [createdRun, setCreatedRun] = useState<CreatedExpressRun | null>(null);

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
    PACKAGE_TYPES.find((pt) => pt.id === packageType)?.label || 'Colis standard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Connectez-vous pour réserver un coursier express.');
      navigate('/login');
      return;
    }
    if (!senderPhone.trim()) {
      toast.error("Veuillez renseigner le numéro de téléphone de l'expéditeur.");
      return;
    }
    if (!recipientPhone.trim()) {
      toast.error('Veuillez renseigner le numéro de téléphone du destinataire.');
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
        p_sender_name: senderName.trim() || userProfile?.full_name || 'Expéditeur',
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

      toast.success('Course Express publiée !');
      setCreatedRun({
        orderId: data.order_id,
        deliveryFee: Number(data.delivery_fee || quote.deliveryFee),
        pickupOtp: String(data.pickup_otp || ''),
        deliveryOtp: String(data.delivery_otp || ''),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la réservation';
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
        senderName={senderName || userProfile?.full_name || 'Expéditeur'}
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
    <div className="mx-auto max-w-2xl px-4 py-6 pb-16">
      <div className="mb-5 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-0.5 text-[10px] font-black text-orange-600 uppercase">
            <Bike className="h-3 w-3" /> DaloaDelivery Express
          </div>
          <h1 className="text-xl font-black text-gray-900">Demander un Coursier Express</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-gray-900">
            <Package className="h-4 w-4 text-orange-600" />
            <span>1. Que souhaitez-vous envoyer ?</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {PACKAGE_TYPES.map((pt) => {
              const Icon = pt.Icon;
              return (
                <button
                  key={pt.id}
                  type="button"
                  onClick={() => setPackageType(pt.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-colors',
                    packageType === pt.id
                      ? 'border-orange-500 bg-orange-50/70 text-orange-950 font-black'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-semibold'
                  )}
                >
                  <Icon className="h-5 w-5 text-orange-600" />
                  <span className="text-xs">{pt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsSealed((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors',
                isSealed ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-600'
              )}
            >
              <Check className="h-3.5 w-3.5" />
              <span>Colis scellé / fermé</span>
            </button>
            <button
              type="button"
              onClick={() => setIsFragile((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors',
                isFragile ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600'
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Fragile</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Instructions ou description discrète (sans valeur marchande)
            </label>
            <input
              type="text"
              value={packageDescription}
              onChange={(e) => setPackageDescription(e.target.value)}
              placeholder="Ex: Enveloppe A4 fermée, sac repas..."
              className="w-full h-11 rounded-xl border border-gray-200 px-3.5 text-sm focus:border-orange-500 focus:outline-hidden"
            />
          </div>
        </section>

        <ExpressRouteContactsSection
          districts={DALOA_DISTRICTS}
          pickupDistrict={pickupDistrict}
          setPickupDistrict={setPickupDistrict}
          pickupAddress={pickupAddress}
          setPickupAddress={setPickupAddress}
          senderName={senderName}
          setSenderName={setSenderName}
          senderPhone={senderPhone}
          setSenderPhone={setSenderPhone}
          dropoffDistrict={dropoffDistrict}
          setDropoffDistrict={setDropoffDistrict}
          dropoffAddress={dropoffAddress}
          setDropoffAddress={setDropoffAddress}
          recipientName={recipientName}
          setRecipientName={setRecipientName}
          recipientPhone={recipientPhone}
          setRecipientPhone={setRecipientPhone}
        />

        <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500">Tarif officiel DaloaDelivery (~{quote.roadKm} km)</p>
              <p className="text-2xl font-black text-gray-900 tabular-nums">{formatPrice(quote.deliveryFee)}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPayerRole('sender')}
                className={cn(
                  'rounded-xl border px-3 py-2 text-xs font-extrabold transition-all',
                  payerRole === 'sender'
                    ? 'border-orange-500 bg-orange-50 text-orange-800'
                    : 'border-gray-200 text-gray-600'
                )}
              >
                Je paie au départ
              </button>
              <button
                type="button"
                onClick={() => setPayerRole('recipient')}
                className={cn(
                  'rounded-xl border px-3 py-2 text-xs font-extrabold transition-all',
                  payerRole === 'recipient'
                    ? 'border-orange-500 bg-orange-50 text-orange-800'
                    : 'border-gray-200 text-gray-600'
                )}
              >
                Le destinataire paie
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-3 text-xs text-gray-600">
            <Shield className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Double code secret OTP généré (Ramassage + Réception) pour sécuriser votre envoi.</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 text-sm font-black text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            <Bike className="h-4 w-4" />
            <span>{submitting ? 'Publication en cours...' : `Appeler un coursier · ${formatPrice(quote.deliveryFee)}`}</span>
          </button>
        </section>
      </form>
    </div>
  );
};

export default ExpressDeliveryPage;
