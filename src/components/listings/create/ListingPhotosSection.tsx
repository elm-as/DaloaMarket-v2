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
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary-50)' }}>
          <Camera className="h-4 w-4" style={{ color: 'var(--color-primary)' }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-on-surface)' }}>Photos</h2>
          <p className="text-xs" style={{ color: 'var(--color-on-surface-variant)' }}>Jusqu'à 5 photos</p>
        </div>
      </div>

      <Card elevation={1} padding="md" className="rounded-2xl">
        {existingPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {existingPhotos.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group">
                <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setexistingPhotos((prev) => prev.filter((_, i) => i !== index))}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"
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
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[13px] text-amber-700">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Les photos ne peuvent pas être modifiées après publication.
          </div>
        ) : (
          <PhotoUploader images={photos} onImagesChange={setPhotos} maxImages={5 - existingPhotos.length} />
        )}
      </Card>
    </section>
  );
};
