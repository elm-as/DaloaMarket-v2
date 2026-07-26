import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Plus, MessageSquare, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMessageRead } from '../../contexts/MessageReadContext';

const tabs = [
  { path: '/', icon: Home },
  { path: '/search', icon: Search },
  { path: '/create-listing', icon: Plus, accent: true },
  { path: '/messages', icon: MessageSquare, showBadge: true },
  { path: '/profile', icon: User },
];

const BottomNavBar: React.FC = () => {
  const location = useLocation();
  const { unreadCount, refreshUnread } = useMessageRead();

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 md:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Surface container with glass */}
      <div
        className="mx-3 mb-3 rounded-full flex items-center justify-around h-16 px-2"
        style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
          border: '1px solid rgba(255,255,255,0.6)',
        }}
      >
        {tabs.map(({ path, icon: Icon, accent, showBadge }) => {
          const active = location.pathname === path;
          const badgeCount = unreadCount;

          if (accent) {
            return (
              <Link
                key={path}
                to={path}
                className="relative flex items-center justify-center active:scale-[0.92] transition-transform duration-150"
                aria-label="Vendre un article"
                style={{ width: 52, height: 52 }}
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 46,
                    height: 46,
                    background: active
                      ? 'var(--gradient-primary)'
                      : 'var(--color-primary-100)',
                    color: active ? '#fff' : 'var(--color-primary)',
                    boxShadow: active
                      ? '0 4px 16px rgba(255, 127, 0, 0.45)'
                      : '0 2px 8px rgba(255, 127, 0, 0.20)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Icon
                    style={{ width: 22, height: 22 }}
                    strokeWidth={2.5}
                  />
                </div>
              </Link>
            );
          }

          const labels: Record<string, string> = {
            '/': 'Accueil',
            '/search': 'Chercher',
            '/messages': 'Messages',
            '/profile': 'Profil',
          };
          const label = labels[path] ?? '';

          return (
            <Link
              key={path}
              to={path}
              className="relative flex flex-col items-center justify-center gap-0.5 active:scale-[0.92] transition-all duration-150"
              style={{ width: 52, height: 56 }}
              aria-current={active ? 'page' : undefined}
              aria-label={showBadge && badgeCount > 0 ? `${label} (${badgeCount} non lus)` : label}
            >
              {/* Active background pill */}
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: 'var(--color-primary-100)',
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}

              <div className="relative z-10 flex flex-col items-center gap-[3px]">
                <div className="relative">
                  <Icon
                    style={{
                      width: 21,
                      height: 21,
                      color: active ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                      opacity: active ? 1 : 0.6,
                    }}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {showBadge && badgeCount > 0 && (
                    <motion.span
                      className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 ring-2 ring-white"
                      style={{
                        background: '#EF4444',
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    >
                      {badgeCount > 99 ? '99+' : badgeCount}
                    </motion.span>
                  )}
                </div>
                <span
                  style={{
                    fontSize: '9.5px',
                    lineHeight: 1,
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                    opacity: active ? 1 : 0.55,
                    letterSpacing: '0.01em',
                    userSelect: 'none',
                  }}
                >
                  {label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavBar;
