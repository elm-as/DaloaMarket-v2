import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Flag, Bell, FileText, Users, Truck } from 'lucide-react';
import { useSupabase } from '../hooks/useSupabase';
import { usePageTitle } from '../hooks/usePageTitle';
import { ErrorState } from '../components/ui/ErrorState';
import { cn } from '../lib/utils';

import { AdminKpisTab } from '../components/admin/AdminKpisTab';
import { AdminReportsTab } from '../components/admin/AdminReportsTab';
import { AdminNotificationsTab } from '../components/admin/AdminNotificationsTab';
import { AdminListingsTab } from '../components/admin/AdminListingsTab';
import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { AdminDeliveriesTab } from '../components/admin/AdminDeliveriesTab';
import { AdminSettingsTab } from '../components/admin/AdminSettingsTab';
import { Sliders } from 'lucide-react';

const TABS = [
  { key: 'kpis', label: 'KPIs', icon: BarChart3, paths: ['/admin', '/admin/kpis'] },
  { key: 'reports', label: 'Signalements', icon: Flag, paths: ['/admin/reports'] },
  { key: 'livraisons', label: 'Livraisons & Litiges', icon: Truck, paths: ['/admin/livraisons', '/admin/litiges'] },
  { key: 'settings', label: 'Configuration & Urgences', icon: Sliders, paths: ['/admin/settings'] },
  { key: 'notifications', label: 'Notifications', icon: Bell, paths: ['/admin/notifications'] },
  { key: 'annonces', label: 'Annonces', icon: FileText, paths: [] },
  { key: 'utilisateurs', label: 'Utilisateurs', icon: Users, paths: [] },
];

export default function AdminDashboardPage() {
  usePageTitle('Administration');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, isAdmin } = useSupabase();

  const role = userProfile?.role?.toLowerCase() || 'user';
  const visibleTabs = TABS.filter((tab) => {
    if (tab.key === 'kpis' || tab.key === 'utilisateurs' || tab.key === 'settings') {
      return ['superadmin', 'admin'].includes(role);
    }
    return true;
  });

  const activeTab = visibleTabs.find((t) => t.paths.includes(location.pathname))?.key || visibleTabs[0]?.key || 'reports';

  const switchTab = (tabKey: string) => {
    if (tabKey === 'kpis') navigate('/admin/kpis');
    else if (tabKey === 'reports') navigate('/admin/reports');
    else if (tabKey === 'livraisons') navigate('/admin/livraisons');
    else if (tabKey === 'settings') navigate('/admin/settings');
    else if (tabKey === 'notifications') navigate('/admin/notifications');
    else navigate(`/admin`, { state: { activeTab: tabKey } });
  };

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorState message="Accès non autorisé" />
      </div>
    );
  }

  // Handle local state override for tabs without specific paths
  let currentTab = location.state?.activeTab || activeTab;
  if (!visibleTabs.some((t) => t.key === currentTab)) {
    currentTab = visibleTabs[0]?.key || 'reports';
  }

  return (
    <div className="pb-20">
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 flex items-center justify-center bg-white shadow-sm border border-gray-100 rounded-lg p-0.5">
          <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-base font-bold text-gray-900">Administration DaloaMarket</h1>
      </div>

      <div className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-outline)] overflow-x-auto">
        <div className="flex gap-1 px-2 py-2 min-w-max">
          {visibleTabs.map((tab) => {
            const isActive = currentTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-[0.97] flex-shrink-0',
                  isActive
                    ? 'bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]'
                    : 'text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-variant)]'
                )}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-6">
        {currentTab === 'kpis' && <AdminKpisTab />}
        {currentTab === 'reports' && <AdminReportsTab />}
        {currentTab === 'livraisons' && <AdminDeliveriesTab />}
        {currentTab === 'settings' && <AdminSettingsTab />}
        {currentTab === 'notifications' && <AdminNotificationsTab />}
        {currentTab === 'annonces' && <AdminListingsTab />}
        {currentTab === 'utilisateurs' && <AdminUsersTab />}
      </div>
    </div>
  );
}
