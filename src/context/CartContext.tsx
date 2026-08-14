import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSupabase } from "../hooks/useSupabase";

export interface CartItem {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_price: number;
  listing_photo: string;
  quantity: number;
  cart_id: string;
  variant_id?: string;
  variant_label?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (
    listingId: string,
    listingTitle: string,
    listingPrice: number,
    listingPhoto: string,
    maxQty: number,
    qty?: number,
    variant?: { id: string; label: string }
  ) => Promise<void>;
  removeFromCart: (cartItemId: string) => Promise<void>;
  updateQuantity: (cartItemId: string, qty: number, maxQty?: number) => Promise<void>;
  clearCart: () => Promise<void>;
  itemCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "daloa_market_cart";
const MAX_QUANTITY = 99;

function loadLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as CartItem[];
    }
  } catch {}
  return [];
}

function saveLocalCart(items: CartItem[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useSupabase();
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [items, setItems] = useState<CartItem[]>(loadLocalCart);

  useEffect(() => {
    saveLocalCart(items);
  }, [items]);

  const addToCart = useCallback(
    async (
      listingId: string,
      listingTitle: string,
      listingPrice: number,
      listingPhoto: string,
      maxQty: number,
      qty: number = 1,
      variant?: { id: string; label: string }
    ) => {
      if (!userRef.current) {
        throw new Error("Veuillez vous connecter pour ajouter des articles au panier");
      }
      setItems((prev) => {
        const existingIndex = prev.findIndex(
          (item) => item.listing_id === listingId && (item.variant_id || null) === (variant?.id || null)
        );
        const safeQty = Math.max(1, Math.min(qty, MAX_QUANTITY));
        const effectiveMax = Math.min(Math.max(0, maxQty ?? 0), MAX_QUANTITY);

        if (effectiveMax <= 0) return prev;

        if (existingIndex >= 0) {
          const existing = prev[existingIndex];
          const newQty = Math.min(existing.quantity + safeQty, effectiveMax);
          if (newQty === existing.quantity) return prev;
          const updated = [...prev];
          updated[existingIndex] = { ...existing, quantity: newQty };
          return updated;
        }

        const newItem: CartItem = {
          id: `local_${Date.now()}_${listingId}_${variant?.id || 'base'}`,
          listing_id: listingId,
          listing_title: listingTitle,
          listing_price: listingPrice,
          listing_photo: listingPhoto,
          quantity: Math.min(safeQty, effectiveMax),
          cart_id: "local",
          ...(variant ? { variant_id: variant.id, variant_label: variant.label } : {}),
        };
        return [...prev, newItem];
      });
    },
    []
  );

  const removeFromCart = useCallback(async (cartItemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== cartItemId));
  }, []);

  const updateQuantity = useCallback(async (cartItemId: string, qty: number, maxQty?: number) => {
    const effectiveMax = Math.min(Math.max(1, maxQty ?? MAX_QUANTITY), MAX_QUANTITY);
    const cappedQty = Math.max(1, Math.min(qty, effectiveMax));
    setItems((prev) =>
      prev.map((item) =>
        item.id === cartItemId ? { ...item, quantity: cappedQty } : item
      )
    );
  }, []);

  const clearCart = useCallback(async () => {
    setItems([]);
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const cartTotal = useMemo(
    () => items.reduce((sum, item) => sum + item.listing_price * item.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextType>(
    () => ({
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      itemCount,
      cartTotal,
    }),
    [items, addToCart, removeFromCart, updateQuantity, clearCart, itemCount, cartTotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export default CartContext;
