import React from 'react';
import { Camera, X, AlertTriangle } from 'lucide-react';
import PhotoUploader from '../PhotoUploader';

interface ListingPhotosSectionProps {
  photos: File[];
  setPhotos: React.Dispatch<React.SetStateAction<File[]>>;
  existingPhotos: string[];
  setexistingPhotos: React.Dispatch<React.SetStateAction<string[]>>;
  isEditing: boolean;
}

export const ListingPhotosSection: React.FC<ListingPhotosSectionProps> = ({
  photos,
  setPhotos,
  existingPhotos,
  setexistingPhotos,
  isEditing,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-orange-600" />
          Photos de l'article <span className="text-red-500">*</span>
        </label>
        <span className="text-[11px] font-medium text-gray-400">
          {photos.length + existingPhotos.length}/5 photos
        </span>
      </div>

      {existingPhotos.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-2">
          {existingPhotos.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 group border border-gray-200 shadow-2xs">
              <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setexistingPhotos((prev) => prev.filter((_, i) => i !== index))}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-red-500 active:scale-95 transition-all shadow-sm"
                  aria-label={`Supprimer la photo ${index + 1}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isEditing ? (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs font-semibold text-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
          Les photos ne peuvent pas être modifiées après publication.
        </div>
      ) : (
        <PhotoUploader images={photos} onImagesChange={setPhotos} maxImages={5 - existingPhotos.length} />
      )}
    </div>
  );
};

export default ListingPhotosSection;
