import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSupabase } from '../../hooks/useSupabase';
import { usePwaNotifications } from '../../hooks/usePwaNotifications';
import {
  isPushSupported,
  getPermissionState,
  subscribeToPush,
  getExistingSubscription,
} from '../../lib/pushNotifications';
import AppBar from './AppBar';
import BottomNavBar from './BottomNavBar';
import InstallPrompt from '../ui/InstallPrompt';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, isProfileComplete } = useSupabase();
  const pushPrompted = useRef(false);

  // Activate global PWA notification listeners (Realtime for Chat, Orders, Admin alerts)
  usePwaNotifications();

  useEffect(() => {
    if (!user || !isProfileComplete || pushPrompted.current) return;
    if (!isPushSupported()) return;

    const permission = getPermissionState();

    if (permission === 'granted') {
      pushPrompted.current = true;
      getExistingSubscription().then((existing) => {
        if (!existing) subscribeToPush(user.id);
      });
      return;
    }

    if (permission === 'default') {
      pushPrompted.current = true;
      const timer = setTimeout(() => subscribeToPush(user.id), 5000);
      return () => clearTimeout(timer);
    }
  }, [user, isProfileComplete]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [location.pathname]);

  const isChatPage = /^\/messages\/[^/]+\/[^/]+/.test(location.pathname);

  const hideBottomNav =
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/complete-profile' ||
    location.pathname === '/email-confirmed' ||
    location.pathname === '/reset-password' ||
    location.pathname === '/update-password' ||
    location.pathname === '/banned' ||
    location.pathname === '/create-listing' ||
    location.pathname === '/panier' ||
    location.pathname.startsWith('/auth/') ||
    location.pathname.startsWith('/payment/') ||
    location.pathname.startsWith('/checkout') ||
    isChatPage;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--color-background)',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppBar />

        <main
          style={{ flex: 1 }}
          className={`${hideBottomNav ? '' : 'pb-[calc(88px+env(safe-area-inset-bottom,0px))]'} md:pb-4`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {!hideBottomNav && <BottomNavBar />}

      <InstallPrompt />
    </div>
  );
};

export { AppLayout };
export default AppLayout;