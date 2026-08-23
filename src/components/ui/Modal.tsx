import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';

type ModalVariant = 'bottom-sheet' | 'dialog';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: ModalVariant;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  variant,
  size = 'lg',
}) => {
  const isMobile = useIsMobile();
  const resolvedVariant = variant ?? (isMobile ? 'bottom-sheet' : 'dialog');

  const sizeClass = size === 'sm' ? 'max-w-sm' : size === 'md' ? 'max-w-md' : 'max-w-lg';

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex flex-col justify-end sm:justify-center">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {resolvedVariant === 'bottom-sheet' ? (
            /* Bottom Sheet (Mobile) */
            <motion.div
              className="relative z-10 w-full bg-[var(--color-surface)] rounded-t-[28px] max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl pb-[calc(20px+env(safe-area-inset-bottom,0px))]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{
                type: 'spring',
                damping: 30,
                stiffness: 300,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-gray-300" />
              </div>

              {/* Header */}
              {title && (
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                  <h2 className="text-[18px] font-extrabold text-[var(--color-on-surface)]">
                    {title}
                  </h2>
                  <button
                    onClick={onClose}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-[0.97] transition-all"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              )}

              {/* Content */}
              <div className={cn('px-5 pt-4 pb-2', !title && 'pt-4')}>
                {children}
              </div>
            </motion.div>
          ) : (
            /* Centered Dialog (Desktop) */
            <div className="relative z-10 w-full flex items-center justify-center p-4 my-auto">
              <motion.div
                className={cn(
                  'w-full',
                  sizeClass,
                  'bg-[var(--color-surface)] rounded-3xl shadow-2xl overflow-hidden flex flex-col',
                )}
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{
                  type: 'spring',
                  damping: 25,
                  stiffness: 300,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                {title && (
                  <div className="flex items-center justify-between px-6 pt-6 pb-2">
                    <h2 className="text-[18px] font-extrabold text-[var(--color-on-surface)]">
                      {title}
                    </h2>
                    <button
                      onClick={onClose}
                      className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-[0.97] transition-all"
                      aria-label="Fermer"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                )}

                {/* Content */}
                <div className={cn('px-6 py-4', !title && 'pt-6')}>
                  {children}
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
