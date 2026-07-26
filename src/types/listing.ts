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
}
