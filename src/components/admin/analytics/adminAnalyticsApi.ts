import { supabase } from '../../../lib/supabase';
import { fetchAdminOrdersFromServer } from '../deliveries/adminOrdersApi';
import type {
  AdminAnalyticsData,
  AnalyticsPeriodDays,
  BreakdownItem,
  DailyAnalyticsPoint,
} from './adminAnalytics.types';

const ADMIN_API_URL =
  import.meta.env.VITE_PAYMENT_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : 'https://api.daloamarket.com');

const VALIDATED_STATUSES = new Set([
  'paid',
  'funded',
  'confirmed',
  'in_transit',
  'delivered',
  'completed',
]);

function computeDelta(current: number, previous: number): number {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

function buildEmptyBuckets(days: AnalyticsPeriodDays, nowMs: number) {
  const map = new Map<string, DailyAnalyticsPoint>();
  const list: DailyAnalyticsPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const iso = new Date(nowMs - offset * 86_400_000).toISOString().slice(0, 10);
    const point: DailyAnalyticsPoint = {
      date: iso,
      label: `${iso.slice(8, 10)}/${iso.slice(5, 7)}`,
      gmv: 0,
      commissions: 0,
      ordersCount: 0,
      newUsers: 0,
      newListings: 0,
    };
    map.set(iso, point);
    list.push(point);
  }
  return { map, list };
}

function groupTopCounts(rows: any[], getter: (r: any) => string): BreakdownItem[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = getter(row);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count);
}

async function buildClientFallbackAnalytics(days: AnalyticsPeriodDays): Promise<AdminAnalyticsData> {
  const nowMs = Date.now();
  const sinceMs = nowMs - days * 86_400_000;
  const compareIso = new Date(nowMs - days * 2 * 86_400_000).toISOString();
  const { map, list } = buildEmptyBuckets(days, nowMs);

  const [serverPayload, usersRes, listingsRes, payoutsRes] = await Promise.all([
    fetchAdminOrdersFromServer(),
    supabase.from('users').select('id, created_at, district, pro_until').is('deleted_at', null).limit(3000),
    supabase.from('listings').select('id, category, status, created_at').neq('status', 'deleted').limit(3000),
    supabase.from('payouts').select('amount, status').limit(1500),
  ]);

  const rawOrders = (serverPayload?.deliveries || [])
    .map((d: any) => d.order || d)
    .filter((o: any, i: number, arr: any[]) => o?.id && arr.findIndex((x: any) => x?.id === o.id) === i);

  const currOrders = rawOrders.filter((o: any) => new Date(o.created_at).getTime() >= sinceMs);
  const prevOrders = rawOrders.filter((o: any) => o.created_at >= compareIso && new Date(o.created_at).getTime() < sinceMs);

  for (const o of currOrders) {
    const bucket = map.get(String(o.created_at || '').slice(0, 10));
    if (!bucket) continue;
    bucket.ordersCount += 1;
    if (VALIDATED_STATUSES.has(o.status)) {
      bucket.gmv += Number(o.total_amount) || 0;
      bucket.commissions += Number(o.platform_commission) || 0;
    }
  }

  const users = usersRes.data || [];
  let newUsersCurr = 0;
  let newUsersPrev = 0;
  for (const u of users) {
    const ts = new Date(u.created_at).getTime();
    if (ts >= sinceMs) {
      newUsersCurr += 1;
      const b = map.get(String(u.created_at || '').slice(0, 10));
      if (b) b.newUsers += 1;
    } else if (u.created_at >= compareIso) {
      newUsersPrev += 1;
    }
  }

  const listings = listingsRes.data || [];
  let newListingsCurr = 0;
  let newListingsPrev = 0;
  for (const l of listings) {
    const ts = new Date(l.created_at).getTime();
    if (ts >= sinceMs) {
      newListingsCurr += 1;
      const b = map.get(String(l.created_at || '').slice(0, 10));
      if (b) b.newListings += 1;
    } else if (l.created_at >= compareIso) {
      newListingsPrev += 1;
    }
  }

  const validCurr = currOrders.filter((o: any) => VALIDATED_STATUSES.has(o.status));
  const validPrev = prevOrders.filter((o: any) => VALIDATED_STATUSES.has(o.status));
  const gmv = validCurr.reduce((s: number, o: any) => s + (Number(o.total_amount) || 0), 0);
  const gmvPrev = validPrev.reduce((s: number, o: any) => s + (Number(o.total_amount) || 0), 0);
  const payouts = payoutsRes.data || [];

  const paymentLabels: Record<string, string> = {
    online: 'Mobile Money en ligne',
    cod: 'Paiement à la livraison (COD)',
    cash_at_shop: 'Retrait en boutique (Espèces)',
  };

  return {
    periodDays: days,
    summary: {
      gmv,
      gmvDeltaPct: computeDelta(gmv, gmvPrev),
      ordersCount: currOrders.length,
      ordersDeltaPct: computeDelta(currOrders.length, prevOrders.length),
      avgOrderValue: validCurr.length ? Math.round(gmv / validCurr.length) : 0,
      completionRatePct: currOrders.length
        ? Math.round((currOrders.filter((o: any) => o.status === 'delivered' || o.status === 'completed').length / currOrders.length) * 100)
        : 0,
      cancellationRatePct: currOrders.length
        ? Math.round((currOrders.filter((o: any) => o.status === 'cancelled').length / currOrders.length) * 100)
        : 0,
      newUsersCount: newUsersCurr,
      newUsersDeltaPct: computeDelta(newUsersCurr, newUsersPrev),
      totalUsersCount: serverPayload?.kpis.users ?? users.length,
      activeProUsers: users.filter((u: any) => u.pro_until && new Date(u.pro_until).getTime() > nowMs).length,
      newListingsCount: newListingsCurr,
      newListingsDeltaPct: computeDelta(newListingsCurr, newListingsPrev),
      activeListingsCount: serverPayload?.kpis.listings ?? listings.filter((l: any) => l.status === 'active').length,
      verifiedDriversCount: 0,
      onlineDriversCount: 0,
    },
    financials: {
      commissions: validCurr.reduce((s: number, o: any) => s + (Number(o.platform_commission) || 0), 0),
      monetizationRevenue: 0,
      totalPlatformRevenue: validCurr.reduce((s: number, o: any) => s + (Number(o.platform_commission) || 0), 0),
      pendingPayoutsAmount: payouts
        .filter((p: any) => p.status === 'pending' || p.status === 'processing')
        .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0),
      pendingPayoutsCount: payouts.filter((p: any) => p.status === 'pending' || p.status === 'processing').length,
      paidPayoutsAmount: payouts
        .filter((p: any) => p.status === 'paid' || p.status === 'completed')
        .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0),
    },
    dailySeries: list,
    breakdowns: {
      paymentMethods: groupTopCounts(currOrders, (o) => {
        const m = String(o.payment_method || 'online').toLowerCase();
        return m === 'cash_at_shop' ? 'cash_at_shop' : m === 'cod' || m === 'cash' ? 'cod' : 'online';
      }).map((r) => ({ ...r, label: paymentLabels[r.key] || r.key })),
      deliveryModes: [
        { key: 'delivery', label: 'Livraison à domicile', count: currOrders.filter((o: any) => o.delivery_mode === 'delivery').length },
        { key: 'pickup_point', label: 'Retrait en boutique', count: currOrders.filter((o: any) => o.delivery_mode !== 'delivery').length },
      ],
      orderStatuses: groupTopCounts(currOrders, (o) => o.status),
      topCategories: groupTopCounts(listings.filter((l: any) => l.status === 'active'), (l) => String(l.category || '').trim()).slice(0, 6),
      topDistricts: groupTopCounts(users, (u) => String(u.district || '').trim()).slice(0, 6),
    },
  };
}

/**
 * Récupère les indicateurs analytiques du tableau de bord admin sur `days` jours,
 * avec repli local si l'API serveur n'est pas joignable.
 */
export async function fetchAdminAnalytics(days: AnalyticsPeriodDays): Promise<AdminAnalyticsData> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      const response = await fetch(`${ADMIN_API_URL}/admin/analytics?days=${days}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const json = await response.json();
        if (json?.success && json.analytics) {
          return json.analytics as AdminAnalyticsData;
        }
      }
    }
  } catch (err: any) {
    console.warn('[adminAnalyticsApi] Route serveur indisponible, repli client:', err?.message);
  }

  return buildClientFallbackAnalytics(days);
}
