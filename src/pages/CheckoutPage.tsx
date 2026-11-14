import React from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCart } from '../contexts/CartContext';
import { useSupabase } from '../hooks/useSupabase';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { usePageTitle } from '../hooks/usePageTitle';
import { Card } from '../components/ui/Card';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useCheckoutData } from '../components/checkout/useCheckoutData';
import { useCheckoutSubmit } from '../components/checkout/useCheckoutSubmit';
import { CheckoutStepHeader } from '../components/checkout/CheckoutStepHeader';
import { CheckoutStepMode } from '../components/checkout/CheckoutStepMode';
import { CheckoutStepAddress } from '../components/checkout/CheckoutStepAddress';
import { CheckoutStepPayment } from '../components/checkout/CheckoutStepPayment';

const CheckoutPage: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user, userProfile } = useSupabase();
  const { phaseConfig, paymentConfig } = useSystemSettings();
  const { items: cartItems, clearCart, removeFromCart, updateQuantity } = useCart();
  usePageTitle('Commander');

  const isCartMode = !listingId || listingId === 'cart';
  const stateVariantId =
    !isCartMode && location.state && typeof location.state === 'object'
      ? (location.state as { variantId?: string }).variantId
      : undefined;
  const requestedVariantId = !isCartMode
    ? stateVariantId || searchParams.get('variant') || undefined
    : undefined;

  const data = useCheckoutData({
    listingId,
    requestedVariantId,
    userId: user?.id,
    userProfile: userProfile as Record<string, any> | null,
    phaseConfig: phaseConfig as Record<string, any>,
    paymentConfig: paymentConfig as Record<string, any> | null,
    cart: { items: cartItems, removeFromCart, updateQuantity },
  });

  const { paying, handlePay } = useCheckoutSubmit({
    user: user as any,
    paymentConfig: paymentConfig as Record<string, any> | null,
    onlineDisabled: data.onlineDisabled,
    isCartMode: data.isCartMode,
    isDigital: data.isDigital,
    cartItems,
    clearCart,
    listing: data.listing,
    directSelectedVariant: data.directSelectedVariant,
    requestedVariantId,
    deliveryMode: data.deliveryMode,
    paymentMethod: data.paymentMethod,
    deliveryAddress: data.deliveryAddress,
    deliveryLatitude: data.deliveryLatitude,
    deliveryLongitude: data.deliveryLongitude,
    distanceKm: data.distanceKm,
    deliveryFeesBySeller: data.deliveryFeesBySeller,
    isOutOfZone: data.isOutOfZone,
    isPickupAllowed: data.isPickupAllowed,
    isCodAllowed: data.isCodAllowed,
    isCodBlocked: data.isCodBlocked,
    codBlockedFormattedDate: data.codBlockedFormattedDate,
    quoteStatus: data.quoteStatus,
    quoteId: data.totals.quoteReady ? data.serverQuote?.id : undefined,
    totals: data.totals,
    setStep: data.setStep,
    setAddressError: data.setAddressError,
    bumpQuoteNonce: data.bumpQuoteNonce,
  });

  if (data.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (data.isCartMode && cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="mx-4 max-w-lg pt-10 md:mx-auto">
          <Card className="rounded-xl border border-stone-200 p-6">
            <EmptyState
              title="Votre panier est vide"
              description="Ajoutez des articles à votre panier avant de finaliser votre commande."
              action={{ label: 'Voir les annonces', onClick: () => navigate('/') }}
            />
          </Card>
        </div>
      </div>
    );
  }

  if (!data.isCartMode && (data.notFound || !data.listing)) {
    return (
      <div className="min-h-screen bg-stone-50">
        <div className="mx-4 max-w-lg pt-10 md:mx-auto">
          <Card className="rounded-xl border border-stone-200 p-6">
            <EmptyState
              title="Article indisponible"
              description="Cette annonce n'existe pas ou a été retirée de la vente."
              action={{ label: 'Retour aux annonces', onClick: () => navigate('/') }}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="min-h-screen bg-stone-50 pb-28 pb-safe"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <CheckoutStepHeader
        title={data.isCartMode ? 'Finaliser votre commande' : 'Finaliser votre achat'}
        step={data.step}
        deliveryMode={data.deliveryMode}
        onBack={data.handleHeaderBack}
        onSelectStep={data.handleSelectStep}
      />

      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        {data.step === 1 && (
          <CheckoutStepMode
            context={{
              isCartMode: data.isCartMode,
              isDigital: data.isDigital,
              isPickupAllowed: data.isPickupAllowed,
              deliveryMode: data.deliveryMode,
              sellerSettings: data.sellerSettings,
            }}
            items={{
              cartItems,
              listing: data.listing,
              directSelectedVariant: data.directSelectedVariant,
            }}
            actions={{
              onSelectMode: (mode) => {
                data.setDeliveryMode(mode);
                if (mode === 'delivery' && data.paymentMethod === 'cash_at_shop') {
                  data.setPaymentMethod('online');
                }
                if (mode === 'pickup' && data.paymentMethod === 'cod') {
                  data.setPaymentMethod('cash_at_shop');
                }
              },
              onContinue: () => data.setStep(data.deliveryMode === 'pickup' ? 3 : 2),
            }}
          />
        )}

        {data.step === 2 && (
          <CheckoutStepAddress
            addressState={{
              deliveryAddress: data.deliveryAddress,
              deliveryDistrict: data.deliveryDistrict,
              addressError: data.addressError,
              deliveryLatitude: data.deliveryLatitude,
              deliveryLongitude: data.deliveryLongitude,
            }}
            routeState={{
              isPickup: data.totals.isPickup,
              isOutOfZone: data.isOutOfZone,
              isCartMode: data.isCartMode,
              sellerCoords: data.sellerCoords,
              distanceKm: data.distanceKm,
              routing: data.routing,
              deliveryFee: data.totals.deliveryFee,
              sellerFeeCount: data.deliveryFeesBySeller.size,
            }}
            actions={{
              onLocationChange: (lat, lng) => {
                data.setDeliveryLatitude(lat);
                data.setDeliveryLongitude(lng);
              },
              onDistrictChange: (district, coords) => {
                data.setDeliveryDistrict(district);
                if (coords) {
                  data.setDeliveryLatitude(coords.latitude);
                  data.setDeliveryLongitude(coords.longitude);
                }
              },
              onAddressChange: (address) => {
                data.setDeliveryAddress(address);
                if (data.addressError) data.setAddressError(false);
              },
              onBack: () => data.setStep(1),
              onNext: data.handleStep2Next,
            }}
          />
        )}

        {data.step === 3 && (
          <CheckoutStepPayment
            summary={{
              isCartMode: data.isCartMode,
              itemCount: cartItems.length,
              distanceKm: data.distanceKm,
              totals: data.totals,
            }}
            paymentState={{
              paymentMethod: data.paymentMethod,
              onlineDisabled: data.onlineDisabled,
              paymentNotice: (paymentConfig as { notice?: string } | null)?.notice,
              isPickupAllowed: data.isPickupAllowed,
              isCodAllowed: data.isCodAllowed,
              isCodBlocked: data.isCodBlocked,
              codBlockedFormattedDate: data.codBlockedFormattedDate,
              isSelfCheckout: data.isSelfCheckout,
              quoteStatus: data.quoteStatus,
              paying,
              appliedPromo: data.appliedPromo,
            }}
            actions={{
              onSelectPaymentMethod: data.setPaymentMethod,
              onApplyPromo: data.setAppliedPromo,
              onBack: () => data.setStep(data.deliveryMode === 'pickup' ? 1 : 2),
              onPay: handlePay,
            }}
          />
        )}
      </div>
    </motion.div>
  );
};

export default CheckoutPage;
