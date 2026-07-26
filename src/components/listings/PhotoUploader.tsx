import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import toast from 'react-hot-toast';

interface PhotoUploaderProps {
  images: File[];
  onImagesChange: (files: File[]) => void;
  maxImages?: number;
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  images,
  onImagesChange,
  maxImages = 5,
}) => {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (images.length + acceptedFiles.length > maxImages) {
        toast.error(`Maximum ${maxImages} images autorisees`);
        return;
      }

      const compressed: File[] = [];
      for (const file of acceptedFiles) {
        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.3, // Max 300 KB per photo for instant 3G loading
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: maxImages,
    disabled: images.length >= maxImages,
  });

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all active:scale-[0.97] ${
          isDragActive
            ? 'border-primary bg-primary-50'
            : images.length >= maxImages
            ? 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
            : 'border-gray-200 hover:border-primary hover:bg-primary-50/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm font-medium text-gray-600">
          {isDragActive
            ? 'Déposez les images ici...'
            : 'Glissez-déposez vos photos ici'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          ou cliquez pour parcourir ({images.length}/{maxImages})
        </p>
      </div>

      {/* Image previews grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((file, index) => (
            <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              <img
                src={URL.createObjectURL(file)}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/70 active:scale-[0.97] transition-all"
                aria-label={`Supprimer la photo ${index + 1}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
