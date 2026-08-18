import React, { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Bell } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSupabase } from './hooks/useSupabase';
import { AppLayout } from './components/app/AppLayout';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ErrorBoundary } from './components/app/ErrorBoundary';
import { CartProvider } from './contexts/CartContext';
import { MessageReadProvider } from './contexts/MessageReadContext';
import { OrderCountProvider } from './contexts/OrderCountContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { supabase } from './lib/supabase';
import { PhaseProvider, usePhase } from './contexts/PhaseContext';
// Static pages (eager loads)
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import HelpPage from './pages/HelpPage';
import HowItWorksPage from './pages/HowItWorksPage';
import NotFoundPage from './pages/NotFoundPage';

const ExternalRedirect: React.FC<{ to: string }> = ({ to }) => {
  React.useEffect(() => {
    window.location.href = to;
  }, [to]);
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <LoadingSpinner size="lg" />
    </div>
  );
};

// Lazy loaded pages
const SearchPage = React.lazy(() => import('./pages/SearchPage'));
const CategoryPage = React.lazy(() => import('./pages/CategoryPage'));
const ListingDetailPage = React.lazy(() => import('./pages/ListingDetailPage'));
const ListingCreatePage = React.lazy(() => import('./pages/ListingCreatePage'));
const MessagesPage = React.lazy(() => import('./pages/MessagesPage'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const SellerProfilePage = React.lazy(() => import('./pages/SellerProfilePage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const PayoutSetupPage = React.lazy(() => import('./pages/PayoutSetupPage'));
const MyStatsPage = React.lazy(() => import('./pages/MyStatsPage'));
const MesTransactionsPage = React.lazy(() => import('./pages/MesTransactionsPage'));
const BecomeProPage = React.lazy(() => import('./pages/BecomeProPage'));
const AffiliatedDeliverersPage = React.lazy(() => import('./pages/AffiliatedDeliverersPage'));
const AcheterPackAnnoncesPage = React.lazy(() => import('./pages/AcheterPackAnnoncesPage'));
const PaymentReturnPage = React.lazy(() => import('./pages/PaymentReturnPage'));
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const ResetPasswordPage = React.lazy(() => import('./pages/ResetPasswordPage'));
const UpdatePasswordPage = React.lazy(() => import('./pages/UpdatePasswordPage'));
const CompleteProfilePage = React.lazy(() => import('./pages/CompleteProfilePage'));
const EmailConfirmedPage = React.lazy(() => import('./pages/EmailConfirmedPage'));
const BannedPage = React.lazy(() => import('./pages/BannedPage'));
const PricingPage = React.lazy(() => import('./pages/PricingPage'));
const CheckoutPage = React.lazy(() => import('./pages/CheckoutPage'));
const OrderTrackingPage = React.lazy(() => import('./pages/OrderTrackingPage'));
const MesCommandesPage = React.lazy(() => import('./pages/MesCommandesPage'));
const MesRevenusPage = React.lazy(() => import('./pages/MesRevenusPage'));
const PanierPage = React.lazy(() => import('./pages/PanierPage'));
const MapTestPage = React.lazy(() => import('./pages/MapTestPage'));
const ShopSettingsPage = React.lazy(() => import('./pages/ShopSettingsPage'));
const MaintenancePage = React.lazy(() => import('./pages/MaintenancePage'));
const MentionsLegalesPage = React.lazy(() => import('./pages/MentionsLegalesPage'));
import { useSystemSettings } from './hooks/useSystemSettings';

function AppContent() {
  const { user, userProfile, isAdmin, isProfileComplete, loading: authLoading } = useSupabase();
  const location = useLocation();
  const navigate = useNavigate();
  const { maintenance, paymentConfig, loading: settingsLoading } = useSystemSettings();
  const { showMonetisation } = usePhase();

  // ── Enregistrement natif des Notifications Push Capacitor (Android / iOS) ──
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user?.id) return;

    const initCapacitorPush = async () => {
      try {
        let perm = await PushNotifications.checkPermissions();
        if (perm.receive === 'prompt') {
          perm = await PushNotifications.requestPermissions();
        }
        if (perm.receive !== 'granted') return;

        await PushNotifications.register();

        PushNotifications.addListener('registration', async (token) => {
          try {
            await (supabase.from('push_subscriptions' as any) as any).upsert(
              {
                user_id: user.id,
                platform: 'android',
                token: token.value,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,platform' }
            );
          } catch (err) {
            console.warn('[Capacitor Push] Token sync error:', err);
          }
        });

        PushNotifications.addListener('pushNotificationReceived', (notification) => {
          toast(
            (t) => (
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-extrabold text-xs text-gray-900 truncate">{notification.title}</span>
                  <span className="text-[11px] text-gray-600 leading-tight line-clamp-2">{notification.body}</span>
                </div>
              </div>
            ),
            { duration: 6000 }
          );
        });

        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
          const data = action.notification.data;
          const targetUrl = data?.url || data?.link;
          if (targetUrl) {
            navigate(targetUrl);
          }
        });
      } catch (e) {
        console.warn('[Capacitor Push] Init error:', e);
      }
    };

    initCapacitorPush();
  }, [user?.id, navigate]);

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to banned page
  const isBannedPath = location.pathname === '/banned';
  if (userProfile?.banned && !isBannedPath) {
    return <Navigate to="/banned" replace />;
  }
  if (!userProfile?.banned && isBannedPath) {
    return <Navigate to="/" replace />;
  }

  // Handle Maintenance Mode
  const isAuthOrAdminPath = location.pathname.startsWith('/admin') || location.pathname.startsWith('/login') || location.pathname.startsWith('/auth');
  if (maintenance.enabled && !isAdmin && !isAuthOrAdminPath) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
        <MaintenancePage message={maintenance.message} expectedReopening={maintenance.expected_reopening} />
      </Suspense>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
          <LoadingSpinner size="lg" />
        </div>
      }>
        <Routes location={location} key={location.pathname}>
          {/* Banned page - no layout */}
          <Route path="/banned" element={<BannedPage />} />

          {/* Auth pages */}
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <AppLayout><LoginPage /></AppLayout>} />
          <Route path="/register" element={user ? <Navigate to="/" replace /> : <AppLayout><RegisterPage /></AppLayout>} />
          <Route path="/auth/reset-password" element={<AppLayout><ResetPasswordPage /></AppLayout>} />
          <Route path="/auth/update-password" element={<AppLayout><UpdatePasswordPage /></AppLayout>} />
          <Route path="/complete-profile" element={
            <PrivateRoute requireProfile={false}>
              {isProfileComplete ? <Navigate to="/" replace /> : (
                <AppLayout><CompleteProfilePage /></AppLayout>
              )}
            </PrivateRoute>
          } />
          <Route path="/email-confirmed" element={<AppLayout><EmailConfirmedPage /></AppLayout>} />

          {/* Main routes */}
          <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
          <Route path="/search" element={<AppLayout><SearchPage /></AppLayout>} />
          
          {/* Category SEO routes */}
          <Route path="/c/:categorySlug" element={<AppLayout><CategoryPage /></AppLayout>} />
          <Route path="/electronique" element={<AppLayout><CategoryPage /></AppLayout>} />
          <Route path="/vehicules" element={<AppLayout><CategoryPage /></AppLayout>} />
          <Route path="/mode" element={<AppLayout><CategoryPage /></AppLayout>} />
          <Route path="/maison-deco" element={<AppLayout><CategoryPage /></AppLayout>} />
          <Route path="/sports-loisirs" element={<AppLayout><CategoryPage /></AppLayout>} />
          <Route path="/livres" element={<AppLayout><CategoryPage /></AppLayout>} />
          <Route path="/alimentaire" element={<AppLayout><CategoryPage /></AppLayout>} />

          <Route path="/l/:id" element={<AppLayout><ListingDetailPage /></AppLayout>} />
          <Route path="/listings/:id" element={<AppLayout><ListingDetailPage /></AppLayout>} />
          <Route path="/create-listing" element={
            <PrivateRoute requireProfile={true}>
              <AppLayout><ListingCreatePage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/messages" element={
            <PrivateRoute requireProfile={true}>
              <AppLayout><MessagesPage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/messages/:listingId/:userId" element={
            <PrivateRoute requireProfile={true}>
              <AppLayout><ChatPage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/profile" element={
            <PrivateRoute requireProfile={false}>
              <AppLayout><ProfilePage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/profil" element={<Navigate to="/profile" replace />} />
          <Route path="/b/:sellerId" element={<AppLayout><SellerProfilePage /></AppLayout>} />
          <Route path="/seller/:sellerId" element={<AppLayout><SellerProfilePage /></AppLayout>} />
          <Route path="/profile/seller/:sellerId" element={<AppLayout><SellerProfilePage /></AppLayout>} />
          <Route path="/boutique/:sellerId" element={<AppLayout><SellerProfilePage /></AppLayout>} />
          <Route path="/vendeur/:sellerId" element={<AppLayout><SellerProfilePage /></AppLayout>} />
          <Route path="/settings" element={
            <PrivateRoute requireProfile={false}>
              <AppLayout><SettingsPage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/settings/payout" element={
            <PrivateRoute requireProfile={false}>
              <AppLayout><PayoutSetupPage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/mes-statistiques" element={
            <PrivateRoute requireProfile={false}>
              <AppLayout><MyStatsPage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/mes-paiements" element={
            showMonetisation ? (
            <PrivateRoute requireProfile={false}>
              <AppLayout><MesTransactionsPage /></AppLayout>
            </PrivateRoute>
            ) : <Navigate to="/" replace />
          } />
          <Route path="/checkout/cart" element={
            <PrivateRoute requireProfile={true}>
              <AppLayout><CheckoutPage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/checkout/:listingId" element={
            <PrivateRoute requireProfile={true}>
              <AppLayout><CheckoutPage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/suivi/:orderId" element={
            <PrivateRoute requireProfile={true}>
              <AppLayout><OrderTrackingPage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/mes-revenus" element={
            showMonetisation ? (
            <PrivateRoute requireProfile={true}>
              <AppLayout><MesRevenusPage /></AppLayout>
            </PrivateRoute>
            ) : <Navigate to="/" replace />
          } />
          <Route path="/panier" element={
            <PrivateRoute requireProfile={true}>
              <AppLayout><PanierPage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/map-test" element={<AppLayout><MapTestPage /></AppLayout>} />
          <Route path="/boutique" element={
            <PrivateRoute requireProfile={true}>
              <AppLayout><ShopSettingsPage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/mes-commandes" element={
            <PrivateRoute requireProfile={true}>
              <AppLayout><MesCommandesPage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/mes-livreurs" element={
            <PrivateRoute requireProfile={true}>
              <AppLayout><AffiliatedDeliverersPage /></AppLayout>
            </PrivateRoute>
          } />
          <Route path="/livreurs-affilies" element={<Navigate to="/mes-livreurs" replace />} />
          <Route path="/devenir-pro" element={
            showMonetisation ? (
            <PrivateRoute requireProfile={true}>
              <AppLayout><BecomeProPage /></AppLayout>
            </PrivateRoute>
            ) : <Navigate to="/" replace />
          } />
          <Route path="/acheter-pack" element={
            showMonetisation ? (
            <PrivateRoute requireProfile={true}>
              <AppLayout><AcheterPackAnnoncesPage /></AppLayout>
            </PrivateRoute>
            ) : <Navigate to="/" replace />
          } />
          <Route path="/acheter-pack-annonces" element={<Navigate to="/acheter-pack" replace />} />
          <Route path="/payment/success" element={
            <PrivateRoute>
              <AppLayout><PaymentReturnPage /></AppLayout>
            </PrivateRoute>
          } />

          {/* Admin routes */}
          <Route path="/admin" element={<AdminRoute><AppLayout><AdminDashboardPage /></AppLayout></AdminRoute>} />
          <Route path="/admin/kpis" element={<AdminRoute><AppLayout><AdminDashboardPage /></AppLayout></AdminRoute>} />
          <Route path="/admin/feedbacks" element={<AdminRoute><AppLayout><AdminDashboardPage /></AppLayout></AdminRoute>} />
          <Route path="/admin/features" element={<AdminRoute><AppLayout><AdminDashboardPage /></AppLayout></AdminRoute>} />
          <Route path="/admin/reports" element={<AdminRoute><AppLayout><AdminDashboardPage /></AppLayout></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><AppLayout><AdminDashboardPage /></AppLayout></AdminRoute>} />
          <Route path="/admin/notifications" element={<AdminRoute><AppLayout><AdminDashboardPage /></AppLayout></AdminRoute>} />
          <Route path="/admin/listings" element={<AdminRoute><AppLayout><AdminDashboardPage /></AppLayout></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AppLayout><AdminDashboardPage /></AppLayout></AdminRoute>} />
          <Route path="/admin/livraisons" element={<AdminRoute><AppLayout><AdminDashboardPage /></AppLayout></AdminRoute>} />
          <Route path="/admin/litiges" element={<AdminRoute><AppLayout><AdminDashboardPage /></AppLayout></AdminRoute>} />

                    {/* Pricing — masqué en Phase 0 */}
          {showMonetisation && (
          <Route path="/pricing" element={<AppLayout><PricingPage /></AppLayout>} />
          )}



          {/* Info pages */}
          <Route path="/about" element={<AppLayout><AboutPage /></AppLayout>} />
          <Route path="/faq" element={<AppLayout><FAQPage /></AppLayout>} />
          <Route path="/terms" element={<AppLayout><TermsPage /></AppLayout>} />
          <Route path="/privacy" element={<AppLayout><PrivacyPage /></AppLayout>} />
          <Route path="/mentions-legales" element={<AppLayout><MentionsLegalesPage /></AppLayout>} />
          <Route path="/help" element={<AppLayout><HelpPage /></AppLayout>} />
          <Route path="/how-it-works" element={<AppLayout><HowItWorksPage /></AppLayout>} />
          <Route path="/guide-vendeur" element={<ExternalRedirect to="https://tuto.daloamarket.com" />} />
          <Route path="/conseils-vendeur" element={<ExternalRedirect to="https://tuto.daloamarket.com" />} />

          {/* 404 */}
          <Route path="*" element={<AppLayout><NotFoundPage /></AppLayout>} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
}

function MessageReadWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useSupabase();
  return (
    <MessageReadProvider userId={user?.id} supabaseClient={supabase}>
      <OrderCountProvider userId={user?.id} supabaseClient={supabase}>
        <FavoritesProvider>
          {children}
        </FavoritesProvider>
      </OrderCountProvider>
    </MessageReadProvider>
  );
}

export default function App() {
  return <CartProvider><PhaseProvider><ErrorBoundary><MessageReadWrapper><AppContent /></MessageReadWrapper></ErrorBoundary></PhaseProvider></CartProvider>;
}
