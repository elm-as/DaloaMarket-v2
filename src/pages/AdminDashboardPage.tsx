import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Flag, Bell, FileText, Users, Truck, MessageSquare, Lightbulb, Sliders } from 'lucide-react';
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
import { AdminFeedbacksTab } from '../components/admin/AdminFeedbacksTab';
import { AdminFeaturesTab } from '../components/admin/AdminFeaturesTab';

const TABS = [
  { key: 'kpis', label: 'KPIs', icon: BarChart3, paths: ['/admin', '/admin/kpis'] },
  { key: 'feedbacks', label: 'Feedbacks & Avis', icon: MessageSquare, paths: ['/admin/feedbacks'] },
  { key: 'features', label: 'Idées Features', icon: Lightbulb, paths: ['/admin/features'] },
  { key: 'reports', label: 'Signalements', icon: Flag, paths: ['/admin/reports'] },
  { key: 'livraisons', label: 'Livraisons & Litiges', icon: Truck, paths: ['/admin/livraisons', '/admin/litiges'] },
  { key: 'settings', label: 'Configuration & Urgences', icon: Sliders, paths: ['/admin/settings'] },
  { key: 'notifications', label: 'Notifications', icon: Bell, paths: ['/admin/notifications'] },
  { key: 'annonces', label: 'Annonces', icon: FileText, paths: ['/admin/listings'] },
  { key: 'utilisateurs', label: 'Utilisateurs', icon: Users, paths: ['/admin/users'] },
];

export default function AdminDashboardPage() {
  usePageTitle('Administration');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, isAdmin } = useSupabase();

  const role =
    userProfile?.role?.toLowerCase() ||
    (user?.user_metadata as any)?.role?.toLowerCase() ||
    (user?.app_metadata as any)?.role?.toLowerCase() ||
    'user';
  const visibleTabs = TABS.filter((tab) => {
    if (tab.key === 'kpis' || tab.key === 'utilisateurs' || tab.key === 'settings') {
      return ['superadmin', 'admin'].includes(role);
    }
    return true;
  });

  const activeTab = visibleTabs.find((t) => t.paths.includes(location.pathname))?.key || visibleTabs[0]?.key || 'reports';

  const switchTab = (tabKey: string) => {
    if (tabKey === 'kpis') navigate('/admin/kpis');
    else if (tabKey === 'feedbacks') navigate('/admin/feedbacks');
    else if (tabKey === 'features') navigate('/admin/features');
    else if (tabKey === 'reports') navigate('/admin/reports');
    else if (tabKey === 'livraisons') navigate('/admin/livraisons');
    else if (tabKey === 'settings') navigate('/admin/settings');
    else if (tabKey === 'notifications') navigate('/admin/notifications');
    else if (tabKey === 'annonces') navigate('/admin/listings');
    else if (tabKey === 'utilisateurs') navigate('/admin/users');
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
    <div className="pb-20 min-h-screen bg-gray-50">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 px-4 py-5 text-white">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
        <div className="w-10 h-10 flex items-center justify-center bg-white shadow-sm rounded-2xl p-1.5">
          <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-100">Espace sécurisé</p>
          <h1 className="text-lg font-extrabold tracking-tight leading-tight">Administration</h1>
          <p className="text-xs text-orange-100">Modération, paiements et opérations.</p>
        </div>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="lg:hidden sticky top-0 z-20 bg-gray-50/95 px-4 py-3 backdrop-blur-md">
        <div className="rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm">
          <label className="sr-only" htmlFor="admin-module">Module d'administration</label>
          <select
            id="admin-module"
            value={currentTab}
            onChange={(event) => switchTab(event.target.value)}
            className="h-11 w-full appearance-none rounded-xl bg-gray-50 px-3 text-sm font-extrabold text-gray-900 outline-none"
          >
            {visibleTabs.map((tab) => <option key={tab.key} value={tab.key}>{tab.label}</option>)}
          </select>
        </div>
      </div>

      {/* Desktop Admin Layout: Sidebar + Main Area */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 mt-6 lg:flex lg:gap-8 lg:items-start">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 bg-white rounded-2xl p-3 border border-gray-100 shadow-sm sticky top-20 gap-1">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">Module Admin</p>
          {visibleTabs.map((tab) => {
            const isActive = currentTab === tab.key;
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => switchTab(tab.key)}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors text-left',
                  isActive
                    ? 'bg-[var(--color-primary-50)] text-[var(--color-primary)] font-bold'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <Icon size={18} className={isActive ? 'text-[var(--color-primary)]' : 'text-gray-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0">
          {currentTab === 'kpis' && <AdminKpisTab />}
          {currentTab === 'feedbacks' && <AdminFeedbacksTab />}
          {currentTab === 'features' && <AdminFeaturesTab />}
          {currentTab === 'reports' && <AdminReportsTab />}
          {currentTab === 'livraisons' && <AdminDeliveriesTab />}
          {currentTab === 'settings' && <AdminSettingsTab />}
          {currentTab === 'notifications' && <AdminNotificationsTab />}
          {currentTab === 'annonces' && <AdminListingsTab />}
          {currentTab === 'utilisateurs' && <AdminUsersTab />}
        </div>
      </div>
    </div>
  );
}
