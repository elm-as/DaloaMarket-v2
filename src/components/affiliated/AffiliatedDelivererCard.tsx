import React from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageCircle, Trash2, Clock, CheckCircle2, Star } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { cn, formatWhatsAppPhone } from '../../lib/utils';
import type { AffiliatedDeliverer } from '../../services/affiliatedDeliverersService';

interface AffiliatedDelivererCardProps {
  item: AffiliatedDeliverer;
  removingId: string | null;
  onRemove: (item: AffiliatedDeliverer) => void;
}

export const AffiliatedDelivererCard: React.FC<AffiliatedDelivererCardProps> = ({
  item,
  removingId,
  onRemove,
}) => {
  const driver = item.delivery_person;
  if (!driver) return null;

  const isAvailable = driver.is_available;
  const isPending = item.status === 'pending';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-3 sm:p-3.5 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-orange-200 transition-all shadow-2xs hover:shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Avatar + Driver Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            {driver.photo_url ? (
              <img
                src={driver.photo_url}
                alt={driver.name}
                className="w-10 h-10 rounded-xl object-cover border border-gray-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                {driver.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                isAvailable ? "bg-emerald-500" : "bg-gray-400"
              )}
              title={isAvailable ? "En ligne" : "Hors ligne"}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-black text-sm text-gray-900 truncate">
                {driver.name}
              </h4>
              {isPending ? (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1 shrink-0">
                  <Clock size={10} className="text-amber-600" /> En attente
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                  <CheckCircle2 size={10} className="text-emerald-600" /> Affilié
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
              <span className="font-semibold text-gray-700">{driver.phone}</span>
              <span className="text-gray-300">•</span>
              <span className="text-amber-700 font-bold flex items-center gap-0.5 text-[11px]">
                <Star size={10} className="fill-amber-400 text-amber-400" />
                {driver.rating ? driver.rating.toFixed(1) : '5.0'}
              </span>
              <span className="text-gray-300">•</span>
              <span className="capitalize text-[11px] text-gray-600">{driver.vehicle_type || 'Moto'}</span>
              <span className="text-gray-300">•</span>
              <span className={cn("text-[11px] font-bold", isAvailable ? "text-emerald-600" : "text-gray-400")}>
                {isAvailable ? "En ligne" : "Hors ligne"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Compact Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <a
            href={`tel:${driver.phone}`}
            className="w-8.5 h-8.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 active:scale-95 transition-all flex items-center justify-center shadow-2xs"
            title="Appeler"
          >
            <Phone size={14} className="text-blue-600" />
          </a>

          <a
            href={`https://wa.me/${formatWhatsAppPhone(driver.phone)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8.5 h-8.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 active:scale-95 transition-all flex items-center justify-center shadow-2xs"
            title="WhatsApp"
          >
            <MessageCircle size={14} className="text-emerald-600" />
          </a>

          <button
            type="button"
            onClick={() => onRemove(item)}
            disabled={removingId === item.id}
            className="w-8.5 h-8.5 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600 active:scale-90 transition-all flex items-center justify-center"
            title="Retirer l'affiliation"
          >
            {removingId === item.id ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Trash2 size={14} />
            )}
          </button>
        </div>
      </div>

      {isPending && (
        <div className="mt-2.5 pt-2 border-t border-amber-100 flex items-center justify-between text-[11px] text-amber-800">
          <span>Le livreur doit accepter l'invitation dans son application.</span>
        </div>
      )}
    </motion.div>
  );
};
