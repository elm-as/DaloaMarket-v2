import React, { useState, useCallback } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface RemoveBgButtonProps {
  /** The original image File to process */
  imageFile: File;
  /** Called when the background-removed image is ready */
  onResult: (processedFile: File) => void;
  /** Optional className override */
  className?: string;
}

/**
 * Button that removes the background of an image using @imgly/background-removal.
 * Runs 100% in the browser (WASM) — no server, no API cost.
 * The WASM model (~5-10MB) is loaded on first use and cached by the browser.
 */
export const RemoveBgButton: React.FC<RemoveBgButtonProps> = ({
  imageFile,
  onResult,
  className,
}) => {
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleRemoveBg = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    setProgress(0);

    try {
      // Dynamic import to avoid loading the heavy WASM bundle on page load
      const { removeBackground } = await import('@imgly/background-removal');

      toast.loading('Détourage en cours... ✨', { id: 'removebg' });

      const blob = await removeBackground(imageFile, {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            setProgress(Math.round((current / total) * 100));
          }
        },
        output: {
          format: 'image/png' as const,
        },
      });

      // Convert Blob to File
      const processedFile = new File(
        [blob],
        imageFile.name.replace(/\.[^.]+$/, '_detoure.png'),
        { type: 'image/png' }
      );

      onResult(processedFile);
      toast.success('Fond supprimé avec succès ! 🎉', { id: 'removebg' });
    } catch (err) {
      console.error('[RemoveBG] Error:', err);
      toast.error(
        'Erreur lors du détourage. Réessayez ou utilisez une photo avec un fond plus clair.',
        { id: 'removebg' }
      );
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  }, [imageFile, onResult, processing]);

  return (
    <button
      type="button"
      onClick={handleRemoveBg}
      disabled={processing}
      className={
        className ||
        'absolute bottom-1 right-1 bg-violet-600/90 hover:bg-violet-700 backdrop-blur-sm text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg flex items-center gap-0.5 shadow-xs active:scale-95 transition-all disabled:opacity-50'
      }
      title="Supprimer le fond de l'image (IA)"
    >
      {processing ? (
        <>
          <Loader2 className="w-2.5 h-2.5 animate-spin" />
          <span>{progress > 0 ? `${progress}%` : '...'}</span>
        </>
      ) : (
        <>
          <Sparkles className="w-2.5 h-2.5" />
          <span>Détourer</span>
        </>
      )}
    </button>
  );
};

export default RemoveBgButton;
