import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, MessageSquare, User, Home, Plus, ShoppingCart, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSupabase } from '../../hooks/useSupabase';
import { useMessageRead } from '../../contexts/MessageReadContext';
import { useOrderCount } from '../../contexts/OrderCountContext';
import { useCart } from '../../contexts/CartContext';
import Avatar from '../profile/Avatar';

const AppBar: React.FC = () => {
  const location = useLocation();
  const { user, userProfile } = useSupabase();
  const { unreadCount, refreshUnread } = useMessageRead();
  const { activeOrderCount, refreshOrderCount } = useOrderCount();
  const { itemCount } = useCart();

  useEffect(() => {
    refreshUnread();
    refreshOrderCount();
  }, [refreshUnread, refreshOrderCount]);

  const isChatPage = /^\/messages\/[^/]+\/[^/]+/.test(location.pathname);
  const isCreateListing = location.pathname === '/create-listing';
  const isListingDetail = /^\/(listings|l)\/[^/]+/.test(location.pathname);
  const isSearchPage = location.pathname === '/search';
  const hideOnMobile = isChatPage || isCreateListing || isListingDetail || isSearchPage;

  return (
    <header
      className={`sticky top-0 z-50 ${hideOnMobile ? 'hidden lg:block' : 'block'}`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      {/* MOBILE BAR - shown on <lg screens */}
      <div
        className="lg:hidden flex items-center w-full px-3 gap-2 h-14"
        style={{
          background: 'rgba(248,249,250,0.82)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        {/* Logo icon only - no text */}
        <Link
          to="/"
          className="flex items-center justify-center flex-shrink-0 active:scale-[0.92] transition-transform"
          aria-label="Accueil"
          style={{ width: 38, height: 38 }}
        >
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: 34,
              height: 34,
            }}
          >
            <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
          </div>
        </Link>

        {/* Search trigger */}
        <Link
          to="/search"
          className="flex-1 flex items-center h-9 rounded-full px-3 gap-2 active:scale-[0.98] transition-transform max-w-md mx-auto"
          style={{
            background: 'rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
          aria-label="Rechercher"
        >
          <Search style={{ width: 17, height: 17, color: 'var(--color-on-surface-variant)', opacity: 0.55, flexShrink: 0 }} />
          <span className="text-sm truncate" style={{ color: 'var(--color-on-surface-variant)', opacity: 0.45 }}>
            Rechercher un produit...
          </span>
        </Link>

        {/* Actions mobiles : Panier + Commandes */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {user && (
            <Link
              to="/panier"
              className="relative flex items-center justify-center rounded-xl active:scale-[0.92] transition-transform"
              style={{ width: 40, height: 40 }}
              aria-label={`Panier${itemCount > 0 ? ` (${itemCount} articles)` : ''}`}
            >
              <ShoppingCart
                style={{
                  width: 21,
                  height: 21,
                  color: location.pathname === '/panier' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  opacity: location.pathname === '/panier' ? 1 : 0.7,
                }}
                strokeWidth={location.pathname === '/panier' ? 2.5 : 2}
              />
              {itemCount > 0 && (
                <motion.span
                  className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </motion.span>
              )}
            </Link>
          )}

          {user && (
            <Link
              to="/mes-commandes"
              className="relative flex items-center justify-center rounded-xl active:scale-[0.92] transition-transform"
              style={{ width: 40, height: 40 }}
              aria-label={`Commandes${activeOrderCount > 0 ? ` (${activeOrderCount} en cours)` : ''}`}
            >
              <Package
                style={{
                  width: 21,
                  height: 21,
                  color: location.pathname === '/mes-commandes' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                  opacity: location.pathname === '/mes-commandes' ? 1 : 0.7,
                }}
                strokeWidth={location.pathname === '/mes-commandes' ? 2.5 : 2}
              />
              {activeOrderCount > 0 && (
                <motion.span
                  className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  {activeOrderCount > 99 ? '99+' : activeOrderCount}
                </motion.span>
              )}
            </Link>
          )}

          {!user && (
            <Link
              to="/login"
              className="flex items-center justify-center rounded-xl active:scale-[0.92] transition-all"
              style={{
                width: 42,
                height: 42,
                background: 'var(--color-primary-50)',
                color: 'var(--color-primary)',
              }}
              aria-label="Connexion"
            >
              <User style={{ width: 20, height: 20 }} />
            </Link>
          )}
        </div>
      </div>

      {/* DESKTOP BAR - shown on lg: screens */}
      <div className="hidden lg:block w-full bg-white border-b border-gray-100 shadow-sm">
        <div
          className="flex items-center w-full px-8 h-16 mx-auto"
          style={{ maxWidth: 'var(--container-max-width)' }}
        >
        {/* Logo + name */}
        <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 mr-6">
          <div
            className="flex items-center justify-center overflow-hidden"
            style={{
              width: 36,
              height: 36,
            }}
          >
            <img src="/logo.png" alt="DaloaMarket" className="w-full h-full object-contain" />
          </div>
          <span
            className="text-lg font-bold hidden xl:inline tracking-tight"
            style={{ color: 'var(--color-on-surface)' }}
          >
            DaloaMarket
          </span>
        </Link>

        {/* Search bar - fills remaining center space */}
        <Link
          to="/search"
          className="flex-1 flex items-center h-10 lg:h-11 rounded-full px-4 gap-2 max-w-2xl bg-gray-50 border border-gray-200 hover:border-[var(--color-primary)]/30 hover:bg-white transition-colors"
        >
          <Search
            style={{
              width: 18,
              height: 18,
              color: 'var(--color-on-surface-variant)',
              opacity: 0.5,
            }}
          />
          <span
            className="text-sm"
            style={{ color: 'var(--color-on-surface-variant)', opacity: 0.5 }}
          >
            Rechercher un produit...
          </span>
        </Link>

        {/* Right nav links - evenly spaced */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-6">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            style={{
              color: location.pathname === '/' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
              background: location.pathname === '/' ? 'var(--color-primary-50)' : 'transparent',
            }}
          >
            <Home style={{ width: 18, height: 18 }} />
            <span className="hidden xl:inline">Accueil</span>
          </Link>

          <Link
            to="/create-listing"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all active:scale-[0.97]"
            style={{
              background: 'var(--gradient-primary)',
              boxShadow: '0 2px 8px rgba(255,127,0,0.35)',
            }}
          >
            <Plus style={{ width: 18, height: 18 }} />
            <span>Vendre</span>
          </Link>

          {user && (
            <Link
              to="/panier"
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              style={{
                color: location.pathname === '/panier' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                background: location.pathname === '/panier' ? 'var(--color-primary-50)' : 'transparent',
              }}
            >
              <ShoppingCart style={{ width: 18, height: 18 }} />
              <span className="hidden xl:inline">Panier</span>
              {itemCount > 0 && (
                <motion.span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </motion.span>
              )}
            </Link>
          )}

          {user && (
            <Link
              to="/mes-commandes"
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              style={{
                color: location.pathname === '/mes-commandes' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                background: location.pathname === '/mes-commandes' ? 'var(--color-primary-50)' : 'transparent',
              }}
            >
              <Package style={{ width: 18, height: 18 }} />
              <span className="hidden xl:inline">Commandes</span>
              {activeOrderCount > 0 && (
                <motion.span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[var(--color-primary)] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  {activeOrderCount > 99 ? '99+' : activeOrderCount}
                </motion.span>
              )}
            </Link>
          )}

          {user && (
            <Link
              to="/messages"
              className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              style={{
                color: location.pathname === '/messages' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                background: location.pathname === '/messages' ? 'var(--color-primary-50)' : 'transparent',
              }}
            >
              <MessageSquare style={{ width: 18, height: 18 }} />
              <span className="hidden xl:inline">Messages</span>
              {unreadCount > 0 && (
                <motion.span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#EF4444] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500 }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.span>
              )}
            </Link>
          )}

          {user ? (
            <Link
              to="/profile"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              style={{
                color: location.pathname === '/profile' ? 'var(--color-primary)' : 'var(--color-on-surface-variant)',
                background: location.pathname === '/profile' ? 'var(--color-primary-50)' : 'transparent',
              }}
            >
              <Avatar
                src={userProfile?.avatar_url}
                name={userProfile?.full_name || user.email}
                size="sm"
              />
              <span
                className="hidden xl:inline text-xs max-w-[80px] truncate"
                style={{ color: 'var(--color-on-surface-variant)' }}
              >
                {userProfile?.full_name || 'Profil'}
              </span>
            </Link>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                color: 'var(--color-primary)',
                background: 'var(--color-primary-50)',
              }}
            >
              <User style={{ width: 18, height: 18 }} />
              <span>Connexion</span>
            </Link>
          )}
        </div>
      </div>
      </div>
    </header>
  );
};

export default AppBar;
