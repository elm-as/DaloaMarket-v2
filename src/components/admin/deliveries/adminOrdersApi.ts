import { supabase } from '../../../lib/supabase';
import type { AdminDeliveryItem } from './types';

const ADMIN_API_URL =
  import.meta.env.VITE_PAYMENT_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.daloamarket.com');

export interface AdminOrdersPayload {
  success: boolean;
  deliveries: AdminDeliveryItem[];
  photoUrls: Record<string, string>;
  kpis: {
    users: number;
    listings: number;
    orders: number;
    activeOrders: number;
    gmvTotal: number;
    recentOrders: any[];
  };
}

async function getAdminAuthHeaders(): Promise<Record<string, string> | null> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return null;
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Récupère l'intégralité des commandes, courses et acteurs via le serveur API
 * (qui dispose de service_role et contourne le filtrage RLS sur public.orders).
 */
export async function fetchAdminOrdersFromServer(): Promise<AdminOrdersPayload | null> {
  try {
    const headers = await getAdminAuthHeaders();
    if (!headers) return null;

    const response = await fetch(`${ADMIN_API_URL}/admin/orders`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) return null;

    const json = await response.json();
    if (!json?.success || !Array.isArray(json.deliveries)) return null;
    return json as AdminOrdersPayload;
  } catch {
    return null;
  }
}

/**
 * Annule une commande et sa course via le serveur API (service_role).
 */
export async function cancelAdminOrderViaServer(params: {
  orderId?: string;
  assignmentId?: string;
}): Promise<{ success: boolean; message?: string }> {
  const headers = await getAdminAuthHeaders();
  if (!headers) {
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }

  const response = await fetch(`${ADMIN_API_URL}/admin/orders/cancel`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || 'Impossible d’annuler cette commande.');
  }
  return json;
}

