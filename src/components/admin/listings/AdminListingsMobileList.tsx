import React from 'react';
import {
  CheckCircle,
  Trash2,
  ExternalLink,
  Sparkles,
  RotateCcw,
  Tag,
  MapPin,
  Phone,
} from 'lucide-react';
import WhatsAppIcon from '../../ui/WhatsAppIcon';
import { cn, formatPrice, formatDate, getListingPath, formatWhatsAppPhone } from '../../../lib/utils';
import type { AdminListing } from './adminListings.types';

interface AdminListingsMobileListProps {
  listings: AdminListing[];
  onShare: (listing: AdminListing) => void;
  onToggleBoost: (id: string, isBoosted: boolean) => void;
  onUpdateStatus: (id: string, status: 'active' | 'sold' | 'deleted') => void;
  onDeletePermanent: (id: string, title: string) => void;
}

export const AdminListingsMobileList: React.FC<AdminListingsMobileListProps> = ({
  listings,
  onShare,
  onToggleBoost,
  onUpdateStatus,
  onDeletePermanent,
}) => (
  <ul className="space-y-3 lg:hidden">
    {listings.map((l) => {
      const isBoosted = Boolean(l.boosted_until && new Date(l.boosted_until) > new Date());
      const listingPath = getListingPath(l.id);
      const thumbnail = l.photos?.[0] || '/logo.png';
      const sellerPhone = l.contact_phone || l.user?.phone;
      const waPhone = formatWhatsAppPhone(sellerPhone);

      return (
        <li key={l.id} className="rounded-2xl border border-gray-200/80 bg-white p-3.5 shadow-2xs">
          <div className="flex items-start gap-3">
            <a
              href={listingPath}
              target="_blank"
              rel="noopener noreferrer"
              className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100"
            >
              <img
                src={thumbnail}
                alt={l.title}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </a>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <a
                  href={listingPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-orange-600"
                >
                  {l.title} <ExternalLink size={12} className="inline text-gray-400" />
                </a>
                <span
                  className={cn(
                    'shrink-0 rounded-lg border px-2 py-0.5 text-[10px] font-semibold',
                    l.status === 'sold'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : l.status === 'deleted'
                      ? 'border-gray-200 bg-gray-100 text-gray-600'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                  )}
                >
                  {l.status === 'sold' ? 'Vendu' : l.status === 'deleted' ? 'Supprimé' : 'Actif'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs tabular-nums">
                <span className="font-bold text-gray-900">{formatPrice(l.price)}</span>
                <span className={l.stock > 0 ? 'text-emerald-600' : 'font-semibold text-red-600'}>
                  Stock : {l.stock > 0 ? l.stock : 'Épuisé'}
                </span>
                {isBoosted && (
                  <span className="inline-flex items-center gap-0.5 font-semibold text-amber-700">
                    <Sparkles size={11} /> Boosté
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-gray-500">
                <span className="inline-flex items-center gap-1"><Tag size={10} />{l.category}</span>
                {l.district && <span className="inline-flex items-center gap-1"><MapPin size={10} />{l.district}</span>}
                <span className="tabular-nums">{formatDate(l.created_at)}</span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2.5 text-xs">
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-800">
                {l.user?.shop_name || l.user?.full_name || 'Utilisateur'}
              </p>
              {sellerPhone && (
                <div className="flex items-center gap-2 text-[11px] text-gray-500 tabular-nums">
                  <a href={`tel:${sellerPhone}`} className="inline-flex items-center gap-1 hover:text-gray-800">
                    <Phone size={10} /> {sellerPhone}
                  </a>
                  {waPhone && (
                    <a
                      href={`https://wa.me/${waPhone}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:underline"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {l.status === 'active' && (
                <button
                  type="button"
                  onClick={() => onShare(l)}
                  className="inline-flex min-h-[38px] items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700"
                >
                  <WhatsAppIcon size={13} /> Chaîne
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggleBoost(l.id, isBoosted)}
                aria-label={isBoosted ? 'Retirer le boost' : 'Booster 7 jours'}
                className={cn(
                  'inline-flex min-h-[38px] items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-semibold',
                  isBoosted ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700',
                )}
              >
                <Sparkles size={13} /> {isBoosted ? 'Boosté' : 'Boost'}
              </button>
              {l.status === 'active' ? (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(l.id, 'sold')}
                  aria-label="Marquer comme vendue"
                  className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-gray-100 text-gray-700"
                >
                  <CheckCircle size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(l.id, 'active')}
                  aria-label="Réactiver l'annonce"
                  className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-gray-100 text-gray-700"
                >
                  <RotateCcw size={15} />
                </button>
              )}
              {l.status !== 'deleted' ? (
                <button
                  type="button"
                  onClick={() => onUpdateStatus(l.id, 'deleted')}
                  aria-label="Supprimer"
                  className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-gray-100 text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onDeletePermanent(l.id, l.title)}
                  aria-label="Supprimer définitivement"
                  className="inline-flex min-h-[38px] min-w-[38px] items-center justify-center rounded-xl bg-red-100 text-red-700"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        </li>
      );
    })}
  </ul>
);
