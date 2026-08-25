# 📱 Guide & Catalogue des Notifications Push — DaloaMarket & DaloaDelivery

Ce guide répertorie des modèles de notifications push prêts à l'envoi, classés par **objectifs marketing**, avec le bon ton ivoirien/local, les emojis adaptés, les **vraies URLs de redirection vérifiées dans le code**, et les payloads JSON pour l'API `/push/send`.

---

## 🗺️ Cartographie des Vraies Routes du Projet

Toutes les URLs ci-dessous sont **100% fonctionnelles et vérifiées** dans [`App.tsx`](file:///c:/Users/elmas/Downloads/DM_DD/DaloaMarket-v2/src/App.tsx) :

| Page cible | Route principale (Code) | Alias FR supporté | Description |
| :--- | :--- | :--- | :--- |
| **Mon Profil (Annonces)** | `/profile?tab=listings` | `/profile`, `/profil` | Espace personnel & annonces actives |
| **Ma Boutique (Studio)** | `/profile?tab=shop` | `/profile?tab=boutique` | Vitrine vendeur & lien de partage boutique |
| **Réglages Boutique** | `/settings?tab=boutique` | `/settings?tab=shop` | Nom, logo, bannière, GPS de la boutique |
| **Mon Compte** | `/settings?tab=compte` | `/settings?tab=account` | Nom, téléphone, mot de passe |
| **Créer une annonce** | `/create-listing` | `/creer-annonce`, `/publier` | Formulaire de publication (Vendeur) |
| **Accueil & Nouveautés** | `/` | `/` | Flux principal des annonces |
| **Recherche & Catalogue** | `/search` | `/categories` | Recherche avec filtres et catégories |
| **Catégories spécifiques** | `/c/electronique`, `/c/mode` | `/electronique`, `/mode`, `/vehicules`, etc. | Accès direct à une catégorie |
| **Comment ça marche** | `/how-it-works` | `/comment-ca-marche` | Guide sécurité, OTP et livraison |
| **Mon Panier** | `/panier` | `/panier` | Panier d'achats en cours |
| **Mes Commandes** | `/mes-commandes` | `/mes-commandes` | Suivi des achats & ventes |
| **Gestion Livreurs** | `/mes-livreurs` | `/livreurs` | Livreurs affiliés pour commerçants |
| **Inscription Livreur (DD)** | `https://livreur.daloamarket.com/devenir-livreur` | `/devenir-livreur` *(sur DaloaDelivery)* | Inscription des motocyclistes |

---

## 📋 Sommaire des Notifications
1. [💬 Levier A : Catalogue WhatsApp & Partage en Statut (Vendeurs)](#-levier-a--catalogue-whatsapp--partage-en-statut-vendeurs)
2. [📲 Objectif 0 : Inciter à Installer l'Application Mobile (PWA)](#-objectif-0--inciter-à-installer-lapplication-mobile-pwa)
1. [🎯 Objectif 1 : Inciter à publier des annonces (Vendeurs & Particuliers)](#-objectif-1--inciter-à-publier-des-annonces-vendeurs--particuliers)
2. [🛍️ Objectif 2 : Booster les achats & Découvrir les nouveautés (Acheteurs)](#️-objectif-2--booster-les-achats--découvrir-les-nouveautés-acheteurs)
3. [⚡ Objectif 3 : Occasions clés (Week-end, Fin de mois, Rentrée)](#-objectif-3--occasions-clés-week-end-fin-de-mois-rentrée)
4. [🔒 Objectif 4 : Confiance, Paiement Sécurisé & Livraison Express](#-objectif-4--confiance-paiement-sécurisé--livraison-express)
5. [🔄 Objectif 5 : Réactivation des utilisateurs inactifs](#-objectif-5--réactivation-des-utilisateurs-inactifs)
6. [🛵 Objectif 6 : Recrutement & Motivation des Livreurs (DaloaDelivery)](#-objectif-6--recrutement--motivation-des-livreurs-daloadelivery)
7. [💻 Guide Technique : Comment envoyer via l'API](#-guide-technique--comment-envoyer-via-lapi)

---

## 🎯 Objectif 1 : Inciter à publier des annonces (Vendeurs & Particuliers)

> **But :** Augmenter le catalogue en rappelant que publier est gratuit, rapide et rapporte des clients 24h/24.

---

### Option A — La rentabilité passive *(Votre idée phare)*
* **Titre :** 💰 Une annonce aujourd’hui, de l’argent qui rentre demain !
* **Message :** Publie ton article en 1 minute : il reste visible 24h/24 auprès de milliers d'acheteurs à Daloa. Ne laisse pas dormir tes produits !
* **Lien cible :** `/create-listing`
* **Moment conseillé :** Mercredi ou Jeudi vers 12h30

```json
{
  "target": "all",
  "title": "💰 Une annonce aujourd’hui, de l’argent qui rentre demain !",
  "body": "Publie ton article en 1 minute : il reste visible 24h/24 auprès de milliers d'acheteurs à Daloa. Ne laisse pas dormir tes produits !",
  "url": "/create-listing",
  "tag": "promo-publish-passive"
}
```

---

### Option B — Vider les placards / Cash rapide
* **Titre :** 📦 Transforme tes objets inutilisés en cash !
* **Message :** Un téléphone, un vêtement ou un appareil qui traîne chez toi ? Dépose ton annonce gratuitement et trouve un acheteur à Daloa aujourd'hui.
* **Lien cible :** `/create-listing`
* **Moment conseillé :** Samedi matin entre 09h00 et 11h00

```json
{
  "target": "all",
  "title": "📦 Transforme tes objets inutilisés en cash !",
  "body": "Un téléphone, un vêtement ou un appareil qui traîne chez toi ? Dépose ton annonce gratuitement et trouve un acheteur à Daloa aujourd'hui.",
  "url": "/create-listing",
  "tag": "promo-publish-declutter"
}
```

---

### Option C — Spécial Commerçants & Boutiques de Daloa
* **Titre :** 🏪 Fais décoller tes ventes à Daloa sans payer de loyer !
* **Message :** Expose tes articles sur DaloaMarket et reçois des commandes directes avec livraison à domicile pour tes clients.
* **Lien cible :** `/create-listing`
* **Moment conseillé :** Lundi matin vers 08h30

```json
{
  "target": "all",
  "title": "🏪 Fais décoller tes ventes à Daloa sans payer de loyer !",
  "body": "Expose tes articles sur DaloaMarket et reçois des commandes directes avec livraison à domicile pour tes clients.",
  "url": "/create-listing",
  "tag": "promo-publish-merchants"
}
```

---

### Option D — Défi Rapidité / 60 secondes chrono
* **Titre :** ⏱️ 60 secondes pour publier ton annonce !
* **Message :** Prends 2 photos, fixe ton prix et c'est en ligne. 0 FCFA de frais pour publier sur DaloaMarket.
* **Lien cible :** `/create-listing`
* **Moment conseillé :** Dimanche après-midi vers 16h00

```json
{
  "target": "all",
  "title": "⏱️ 60 secondes pour publier ton annonce !",
  "body": "Prends 2 photos, fixe ton prix et c'est en ligne. 0 FCFA de frais pour publier sur DaloaMarket.",
  "url": "/create-listing",
  "tag": "promo-publish-fast"
}
```

---

## 🛍️ Objectif 2 : Booster les achats & Découvrir les nouveautés (Acheteurs)

> **But :** Créer l'envie d'explorer le catalogue et générer des commandes.

---

### Option A — Nouveaux arrivages du jour
* **Titre :** 🔥 Les pépites du jour sont arrivées à Daloa !
* **Message :** Téléphones, mode, électroménager, accessoires... Découvre les dernières annonces fraîchement publiées près de chez toi.
* **Lien cible :** `/`
* **Moment conseillé :** Tous les jours à 12h00 ou 18h30

```json
{
  "target": "all",
  "title": "🔥 Les pépites du jour sont arrivées à Daloa !",
  "body": "Téléphones, mode, électroménager, accessoires... Découvre les dernières annonces fraîchement publiées près de chez toi.",
  "url": "/",
  "tag": "explore-new-listings"
}
```

---

### Option B — Confort & Zéro fatigue
* **Titre :** 🛵 Fais ton marché sans quitter ton salon !
* **Message :** Évite les embouteillages et le soleil. Découvre les boutiques de Daloa et fais-toi livrer où tu veux.
* **Lien cible :** `/search`
* **Moment conseillé :** Samedi ou Dimanche vers 11h30

```json
{
  "target": "all",
  "title": "🛵 Fais ton marché sans quitter ton salon !",
  "body": "Évite les embouteillages et le soleil. Découvre les boutiques de Daloa et fais-toi livrer où tu veux.",
  "url": "/search",
  "tag": "explore-comfort"
}
```

---

### Option C — Bonnes affaires & Prix choc
* **Titre :** 🏷️ Des prix imbattables à Daloa !
* **Message :** Consulte les articles disponibles et commande directement avec livraison sécurisée.
* **Lien cible :** `/search`
* **Moment conseillé :** Mardi ou Mercredi vers 17h30

```json
{
  "target": "all",
  "title": "🏷️ Des prix imbattables à Daloa !",
  "body": "Consulte les articles disponibles et commande directement avec livraison sécurisée.",
  "url": "/search",
  "tag": "explore-deals"
}
```

---

## ⚡ Objectif 3 : Occasions clés (Week-end, Fin de mois, Rentrée)

> **But :** Capitaliser sur les moments où les utilisateurs ont du temps ou de la liquidité.

---

### Option A — Spécial Fin de Mois / Jour de Paie
* **Titre :** 💳 C’est la fin du mois : Fais-toi plaisir !
* **Message :** Découvre les meilleures offres sélectionnées pour toi à Daloa. Offre-toi ce dont tu rêvais au meilleur prix.
* **Lien cible :** `/search`
* **Moment conseillé :** Du 28 au 02 du mois, à 18h00

```json
{
  "target": "all",
  "title": "💳 C’est la fin du mois : Fais-toi plaisir !",
  "body": "Découvre les meilleures offres sélectionnées pour toi à Daloa. Offre-toi ce dont tu rêvais au meilleur prix.",
  "url": "/search",
  "tag": "event-payday"
}
```

---

### Option B — Spécial Week-end / Bonnes Affaires du Samedi
* **Titre :** ☀️ Bon week-end à Daloa !
* **Message :** Profite de ton samedi pour chiner les meilleures affaires du week-end sur DaloaMarket. Livraison rapide garantie !
* **Lien cible :** `/`
* **Moment conseillé :** Samedi matin à 09h30

```json
{
  "target": "all",
  "title": "☀️ Bon week-end à Daloa !",
  "body": "Profite de ton samedi pour chiner les meilleures affaires du week-end sur DaloaMarket. Livraison rapide garantie !",
  "url": "/",
  "tag": "event-weekend"
}
```

---

## 🔒 Objectif 4 : Confiance, Paiement Sécurisé & Livraison Express

> **But :** Rassurer les clients hésitants sur la sécurité des transactions et la fiabilité de la livraison.

---

### Option A — Paiement Sécurisé & Protection Acheteur
* **Titre :** 🛡️ Achetez en toute confiance avec Wave & MoMo !
* **Message :** Sur DaloaMarket, ton argent est protégé : le vendeur n'est payé qu'une fois ton colis reçu et validé. Zéro risque d'arnaque !
* **Lien cible :** `/how-it-works`
* **Moment conseillé :** Jeudi vers 15h00

```json
{
  "target": "all",
  "title": "🛡️ Achetez en toute confiance avec Wave & MoMo !",
  "body": "Sur DaloaMarket, ton argent est protégé : le vendeur n'est payé qu'une fois ton colis reçu et validé. Zéro risque d'arnaque !",
  "url": "/how-it-works",
  "tag": "trust-security"
}
```

---

### Option B — La vitesse DaloaDelivery
* **Titre :** ⚡ Livraison express partout à Daloa !
* **Message :** Commandé à 14h, livré à 15h ! Nos livreurs DaloaDelivery sillonnent tous les quartiers pour vous servir.
* **Lien cible :** `/`
* **Moment conseillé :** Vendredi vers 11h30

```json
{
  "target": "all",
  "title": "⚡ Livraison express partout à Daloa !",
  "body": "Commandé à 14h, livré à 15h ! Nos livreurs DaloaDelivery sillonnent tous les quartiers pour vous servir.",
  "url": "/",
  "tag": "trust-delivery-speed"
}
```

---

## 🔄 Objectif 5 : Réactivation des utilisateurs inactifs

> **But :** Faire revenir les utilisateurs qui n'ont pas ouvert l'application depuis plusieurs jours.

---

### Option A — Tu nous as manqué
* **Titre :** 👋 Ça fait un moment ! Viens voir les nouveautés
* **Message :** De nombreux vendeurs ont ajouté de nouveaux articles à Daloa depuis ton dernier passage. Viens jeter un coup d’œil !
* **Lien cible :** `/`
* **Moment conseillé :** Dimanche soir vers 19h00

```json
{
  "target": "all",
  "title": "👋 Ça fait un moment ! Viens voir les nouveautés",
  "body": "De nombreux vendeurs ont ajouté de nouveaux articles à Daloa depuis ton dernier passage. Viens jeter un coup d’œil !",
  "url": "/",
  "tag": "reengage-miss-you"
}
```

---

### Option B — Un acheteur cherche peut-être ce que tu as
* **Titre :** 💡 Et si tu gagnais de l'argent ce soir ?
* **Message :** Des acheteurs recherchent activement des articles à Daloa. Poste ton annonce maintenant et reçois tes premiers messages.
* **Lien cible :** `/create-listing`
* **Moment conseillé :** Mardi soir vers 19h30

```json
{
  "target": "all",
  "title": "💡 Et si tu gagnais de l'argent ce soir ?",
  "body": "Des acheteurs recherchent activement des articles à Daloa. Poste ton annonce maintenant et reçois tes premiers messages.",
  "url": "/create-listing",
  "tag": "reengage-earn-tonight"
}
```

---

## 🛵 Objectif 6 : Recrutement & Motivation des Livreurs (DaloaDelivery)

> **But :** Recruter de nouveaux livreurs partenaires ou encourager les livreurs à se mettre "En ligne".

---

### Option A — Recrutement de Livreurs
* **Titre :** 🛵 Tu as une moto à Daloa ? Gagne de l'argent chaque jour !
* **Message :** Rejoins le réseau DaloaDelivery : reçois des courses directement sur ton téléphone et sois payé instantanément.
* **Lien cible :** `/mes-livreurs` *(ou `https://livreur.daloamarket.com/devenir-livreur`)*
* **Moment conseillé :** Lundi ou Mercredi vers 10h00

```json
{
  "target": "all",
  "title": "🛵 Tu as une moto à Daloa ? Gagne de l'argent chaque jour !",
  "body": "Rejoins le réseau DaloaDelivery : reçois des courses directement sur ton téléphone et sois payé instantanément.",
  "url": "/mes-livreurs",
  "tag": "driver-recruit"
}
```

---

## 💻 Guide Technique : Comment envoyer une notification ?

Votre serveur Railway possède déjà l'endpoint `/push/send`.

### Exemple d'envoi en ligne de commande (cURL / PowerShell) :

```bash
curl -X POST https://api.daloamarket.ci/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "target": "all",
    "title": "💰 Une annonce aujourd’hui, de l’argent qui rentre demain !",
    "body": "Publie ton article en 1 minute : il reste visible 24h/24 auprès de milliers d acheteurs à Daloa.",
    "url": "/create-listing",
    "tag": "promo-publish"
  }'
```

### 💡 Bonnes pratiques d'envoi :
1. **Longueur maximale recommandée :**
   - **Titre :** 40 à 50 caractères max (pour ne pas être tronqué sur Android/iOS).
   - **Message :** 90 à 120 caractères max.
2. **Fréquence idéale :** 2 à 3 notifications push broadcast par semaine maximum pour éviter les désabonnements.
3. **Meilleurs créneaux horaires à Daloa :**
   - **Midi :** Entre 12h00 et 13h30 (pause déjeuner).
   - **Soirée :** Entre 18h00 et 20h30 (détente / temps d'écran).
   - **Samedi matin :** Entre 09h00 et 11h00 (achats et rangement du week-end).
