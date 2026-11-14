export type AnalyticsPeriodDays = 7 | 14 | 30 | 90;

export const ANALYTICS_PERIOD_OPTIONS: { value: AnalyticsPeriodDays; label: string }[] = [
  { value: 7, label: '7j' },
  { value: 14, label: '14j' },
  { value: 30, label: '30j' },
  { value: 90, label: '90j' },
];

export interface DailyAnalyticsPoint {
  date: string;
  label: string;
  gmv: number;
  commissions: number;
  ordersCount: number;
  newUsers: number;
  newListings: number;
}

export interface BreakdownItem {
  key: string;
  label: string;
  count: number;
  amount?: number;
}

export interface AdminAnalyticsSummary {
  gmv: number;
  gmvDeltaPct: number;
  ordersCount: number;
  ordersDeltaPct: number;
  avgOrderValue: number;
  completionRatePct: number;
  cancellationRatePct: number;
  newUsersCount: number;
  newUsersDeltaPct: number;
  totalUsersCount: number;
  activeProUsers: number;
  newListingsCount: number;
  newListingsDeltaPct: number;
  activeListingsCount: number;
  verifiedDriversCount: number;
  onlineDriversCount: number;
}

export interface AdminAnalyticsFinancials {
  commissions: number;
  monetizationRevenue: number;
  totalPlatformRevenue: number;
  pendingPayoutsAmount: number;
  pendingPayoutsCount: number;
  paidPayoutsAmount: number;
}

export interface AdminAnalyticsData {
  periodDays: AnalyticsPeriodDays;
  summary: AdminAnalyticsSummary;
  financials: AdminAnalyticsFinancials;
  dailySeries: DailyAnalyticsPoint[];
  breakdowns: {
    paymentMethods: BreakdownItem[];
    deliveryModes: BreakdownItem[];
    orderStatuses: BreakdownItem[];
    topCategories: BreakdownItem[];
    topDistricts: BreakdownItem[];
  };
}
