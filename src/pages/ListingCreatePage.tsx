import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, ArrowRight, CheckCircle2, Star } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

import { useSupabase } from '../hooks/useSupabase';
import { supabase } from '../lib/supabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePhase } from '../contexts/PhaseContext';
import { SELLER_FEE_RATE, PRO_SELLER_FEE_RATE } from '../lib/pricing';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { getListingPath } from '../lib/utils';
import type { ListingVariant } from '../types/listing';

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
  const { isPhase0, maxFreeListings, showMonetisation } = usePhase();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setexistingPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingListing, setLoadingListing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdListingId, setCreatedListingId] = useState<string | null>(null);
  const [variants, setVariants] = useState<ListingVariant[]>([]);

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
  const currentSellerFeeRate = isPro ? PRO_SELLER_FEE_RATE : SELLER_FEE_RATE;
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

        const loadedVariants = Array.isArray((data as any).variants) ? (data as any).variants : [];
        setVariants(loadedVariants.map((variant: any, index: number) => ({
          id: String(variant.id || `variant_${index}_${Date.now()}`),
          label: String(variant.label || ''),
          price: variant.price == null || variant.price === '' ? null : Number(variant.price),
          stock: Math.max(0, Number(variant.stock) || 0),
          active: variant.active !== false,
        })));

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
      const isValid = await trigger(['title', 'category', 'condition']);
      if (isValid) {
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (currentStep === 2) {
      const isValid = await trigger(['price', 'stock']);
      if (isValid) {
        if (variants.length > 0) {
          if (variants.some((v) => !v.label && !v.size && !v.color)) {
            toast.error('Chaque déclinaison doit avoir au moins une couleur, taille ou libellé.');
            return;
          }
          if (variants.some((v) => v.stock < 1 || (v.price != null && v.price < 300))) {
            toast.error('Chaque option doit avoir un stock (>= 1) et un prix valide (>= 300 F).');
            return;
          }
        }
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
      const normalizedVariants = variants.map((variant) => {
        const color = variant.color?.trim() || null;
        const color_code = variant.color_code?.trim() || null;
        const size = variant.size?.trim() || null;

        let label = (variant.label || '').trim();
        if (!label) {
          if (color && size) label = `${color} · ${size}`;
          else if (color) label = color;
          else if (size) label = size;
          else label = 'Option standard';
        }

        return {
          id: variant.id || `variant_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          label,
          color,
          color_code,
          size,
          price: variant.price == null || Number.isNaN(Number(variant.price)) ? null : Math.round(Number(variant.price)),
          stock: Math.max(0, Math.floor(Number(variant.stock) || 0)),
          active: variant.active !== false,
        };
      });

      if (normalizedVariants.some((variant) => !variant.label)) {
        toast.error('Chaque option doit avoir un nom ou une déclinaison.');
        setCurrentStep(2);
        return;
      }

      if (normalizedVariants.some((variant) => variant.stock < 1 || (variant.price != null && variant.price < 300))) {
        toast.error('Chaque déclinaison doit avoir un stock et un prix valides.');
        setCurrentStep(2);
        return;
      }

      const listingId = editId || crypto.randomUUID();
      const totalStock = normalizedVariants.length > 0
        ? normalizedVariants.reduce((sum, variant) => sum + variant.stock, 0)
        : Math.max(1, parseInt(values.stock, 10) || 1);

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
            stock: totalStock,
            variants: normalizedVariants,
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
            stock: totalStock,
            variants: normalizedVariants,
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

  const canCreateNew = isEditing || isPro || isPhase0 || activeListingsCount < maxFreeListings;

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
      className="min-h-screen bg-gray-50/60 pb-safe pb-28 overflow-x-hidden w-full max-w-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      {/* ── HERO BANNER (THEME SIGNATURE DALOAMARKET) ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-500 to-amber-600 px-4 sm:px-6 pt-6 pb-12 rounded-b-[36px] shadow-lg shadow-orange-500/15">
        <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-14 -left-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white active:scale-95 transition-all shadow-xs"
              aria-label="Retour"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-100">
                Espace Vendeur · Daloa
              </p>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {isEditing ? "Modifier l'annonce" : "Publier une annonce"}
              </h1>
            </div>
          </div>
          <span className="inline-flex rounded-full bg-white/20 backdrop-blur-md px-3.5 py-1 text-xs font-black text-white border border-white/25 shadow-2xs">
            {isEditing ? "Édition" : "Gratuit"}
          </span>
        </div>
      </header>

      {!hasPayoutInfo ? (
        <div className="relative z-10 -mt-6 px-4 max-w-lg mx-auto">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-3.5 shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-base font-black text-gray-900 mb-1.5">Informations de retrait requises</h2>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Pour vendre sur DaloaMarket, vous devez d'abord configurer le compte Mobile Money (Wave, Orange, MTN...) sur lequel vous recevrez vos paiements.
            </p>
            <Button
              color="primary"
              onClick={() => navigate('/settings/payout')}
              className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-black shadow-lg shadow-orange-500/25 active:scale-[0.98]"
            >
              Configurer mes coordonnées
            </Button>
          </div>
        </div>
      ) : !hasShopLocation ? (
        <div className="relative z-10 -mt-6 px-4 max-w-lg mx-auto">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl shadow-gray-200/50 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mb-3.5 shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-base font-black text-gray-900 mb-1.5">Position de boutique requise</h2>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Afin que vos acheteurs et les livreurs de Daloa puissent localiser vos articles et calculer la livraison, veuillez positionner votre boutique sur la carte.
            </p>
            <Button
              color="primary"
              onClick={() => navigate('/settings?tab=boutique')}
              className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-black shadow-lg shadow-orange-500/25 active:scale-[0.98]"
            >
              Définir la position GPS
            </Button>
          </div>
        </div>
      ) : !canCreateNew ? (
        <div className="relative z-10 -mt-6 px-4 max-w-lg mx-auto">
          <div className="bg-white rounded-3xl p-6 border border-amber-100 shadow-xl shadow-amber-100/50 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-3.5 border border-amber-200 shadow-xs">
              <Star className="w-7 h-7 text-amber-500 fill-amber-500" />
            </div>
            <h2 className="text-base font-black text-gray-900 mb-1.5">Limite d'annonces atteinte ({activeListingsCount}/{maxFreeListings})</h2>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Votre compte Standard est limité à {maxFreeListings} annonces actives. {showMonetisation ? 'Passez au Pass Vendeur Pro pour publier sans limite !' : 'Gérez ou supprimez vos anciennes annonces pour en publier de nouvelles.'}
            </p>
            {showMonetisation ? (
              <Button
                color="primary"
                onClick={() => navigate('/devenir-pro')}
                className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-black shadow-lg shadow-orange-500/25 active:scale-[0.98]"
              >
                Devenir Vendeur Pro
              </Button>
            ) : (
              <Button
                color="primary"
                onClick={() => navigate('/profile')}
                className="w-full rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 font-black shadow-lg shadow-orange-500/25 active:scale-[0.98]"
              >
                Gérer mes annonces
              </Button>
            )}
          </div>
        </div>
      ) : (
      <>
        {/* ── STEPPER FLOATING CARD ── */}
        <div className="relative z-10 -mt-6 max-w-lg mx-auto px-4 w-full">
          <div className="bg-white rounded-3xl p-2.5 sm:p-3 border border-gray-100/90 shadow-xl shadow-gray-200/50">
            <ListingStepper currentStep={currentStep} onStepClick={(step) => setCurrentStep(step)} />
          </div>
        </div>

        {/* DESKTOP SPLIT-SCREEN LAYOUT */}
        <div className="max-w-6xl mx-auto px-4 lg:px-6 py-2 lg:grid lg:grid-cols-[1fr_420px] lg:gap-8 lg:items-start">
          {/* LEFT COLUMN: FORM */}
          <div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <AnimatePresence mode="wait">
                {/* ── STEP 1: Photos, Titre, Catégorie & État ── */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
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
                      mode="title_only"
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

                {/* ── STEP 2: Prix, Promo & Déclinaisons (Couleurs & Tailles) ── */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <ListingPricingSection
                      register={register}
                      errors={errors}
                      priceNum={priceNum}
                      sellerFee={sellerFee}
                      discountPercent={discountPercent}
                      netPayout={netPayout}
                      isPro={isPro}
                      variants={variants}
                      onVariantsChange={(nextVariants) => {
                        setVariants(nextVariants);
                        if (nextVariants.length > 0) {
                          setValue('stock', String(nextVariants.reduce((sum, variant) => sum + Math.max(0, Number(variant.stock) || 0), 0)));
                        }
                      }}
                    />
                  </motion.div>
                )}

                {/* ── STEP 3: Description, Quartier Daloa & Contact (Publication directe) ── */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <ListingGeneralInfoSection
                      register={register}
                      errors={errors}
                      watchDescription={watchDescription}
                      mode="description_only"
                    />

                    {/* Logistique & Contact */}
                    <ListingLogisticsSection register={register} errors={errors} />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Spacer for bottom sticky navigation on mobile */}
              <div className="h-28 lg:h-8" />
            </form>
          </div>

          {/* RIGHT COLUMN: PERMANENT DESKTOP LIVE PREVIEW */}
          <div className="hidden lg:block lg:sticky lg:top-20 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Aperçu en direct pour les acheteurs
              </h3>
              <span className="text-xs text-gray-400 font-bold">Temps réel</span>
            </div>

            <div className="bg-white rounded-3xl p-4 shadow-md shadow-gray-100 border border-gray-100">
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
            </div>
          </div>
        </div>

        {/* ─── BOTTOM STICKY NAVIGATION ─── */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100/90 px-4 py-3 z-40 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}
        >
          <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="h-12 px-5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-black text-xs sm:text-sm active:scale-95 transition-all flex items-center justify-center shrink-0 border border-gray-200/50"
              >
                Précédent
              </button>
            ) : null}

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
              >
                <span>Suivant</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting || (!isEditing && !canCreateNew)}
                onClick={handleSubmit(onSubmit)}
                className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <LoadingSpinner size="sm" className="text-white" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEditing ? 'Enregistrer les modifications' : 'Publier mon annonce'}</span>
                  </>
                )}
              </button>
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
