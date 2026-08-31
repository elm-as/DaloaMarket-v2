import React from 'react';
import { motion } from 'framer-motion';
import { Phone, MessageCircle, Trash2, Clock, CheckCircle2, Star, User } from 'lucide-react';
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
  const isPending = item.status === 'pending';
  const driverName = driver?.name || 'Livreur DaloaDelivery';
  const driverPhone = driver?.phone || '';
  const isAvailable = driver?.is_available ?? false;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "p-3.5 sm:p-4 rounded-2xl border transition-all shadow-2xs hover:shadow-sm",
        isPending
          ? "border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 hover:border-amber-300"
          : "border-gray-100 bg-white hover:border-orange-200"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Avatar + Driver Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative shrink-0">
            {driver?.photo_url ? (
              <img
                src={driver.photo_url}
                alt={driverName}
                className="w-11 h-11 rounded-2xl object-cover border border-gray-200"
              />
            ) : (
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                {driverName.charAt(0).toUpperCase()}
              </div>
            )}
            {!isPending && (
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                  isAvailable ? "bg-emerald-500" : "bg-gray-400"
                )}
                title={isAvailable ? "En ligne" : "Hors ligne"}
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-black text-sm text-gray-900 truncate">
                {driverName}
              </h4>
              {isPending ? (
                <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-amber-100 text-amber-900 border border-amber-300/80 flex items-center gap-1 shrink-0 animate-pulse">
                  <Clock size={10} className="text-amber-700" /> Demande envoyée
                </span>
              ) : (
                <span className="px-2.5 py-0.5 text-[10px] font-black rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                  <CheckCircle2 size={10} className="text-emerald-600" /> Partenaire actif
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
              {driverPhone ? (
                <span className="font-bold text-gray-800 tracking-tight">{driverPhone}</span>
              ) : (
                <span className="text-gray-400">Livreur inscrit</span>
              )}
              {driver?.rating !== undefined && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-amber-700 font-bold flex items-center gap-0.5 text-[11px]">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    {driver.rating ? Number(driver.rating).toFixed(1) : '5.0'}
                  </span>
                </>
              )}
              {driver?.vehicle_type && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="capitalize text-[11px] text-gray-600 font-medium">
                    {driver.vehicle_type}
                  </span>
                </>
              )}
              {!isPending && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className={cn("text-[11px] font-bold", isAvailable ? "text-emerald-600" : "text-gray-400")}>
                    {isAvailable ? "En ligne" : "Hors ligne"}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {driverPhone && !isPending && (
            <>
              <a
                href={`tel:${driverPhone}`}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 active:scale-95 transition-all flex items-center justify-center shadow-2xs"
                title="Appeler"
              >
                <Phone size={15} className="text-blue-600" />
              </a>

              <a
                href={`https://wa.me/${formatWhatsAppPhone(driverPhone)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 active:scale-95 transition-all flex items-center justify-center shadow-2xs"
                title="WhatsApp"
              >
                <MessageCircle size={15} className="text-emerald-600" />
              </a>
            </>
          )}

          <button
            type="button"
            onClick={() => onRemove(item)}
            disabled={removingId === item.id}
            className={cn(
              "px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95",
              isPending
                ? "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60"
                : "hover:bg-red-50 text-gray-400 hover:text-red-600"
            )}
            title={isPending ? "Annuler la demande" : "Retirer l'affiliation"}
          >
            {removingId === item.id ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <Trash2 size={14} className={isPending ? "text-red-600" : ""} />
                {isPending && <span className="hidden sm:inline">Annuler</span>}
              </>
            )}
          </button>
        </div>
      </div>

      {isPending && (
        <div className="mt-2.5 pt-2.5 border-t border-amber-200/80 flex items-center justify-between text-[11px] text-amber-900 font-medium">
          <span className="flex items-center gap-1.5">
            <Clock size={12} className="text-amber-700 shrink-0" />
            Le livreur doit valider votre invitation dans son application DaloaDelivery.
          </span>
          <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
            Annulable à tout moment
          </span>
        </div>
      )}
    </motion.div>
  );
};
