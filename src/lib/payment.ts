/**
 * Client de paiement front-end.
 * Communique avec le serveur Railway / Netlify (via /api/* ou VITE_PAYMENT_API_URL), qui parle à l'API Money Fusion.
 *
 * Flow:
 *   1. initiatePayment()   → POST /create-payment   → renvoie une URL Money Fusion
 *   2. redirige le user vers cette URL
 *   3. au retour, PaymentReturnPage interroge checkPaymentStatus() pour confirmer
 *   4. en parallèle, Money Fusion appelle notre webhook qui met à jour la DB
 */

import { supabase } from './supabase';

const PAYMENT_API_URL =
  import.meta.env.VITE_PAYMENT_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://daloapay.onrender.com');

export type PaymentType = 'seller_badge' | 'listing_pack_10' | 'boost' | 'bump' | 'pro' | 'order' | 'credits_pack_5' | 'credits_pack_12' | 'credits_pack_30';

export interface InitiatePaymentInput {
  type: PaymentType;
  amount: number;
  customerName: string;
  customerPhone: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface InitiatePaymentResponse {
  success: boolean;
  transactionId: string;
  token: string;
  paymentUrl: string;
  message?: string;
}

export interface PaymentStatusResponse {
  success: boolean;
  status: 'pending' | 'paid' | 'failure' | 'not_paid' | 'unknown';
  transactionId?: string;
  order_id?: string;      // ← renvoyé quand le paiement est confirmé
  amount?: number;
  paymentMethod?: string;
  confirmedAt?: string | null;
  message?: string;
}

export const normalizeMoneyFusionUrl = (url?: string, token?: string, amount?: number, name?: string): string => {
  if (url) return url;
  if (token) {
    return `https://payin.moneyfusion.net/payment/${token}/${amount || ''}/${encodeURIComponent(name || 'Client')}`;
  }
  return '';
};

const getAccessToken = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Votre session a expiré. Veuillez vous reconnecter.');
  }
  return data.session.access_token;
};

const POST_JSON = async <T>(url: string, body: unknown): Promise<T> => {
  try {
    const accessToken = await getAccessToken();
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!res.ok) {
      const msg = (data as { message?: string } | null)?.message || `Erreur ${res.status}`;
      console.error('Payment API error:', { status: res.status, message: msg, url });
      throw new Error(msg);
    }
    return data as T;
  } catch (error) {
    if (error instanceof Error) {
      console.error('Payment API request failed:', { error: error.message, url });
      throw error;
    }
    throw new Error('Erreur de connexion au serveur de paiement');
  }
};

export interface CreateOrderInput {
  buyer_id: string;
  listing_id: string;
  variant_id?: string;
  quantity?: number;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_mode: 'delivery' | 'pickup_point';
  amount?: number;
}

export interface CreateOrderResponse {
  success: boolean;
  order_id?: string;      // ← n'existe PAS encore au moment de la création
  total_amount?: number;
  payment_url: string;
  token: string;
  transactionId: string;  // ← ID de l'escrow (pour check-payment)
}

export const createOrder = async (
  input: CreateOrderInput
): Promise<CreateOrderResponse> => {
  if (!PAYMENT_API_URL) {
    throw new Error("Configuration invalide: VITE_PAYMENT_API_URL non definie");
  }
  const res = await POST_JSON<CreateOrderResponse>(`${PAYMENT_API_URL}/create-payment`, {
    type: 'order',
    amount: input.amount || 0,
    customerName: '',
    customerPhone: '',
    userId: input.buyer_id,
    orderInput: input,
  });

  if (res) {
    res.payment_url = normalizeMoneyFusionUrl(res.payment_url, res.token, res.total_amount);
  }
  return res;
};

export const initiatePayment = async (
  input: InitiatePaymentInput
): Promise<InitiatePaymentResponse> => {
  if (!PAYMENT_API_URL) {
    throw new Error('Configuration invalide: VITE_PAYMENT_API_URL non définie');
  }
  const res = await POST_JSON<InitiatePaymentResponse>(`${PAYMENT_API_URL}/create-payment`, input);
  if (res) {
    res.paymentUrl = normalizeMoneyFusionUrl(res.paymentUrl, res.token, input.amount, input.customerName);
  }
  return res;
};

export const checkPaymentStatus = async (
  transactionId: string
): Promise<PaymentStatusResponse> => {
  if (!PAYMENT_API_URL) {
    throw new Error('Configuration invalide: VITE_PAYMENT_API_URL non définie');
  }
  const accessToken = await getAccessToken();
  const res = await fetch(`${PAYMENT_API_URL}/check-payment?transactionId=${encodeURIComponent(transactionId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Erreur ${res.status}`);
  }
  return res.json();
};

/**
 * Déclenche le traitement des virements en attente côté serveur.
 *
 * Appelé en « tire-et-oublie » juste après une remise validée : c'est ce qui
 * rend les virements automatiques. La route exige désormais un utilisateur
 * authentifié, donc on y joint le jeton de session.
 *
 * `?force=true` a été retiré volontairement : il court-circuite le délai
 * d'escrow et n'est plus honoré que pour l'administration. Il était de toute
 * façon inutile ici, `create_seller_payout` posant `scheduled_for = now()`,
 * donc tout virement légitime est immédiatement éligible.
 */
export const triggerPayoutProcessing = async (): Promise<void> => {
  if (!PAYMENT_API_URL) return;
  try {
    const accessToken = await getAccessToken();
    await fetch(`${PAYMENT_API_URL}/process-payouts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    // Silencieux : l'échec du déclenchement ne doit pas bloquer la remise.
    // Les virements restent en 'pending' et repartiront au prochain appel.
  }
};
