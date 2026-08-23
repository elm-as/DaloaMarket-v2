import React, { useEffect } from 'react';
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
import { useScrollRestoration } from '../../hooks/useScrollRestoration';
import AppBar from './AppBar';
import BottomNavBar from './BottomNavBar';
import InstallPrompt from '../ui/InstallPrompt';
import { WelcomeScreenModal } from '../home/WelcomeScreenModal';
import Footer from './Footer';

interface AppLayoutProps {
  children: React.ReactNode;
}

const PUSH_PROMPTED_KEY = 'dm_push_prompted';

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const location = useLocation();
  const { user, isProfileComplete } = useSupabase();

  // Handle intelligent scroll restoration across routes (PUSH vs POP)
  // useScrollRestoration handled globally in App.tsx

  // Activate global PWA notification listeners (Realtime for Chat, Orders, Admin alerts)
  usePwaNotifications();

  useEffect(() => {
    if (!user?.id) return;
    if (!isPushSupported()) return;

    // Déclencher la synchronisation du token pour cet utilisateur connecté
    subscribeToPush(user.id).catch((err) => {
      console.warn('[Push] Auto-sync subscription to Supabase failed:', err);
    });
  }, [user?.id]);

  const isChatPage = /^\/messages\/[^/]+\/[^/]+/.test(location.pathname);
  const isListingDetailPage = /^\/(listings|l)\/[^/]+/.test(location.pathname);

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
    isChatPage ||
    isListingDetailPage;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--color-background)',
        overflowX: 'hidden',
        maxWidth: '100vw',
        width: '100%',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowX: 'hidden', width: '100%', maxWidth: '100vw' }}>
        <AppBar />

        <main
          style={{ flex: 1, width: '100%', maxWidth: '100vw', overflowX: 'hidden' }}
          className={`${hideBottomNav || isChatPage ? 'pb-0' : 'pb-[calc(58px+env(safe-area-inset-bottom,0px))]'} ${isChatPage ? 'md:pb-0' : 'md:pb-4'}`}
        >
          <div
            style={{ maxWidth: isChatPage ? '100%' : 'var(--container-max-width)', marginLeft: 'auto', marginRight: 'auto', width: '100%', overflowX: 'hidden' }}
            className={isChatPage ? 'h-[100dvh] flex flex-col' : ''}
          >
            <div
              style={{ width: '100%', overflowX: 'hidden' }}
              className={isChatPage ? 'h-full flex flex-col flex-1' : ''}
            >
              {children}
            </div>
          </div>
        </main>

        {!isChatPage && <Footer />}
      </div>

      {!hideBottomNav && <BottomNavBar />}

      <InstallPrompt />
      <WelcomeScreenModal />
    </div>
  );
};

export { AppLayout };
export default AppLayout;