import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, ArrowRight, CheckCircle2, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { MAX_FREE_LISTINGS } from '../lib/featureFlags';
import { SELLER_FEE_RATE } from '../lib/pricing';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getListingPath } from '../lib/utils';

import { ListingStepper } from '../components/listings/create/ListingStepper';
import { ListingLivePreview } from '../components/listings/create/ListingLivePreview';
import { ListingPhotosSection } from '../components/listings/create/ListingPhotosSection';
import { ListingGeneralInfoSection } from '../components/listings/create/ListingGeneralInfoSection';
import { ListingDetailsSection } from '../components/listings/create/ListingDetailsSection';
import { ListingPricingSection } from '../components/listings/create/ListingPricingSection';
import { ListingLogisticsSection } from '../components/listings/create/ListingLogisticsSection';
import { ListingSuccessModal } from '../components/listings/create/ListingSuccessModal';

export interface ListingFormValues {
  title: string;
  price: string;
  description: string;
  category: string;
  condition: string;
  district: string;
  phone: string;
  stock: string;
  original_price: string;
}

const ListingCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const isEditing = !!editId;

  usePageTitle(isEditing ? "Modifier l'annonce" : 'Publier une annonce');

  const { user, userProfile, loading: authLoading } = useSupabase();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setexistingPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingListing, setLoadingListing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<ListingFormValues>({
    defaultValues: {
      title: '',
      price: '',
      description: '',
      category: '',
      condition: '',
      district: '',
      phone: '',
      stock: '1',
    },
  });

  const watchTitle = watch('title', '');
  const watchDescription = watch('description', '');
  const watchCategory = watch('category', '');
  const watchCondition = watch('condition', '');
  const watchDistrict = watch('district', '');
  const watchPrice = watch('price', '');
  const watchOriginalPrice = watch('original_price', '');

  const priceNum = parseInt(watchPrice, 10);
  const origPriceNum = parseInt(watchOriginalPrice, 10);
  const discountPercent = (origPriceNum > priceNum && priceNum > 0) ? Math.round(((origPriceNum - priceNum) / origPriceNum) * 100) : 0;
  const isPro = userProfile?.pro_until ? new Date(userProfile.pro_until) > new Date() : false;
  const currentSellerFeeRate = isPro ? 0.025 : SELLER_FEE_RATE;
  const sellerFee = !isNaN(priceNum) ? Math.round(priceNum * currentSellerFeeRate) : 0;
  const netPayout = !isNaN(priceNum) ? priceNum - sellerFee : 0;

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

  // Auth guard: redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/create-listing' } });
    }
  }, [user, authLoading, navigate]);

  // Pre-fill phone from profile
  useEffect(() => {
    if (userProfile?.phone) {
      setValue('phone', userProfile.phone);
    }
    if (userProfile?.district && !watchDistrict) {
      setValue('district', userProfile.district);
    }
  }, [userProfile, setValue, watchDistrict]);

  // Fetch existing listing for editing
  useEffect(() => {
    if (!editId) return;
    const fetchListing = async () => {
      setLoadingListing(true);
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*')
          .eq('id', editId)
          .single();

        if (error) throw error;

        // Check ownership
        if (data.user_id !== user?.id) {
          toast.error("Annonce introuvable");
          navigate('/create-listing');
          return;
        }

        reset({
          title: data.title || '',
          price: data.price ? String(data.price) : '',
          description: data.description || '',
          category: data.category || '',
          condition: data.condition || '',
          district: data.district || '',
          phone: data.contact_phone || userProfile?.phone || '',
          stock: data.stock != null ? String(data.stock) : '1',
          original_price: (data as any).original_price != null ? String((data as any).original_price) : '',
        });

        if (data.photos && data.photos.length > 0) {
          setexistingPhotos(data.photos);
        }
      } catch (err: unknown) {
        toast.error("Erreur lors du chargement de l'annonce");
        navigate('/');
      } finally {
        setLoadingListing(false);
      }
    };
    fetchListing();
  }, [editId, user, userProfile, reset, navigate]);

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!isEditing && photos.length === 0 && existingPhotos.length === 0) {
        toast.error("Veuillez ajouter au moins une photo pour votre annonce.");
        return;
      }
      const isValid = await trigger(['title', 'category']);
      if (isValid) {
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (currentStep === 2) {
      const isValid = await trigger(['price', 'condition']);
      if (isValid) {
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const uploadPhotos = async (listingId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const file = photos[i];
      const ext = file.name.split('.').pop();
      const path = `${user!.id}/${listingId}/${Date.now()}_${i}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('listings')
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('listings')
        .getPublicUrl(path);

      urls.push(data.publicUrl);
    }
    return urls;
  };

  const onSubmit = async (values: ListingFormValues) => {
    if (!user) return;

    // 1. Intercepter la touche "Entrée" aux étapes 1 et 2 pour passer à l'étape suivante au lieu de publier prématurément
    if (currentStep < 3 && !isEditing) {
      handleNextStep();
      return;
    }

    // 2. Validation stricte de la présence d'au moins une photo
    const totalPhotos = photos.length + existingPhotos.length;
    if (totalPhotos === 0) {
      toast.error("Veuillez ajouter au moins une photo pour votre annonce.");
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);

    try {
      const listingId = editId || crypto.randomUUID();

      // 3. Uploader les photos AVANT d'insérer l'annonce dans la base de données
      let uploadedUrls: string[] = [];
      if (photos.length > 0) {
        uploadedUrls = await uploadPhotos(listingId);
      }

      const finalPhotos = [...existingPhotos, ...uploadedUrls];

      if (finalPhotos.length === 0) {
        toast.error("Veuillez ajouter au moins une photo pour votre annonce.");
        setCurrentStep(1);
        setSubmitting(false);
        return;
      }

      if (isEditing && editId) {
        const { error } = await supabase
          .from('listings')
          .update({
            title: values.title.trim(),
            price: parseInt(values.price, 10),
            original_price: values.original_price ? parseInt(values.original_price, 10) : null,
            description: values.description.trim(),
            category: values.category,
            condition: values.condition,
            district: values.district,
            contact_phone: values.phone.trim(),
            stock: parseInt(values.stock, 10) || 1,
            photos: finalPhotos,
          } as any)
          .eq('id', editId);

        if (error) throw error;
        toast.success('Annonce modifiée avec succès !');
        navigate(getListingPath(editId, values.title));
      } else {
        // Enregistrement atomique de l'annonce avec ses photos
        const { data: newListing, error: createError } = await supabase
          .from('listings')
          .insert({
            id: listingId,
            user_id: user.id,
            title: values.title.trim(),
            price: parseInt(values.price, 10),
            original_price: values.original_price ? parseInt(values.original_price, 10) : null,
            description: values.description.trim(),
            category: values.category,
            condition: values.condition,
            district: values.district,
            contact_phone: values.phone.trim(),
            stock: parseInt(values.stock, 10) || 1,
            status: 'active',
            photos: finalPhotos,
          } as any)
          .select('id')
          .single();

        if (createError) throw createError;

        setCreatedListingId(newListing.id);
        setShowSuccessModal(true);
      }
    } catch (err: unknown) {
      console.error('Erreur publication:', err);
      toast.error("Erreur lors de la publication de l'annonce. Vérifiez vos photos et réessayez.");
    } finally {
      setSubmitting(false);
    }
  };

  const [activeListingsCount, setActiveListingsCount] = useState<number>(0);

  useEffect(() => {
    if (user && !isPro && !isEditing) {
      supabase
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'active')
        .then(({ count }) => {
          if (count != null) setActiveListingsCount(count);
        });
    }
  }, [user, isPro, isEditing]);

  const canCreateNew = isEditing || isPro || activeListingsCount < MAX_FREE_LISTINGS;

  if (authLoading || loadingListing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const hasPayoutInfo = !!userProfile?.payout_network && !!userProfile?.payout_number;
  const hasShopLocation = userProfile?.shop_latitude != null && userProfile?.shop_longitude != null;

  return (
    <motion.div
      className="min-h-screen bg-[var(--color-background)] pb-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* HEADER */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between safe-top">
        <button
          onClick={() => navigate(-1)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 rounded-full hover:bg-gray-100 active:scale-[0.97] transition-all"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: 'var(--color-on-surface)' }} />
        </button>
        <h1 className="text-base font-semibold" style={{ color: 'var(--color-on-surface)' }}>
          {isEditing ? "Modifier l'annonce" : 'Nouvelle annonce'}
        </h1>
        <div className="w-[44px]" />
      </div>

      {!hasPayoutInfo ? (
        <div className="p-4 mt-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Informations de retrait manquantes</h2>
          <p className="text-sm text-gray-600 mb-6">
            Pour vendre sur DaloaMarket, vous devez d'abord configurer le compte (Wave, Orange, MTN...) sur lequel vous souhaitez recevoir l'argent de vos ventes.
          </p>
          <Button
            color="primary"
            onClick={() => navigate('/settings?tab=compte')}
            className="w-full max-w-xs"
          >
            Configurer maintenant
          </Button>
        </div>
      ) : !hasShopLocation ? (
        <div className="p-4 mt-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Position de votre boutique requise</h2>
          <p className="text-sm text-gray-600 mb-6">
            Afin que vos acheteurs et les livreurs de Daloa puissent localiser facilement vos articles, vous devez définir l'emplacement de votre boutique sur la carte.
          </p>
          <Button
            color="primary"
            onClick={() => navigate('/settings?tab=shop')}
            className="w-full max-w-xs"
          >
            Définir l'emplacement de ma boutique
          </Button>
        </div>
      ) : !canCreateNew ? (
        <div className="p-4 mt-8 flex flex-col items-center text-center max-w-sm mx-auto">
          <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-4 border border-amber-200">
            <Star className="w-8 h-8 text-amber-500 fill-amber-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Limite d'annonces gratuites atteinte ({MAX_FREE_LISTINGS}/10)</h2>
          <p className="text-sm text-gray-600 mb-6">
            Votre compte Standard est limité à {MAX_FREE_LISTINGS} annonces actives. Passez au Pass Vendeur Pro pour publier des produits en illimité !
          </p>
          <Button
            color="primary"
            onClick={() => navigate('/become-pro')}
            className="w-full max-w-xs"
          >
            Devenir Vendeur Pro
          </Button>
        </div>
      ) : (
      <>
        {/* STEPPER BAR */}
        <ListingStepper currentStep={currentStep} onStepClick={(step) => setCurrentStep(step)} />

        {/* DISCREET GUIDE LINK */}
        <div className="max-w-lg mx-auto px-4 pt-2 pb-1 flex items-center justify-between text-xs text-gray-500">
          <span className="truncate pr-2">Conseils pour réussir votre annonce :</span>
          <Link to="/guide-vendeur" className="text-[var(--color-primary)] font-semibold hover:underline flex items-center gap-1 shrink-0">
            <span>Guide Vendeur</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="max-w-lg mx-auto px-4 py-2 space-y-5">
          <AnimatePresence mode="wait">
            {/* STEP 1: Photos & Infos Générales */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <ListingPhotosSection
                  photos={photos}
                  setPhotos={setPhotos}
                  existingPhotos={existingPhotos}
                  setexistingPhotos={setexistingPhotos}
                  isEditing={isEditing}
                />

                <ListingGeneralInfoSection
                  register={register}
                  errors={errors}
                  watchDescription={watchDescription}
                />
              </motion.div>
            )}

            {/* STEP 2: Prix, Détails & Stock */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <ListingPricingSection
                  register={register}
                  errors={errors}
                  priceNum={priceNum}
                  sellerFee={sellerFee}
                  discountPercent={discountPercent}
                  netPayout={netPayout}
                  isPro={isPro}
                />

                <ListingDetailsSection
                  register={register}
                  errors={errors}
                  watchCategory={watchCategory}
                  watchCondition={watchCondition}
                  setValue={setValue}
                />
              </motion.div>
            )}

            {/* STEP 3: Aperçu en Direct & Validation Logistique */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Live Preview Card */}
                <ListingLivePreview
                  title={watchTitle}
                  price={watchPrice}
                  originalPrice={watchOriginalPrice}
                  category={watchCategory}
                  condition={watchCondition}
                  district={watchDistrict}
                  photos={photos}
                  existingPhotos={existingPhotos}
                  discountPercent={discountPercent}
                  sellerName={userProfile?.full_name || 'Vous'}
                  isPro={isPro}
                />

                {/* Logistique & Contact */}
                <ListingLogisticsSection register={register} errors={errors} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spacer for bottom sticky navigation */}
          <div className="h-28" />
        </form>

        {/* ─── BOTTOM STICKY NAVIGATION ─── */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 px-4 py-3 z-30 shadow-lg"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 8px), 8px)' }}
        >
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outlined"
                color="secondary"
                size="lg"
                onClick={handlePrevStep}
                className="w-[100px] shrink-0"
              >
                Précédent
              </Button>
            ) : <div />}

            {currentStep < 3 ? (
              <Button
                type="button"
                variant="filled"
                color="primary"
                size="lg"
                onClick={handleNextStep}
                className="flex-1 flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
              >
                Suivant <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="filled"
                color="primary"
                size="lg"
                loading={submitting}
                disabled={!isEditing && !canCreateNew}
                onClick={handleSubmit(onSubmit)}
                className="flex-1 flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/30 bg-gradient-to-r from-[#FF7F00] to-orange-600 font-bold"
              >
                {isEditing ? 'Enregistrer' : 'Publier l\'annonce'}
              </Button>
            )}
          </div>
        </div>
      </>
      )}

      {/* ─── SUCCESS MODAL ─── */}
      <ListingSuccessModal
        show={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        isEditing={isEditing}
        createdListingId={createdListingId}
      />
    </motion.div>
  );
};

export default ListingCreatePage;
