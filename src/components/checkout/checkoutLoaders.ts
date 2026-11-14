import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { resolveSellerPoint } from '../../lib/daloaGeo';
import { affiliatedDeliverersService } from '../../services/affiliatedDeliverersService';
import type { CartItem } from '../../contexts/CartContext';
import type { ListingVariant } from '../../types/listing';
import type { CartSellerPoint, ListingData, SellerDeliverySettings } from './checkout.types';

interface CartLoaderArgs {
  cartItems: CartItem[];
  userId?: string;
  removeFromCart: (id: string) => Promise<void>;
  updateQuantity: (id: string, qty: number, max?: number) => Promise<void>;
}

export interface CartLoaderResult {
  invalidRedirect: boolean;
  sellerMap: Map<string, CartSellerPoint>;
  hasSelfItem: boolean;
  sellerSettings: SellerDeliverySettings;
  homeDeliveryDisabled: boolean;
}

export async function loadCartCheckoutState({
  cartItems,
  userId,
  removeFromCart,
  updateQuantity,
}: CartLoaderArgs): Promise<CartLoaderResult | null> {
  const listingIds = [...new Set(cartItems.map((item) => item.listing_id))];
  if (listingIds.length === 0) return null;

  const { data, error } = await supabase
    .from('listings')
    .select(
      'id, user_id, stock, status, title, variants, seller:users!listings_user_id_fkey(shop_latitude, shop_longitude, district, pro_until)'
    )
    .in('id', listingIds);

  if (error || !data) return null;

  const sellerMap = new Map<string, CartSellerPoint>();
  const dbMap = new Map<string, { stock: number; status: string; title: string; variants: ListingVariant[] }>();
  let hasSelfItem = false;

  (data as any[]).forEach((item) => {
    if (item.user_id === userId) hasSelfItem = true;
    const isPro = item.seller?.pro_until ? new Date(item.seller.pro_until) > new Date() : false;
    const point = resolveSellerPoint({
      shop_latitude: item.seller?.shop_latitude,
      shop_longitude: item.seller?.shop_longitude,
      district: item.seller?.district,
    });
    sellerMap.set(item.id, {
      sellerId: item.user_id,
      lat: point.latitude,
      lng: point.longitude,
      isPro,
    });
    dbMap.set(item.id, {
      stock: item.stock ?? 0,
      status: item.status,
      title: item.title,
      variants: Array.isArray(item.variants) ? item.variants : [],
    });
  });

  let hasInvalidItem = false;
  for (const ci of cartItems) {
    const dbListing = dbMap.get(ci.listing_id);
    const selectedVariant = dbListing?.variants.find((v) => v.id === ci.variant_id);
    const availableStock = ci.variant_id ? (selectedVariant?.stock ?? 0) : (dbListing?.stock ?? 0);
    const isInvalid =
      !dbListing ||
      dbListing.status !== 'active' ||
      availableStock <= 0 ||
      (ci.variant_id && !selectedVariant) ||
      (dbListing.variants.length > 0 && !ci.variant_id);

    if (isInvalid) {
      removeFromCart(ci.id);
      const suffix = ci.variant_label ? ` (${ci.variant_label})` : '';
      toast.error(
        `"${ci.listing_title}"${suffix} n'est plus disponible ou nécessite un choix de taille et a été retiré du panier`
      );
      hasInvalidItem = true;
    } else if (ci.quantity > availableStock) {
      updateQuantity(ci.id, availableStock, availableStock);
      const suffix = ci.variant_label ? ` (${ci.variant_label})` : '';
      toast(`Quantité de "${ci.listing_title}"${suffix} ajustée à ${availableStock}`);
      hasInvalidItem = true;
    }
  }

  if (hasInvalidItem) {
    return {
      invalidRedirect: true,
      sellerMap,
      hasSelfItem,
      sellerSettings: { home_delivery_enabled: true, cash_on_delivery_enabled: false },
      homeDeliveryDisabled: false,
    };
  }

  const uniqueSellerIds = Array.from(
    new Set((data as { user_id?: string }[]).map((item) => item.user_id).filter(Boolean))
  ) as string[];

  let sellerSettings: SellerDeliverySettings = {
    home_delivery_enabled: true,
    cash_on_delivery_enabled: false,
  };
  let homeDeliveryDisabled = false;

  if (uniqueSellerIds.length > 0) {
    const settingsList = await Promise.all(
      uniqueSellerIds.map((sid) => affiliatedDeliverersService.getSellerDeliverySettings(sid))
    );
    const allHomeDelivery = settingsList.every((s) => s.home_delivery_enabled);
    const allCashOnDelivery = settingsList.every((s) => s.cash_on_delivery_enabled);
    sellerSettings = {
      home_delivery_enabled: allHomeDelivery,
      cash_on_delivery_enabled: allCashOnDelivery,
    };
    homeDeliveryDisabled = !allHomeDelivery;
  }

  return {
    invalidRedirect: false,
    sellerMap,
    hasSelfItem,
    sellerSettings,
    homeDeliveryDisabled,
  };
}

export interface SingleListingLoaderResult {
  status: 'ok' | 'not_found' | 'redirect_listing' | 'redirect_home';
  listing?: ListingData;
  sellerSettings?: SellerDeliverySettings;
  homeDeliveryDisabled?: boolean;
}

export async function loadSingleListingCheckoutState(
  listingId: string,
  requestedVariantId?: string
): Promise<SingleListingLoaderResult> {
  const { data, error } = await supabase
    .from('listings')
    .select(
      'id, title, price, photos, user_id, category, original_price, stock, status, variants, seller:users!listings_user_id_fkey(shop_latitude, shop_longitude, district, pro_until)'
    )
    .eq('id', listingId)
    .single();

  if (error || !data) return { status: 'not_found' };

  const raw = data as any;
  const variants: ListingVariant[] = Array.isArray(raw.variants) ? raw.variants : [];
  const selectedVariant = variants.find((v) => v.id === requestedVariantId);
  if (variants.length > 0 && (!selectedVariant || selectedVariant.active === false || selectedVariant.stock <= 0)) {
    toast.error(requestedVariantId ? "Cette taille n'est plus disponible" : 'Veuillez choisir une taille');
    return { status: 'redirect_listing' };
  }

  const availableStock = selectedVariant ? selectedVariant.stock : (raw.stock ?? 0);
  if (raw.status !== 'active' || availableStock <= 0) {
    toast.error("Cette annonce n'est plus disponible");
    return { status: 'redirect_home' };
  }

  const isSellerPro = raw.seller?.pro_until ? new Date(raw.seller.pro_until) > new Date() : false;
  const listing: ListingData = {
    id: raw.id,
    title: raw.title,
    price: raw.price,
    photos: raw.photos,
    user_id: raw.user_id,
    category: raw.category ?? null,
    latitude: raw.seller?.shop_latitude ?? null,
    longitude: raw.seller?.shop_longitude ?? null,
    original_price: raw.original_price,
    seller_shop_latitude: raw.seller?.shop_latitude ?? null,
    seller_shop_longitude: raw.seller?.shop_longitude ?? null,
    seller_district: raw.seller?.district ?? null,
    is_seller_pro: isSellerPro,
    variants,
  };

  let sellerSettings: SellerDeliverySettings = {
    home_delivery_enabled: true,
    cash_on_delivery_enabled: false,
  };
  let homeDeliveryDisabled = false;

  if (raw.user_id) {
    const s = await affiliatedDeliverersService.getSellerDeliverySettings(raw.user_id);
    sellerSettings = {
      home_delivery_enabled: s.home_delivery_enabled,
      cash_on_delivery_enabled: s.cash_on_delivery_enabled,
    };
    homeDeliveryDisabled = !s.home_delivery_enabled;
  }

  return { status: 'ok', listing, sellerSettings, homeDeliveryDisabled };
}
