import React from 'react';

export const ListingCreatePage = React.lazy(() => import('../pages/ListingCreatePage'));
export const MessagesPage = React.lazy(() => import('../pages/MessagesPage'));
export const ChatPage = React.lazy(() => import('../pages/ChatPage'));
export const ProfilePage = React.lazy(() => import('../pages/ProfilePage'));
export const SellerProfilePage = React.lazy(() => import('../pages/SellerProfilePage'));
export const SettingsPage = React.lazy(() => import('../pages/SettingsPage'));
export const PayoutSetupPage = React.lazy(() => import('../pages/PayoutSetupPage'));
export const MyStatsPage = React.lazy(() => import('../pages/MyStatsPage'));
export const MesTransactionsPage = React.lazy(() => import('../pages/MesTransactionsPage'));
export const BecomeProPage = React.lazy(() => import('../pages/BecomeProPage'));
export const AffiliatedDeliverersPage = React.lazy(() => import('../pages/AffiliatedDeliverersPage'));
export const AcheterPackAnnoncesPage = React.lazy(() => import('../pages/AcheterPackAnnoncesPage'));
export const PaymentReturnPage = React.lazy(() => import('../pages/PaymentReturnPage'));
export const AdminDashboardPage = React.lazy(() => import('../pages/AdminDashboardPage'));
export const LoginPage = React.lazy(() => import('../pages/LoginPage'));
export const RegisterPage = React.lazy(() => import('../pages/RegisterPage'));
export const ResetPasswordPage = React.lazy(() => import('../pages/ResetPasswordPage'));
export const UpdatePasswordPage = React.lazy(() => import('../pages/UpdatePasswordPage'));
export const CompleteProfilePage = React.lazy(() => import('../pages/CompleteProfilePage'));
export const EmailConfirmedPage = React.lazy(() => import('../pages/EmailConfirmedPage'));
export const BannedPage = React.lazy(() => import('../pages/BannedPage'));
export const PricingPage = React.lazy(() => import('../pages/PricingPage'));
export const CheckoutPage = React.lazy(() => import('../pages/CheckoutPage'));
export const OrderConfirmedPage = React.lazy(() => import('../pages/OrderConfirmedPage'));
export const OrderTrackingPage = React.lazy(() => import('../pages/OrderTrackingPage'));
export const MesCommandesPage = React.lazy(() => import('../pages/MesCommandesPage'));
export const MesRevenusPage = React.lazy(() => import('../pages/MesRevenusPage'));
export const PanierPage = React.lazy(() => import('../pages/PanierPage'));
export const MapTestPage = React.lazy(() => import('../pages/MapTestPage'));
export const ShopSettingsPage = React.lazy(() => import('../pages/ShopSettingsPage'));
export const ExpressDeliveryPage = React.lazy(() => import('../pages/ExpressDeliveryPage'));
export const MaintenancePage = React.lazy(() => import('../pages/MaintenancePage'));
export const MentionsLegalesPage = React.lazy(() => import('../pages/MentionsLegalesPage'));

export const CATEGORY_SEO_PATHS = [
  '/c/:categorySlug',
  '/electronique',
  '/vehicules',
  '/mode',
  '/cosmetiques',
  '/maison-deco',
  '/sports-loisirs',
  '/livres',
  '/alimentaire',
];

export const SELLER_PROFILE_PATHS = [
  '/shop/:sellerId',
  '/b/:sellerId',
  '/seller/:sellerId',
  '/profile/seller/:sellerId',
  '/boutique/:sellerId',
  '/vendeur/:sellerId',
];

export const ADMIN_ROUTE_PATHS = [
  '/admin',
  '/admin/kpis',
  '/admin/ambassadeurs',
  '/admin/feedbacks',
  '/admin/features',
  '/admin/reports',
  '/admin/settings',
  '/admin/notifications',
  '/admin/listings',
  '/admin/users',
  '/admin/livraisons',
  '/admin/litiges',
  '/admin/payouts',
  '/admin/versements',
  '/admin/monetisation',
  '/admin/paiements',
  '/admin/maintenance',
];

export const REDIRECT_ROUTES: Array<{ from: string; to: string }> = [
  { from: '/profil', to: '/profile' },
  { from: '/coursier-express', to: '/express' },
  { from: '/livreurs-affilies', to: '/mes-livreurs' },
  { from: '/acheter-pack-annonces', to: '/acheter-pack' },
  { from: '/creer-annonce', to: '/create-listing' },
  { from: '/publier', to: '/create-listing' },
  { from: '/comment-ca-marche', to: '/how-it-works' },
  { from: '/categories', to: '/search' },
  { from: '/livreurs', to: '/mes-livreurs' },
];
