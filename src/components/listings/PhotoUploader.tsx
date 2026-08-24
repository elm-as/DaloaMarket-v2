import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ImagePlus, X, Star } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

interface PhotoUploaderProps {
  images: File[];
  onImagesChange: (files: File[]) => void;
  maxImages?: number;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  images,
  onImagesChange,
  maxImages = 5,
}) => {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (images.length + acceptedFiles.length > maxImages) {
        toast.error(`Maximum ${maxImages} photos autorisées`);
        return;
      }

      const compressed: File[] = [];
      for (const file of acceptedFiles) {
        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.3,
            maxWidthOrHeight: 1200,
            fileType: 'image/jpeg',
            initialQuality: 0.8,
            useWebWorker: true,
          });
          compressed.push(compressedFile);
        } catch {
          compressed.push(file);
        }
      }

      onImagesChange([...images, ...compressed]);
    },
    [images, maxImages, onImagesChange]
  );

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  };

  /** Replace a photo at a given index with its background-removed version */
  const replaceImage = useCallback(
    (index: number, newFile: File) => {
      const updated = [...images];
      updated[index] = newFile;
      onImagesChange(updated);
    },
    [images, onImagesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: maxImages,
    disabled: images.length >= maxImages,
  });

  return (
    <div className="space-y-3">
      {/* ── PHOTO THUMBNAIL TILES & ADD BUTTON ── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
        {images.map((file, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 border border-gray-200/80 shadow-2xs group"
          >
            <img
              src={URL.createObjectURL(file)}
              alt={`Photo ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />

            {/* Badge photo principale */}
            {index === 0 && (
              <div className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-xs text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 shadow-xs">
                <Star className="w-3 h-3 fill-amber-400" />
                <span>Principale</span>
              </div>
            )}

            {/* Bouton supprimer */}
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-red-500 backdrop-blur-xs rounded-full flex items-center justify-center text-white active:scale-90 transition-all shadow-xs"
              aria-label={`Supprimer la photo ${index + 1}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

        {/* ── BOUTON D'AJOUT RAPIDE SI < MAX ── */}
        {images.length < maxImages && (
          <div
            {...getRootProps()}
            className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.97] p-2 text-center ${
              isDragActive
                ? 'border-orange-500 bg-orange-50/80 text-orange-600 scale-[0.98]'
                : 'border-orange-200/90 bg-orange-50/30 hover:bg-orange-50/70 hover:border-orange-400 text-orange-950'
            }`}
          >
            <input {...getInputProps()} />
            <div className="w-8 h-8 rounded-xl bg-orange-100/80 flex items-center justify-center text-orange-600 mb-1 shadow-2xs">
              <ImagePlus className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-black leading-tight text-orange-900">+ Photo</span>
            <span className="text-[9px] font-semibold text-gray-400 mt-0.5">
              {images.length}/{maxImages}
            </span>
          </div>
        )}
      </div>

      {images.length === 0 && (
        <p className="text-[11px] text-gray-400 text-center font-medium">
          📸 Ajoutez au moins 1 photo claire de votre produit pour attirer les acheteurs.
        </p>
      )}
    </div>
  );
};

export default PhotoUploader;

