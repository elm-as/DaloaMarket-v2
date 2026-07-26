# 🛒 DaloaMarket v2

> **Marketplace locale de proximité** pour la ville de Daloa, Côte d'Ivoire.  
> Achetez, vendez et faites-vous livrer — le tout avec un paiement mobile money sécurisé.

🌐 **Production** : [daloamarket.shop](https://daloamarket.shop)

---

## 📖 Description

DaloaMarket est une application web progressive (PWA) qui permet aux habitants de Daloa de publier des annonces, acheter des produits et se faire livrer à domicile. La plateforme intègre :

- **Marketplace complète** : Publication d'annonces avec photos, recherche, filtres par catégorie, système de messagerie entre acheteurs et vendeurs
- **Paiement sécurisé** : Intégration Money Fusion (mobile money) avec système d'escrow (séquestre)
- **Système de livraison** : Connexion avec [DaloaDelivery](../DaloaDelivery/) pour la livraison par moto, vélo, voiture ou triporteur
- **Monétisation** : Badges vendeur Pro, boosts, bumps, packs d'annonces (désactivable via feature flags)
- **Administration** : Dashboard admin avec KPIs, gestion des utilisateurs, modération des annonces

---

## 🏗️ Stack technique

| Couche | Technologies |
|--------|-------------|
| **Framework** | React 18 + TypeScript + Vite 6 |
| **Styling** | Tailwind CSS 3 |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, RLS, RPC) |
| **Paiement** | Money Fusion API via Express.js (Railway) |
| **Cartographie** | Leaflet + React-Leaflet |
| **Animations** | Framer Motion |
| **UI** | Lucide React (icônes), react-hot-toast, react-dropzone |
| **Formulaires** | react-hook-form |
| **Déploiement** | Netlify (frontend) + Railway (API paiement) |

---

## 📂 Structure du projet

```
DaloaMarket-v2/
├── src/
│   ├── App.tsx                  # Routes (37 pages, lazy loading)
│   ├── main.tsx                 # Point d'entrée
│   ├── components/
│   │   ├── app/                 # Layout, ErrorBoundary
│   │   ├── auth/                # PrivateRoute, AdminRoute
│   │   ├── cart/                # Panier
│   │   ├── chat/                # Messagerie
│   │   ├── listings/            # Annonces
│   │   ├── maps/                # Cartes Leaflet
│   │   ├── profile/             # Profils utilisateurs
│   │   ├── search/              # Recherche
│   │   └── ui/                  # Composants réutilisables
│   ├── context/
│   │   └── CartContext.tsx       # Gestion du panier
│   ├── contexts/
│   │   ├── SupabaseContext.tsx   # Auth + profil utilisateur
│   │   ├── MessageReadContext.tsx # Messages lus/non lus
│   │   └── supabaseContextTypes.ts
│   ├── hooks/
│   │   ├── useSupabase.ts       # Hook auth principal
│   │   ├── useIsMobile.ts       # Détection mobile
│   │   ├── usePageTitle.ts      # Titre de page dynamique
│   │   └── useUnreadMessageCount.ts
│   ├── lib/
│   │   ├── supabase.ts          # Client Supabase (typé)
│   │   ├── database.types.ts    # Types auto-générés Supabase
│   │   ├── delivery.ts          # Calculs livraison (haversine, frais)
│   │   ├── deliveryRequestService.ts
│   │   ├── featureFlags.ts      # Feature flags (Phase0, monétisation)
│   │   ├── payment.ts           # Client paiement Money Fusion
│   │   ├── messages.ts          # Service messagerie
│   │   ├── analytics.ts         # Analytics
│   │   ├── pricing.ts           # Constantes tarification
│   │   ├── pushNotifications.ts # Notifications push
│   │   └── utils.ts             # Utilitaires
│   ├── pages/                   # 37 pages (voir Routes)
│   ├── styles/                  # CSS
│   └── types/
│       └── delivery.ts          # Types livraison
├── railway-server/              # API paiement Express.js
│   ├── index.js                 # Serveur (302 lignes)
│   ├── package.json
│   ├── render.yaml              # Config Render (backup)
│   └── test-api.js              # Tests API
├── supabase/
│   ├── migrations/              # 19 fichiers SQL
│   └── emails/                  # Templates emails
├── docs/
│   ├── DELIVERY_FLOW.md         # Flow livraison complet (835 lignes)
│   ├── DALOADELIVERY_CHANGES.md # Changements côté DaloaDelivery
│   └── API MoneyFusion.txt      # Doc API paiement
├── public/                      # Assets statiques (logos, manifest PWA)
├── index.html                   # SEO, Open Graph, JSON-LD, PWA
├── vite.config.ts               # Aliases @/, proxy /api
├── tailwind.config.js
├── robots.txt
└── logos.json                   # Configuration logos
```

---

## 🗺️ Routes

### Pages publiques
| Route | Page | Description |
|-------|------|-------------|
| `/` | HomePage | Page d'accueil avec annonces récentes |
| `/search` | SearchPage | Recherche et filtres |
| `/listings/:id` | ListingDetailPage | Détail d'une annonce |
| `/profile/seller/:sellerId` | SellerProfilePage | Profil vendeur public |
| `/about` | AboutPage | À propos |
| `/faq` | FAQPage | Questions fréquentes |
| `/terms` | TermsPage | CGU |
| `/privacy` | PrivacyPage | Politique de confidentialité |
| `/help` | HelpPage | Aide |
| `/how-it-works` | HowItWorksPage | Comment ça marche |

### Pages authentifiées
| Route | Page | Description |
|-------|------|-------------|
| `/create-listing` | ListingCreatePage | Créer une annonce |
| `/messages` | MessagesPage | Boîte de messagerie |
| `/messages/:listingId/:userId` | ChatPage | Conversation |
| `/profile` | ProfilePage | Mon profil |
| `/settings` | SettingsPage | Paramètres |
| `/panier` | PanierPage | Panier d'achat |
| `/checkout/:listingId` | CheckoutPage | Paiement |
| `/checkout/cart` | CheckoutPage | Paiement panier |
| `/suivi/:orderId` | OrderTrackingPage | Suivi de commande |
| `/mes-commandes` | MesCommandesPage | Mes commandes |
| `/mes-revenus` | MesRevenusPage | Revenus vendeur |
| `/mes-statistiques` | MyStatsPage | Statistiques |
| `/boutique` | ShopSettingsPage | Paramètres boutique |

### Pages monétisation (masquées en Phase0)
| Route | Page | Description |
|-------|------|-------------|
| `/devenir-pro` | BecomeProPage | Badge Pro |
| `/acheter-pack` | AcheterPackAnnoncesPage | Packs de crédits d'annonces |
| `/mes-paiements` | MesTransactionsPage | Historique paiements |
| `/pricing` | PricingPage | Tarification |

### Pages admin
| Route | Page |
|-------|------|
| `/admin` | AdminDashboardPage |
| `/admin/kpis` | KPIs |
| `/admin/users` | Gestion utilisateurs |
| `/admin/listings` | Modération annonces |
| `/admin/reports` | Rapports |
| `/admin/notifications` | Notifications |

---

## ⚙️ Feature Flags

La monétisation est contrôlée par des feature flags configurables dans `.env` :

| Flag | Défaut | Description |
|------|--------|-------------|
| `VITE_PHASE0_FREE_MODE` | `false` | Si `true`, désactive toute la monétisation |
| `VITE_BETA_DISABLE_LISTING_PAYMENTS` | `true` | Désactive le paiement pour publier |
| `VITE_MAX_FREE_LISTINGS` | `10` | Limite d'annonces gratuites (ignoré en Phase0) |
| `VITE_ENABLE_BOOST` | `true` | Active le boost d'annonces |
| `VITE_ENABLE_BUMP` | `true` | Active le bump d'annonces |
| `VITE_ENABLE_SELLER_BADGE` | `true` | Active le badge vendeur Pro |

---

## 🚀 Installation et lancement

### Prérequis

- Node.js ≥ 18
- npm ≥ 9
- Projet Supabase configuré

### Installation

```bash
cd DaloaMarket-v2
npm install
cp .env.example .env
# → Renseigner les variables d'environnement
```

### Variables d'environnement

```env
# Supabase
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=...         # Pour railway-server et fonctions admin

# Emails
RESEND_API_KEY=re_XXXXXXXX

# App
VITE_APP_URL=http://localhost:5173
SITE_URL=http://localhost:5173

# Paiement
VITE_PAYMENT_API_URL=http://localhost:3000  # Dev : railway-server local

# Feature Flags
VITE_BETA_DISABLE_LISTING_PAYMENTS=true
VITE_MAX_FREE_LISTINGS=10
VITE_ENABLE_BOOST=true
VITE_ENABLE_BUMP=true
VITE_ENABLE_SELLER_BADGE=true
```

### Développement

```bash
# Frontend
npm run dev                    # → http://localhost:5173

# API Paiement (optionnel)
cd railway-server
npm install
node index.js                  # → http://localhost:3000
```

### Build production

```bash
npm run build                  # → ./dist/
npm run preview                # Prévisualiser le build
```

---

## 💳 API Paiement (Railway Server)

Le sous-dossier `railway-server/` contient un serveur Express qui fait le pont entre le frontend et l'API Money Fusion :

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/create-payment` | POST | Crée un paiement (order, badge, pack) |
| `/payment-webhook` | POST | Webhook appelé par Money Fusion |
| `/check-payment` | GET | Vérifie le statut d'un paiement |
| `/ip` | GET | IP publique du serveur (pour whitelist) |
| `/config` | GET | Diagnostic configuration |
| `/health` | GET | Health check |

Voir [railway-server/README.md](./railway-server/README.md) pour le déploiement.

---

## 🗄️ Migrations Supabase

19 migrations SQL dans `supabase/migrations/` couvrant :

- Système de livraison (orders, delivery_assignments, escrow)
- Stockage (RLS policies pour photos/avatars)
- Messagerie (messages, lecture)
- Coordonnées GPS (shop location)
- Sécurité livraison (OTP, GPS, photo, RLS, RPC)
- Idempotence payout
- Résolution litiges

---

## 🔗 Connexion avec DaloaDelivery

Ce projet partage sa base Supabase avec [DaloaDelivery](../DaloaDelivery/). Les tables clés partagées sont `delivery_assignments`, `orders`, `delivery_persons`, et `escrow_transactions`.

Voir le [README combiné](../README.md) pour l'architecture complète de l'écosystème.

---

## 📄 Licence

Projet propriétaire — Tous droits réservés © 2025-2026 DaloaMarket.
