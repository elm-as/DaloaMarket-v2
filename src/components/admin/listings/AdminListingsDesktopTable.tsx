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
import { AdminScrollTableContainer } from '../ui/AdminUI';
import type { AdminListing } from './adminListings.types';

interface AdminListingsTableProps {
  listings: AdminListing[];
  onShare: (listing: AdminListing) => void;
  onToggleBoost: (id: string, isBoosted: boolean) => void;
  onUpdateStatus: (id: string, status: 'active' | 'sold' | 'deleted') => void;
  onDeletePermanent: (id: string, title: string) => void;
}

export const AdminListingsDesktopTable: React.FC<AdminListingsTableProps> = ({
  listings,
  onShare,
  onToggleBoost,
  onUpdateStatus,
  onDeletePermanent,
}) => (
  <AdminScrollTableContainer label="Catalogue des annonces" className="hidden lg:block shadow-sm">
    <table className="w-full border-collapse text-left text-xs">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50/80 text-[11px] font-semibold text-gray-400">
          <th className="p-3.5 pl-5">Article</th>
          <th className="p-3.5">Prix & Stock</th>
          <th className="p-3.5">Vendeur & Contact</th>
          <th className="p-3.5">Statut</th>
          <th className="p-3.5">Boost</th>
          <th className="p-3.5">Date</th>
          <th className="p-3.5 pr-5 text-right">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
        {listings.map((l) => {
          const isBoosted = Boolean(l.boosted_until && new Date(l.boosted_until) > new Date());
          const listingPath = getListingPath(l.id);
          const thumbnail = l.photos?.[0] || '/logo.png';
          const sellerPhone = l.contact_phone || l.user?.phone;
          const waPhone = formatWhatsAppPhone(sellerPhone);

          return (
            <tr key={l.id} className="group transition-colors hover:bg-orange-50/30">
              <td className="p-3.5 pl-5">
                <div className="flex max-w-[320px] min-w-[240px] items-center gap-3">
                  <a
                    href={listingPath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/img relative block h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-gray-200/60 bg-gray-100 shadow-2xs"
                  >
                    <img
                      src={thumbnail}
                      alt={l.title}
                      className="h-full w-full object-cover transition-transform group-hover/img:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/logo.png';
                      }}
                    />
                    {l.photos?.length > 1 && (
                      <span className="absolute right-0.5 bottom-0.5 rounded-md bg-black/70 px-1 text-[9px] font-semibold text-white">
                        +{l.photos.length - 1}
                      </span>
                    )}
                  </a>
                  <div className="min-w-0 flex-1">
                    <a
                      href={listingPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group-hover:underline flex items-center gap-1 truncate text-sm font-semibold text-gray-900 hover:text-orange-600"
                      title={l.title}
                    >
                      <span className="truncate">{l.title}</span>
                      <ExternalLink size={12} className="shrink-0 text-orange-500 opacity-0 group-hover:opacity-100" />
                    </a>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-0.5 font-bold text-gray-600">
                        <Tag size={10} className="text-gray-400" />
                        {l.category}
                      </span>
                      {l.district && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5 truncate">
                            <MapPin size={10} className="text-gray-400" />
                            {l.district}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td className="p-3.5 whitespace-nowrap tabular-nums">
                <div className="text-sm font-semibold text-gray-900">{formatPrice(l.price)}</div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                  <span className="font-bold">Stock :</span>
                  <span className={l.stock > 0 ? 'font-semibold text-emerald-600' : 'font-bold text-red-500'}>
                    {l.stock > 0 ? l.stock : 'Épuisé'}
                  </span>
                </div>
              </td>
              <td className="p-3.5">
                <div className="min-w-[150px]">
                  <div className="truncate text-xs font-bold text-gray-900">
                    {l.user?.shop_name || l.user?.full_name || 'Utilisateur'}
                  </div>
                  {sellerPhone && (
                    <div className="mt-1 flex items-center gap-1.5">
                      <a
                        href={`tel:${sellerPhone}`}
                        className="flex items-center gap-0.5 text-[11px] text-gray-500 hover:text-gray-800"
                        title="Appeler"
                      >
                        <Phone size={10} />
                        <span className="tabular-nums">{sellerPhone}</span>
                      </a>
                      {waPhone && (
                        <a
                          href={`https://wa.me/${waPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-md bg-emerald-50 p-1 text-emerald-600 hover:bg-emerald-100"
                          title="WhatsApp"
                        >
                          <WhatsAppIcon size={12} />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </td>
              <td className="p-3.5 whitespace-nowrap">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[10px] font-semibold',
                    l.status === 'sold'
                      ? 'border-red-200/60 bg-red-50 text-red-700'
                      : l.status === 'deleted'
                      ? 'border-gray-200/60 bg-gray-100 text-gray-600'
                      : 'border-emerald-200/60 bg-emerald-50 text-emerald-700',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      l.status === 'sold' ? 'bg-red-500' : l.status === 'deleted' ? 'bg-gray-400' : 'bg-emerald-500',
                    )}
                  />
                  {l.status === 'sold' ? 'Vendu' : l.status === 'deleted' ? 'Supprimé' : 'Actif'}
                </span>
              </td>
              <td className="p-3.5 whitespace-nowrap">
                {isBoosted ? (
                  <div className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                    <Sparkles size={12} className="text-amber-500" />
                    <span>Boosté</span>
                  </div>
                ) : (
                  <span className="text-[11px] font-semibold text-gray-400">Standard</span>
                )}
              </td>
              <td className="p-3.5 whitespace-nowrap text-[11px] text-gray-500 tabular-nums">
                {formatDate(l.created_at)}
              </td>
              <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1">
                  {l.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => onShare(l)}
                      className="flex items-center gap-1 rounded-xl bg-emerald-50 p-2 text-[11px] font-bold text-emerald-700 transition-all hover:bg-emerald-100"
                      title="Diffuser sur la chaîne WhatsApp"
                    >
                      <WhatsAppIcon size={14} className="h-3.5 w-3.5" />
                      <span className="hidden xl:inline">Chaîne</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onToggleBoost(l.id, isBoosted)}
                    className={cn(
                      'rounded-xl p-2 text-xs font-bold transition-all',
                      isBoosted ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-amber-50 hover:text-amber-600',
                    )}
                    title={isBoosted ? 'Retirer le boost' : 'Booster pour 7 jours'}
                  >
                    <Sparkles size={14} />
                  </button>
                  {l.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(l.id, 'sold')}
                      className="rounded-xl bg-gray-100 p-2 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600"
                      title="Marquer comme vendue"
                    >
                      <CheckCircle size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(l.id, 'active')}
                      className="rounded-xl bg-gray-100 p-2 text-gray-600 hover:bg-emerald-50 hover:text-emerald-600"
                      title="Réactiver l'annonce"
                    >
                      <RotateCcw size={14} />
                    </button>
                  )}
                  {l.status !== 'deleted' ? (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(l.id, 'deleted')}
                      className="rounded-xl bg-gray-100 p-2 text-gray-600 hover:bg-red-50 hover:text-red-600"
                      title="Mettre à la corbeille"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onDeletePermanent(l.id, l.title)}
                      className="rounded-xl bg-red-100 p-2 text-red-700 hover:bg-red-200"
                      title="Supprimer définitivement"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </AdminScrollTableContainer>
);
