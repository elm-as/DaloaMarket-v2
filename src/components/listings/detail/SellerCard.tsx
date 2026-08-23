import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, MessageCircle, ChevronRight, Store } from 'lucide-react';
import { formatDate, getSellerPath, getListingShareUrl, formatWhatsAppPhone } from '../../../lib/utils';
import Avatar from '../../profile/Avatar';
import WhatsAppIcon from '../../ui/WhatsAppIcon';
import type { ListingFull } from '../../../types/listing';

interface SellerCardProps {
  listing: ListingFull;
  isPro: boolean;
  currentUserId?: string;
  avgRating: number;
  reviewCount: number;
}

const SellerCard: React.FC<SellerCardProps> = ({ listing, isPro, currentUserId, avgRating, reviewCount }) => {
  const navigate = useNavigate();
  const memberSince = listing.users?.created_at ? formatDate(listing.users.created_at) : '';
  const isOwnListing = listing.user_id === currentUserId;
  const shopName = isPro && listing.users?.shop_name ? listing.users.shop_name : (listing.users?.full_name || 'Vendeur');
  const sellerPath = getSellerPath(listing.user_id, (listing.users as any)?.shop_slug);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-xl shadow-gray-200/50 border border-gray-100/90 space-y-4">
      <Link to={sellerPath} className="flex items-center gap-3.5 no-underline group">
        <div className="relative flex-shrink-0">
          <Avatar
            src={isPro && listing.users?.shop_logo_url ? listing.users.shop_logo_url : listing.users?.avatar_url}
            name={shopName}
            size="lg"
            className="ring-2 ring-orange-500/30 shadow-md"
          />
          {isPro && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 ring-2 ring-white flex items-center justify-center shadow-xs">
              <Star className="w-2.5 h-2.5 text-amber-950 fill-amber-950" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm sm:text-base text-gray-900 truncate group-hover:text-orange-600 transition-colors">
              {shopName}
            </span>
            {isPro && (
              <span className="text-[9px] font-black text-amber-800 bg-amber-50 px-2 py-0.2 rounded-full border border-amber-200">
                PRO
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs font-black text-gray-800">
              {(listing.users?.rating || avgRating || 5).toFixed(1)}
            </span>
            <span className="text-xs text-gray-400 font-semibold ml-0.5">
              ({(listing.users?.review_count || reviewCount) > 0 ? `${listing.users?.review_count || reviewCount} avis` : 'Nouveau'})
            </span>
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5">Membre depuis {memberSince || 'récemment'}</p>
        </div>

        <div className="w-8 h-8 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </div>
      </Link>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        {!isOwnListing && (
          <button
            type="button"
            className="flex-1 h-10 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-gray-200/70"
            onClick={() => {
              if (!currentUserId) {
                navigate('/login', { state: { from: `/listings/${listing.id}` } });
                return;
              }
              navigate(`/messages/${listing.id}/${listing.user_id}`);
            }}
          >
            <MessageCircle className="h-4 w-4 text-gray-500" />
            <span>Message</span>
          </button>
        )}

        {/* WhatsApp Icon Button — Compact icon-only with official SVG */}
        {!isOwnListing && listing.users?.phone && (
          <a
            href={`https://wa.me/${formatWhatsAppPhone(listing.users.phone)}?text=${encodeURIComponent(
              `Bonjour, je suis intéressé(e) par votre article "${listing.title}" sur DaloaMarket 🛒\n${getListingShareUrl(listing.id)}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 flex-shrink-0 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center active:scale-95 transition-all shadow-xs shadow-emerald-500/25"
            title="Contacter sur WhatsApp"
            aria-label="Contacter sur WhatsApp"
          >
            <WhatsAppIcon size={20} className="w-5 h-5" />
          </a>
        )}

        <Link to={sellerPath} className="flex-1">
          <button
            type="button"
            className="w-full h-10 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-600 font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-orange-200/60"
          >
            <Store className="h-4 w-4 text-orange-600" />
            <span>Visiter la vitrine</span>
          </button>
        </Link>
      </div>
    </div>
  );
};

export default SellerCard;
