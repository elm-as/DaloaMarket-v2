import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Store } from 'lucide-react';

import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/utils';
import { AccountTab } from '../components/settings/AccountTab';
import { ShopTab } from '../components/settings/ShopTab';

type TabId = 'compte' | 'boutique';

const getSettingsTabFromParam = (param: string | null): TabId => {
  if (!param) return 'compte';
  const clean = param.toLowerCase();
  if (clean === 'boutique' || clean === 'shop' || clean === 'vitrine' || clean === 'magasin') return 'boutique';
  return 'compte';
};

const SettingsPage: React.FC = () => {
  usePageTitle('Paramètres');
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<TabId>(() => getSettingsTabFromParam(searchParams.get('tab')));

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(getSettingsTabFromParam(tabParam));
    }
  }, [searchParams]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'compte', label: 'Mon compte', icon: <User className="w-4 h-4" /> },
    { id: 'boutique', label: 'Ma boutique', icon: <Store className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full max-w-2xl lg:max-w-4xl mx-auto pb-32 bg-gray-50/70 min-h-screen">
      {/* ── Header ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 to-amber-600 px-4 pt-5 pb-14 flex items-center gap-3 rounded-b-[32px] shadow-lg">
        <div className="absolute -top-12 -right-10 w-36 h-36 rounded-full bg-white/10" />
        <div className="absolute -bottom-12 -left-8 w-28 h-28 rounded-full bg-white/10" />
        <button
          onClick={() => navigate(-1)}
          className="relative z-10 w-10 h-10 flex items-center justify-center rounded-2xl bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="relative z-10">
          <h1 className="text-xl font-extrabold tracking-tight text-white leading-tight">Paramètres</h1>
          <p className="text-xs font-medium text-orange-100">Gérez votre compte et votre boutique</p>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="relative z-10 px-4 -mt-6 pb-2">
        <div className="flex bg-white rounded-2xl p-1 gap-1 shadow-md shadow-gray-200/40 border border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95',
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-extrabold shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="px-4 space-y-5 pt-2"
        >
          {activeTab === 'compte' && <AccountTab />}
          {activeTab === 'boutique' && <ShopTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
