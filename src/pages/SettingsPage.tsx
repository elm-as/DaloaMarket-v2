import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, Store } from 'lucide-react';

import { usePageTitle } from '../hooks/usePageTitle';
import { cn } from '../lib/utils';
import { AccountTab } from '../components/settings/AccountTab';
import { ShopTab } from '../components/settings/ShopTab';

type TabId = 'compte' | 'boutique';

const SettingsPage: React.FC = () => {
  usePageTitle('Paramètres');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTab: TabId = searchParams.get('tab') === 'boutique' ? 'boutique' : 'compte';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'compte', label: 'Mon compte', icon: <User className="w-4 h-4" /> },
    { id: 'boutique', label: 'Ma boutique', icon: <Store className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto pb-32">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all"
          aria-label="Retour"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900 leading-tight">Paramètres</h1>
          <p className="text-xs text-gray-400">Compte &amp; Boutique</p>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex bg-gray-100 rounded-2xl p-1 gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                activeTab === tab.id
                  ? 'bg-white text-[var(--color-primary)] shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.icon}
              {tab.label}
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
          className="px-4 space-y-4 pt-2"
        >
          {activeTab === 'compte' && <AccountTab />}
          {activeTab === 'boutique' && <ShopTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SettingsPage;
