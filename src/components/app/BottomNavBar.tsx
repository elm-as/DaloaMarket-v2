import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Plus, MessageSquare, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMessageRead } from '../../contexts/MessageReadContext';

const tabs = [
  { path: '/', icon: Home, label: 'Accueil' },
  { path: '/search', icon: Search, label: 'Rechercher' },
  { path: '/create-listing', icon: Plus, label: 'Vendre', isCenterAction: true },
  { path: '/messages', icon: MessageSquare, label: 'Messages', showBadge: true },
  { path: '/profile', icon: User, label: 'Profil' },
];

const BottomNavBar: React.FC = () => {
  const location = useLocation();
  const { unreadCount, refreshUnread } = useMessageRead();

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100/80 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="mx-auto flex h-[60px] max-w-lg items-center justify-around px-2">
        {tabs.map(({ path, icon: Icon, label, isCenterAction, showBadge }) => {
          const active =
            path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path);
          const badgeCount = unreadCount;

          if (isCenterAction) {
            return (
              <Link
                key={path}
                to={path}
                className="relative flex flex-col items-center justify-center -mt-3.5 group select-none"
                aria-label="Vendre un article"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-500 to-amber-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/35 ring-4 ring-white active:scale-90 transition-all duration-150 group-hover:shadow-orange-500/50">
                  <Plus className="w-6 h-6 stroke-[2.8]" />
                </div>
                <span className="text-[9px] font-black text-orange-600 tracking-tight mt-0.5">
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={path}
              to={path}
              className="relative flex flex-1 flex-col items-center justify-center py-1.5 min-w-0 transition-all active:scale-90 select-none"
              aria-current={active ? 'page' : undefined}
              aria-label={
                showBadge && badgeCount > 0
                  ? `${label} (${badgeCount} non lus)`
                  : label
              }
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    active
                      ? 'text-orange-600'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                  strokeWidth={active ? 2.5 : 1.9}
                  aria-hidden="true"
                />

                {showBadge && badgeCount > 0 && (
                  <motion.span
                    className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] flex items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white ring-2 ring-white shadow-xs"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </motion.span>
                )}
              </div>

              <span
                className={`text-[10px] tracking-tight whitespace-nowrap mt-1 transition-colors ${
                  active
                    ? 'font-black text-orange-600'
                    : 'font-semibold text-gray-400'
                }`}
              >
                {label}
              </span>

              {active && (
                <motion.div
                  layoutId="bottomNavDot"
                  className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-0.5 shadow-xs"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
