import React from 'react';
import { Camera, X, AlertTriangle } from 'lucide-react';
import { Card } from '../../ui/Card';
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
    <section>
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-orange-50 text-orange-600">
          <Camera className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-gray-900">Photos de l'article</h2>
          <p className="text-[11px] font-medium text-gray-500">Jusqu'à 5 photos claires et bien éclairées</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-lg shadow-gray-200/50 space-y-3">
        {existingPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {existingPhotos.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 group border border-gray-200">
                <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setexistingPhotos((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute top-1.5 right-1.5 w-7 h-7 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 active:scale-95 transition-all shadow-md"
                    aria-label={`Supprimer la photo ${index + 1}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {isEditing ? (
          <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
            Les photos ne peuvent pas être modifiées après publication.
          </div>
        ) : (
          <PhotoUploader images={photos} onImagesChange={setPhotos} maxImages={5 - existingPhotos.length} />
        )}
      </div>
    </section>
  );
};
