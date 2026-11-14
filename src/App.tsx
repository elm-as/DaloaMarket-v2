import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useSupabase } from './hooks/useSupabase';
import { useSystemSettings } from './hooks/useSystemSettings';
import { useScrollRestoration } from './hooks/useScrollRestoration';
import { useCapacitorPush } from './hooks/useCapacitorPush';
import { AppLayout } from './components/app/AppLayout';
import { PrivateRoute } from './components/auth/PrivateRoute';
import { AdminRoute } from './components/auth/AdminRoute';
import { LoadingSpinner } from './components/ui/LoadingSpinner';
import { ErrorBoundary } from './components/app/ErrorBoundary';
import { CartProvider } from './contexts/CartContext';
import { MessageReadProvider } from './contexts/MessageReadContext';
import { OrderCountProvider } from './contexts/OrderCountContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { PhaseProvider, usePhase } from './contexts/PhaseContext';
import { supabase } from './lib/supabase';
import HomePage from './pages/HomePage';
import SearchPage from './pages/SearchPage';
import CategoryPage from './pages/CategoryPage';
import ListingDetailPage from './pages/ListingDetailPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import DeleteAccountPage from './pages/DeleteAccountPage';
import HelpPage from './pages/HelpPage';
import HowItWorksPage from './pages/HowItWorksPage';
import NotFoundPage from './pages/NotFoundPage';
import {
  ADMIN_ROUTE_PATHS,
  CATEGORY_SEO_PATHS,
  REDIRECT_ROUTES,
  SELLER_PROFILE_PATHS,
  AcheterPackAnnoncesPage,
  AdminDashboardPage,
  AffiliatedDeliverersPage,
  BannedPage,
  BecomeProPage,
  ChatPage,
  CheckoutPage,
  CompleteProfilePage,
  EmailConfirmedPage,
  ExpressDeliveryPage,
  ListingCreatePage,
  LoginPage,
  MaintenancePage,
  MapTestPage,
  MentionsLegalesPage,
  MesCommandesPage,
  MesRevenusPage,
  MesTransactionsPage,
  MessagesPage,
  MyStatsPage,
  OrderConfirmedPage,
  OrderTrackingPage,
  PanierPage,
  PaymentReturnPage,
  PayoutSetupPage,
  PricingPage,
  ProfilePage,
  RegisterPage,
  ResetPasswordPage,
  SellerProfilePage,
  SettingsPage,
  ShopSettingsPage,
  UpdatePasswordPage,
} from './routes/lazyPages';

const ExternalRedirect: React.FC<{ to: string }> = ({ to }) => {
  React.useEffect(() => {
    window.location.href = to;
  }, [to]);
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <LoadingSpinner size="lg" />
    </div>
  );
};

const PROFILE_EXEMPT_PATHS = [
  '/complete-profile',
  '/banned',
  '/login',
  '/register',
  '/email-confirmed',
  '/mentions-legales',
  '/privacy',
];

function wrapPrivate(element: React.ReactNode, requireProfile = true) {
  return (
    <PrivateRoute requireProfile={requireProfile}>
      <AppLayout>{element}</AppLayout>
    </PrivateRoute>
  );
}

function AppContent() {
  const { user, userProfile, isAdmin, isProfileComplete, profileHydrated, loading: authLoading } = useSupabase();
  const location = useLocation();
  const { maintenance, loading: settingsLoading } = useSystemSettings();
  const { showMonetisation } = usePhase();
  useScrollRestoration();
  useCapacitorPush(user?.id);

  if (authLoading || settingsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const isBannedPath = location.pathname === '/banned';
  if (userProfile?.banned && !isBannedPath) return <Navigate to="/banned" replace />;
  if (!userProfile?.banned && isBannedPath) return <Navigate to="/" replace />;

  const isProfileExempt =
    PROFILE_EXEMPT_PATHS.includes(location.pathname) || location.pathname.startsWith('/auth/');
  if (user && profileHydrated && !isProfileComplete && !isProfileExempt) {
    return <Navigate to="/complete-profile" state={{ from: location }} replace />;
  }

  const isAuthOrAdminPath =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/login') ||
    location.pathname.startsWith('/auth');
  if (maintenance.enabled && !isAdmin && !isAuthOrAdminPath) {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-slate-900"><LoadingSpinner size="lg" /></div>}>
        <MaintenancePage message={maintenance.message} expectedReopening={maintenance.expected_reopening} />
      </Suspense>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <Routes location={location}>
        <Route path="/banned" element={<BannedPage />} />
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <AppLayout><LoginPage /></AppLayout>} />
        <Route path="/register" element={user ? <Navigate to="/" replace /> : <AppLayout><RegisterPage /></AppLayout>} />
        <Route path="/auth/reset-password" element={<AppLayout><ResetPasswordPage /></AppLayout>} />
        <Route path="/auth/update-password" element={<AppLayout><UpdatePasswordPage /></AppLayout>} />
        <Route
          path="/complete-profile"
          element={
            <PrivateRoute requireProfile={false}>
              {isProfileComplete ? <Navigate to="/" replace /> : <AppLayout><CompleteProfilePage /></AppLayout>}
            </PrivateRoute>
          }
        />
        <Route path="/email-confirmed" element={<AppLayout><EmailConfirmedPage /></AppLayout>} />

        <Route path="/" element={<AppLayout><HomePage /></AppLayout>} />
        <Route path="/search" element={<AppLayout><SearchPage /></AppLayout>} />

        {CATEGORY_SEO_PATHS.map((path) => (
          <Route key={path} path={path} element={<AppLayout><CategoryPage /></AppLayout>} />
        ))}

        <Route path="/l/:id" element={<AppLayout><ListingDetailPage /></AppLayout>} />
        <Route path="/listings/:id" element={<AppLayout><ListingDetailPage /></AppLayout>} />
        <Route path="/create-listing" element={wrapPrivate(<ListingCreatePage />)} />
        <Route path="/messages" element={wrapPrivate(<MessagesPage />)} />
        <Route path="/messages/:listingId/:userId" element={wrapPrivate(<ChatPage />)} />
        <Route path="/messages/:userId" element={wrapPrivate(<ChatPage />)} />
        <Route path="/profile" element={wrapPrivate(<ProfilePage />, false)} />

        {SELLER_PROFILE_PATHS.map((path) => (
          <Route key={path} path={path} element={<AppLayout><SellerProfilePage /></AppLayout>} />
        ))}

        <Route path="/settings" element={wrapPrivate(<SettingsPage />, false)} />
        <Route path="/settings/payout" element={wrapPrivate(<PayoutSetupPage />, false)} />
        <Route path="/mes-statistiques" element={wrapPrivate(<MyStatsPage />, false)} />
        <Route path="/mes-paiements" element={showMonetisation ? wrapPrivate(<MesTransactionsPage />, false) : <Navigate to="/" replace />} />
        <Route path="/checkout/cart" element={wrapPrivate(<CheckoutPage />)} />
        <Route path="/checkout/:listingId" element={wrapPrivate(<CheckoutPage />)} />
        <Route path="/suivi/:orderId" element={wrapPrivate(<OrderTrackingPage />)} />
        <Route path="/commande-confirmee/:orderId" element={wrapPrivate(<OrderConfirmedPage />)} />
        <Route path="/mes-revenus" element={showMonetisation ? wrapPrivate(<MesRevenusPage />) : <Navigate to="/" replace />} />
        <Route path="/panier" element={wrapPrivate(<PanierPage />)} />
        <Route path="/map-test" element={<AdminRoute><AppLayout><MapTestPage /></AppLayout></AdminRoute>} />
        <Route path="/boutique" element={wrapPrivate(<ShopSettingsPage />)} />
        <Route path="/mes-commandes" element={wrapPrivate(<MesCommandesPage />)} />
        <Route path="/mes-livreurs" element={wrapPrivate(<AffiliatedDeliverersPage />)} />
        <Route path="/express" element={wrapPrivate(<ExpressDeliveryPage />)} />
        <Route path="/devenir-pro" element={showMonetisation ? wrapPrivate(<BecomeProPage />) : <Navigate to="/" replace />} />
        <Route path="/acheter-pack" element={showMonetisation ? wrapPrivate(<AcheterPackAnnoncesPage />) : <Navigate to="/" replace />} />
        <Route path="/payment/success" element={<AppLayout><PaymentReturnPage /></AppLayout>} />

        {REDIRECT_ROUTES.map(({ from, to }) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}

        {ADMIN_ROUTE_PATHS.map((path) => (
          <Route key={path} path={path} element={<AdminRoute><AppLayout><AdminDashboardPage /></AppLayout></AdminRoute>} />
        ))}

        {showMonetisation && <Route path="/pricing" element={<AppLayout><PricingPage /></AppLayout>} />}

        <Route path="/about" element={<AppLayout><AboutPage /></AppLayout>} />
        <Route path="/faq" element={<AppLayout><FAQPage /></AppLayout>} />
        <Route path="/terms" element={<AppLayout><TermsPage /></AppLayout>} />
        <Route path="/privacy" element={<AppLayout><PrivacyPage /></AppLayout>} />
        <Route path="/supprimer-mon-compte" element={<AppLayout><DeleteAccountPage /></AppLayout>} />
        <Route path="/mentions-legales" element={<AppLayout><MentionsLegalesPage /></AppLayout>} />
        <Route path="/help" element={<AppLayout><HelpPage /></AppLayout>} />
        <Route path="/how-it-works" element={<AppLayout><HowItWorksPage /></AppLayout>} />
        <Route path="/guide-vendeur" element={<ExternalRedirect to="https://tuto.daloamarket.com" />} />
        <Route path="/conseils-vendeur" element={<ExternalRedirect to="https://tuto.daloamarket.com" />} />
        <Route path="*" element={<AppLayout><NotFoundPage /></AppLayout>} />
      </Routes>
    </Suspense>
  );
}

function MessageReadWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useSupabase();
  return (
    <MessageReadProvider userId={user?.id} supabaseClient={supabase}>
      <OrderCountProvider userId={user?.id} supabaseClient={supabase}>
        <FavoritesProvider>{children}</FavoritesProvider>
      </OrderCountProvider>
    </MessageReadProvider>
  );
}

export default function App() {
  return (
    <CartProvider>
      <PhaseProvider>
        <ErrorBoundary>
          <MessageReadWrapper>
            <AppContent />
          </MessageReadWrapper>
        </ErrorBoundary>
      </PhaseProvider>
    </CartProvider>
  );
}
