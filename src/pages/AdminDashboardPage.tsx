import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { AdminMonetisationSettings } from '../components/admin/config/AdminMonetisationSettings';
import { AdminPaymentSettings } from '../components/admin/config/AdminPaymentSettings';
import { AdminMaintenanceSettings } from '../components/admin/config/AdminMaintenanceSettings';

interface AdminPage {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Premier chemin = chemin canonique ; les suivants restent acceptés. */
  paths: string[];
  /** Réservé aux rôles admin et superadmin (pas aux modérateurs). */
  adminOnly?: boolean;
  render: () => React.ReactNode;
}

/**
 * Administration : pages rangées par groupe, chaque fonction à un seul endroit.
 *
 * Avant : onze onglets à plat, avec des doublons (litiges tranchés dans
 * Livraisons ET Versements, versement livreur déclenché à deux endroits,
 * resynchronisation des versements dans la Configuration ET dans Versements)
 * et une page « Configuration & Urgences » qui mélangeait monétisation,
 * maintenance, paiements et bannissements d'IP.
 */
const GROUPS: { label: string; pages: AdminPage[] }[] = [
  {
    label: 'Pilotage',
    pages: [
      { key: 'kpis', label: 'Tableau de bord', icon: LayoutDashboard, paths: ['/admin', '/admin/kpis'], adminOnly: true, render: () => <AdminKpisTab /> },
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
    label: 'Opérations',
    pages: [
      { key: 'livraisons', label: 'Livraisons', icon: Truck, paths: ['/admin/livraisons'], render: () => <AdminDeliveriesTab /> },
      { key: 'litiges', label: 'Litiges', icon: ShieldAlert, paths: ['/admin/litiges'], render: () => <AdminDisputesTab /> },
      { key: 'versements', label: 'Versements', icon: Banknote, paths: ['/admin/versements', '/admin/payouts'], adminOnly: true, render: () => <AdminPayoutsTab /> },
    ],
  },
  {
    label: 'Communauté',
    pages: [
      { key: 'feedbacks', label: 'Avis', icon: MessageSquare, paths: ['/admin/feedbacks'], render: () => <AdminFeedbacksTab /> },
      { key: 'features', label: 'Idées', icon: Lightbulb, paths: ['/admin/features'], render: () => <AdminFeaturesTab /> },
      { key: 'ambassadeurs', label: 'Ambassadeurs', icon: Award, paths: ['/admin/ambassadeurs'], adminOnly: true, render: () => <AdminAmbassadorsTab /> },
    ],
  },
  {
    label: 'Communication',
    pages: [
      { key: 'notifications', label: 'Notifications', icon: Bell, paths: ['/admin/notifications'], render: () => <AdminNotificationsTab /> },
    ],
  },
  {
    label: 'Réglages',
    pages: [
      { key: 'monetisation', label: 'Monétisation', icon: Rocket, paths: ['/admin/monetisation', '/admin/settings'], adminOnly: true, render: () => <AdminMonetisationSettings /> },
      { key: 'paiements', label: 'Paiements', icon: CreditCard, paths: ['/admin/paiements'], adminOnly: true, render: () => <AdminPaymentSettings /> },
      { key: 'maintenance', label: 'Maintenance', icon: Wrench, paths: ['/admin/maintenance'], adminOnly: true, render: () => <AdminMaintenanceSettings /> },
    ],
  },
];

export default function AdminDashboardPage() {
  usePageTitle('Administration');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, isAdmin } = useSupabase();
  const { byTab } = useAdminPendingCounts(Boolean(isAdmin));

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
        <ErrorState message="Accès non autorisé" />
      </div>
    );
  }

  const current = pages.find((p) => p.paths.includes(location.pathname)) || pages[0];
  const go = (page: AdminPage) => navigate(page.paths[0]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Navigation mobile : un sélecteur groupé */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <label className="sr-only" htmlFor="admin-page">
          Page d’administration
        </label>
        <select
          id="admin-page"
          value={current?.key}
          onChange={(e) => {
            const page = pages.find((p) => p.key === e.target.value);
            if (page) go(page);
          }}
          className="h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 outline-none"
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

      <div className="mx-auto mt-6 max-w-7xl px-4 lg:flex lg:items-start lg:gap-8 lg:px-6">
        {/* Navigation bureau : groupes */}
        <nav className="sticky top-20 hidden w-60 shrink-0 space-y-5 rounded-2xl border border-gray-200 bg-white p-3 lg:block">
          <p className="px-2 pt-1 text-sm font-semibold text-gray-900">Administration</p>
          {groups.map((g) => (
            <div key={g.label}>
              <p className="px-2 pb-1 text-xs font-medium text-gray-400">{g.label}</p>
              {g.pages.map((p) => {
                const active = current?.key === p.key;
                const Icon = p.icon;
                const n = byTab[p.key] || 0;
                return (
                  <button
                    key={p.key}
                    onClick={() => go(p)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors',
                      active
                        ? 'bg-[var(--color-primary-50)] font-medium text-[var(--color-primary-dark)]'
                        : 'text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    <Icon size={16} className={active ? 'text-[var(--color-primary)]' : 'text-gray-400'} />
                    <span className="flex-1">{p.label}</span>
                    {n > 0 && (
                      <span className="rounded-full bg-red-500 px-1.5 text-xs font-medium tabular-nums text-white" aria-label={`${n} en attente`}>
                        {n}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <main className="min-w-0 flex-1">{current?.render()}</main>
      </div>
    </div>
  );
}
