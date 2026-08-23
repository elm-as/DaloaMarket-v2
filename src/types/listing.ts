export interface UserData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  rating: number | null;
  review_count?: number;
  pro_until: string | null;
  created_at: string;
  shop_name?: string | null;
  shop_logo_url?: string | null;
}

export interface ListingVariant {
  id: string;
  label: string;
  color?: string | null;
  color_code?: string | null;
  size?: string | null;
  price: number | null;
  stock: number;
  active?: boolean;
}

export function getListingStartingPrice(listingPrice: number, variants: ListingVariant[] = []): number {
  const availablePrices = variants
    .filter((variant) => variant.active !== false && variant.stock > 0)
    .map((variant) => variant.price ?? listingPrice)
    .filter((price) => Number.isFinite(price) && price > 0);

  return availablePrices.length > 0 ? Math.min(listingPrice, ...availablePrices) : listingPrice;
}

export interface ListingFull {
  id: string;
  title: string;
  description: string;
  price: number;
  photos: string[];
  created_at: string;
  district: string;
  condition: string;
  category: string;
  boosted_until: string | null;
  status: string;
  user_id: string;
  users: UserData | null;
  accepts_delivery?: boolean;
  delivery_fee_override?: number | null;
  stock: number;
  original_price?: number | null;
  variants?: ListingVariant[];
}

export interface ReviewData {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface SimilarListing {
  id: string;
  title: string;
  price: number;
  photos: string[];
  created_at: string;
  district: string;
  condition: string;
  category: string;
  boosted_until: string | null;
  seller: { name: string; avatar: string | null };
  is_favorite: boolean;
  stock: number;
  listing_user_id: string;
  original_price: number | null;
  variants?: ListingVariant[];
  similarityPercent?: number;
  matchReason?: string;
}
