import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePhase } from '../contexts/PhaseContext';
import { SELLER_FEE_RATE, PRO_SELLER_FEE_RATE } from '../lib/pricing';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getListingPath, isLocationInDaloa } from '../lib/utils';
import type { ListingVariant } from '../types/listing';
import { listingDraftService } from '../services/listingDraftService';

import { ListingWizardHeader } from '../components/listings/create/ListingWizardHeader';
import { ListingWizardBottomBar } from '../components/listings/create/ListingWizardBottomBar';
import { ListingRequirementsGuard } from '../components/listings/create/ListingRequirementsGuard';
import { ListingCreateStepContent } from '../components/listings/create/ListingCreateStepContent';
import { ListingSuccessModal } from '../components/listings/create/ListingSuccessModal';
import {
  EMPTY_LISTING_FORM_VALUES,
  fetchEditableListing,
  normalizeCreateVariants,
  saveListingRecord,
  uploadListingPhotos,
  type ListingFormValues,
} from '../components/listings/create/listingCreatePayload';

export type { ListingFormValues };

const ListingCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isEditing = Boolean(editId);

  usePageTitle(isEditing ? "Modifier l'annonce" : 'Publier une annonce');

  const { user, userProfile, loading: authLoading } = useSupabase();
  const { sellerFeeOverride } = usePhase();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setexistingPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingListing, setLoadingListing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [variants, setVariants] = useState<ListingVariant[]>([]);
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  const { register, handleSubmit, trigger, formState: { errors, isDirty }, reset, setValue, watch } = useForm<ListingFormValues>({
    defaultValues: EMPTY_LISTING_FORM_VALUES,
  });

  const [watchTitle, watchDescription, watchCategory, watchCondition, watchDistrict, watchPrice, watchOriginalPrice, watchPhone, watchStock] = watch([
    'title',
    'description',
    'category',
    'condition',
    'district',
    'price',
    'original_price',
    'phone',
    'stock',
  ]);

  const priceNum = parseInt(watchPrice || '0', 10);
  const origPriceNum = parseInt(watchOriginalPrice || '0', 10);
  const discountPercent = origPriceNum > priceNum && priceNum > 0 ? Math.round(((origPriceNum - priceNum) / origPriceNum) * 100) : 0;
  const isPro = userProfile?.pro_until ? new Date(userProfile.pro_until) > new Date() : false;
  const currentSellerFeeRate = sellerFeeOverride ?? (isPro ? PRO_SELLER_FEE_RATE : SELLER_FEE_RATE);
  const sellerFee = !Number.isNaN(priceNum) ? Math.round(priceNum * currentSellerFeeRate) : 0;
  const netPayout = !Number.isNaN(priceNum) ? priceNum - sellerFee : 0;

  useEffect(() => {
    if (editId) return;
    const draft = listingDraftService.getDraft();
    if (!draft) return;
    reset({ ...EMPTY_LISTING_FORM_VALUES, ...draft.values });
    if (Array.isArray(draft.variants)) setVariants(draft.variants);
    if (draft.step >= 1 && draft.step <= 3) setCurrentStep(draft.step);
    const savedPhotos = listingDraftService.getStoredPhotos();
    if (savedPhotos.length > 0) setPhotos(savedPhotos);
    setIsDraftRestored(true);
  }, [editId, reset]);

  useEffect(() => {
    if (isEditing || !user) return;
    const timer = window.setTimeout(() => {
      listingDraftService.saveDraft(currentStep, watch(), variants);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [watchTitle, watchPrice, watchOriginalPrice, watchDescription, watchCategory, watchCondition, watchDistrict, watchPhone, watchStock, variants, currentStep, isEditing, user, watch]);

  useEffect(() => {
    if (isEditing || !user) return;
    listingDraftService.savePhotos(photos);
  }, [photos, isEditing, user]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/login', { state: { from: '/create-listing' } });
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (userProfile?.phone && !watchPhone) setValue('phone', userProfile.phone);
    if (userProfile?.district && !watchDistrict) setValue('district', userProfile.district);
  }, [userProfile, setValue, watchPhone, watchDistrict]);

  useEffect(() => {
    if (!editId || !user) return;
    let cancelled = false;
    setLoadingListing(true);
    fetchEditableListing(editId, user.id, userProfile?.phone || '')
      .then((loaded) => {
        if (cancelled) return;
        if (!loaded) {
          toast.error('Annonce introuvable');
          navigate('/create-listing');
          return;
        }
        reset(loaded.values);
        setVariants(loaded.variants);
        if (loaded.photos.length > 0) setexistingPhotos(loaded.photos);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Erreur lors du chargement de l'annonce");
        navigate('/');
      })
      .finally(() => {
        if (!cancelled) setLoadingListing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId, user, userProfile?.phone, reset, navigate]);

  const handleResetDraft = () => {
    listingDraftService.clearDraft();
    reset({ ...EMPTY_LISTING_FORM_VALUES, district: userProfile?.district || '', phone: userProfile?.phone || '' });
    setVariants([]);
    setPhotos([]);
    setCurrentStep(1);
    setIsDraftRestored(false);
    toast.success('Brouillon effacé.');
  };

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!isEditing && photos.length === 0 && existingPhotos.length === 0) {
        toast.error('Ajoutez au moins une photo de votre article.');
        return;
      }
      if (await trigger(['title', 'category', 'condition'])) {
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    if (currentStep === 2 && (await trigger(['price', 'stock']))) {
      if (Number.isNaN(priceNum) || priceNum < 300) {
        toast.error("Le montant minimum d'une annonce est de 300 FCFA.");
        return;
      }
      const { errorMessage } = normalizeCreateVariants(variants);
      if (errorMessage) {
        toast.error(errorMessage);
        return;
      }
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onSubmit = async (values: ListingFormValues) => {
    if (!user) return;
    if (currentStep < 3 && !isEditing) {
      await handleNextStep();
      return;
    }
    if (photos.length + existingPhotos.length === 0) {
      toast.error('Ajoutez au moins une photo pour votre annonce.');
      setCurrentStep(1);
      return;
    }
    const { normalized, errorMessage } = normalizeCreateVariants(variants);
    if (errorMessage) {
      toast.error(errorMessage);
      setCurrentStep(2);
      return;
    }

    setSubmitting(true);
    try {
      const listingId = editId || crypto.randomUUID();
      const uploadedUrls = photos.length > 0 ? await uploadListingPhotos(user.id, listingId, photos) : [];
      const savedId = await saveListingRecord({
        editId,
        userId: user.id,
        listingId,
        values,
        finalPhotos: [...existingPhotos, ...uploadedUrls],
        normalizedVariants: normalized,
      });

      if (isEditing) {
        toast.success('Annonce modifiée !');
        navigate(getListingPath(savedId, values.title));
        return;
      }
      listingDraftService.clearDraft();
      setIsDraftRestored(false);
      setCreatedListingId(savedId);
      setShowSuccessModal(true);
    } catch {
      toast.error("Erreur lors de la publication. Vérifiez vos photos et réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loadingListing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
  if (!user) return null;

  const isSuperOrAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';
  const hasPayoutInfo = Boolean(userProfile?.payout_network && userProfile?.payout_number);
  const hasShopLocation = userProfile?.shop_latitude != null && userProfile?.shop_longitude != null;
  const isShopInDaloa =
    hasShopLocation &&
    (isSuperOrAdmin || isLocationInDaloa(Number(userProfile!.shop_latitude), Number(userProfile!.shop_longitude)));

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <ListingWizardHeader
        currentStep={currentStep}
        isEditing={isEditing}
        isDraftRestored={isDraftRestored}
        onBack={() => (currentStep > 1 ? setCurrentStep((s) => s - 1) : navigate(-1))}
        onStepSelect={(step) => setCurrentStep(step)}
        onResetDraft={handleResetDraft}
      />

      {!hasPayoutInfo || !hasShopLocation || !isShopInDaloa ? (
        <ListingRequirementsGuard
          hasPayoutInfo={hasPayoutInfo}
          onConfigurePayout={() => navigate('/settings/payout')}
          onConfigureShop={() => navigate('/settings?tab=boutique')}
        />
      ) : (
        <>
          <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl px-4 pt-4">
            <ListingCreateStepContent
              currentStep={currentStep}
              isEditing={isEditing}
              photos={photos}
              setPhotos={setPhotos}
              existingPhotos={existingPhotos}
              setexistingPhotos={setexistingPhotos}
              register={register}
              errors={errors}
              setValue={setValue}
              watchCategory={watchCategory}
              watchCondition={watchCondition}
              watchDescription={watchDescription}
              priceNum={priceNum}
              sellerFee={sellerFee}
              discountPercent={discountPercent}
              netPayout={netPayout}
              sellerFeeRate={currentSellerFeeRate}
              isPro={isPro}
              variants={variants}
              onVariantsChange={(nextVariants) => {
                setVariants(nextVariants);
                if (nextVariants.length > 0) {
                  setValue('stock', String(nextVariants.reduce((sum, v) => sum + Math.max(0, Number(v.stock) || 0), 0)));
                }
              }}
            />
          </form>

          <ListingWizardBottomBar
            currentStep={currentStep}
            isEditing={isEditing}
            submitting={submitting}
            onPrevious={() => setCurrentStep((s) => Math.max(1, s - 1))}
            onNext={handleNextStep}
            onSubmit={handleSubmit(onSubmit)}
          />
        </>
      )}

      <ListingSuccessModal
        show={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        isEditing={isEditing}
        createdListingId={createdListingId}
        listingTitle={watchTitle}
        listingPrice={parseInt(watchPrice || '0', 10)}
        listingDistrict={watchDistrict}
        listingPhoto={existingPhotos[0] || null}
      />
    </div>
  );
};

export default ListingCreatePage;
