import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Flag,
  FileText,
  Users,
  Truck,
  ShieldAlert,
  Banknote,
  MessageSquare,
  Lightbulb,
  Award,
  Bell,
  Rocket,
  CreditCard,
  Wrench,
  Image as ImageIcon,
  ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { ErrorState } from '../components/ui/ErrorState';
import { cn } from '../lib/utils';
import { useAdminPendingCounts } from '../hooks/useAdminPendingCounts';

import { AdminKpisTab } from '../components/admin/AdminKpisTab';
import { AdminReportsTab } from '../components/admin/AdminReportsTab';
import { AdminListingsTab } from '../components/admin/AdminListingsTab';
import { AdminUsersPage } from '../components/admin/AdminUsersPage';
import { AdminDeliveriesTab } from '../components/admin/AdminDeliveriesTab';
import { AdminDisputesTab } from '../components/admin/AdminDisputesTab';
import { AdminPayoutsTab } from '../components/admin/AdminPayoutsTab';
import { AdminFeedbacksTab } from '../components/admin/AdminFeedbacksTab';
import { AdminFeaturesTab } from '../components/admin/AdminFeaturesTab';
import { AdminAmbassadorsTab } from '../components/admin/AdminAmbassadorsTab';
import { AdminNotificationsTab } from '../components/admin/AdminNotificationsTab';
import { AdminBannersTab } from '../components/admin/AdminBannersTab';
import { AdminMonetisationSettings } from '../components/admin/config/AdminMonetisationSettings';
import { AdminPaymentSettings } from '../components/admin/config/AdminPaymentSettings';
import { AdminMaintenanceSettings } from '../components/admin/config/AdminMaintenanceSettings';

interface AdminPage {
  key: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  paths: string[];
  adminOnly?: boolean;
  quickMobile?: boolean;
  render: () => React.ReactNode;
}

const GROUPS: { label: string; pages: AdminPage[] }[] = [
  {
    label: 'Pilotage',
    pages: [
      {
        key: 'kpis',
        label: 'Tableau de bord',
        shortLabel: 'Aperçu',
        icon: LayoutDashboard,
        paths: ['/admin', '/admin/kpis'],
        adminOnly: true,
        quickMobile: true,
        render: () => <AdminKpisTab />,
      },
      {
        key: 'livraisons',
        label: 'Commandes & Livraisons',
        shortLabel: 'Commandes',
        icon: Truck,
        paths: ['/admin/livraisons'],
        quickMobile: true,
        render: () => <AdminDeliveriesTab />,
      },
      {
        key: 'notifications',
        label: 'Notifications Push',
        shortLabel: 'Notifs',
        icon: Bell,
        paths: ['/admin/notifications'],
        quickMobile: true,
        render: () => <AdminNotificationsTab />,
      },
      {
        key: 'bannieres',
        label: 'Affiches & Carrousel',
        shortLabel: 'Carrousel',
        icon: ImageIcon,
        paths: ['/admin/bannieres', '/admin/banners'],
        adminOnly: true,
        render: () => <AdminBannersTab />,
      },
    ],
  },
  {
    label: 'Arbitrage & Finances',
    pages: [
      {
        key: 'litiges',
        label: 'Litiges',
        icon: ShieldAlert,
        paths: ['/admin/litiges'],
        quickMobile: true,
        render: () => <AdminDisputesTab />,
      },
      {
        key: 'versements',
        label: 'Versements',
        icon: Banknote,
        paths: ['/admin/versements', '/admin/payouts'],
        adminOnly: true,
        quickMobile: true,
        render: () => <AdminPayoutsTab />,
      },
    ],
  },
  {
    label: 'Modération',
    pages: [
      { key: 'reports', label: 'Signalements', icon: Flag, paths: ['/admin/reports'], render: () => <AdminReportsTab /> },
      { key: 'annonces', label: 'Annonces', icon: FileText, paths: ['/admin/listings'], render: () => <AdminListingsTab /> },
      { key: 'utilisateurs', label: 'Utilisateurs', icon: Users, paths: ['/admin/users'], adminOnly: true, render: () => <AdminUsersPage /> },
    ],
  },
  {
    label: 'Communauté',
    pages: [
      { key: 'feedbacks', label: 'Avis clients', icon: MessageSquare, paths: ['/admin/feedbacks'], render: () => <AdminFeedbacksTab /> },
      { key: 'features', label: 'Boîte à idées', icon: Lightbulb, paths: ['/admin/features'], render: () => <AdminFeaturesTab /> },
      { key: 'ambassadeurs', label: 'Ambassadeurs', icon: Award, paths: ['/admin/ambassadeurs'], adminOnly: true, render: () => <AdminAmbassadorsTab /> },
    ],
  },
  {
    label: 'Configuration',
    pages: [
      { key: 'monetisation', label: 'Monétisation', icon: Rocket, paths: ['/admin/monetisation', '/admin/settings'], adminOnly: true, render: () => <AdminMonetisationSettings /> },
      { key: 'paiements', label: 'Paiements', icon: CreditCard, paths: ['/admin/paiements'], adminOnly: true, render: () => <AdminPaymentSettings /> },
      { key: 'maintenance', label: 'Maintenance', icon: Wrench, paths: ['/admin/maintenance'], adminOnly: true, render: () => <AdminMaintenanceSettings /> },
    ],
  },
];

export default function AdminDashboardPage() {
  usePageTitle('Console Administration');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, isAdmin } = useSupabase();
  const { byTab, total: totalPending } = useAdminPendingCounts(Boolean(isAdmin));

  const role = String(userProfile?.role || '').toLowerCase();
  const isFullAdmin = role === 'admin' || role === 'superadmin';

  const groups = GROUPS.map((g) => ({
    ...g,
    pages: g.pages.filter((p) => !p.adminOnly || isFullAdmin),
  })).filter((g) => g.pages.length > 0);
  const pages = groups.flatMap((g) => g.pages);

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <ErrorState message="Accès réservé à l'administration" />
      </div>
    );
  }

  const current = pages.find((p) => p.paths.includes(location.pathname)) || pages[0];
  const quickPages = pages.filter((p) => p.quickMobile);
  const go = (page: AdminPage) => navigate(page.paths[0]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] pb-20 text-stone-900">
      {/* Bandeau supérieur sobre */}
      <header className="sticky top-0 z-30 border-b border-stone-200/90 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 lg:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="h-2 w-2 rounded-full bg-[var(--color-primary)] shrink-0" />
            <span className="text-xs font-bold tracking-tight text-stone-900">DALOAMARKET ADMIN</span>
            <span className="text-stone-300">/</span>
            <span className="truncate text-xs font-medium text-stone-600">{current?.label}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {totalPending > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200/70 px-2 py-0.5 text-xs font-medium text-amber-800 tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {totalPending} en attente
              </span>
            )}
            <Link
              to="/"
              className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Boutique <ArrowUpRight size={13} className="text-stone-400" />
            </Link>
          </div>
        </div>

        {/* Navigation rapide Mobile */}
        <div className="border-t border-stone-100 bg-stone-50/70 px-4 py-2 lg:hidden">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {quickPages.map((p) => {
              const active = current?.key === p.key;
              const Icon = p.icon;
              const n = byTab[p.key] || 0;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => go(p)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'bg-stone-900 text-white'
                      : 'bg-white text-stone-600 border border-stone-200/80 hover:bg-stone-100'
                  )}
                >
                  <Icon size={13} />
                  <span>{p.shortLabel || p.label}</span>
                  {n > 0 && (
                    <span className={cn(
                      'rounded-full px-1.5 text-[10px] font-bold tabular-nums',
                      active ? 'bg-red-500 text-white' : 'bg-red-100 text-red-700'
                    )}>
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
            <select
              aria-label="Toutes les rubriques d'administration"
              value={current?.key}
              onChange={(e) => {
                const page = pages.find((p) => p.key === e.target.value);
                if (page) go(page);
              }}
              className="ml-auto h-7 shrink-0 rounded-lg border border-stone-200 bg-white px-2 text-xs font-medium text-stone-700 outline-none"
            >
              {groups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.pages.map((p) => {
                    const n = byTab[p.key] || 0;
                    return (
                      <option key={p.key} value={p.key}>
                        {n > 0 ? `${p.label} (${n})` : p.label}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="mx-auto mt-6 max-w-7xl px-4 lg:flex lg:items-start lg:gap-7 lg:px-6">
        {/* Barre latérale Bureau */}
        <nav
          aria-label="Navigation administration"
          className="sticky top-16 hidden w-56 shrink-0 space-y-4 rounded-xl border border-stone-200/90 bg-white p-3 shadow-2xs lg:block"
        >
          {groups.map((g, idx) => (
            <div key={g.label} className={cn(idx > 0 && 'border-t border-stone-100 pt-3')}>
              <p className="px-2.5 pb-1.5 text-[11px] font-semibold text-stone-400">{g.label}</p>
              <div className="space-y-0.5">
                {g.pages.map((p) => {
                  const active = current?.key === p.key;
                  const Icon = p.icon;
                  const n = byTab[p.key] || 0;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => go(p)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors',
                        active
                          ? 'bg-stone-900 font-semibold text-white'
                          : 'font-medium text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                      )}
                    >
                      <Icon size={15} className={active ? 'text-[var(--color-primary)]' : 'text-stone-400'} />
                      <span className="flex-1 truncate">{p.label}</span>
                      {n > 0 && (
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.2 text-[10px] font-semibold tabular-nums',
                            active ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700'
                          )}
                          aria-label={`${n} en attente`}
                        >
                          {n}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <main className="min-w-0 flex-1">{current?.render()}</main>
      </div>
    </div>
  );
}
