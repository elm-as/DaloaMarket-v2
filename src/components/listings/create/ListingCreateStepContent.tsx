import React from 'react';
import type { FieldErrors, UseFormRegister, UseFormSetValue } from 'react-hook-form';
import type { ListingVariant } from '../../../types/listing';
import type { ListingFormValues } from './listingCreatePayload';
import { ListingPhotosSection } from './ListingPhotosSection';
import { ListingGeneralInfoSection } from './ListingGeneralInfoSection';
import { ListingDetailsSection } from './ListingDetailsSection';
import { ListingPricingSection } from './ListingPricingSection';
import { ListingLogisticsSection } from './ListingLogisticsSection';

interface ListingCreateStepContentProps {
  currentStep: number;
  isEditing: boolean;
  photos: File[];
  setPhotos: React.Dispatch<React.SetStateAction<File[]>>;
  existingPhotos: string[];
  setexistingPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  register: UseFormRegister<ListingFormValues>;
  errors: FieldErrors<ListingFormValues>;
  setValue: UseFormSetValue<ListingFormValues>;
  watchCategory: string;
  watchCondition: string;
  watchDescription: string;
  priceNum: number;
  sellerFee: number;
  discountPercent: number;
  netPayout: number;
  sellerFeeRate: number;
  isPro: boolean;
  variants: ListingVariant[];
  onVariantsChange: (nextVariants: ListingVariant[]) => void;
}

/**
 * Affiche les champs correspondants à l'étape active du assistant de publication Web.
 */
export const ListingCreateStepContent: React.FC<ListingCreateStepContentProps> = ({
  currentStep,
  isEditing,
  photos,
  setPhotos,
  existingPhotos,
  setexistingPhotos,
  register,
  errors,
  setValue,
  watchCategory,
  watchCondition,
  watchDescription,
  priceNum,
  sellerFee,
  discountPercent,
  netPayout,
  sellerFeeRate,
  isPro,
  variants,
  onVariantsChange,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 space-y-5">
    {currentStep === 1 && (
      <>
        <ListingPhotosSection
          photos={photos}
          setPhotos={setPhotos}
          existingPhotos={existingPhotos}
          setexistingPhotos={setexistingPhotos}
          isEditing={isEditing}
        />
        <div className="h-px bg-slate-100" />
        <ListingGeneralInfoSection register={register} errors={errors} mode="title_only" />
        <div className="h-px bg-slate-100" />
        <ListingDetailsSection
          register={register}
          errors={errors}
          watchCategory={watchCategory}
          watchCondition={watchCondition}
          setValue={setValue}
        />
      </>
    )}

    {currentStep === 2 && (
      <ListingPricingSection
        register={register}
        errors={errors}
        setValue={setValue}
        category={watchCategory}
        priceNum={priceNum}
        sellerFee={sellerFee}
        discountPercent={discountPercent}
        netPayout={netPayout}
        sellerFeeRate={sellerFeeRate}
        isPro={isPro}
        variants={variants}
        onVariantsChange={onVariantsChange}
      />
    )}

    {currentStep === 3 && (
      <>
        <ListingGeneralInfoSection
          register={register}
          errors={errors}
          watchDescription={watchDescription}
          setValue={setValue}
          mode="description_only"
        />
        <div className="h-px bg-slate-100" />
        <ListingLogisticsSection register={register} errors={errors} />
      </>
    )}
  </div>
);
