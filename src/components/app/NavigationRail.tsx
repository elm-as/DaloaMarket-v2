import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Plus, MessageSquare, User, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMessageRead } from '../../contexts/MessageReadContext';
import { useCart } from '../../context/CartContext';

const navItems = [
  { path: '/', icon: Home, label: 'Accueil' },
  { path: '/search', icon: Search, label: 'Recherche' },
  { path: '/panier', icon: ShoppingBag, label: 'Panier', showBadge: true },
  { path: '/create-listing', icon: Plus, label: 'Vendre', accent: true },
  { path: '/messages', icon: MessageSquare, label: 'Messages', showBadge: true },
  { path: '/profile', icon: User, label: 'Profil' },
];

const RAIL_W = 68;

const NavigationRail: React.FC = () => {
  const location = useLocation();
  const { unreadCount } = useMessageRead();
  const { itemCount } = useCart();
  const [tooltip, setTooltip] = useState<string | null>(null);

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-40 hidden md:flex flex-col items-center"
      style={{
        width: RAIL_W,
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'rgba(248,249,250,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center justify-center mt-3 mb-5 rounded-xl active:scale-[0.92] transition-transform overflow-hidden"
        style={{ width: 36, height: 36 }}
        aria-label="DaloaMarket - Accueil"
      >
        <img
          src="/logo.svg"
          alt="DaloaMarket"
          width={36}
          height={36}
          className="w-full h-full object-contain"
          style={{
            background: 'var(--gradient-primary)',
          }}
        />
      </Link>

      {/* Nav items */}
      <nav className="flex flex-col items-center gap-1.5 flex-1">
        {navItems.map(({ path, icon: Icon, label, accent, showBadge }) => {
          const active = location.pathname === path;

          return (
            <div
              key={path}
              className="relative"
              onMouseEnter={() => setTooltip(label)}
              onMouseLeave={() => setTooltip(null)}
            >
              <Link
                to={path}
                className="relative flex items-center justify-center rounded-2xl active:scale-[0.92] transition-all duration-200"
                style={{
                  width: 44,
                  height: 44,
                  background: accent
                    ? active
                      ? 'var(--gradient-primary)'
                      : 'var(--color-primary-50)'
                    : active
                    ? 'var(--color-primary-100)'
                    : 'transparent',
                  boxShadow: accent && active ? '0 4px 12px rgba(255,127,0,0.40)' : undefined,
                }}
                aria-label={showBadge && (path === '/panier' ? itemCount : unreadCount) > 0 ? (path === '/panier' ? `${label} (${itemCount})` : `${label} (${unreadCount} non lus)`) : label}
              >
                <div className="relative">
                  <Icon
                    style={{
                      width: 21,
                      height: 21,
                      color: accent && !active
                        ? 'var(--color-primary)'
                        : accent && active
                        ? '#fff'
                        : active
                        ? 'var(--color-primary)'
                        : 'var(--color-on-surface-variant)',
                      opacity: active || accent ? 1 : 0.5,
                    }}
                    strokeWidth={active ? 2.5 : 2}
                  />
                  {showBadge && (path === '/panier' ? itemCount : unreadCount) > 0 && (
                    <motion.span
                      className="absolute -top-1 -right-1 min-w-[16px] h-[16px] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white"
                      style={{
                        background: path === '/panier' ? 'var(--color-primary)' : '#EF4444',
                      }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500 }}
                    >
                      {(path === '/panier' ? itemCount : unreadCount) > 99 ? '99+' : (path === '/panier' ? itemCount : unreadCount)}
                    </motion.span>
                  )}
                </div>
              </Link>

              {tooltip === label && (
                <motion.div
                  className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.12 }}
                >
                  <div
                    className="text-white text-xs font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap"
                    style={{ background: 'var(--color-on-surface)' }}
                  >
                    {label}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};

export default NavigationRail;
