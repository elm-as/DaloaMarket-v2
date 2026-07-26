# Flow DaloaMarket ↔ DaloaDelivery

## Vue d'ensemble

DaloaMarket et DaloaDelivery partagent la même base de données Supabase. Le flow de livraison utilise principalement les tables :
- `orders` : Commandes clients
- `delivery_assignments` : Assignations de livraison
- `delivery_persons` : Profils des livreurs
- `escrow_transactions` : Transactions escrow

## Flow complet de commande

### 1. Création de commande (DaloaMarket)

**Acheteur** :
- Sélectionne un article et ajoute au panier
- Choisi le mode de livraison ("delivery")
- Saisit l'adresse de livraison (latitude/longitude)
- Passe commande via paiement sécurisé (Money Fusion)

**Backend** :
- Crée un enregistrement dans `orders` avec status `pending`
- Crée un enregistrement dans `escrow_transactions` avec status `pending`
- Redirige vers Money Fusion pour paiement

### 2. Paiement confirmé (Webhook Money Fusion)

**Backend** :
- Met à jour `escrow_transactions.status` → `funded`
- Met à jour `orders.status` → `paid`
- Crée un enregistrement dans `delivery_assignments` avec :
  - `status` = `awaiting_pickup`
  - `pickup_confirmed_by_seller` = `false`
  - Génère un `pickup_otp` (code à 6 chiffres, communiqué uniquement au vendeur)
  - Génère un `delivery_otp` (code à 6 chiffres, communiqué uniquement à l'acheteur)

### 3. Confirmation par le vendeur (DaloaMarket)

**Ce que voit le vendeur** :
- Liste des commandes payées (status = `paid`)
- Détails de chaque commande :
  - Nom de l'acheteur
  - Article commandé
  - Prix total
  - Adresse de livraison
  - Code OTP de ramassage (pickup_otp) - à donner au livreur
  - Statut de l'assignation de livraison

**Actions du vendeur** :
- Clique sur "Confirmer la commande"
- Peut prendre une photo de préparation (optionnel)
- Confirme sa position GPS

**Backend** :
- Met à jour `delivery_assignments.pickup_confirmed_by_seller` = `true`
- Met à jour `delivery_assignments.pickup_confirmed_at` = `now()`
- Enregistre `pickup_gps` et `pickup_gps_distance_m`
- Met à jour `orders.status` → `in_transit`
- **Déclenche la notification aux livreurs disponibles**

### 4. Assignation du livreur (DaloaDelivery)

**Ce que voit le livreur** (DashboardLivreur) :
- Liste des commandes disponibles (status = `awaiting_pickup` ET `pickup_confirmed_by_seller` = `true`)
- Pour chaque commande :
  - Adresse du vendeur (pickup)
  - Adresse de l'acheteur (dropoff)
  - Distance estimée
  - Prix de livraison (calculé : 500 FCFA + 200 FCFA/km)
  - Temps estimé
  - Photo de préparation (si disponible)

**Actions du livreur** :
- Clique sur "Accepter la commande"
- Confirme sa disponibilité

**Backend** :
- Met à jour `delivery_assignments.delivery_person_id` = ID du livreur
- Met à jour `delivery_assignments.status` = `accepted` (livreur assigné, pas encore arrivé)
- Enregistre `accepted_at` = `now()`
- **Masque la commande pour les autres livreurs**

### 5. Ce que voient les autres livreurs

**Règle de visibilité** :
- Une commande acceptée par un livreur est **invisible** pour les autres livreurs
- Les livreurs ne voient que les commandes avec :
  - `delivery_assignments.status` = `awaiting_pickup`
  - `delivery_assignments.delivery_person_id` = `NULL`
  - `delivery_assignments.pickup_confirmed_by_seller` = `true`

**Si un livreur ne se présente pas (timeout 1h30)** :
- Un job cron vérifie toutes les 10 minutes les commandes en attente
- Si `now() - accepted_at > 90 minutes` ET status = `accepted` :
  - Met à jour `delivery_assignments.delivery_person_id` = `NULL`
  - Met à jour `delivery_assignments.status` = `awaiting_pickup`
  - Met à jour `delivery_assignments.accepted_at` = `NULL`
  - Incrémente un compteur de "no-show" pour le livreur dans `user_reliability.no_show_count`
  - Réduit `user_reliability.reliability_score` de 10 points
  - La commande redevient visible pour les autres livreurs

### 6. Ramassage chez le vendeur

**Ce que voit le livreur** (en route vers le vendeur) :
- Adresse exacte du vendeur
- Itinéraire optimisé (OSRM)
- Position GPS du vendeur (si partagée)

**Actions du livreur** :
- Arrive chez le vendeur
- Demande le code OTP de ramassage (pickup_otp) au vendeur
- Le vendeur communique le code
- Le livreur saisit le code dans l'app
- **Prend une photo de ramassage (obligatoire)**
- Confirme sa position GPS

**Backend** :
- Vérifie le code OTP (`delivery_assignments.pickup_otp`)
- Vérifie la distance GPS entre livreur et vendeur (max 100m toléré)
- Si correct (max 3 tentatives) ET distance GPS acceptable :
  - Met à jour `delivery_assignments.pickup_photo_url`
  - Met à jour `delivery_assignments.pickup_gps`
  - Met à jour `delivery_assignments.pickup_gps_distance_m`
  - Met à jour `delivery_assignments.pickup_otp_attempts`
  - Met à jour `delivery_assignments.status` = `picked_up`
- Si incorrect après 3 tentatives OU distance GPS > 100m :
  - Met à jour `delivery_assignments.status` = `disputed`
  - Notifie le support

### 7. Ce que voit l'acheteur en attendant la livraison

**Dashboard acheteur** :
- Liste des commandes en cours
- Pour chaque commande :
  - Statut actuel (en attente de livreur, en route vers vendeur, en livraison)
  - Position GPS du livreur (en temps réel)
  - Temps estimé d'arrivée
  - Code OTP de livraison (à communiquer au livreur)
  - Photo de ramassage (si disponible)

**Notifications push** :
- "Livreur accepté"
- "Livreur en route vers le vendeur"
- "Livreur en route vers vous"
- "Livreur à proximité"

### 8. Livraison chez l'acheteur

**Ce que voit le livreur** (en route vers l'acheteur) :
- Adresse de livraison
- Itinéraire optimisé
- Position GPS de l'acheteur (si partagée)
- Code OTP à obtenir de l'acheteur

**Actions du livreur** :
- Arrive chez l'acheteur
- Demande le code OTP
- L'acheteur communique le code
- Le livreur saisit le code dans l'app
- **Prend une photo de livraison (obligatoire)**
- Confirme sa position GPS

**Backend** :
- Vérifie le code OTP (`delivery_assignments.delivery_otp`)
- Vérifie la distance GPS entre livreur et acheteur (max 100m toléré)
- Si correct (max 3 tentatives) ET distance GPS acceptable :
  - **Idempotence check** : Vérifie que `delivery_assignments.status` != `delivered` (check-and-set atomique)
  - Met à jour `delivery_assignments.status` = `delivered`
  - Met à jour `delivery_assignments.delivered_at` = `now()`
  - Met à jour `delivery_assignments.delivery_gps`
  - Met à jour `delivery_assignments.delivery_gps_distance_m`
  - Met à jour `delivery_assignments.delivery_otp_attempts`
  - Met à jour `orders.status` = `completed`
  - Met à jour `escrow_transactions.status` = `released`
  - Déclenche le paiement du vendeur (payout) avec idempotency key basée sur `delivery_assignments.id`
  - Déclenche le paiement du livreur (payout) avec idempotency key basée sur `delivery_assignments.id`
- Si incorrect après 3 tentatives OU distance GPS > 100m :
  - Met à jour `delivery_assignments.status` = `disputed`
  - Notifie le support

### 9. Auto-release (si acheteur ne confirme pas)

**Timeout 24h** :
- Si `delivered_at` existe mais `buyer_confirmed_at` est NULL après 24h ET status != `disputed` :
  - Met à jour `delivery_assignments.buyer_confirmed_at` = `now()`
  - Met à jour `delivery_assignments.auto_released_at` = `now()`
  - Met à jour `delivery_assignments.status` = `auto_released`
  - Libère les fonds automatiquement

## États de delivery_assignments

| Status | Description | Visible par |
|--------|-------------|-------------|
| `awaiting_pickup` | En attente de livreur | Livreurs (si non assigné) |
| `accepted` | Livreur assigné, en route vers vendeur | Vendeur, Acheteur, Livreur assigné |
| `picked_up` | Ramassé chez vendeur | Vendeur, Acheteur, Livreur assigné |
| `in_transit` | En route vers acheteur | Acheteur, Livreur assigné |
| `delivered` | Livré et confirmé | Vendeur, Acheteur, Livreur assigné |
| `auto_released` | Auto-release après 24h | Tous |
| `disputed` | Litige en cours | Support |
| `cancelled` | Annulé | Tous |

## États de orders

| Status | Description | Visible par |
|--------|-------------|-------------|
| `pending` | En attente de paiement | Acheteur |
| `paid` | Payé, attente confirmation vendeur | Vendeur, Acheteur |
| `in_transit` | En livraison | Vendeur, Acheteur |
| `delivered` | Livré (physiquement) | Acheteur |
| `completed` | Terminé et payé | Tous |
| `cancelled` | Annulé | Tous |
| `disputed` | Litige | Support |

## Fiabilité des livreurs (user_reliability)

| Champ | Description |
|-------|-------------|
| `no_show_count` | Nombre de fois où le livreur ne s'est pas présenté |
| `reliability_score` | Score de fiabilité (0-100, commence à 100) |
| `response_time_avg_seconds` | Temps moyen de réponse |

**Pénalités** :
- No-show : -10 points
- Annulation : -5 points
- Litige perdu : -20 points

**Bonus** :
- Livraison réussie : +1 point
- Note 5 étoiles : +2 points

## Notifications

**Acheteur** :
- Commande confirmée
- Livreur accepté
- Livreur en route
- Livraison effectuée

**Vendeur** :
- Nouvelle commande
- Livreur accepté
- Livreur ramassé
- Livraison effectuée

**Livreur** :
- Nouvelle commande disponible
- Commande acceptée
- Commande annulée (timeout)

## Sécurité

- **OTP** : Code unique à 6 chiffres, valide 24h
- **GPS verification** : Distance max tolérée pour pickup/delivery (100m)
- **Photo proof** : Preuve visuelle obligatoire de ramassage/livraison
- **Max 3 tentatives** : Pour le code OTP avant litige

## Implémentation des corrections de sécurité

### Statut d'implémentation

| Correction | Statut | Fichier |
|------------|--------|---------|
| Séparation pickup_otp/delivery_otp | ✅ Appliqué | `railway-server/index.js`, migration SQL |
| Statut intermédiaire 'accepted' | ✅ Appliqué | migration SQL, cron no-show, DaloaDelivery |
| Idempotence payout | ✅ Appliqué | Migration SQL + stratégie documentée |
| Vérification GPS (100m) | ✅ Appliqué | RPC Postgres + RLS policies |
| Photo obligatoire | ✅ Appliqué | RPC Postgres + RLS policies |
| Exclusion disputed auto-release | ✅ Documenté | DELIVERY_FLOW.md étape 9 |
| Fee/commission routing | ✅ Documenté | Section dédiée |

### Fichiers modifiés

**Côté DaloaMarket**:
1. **Migration SQL** : `supabase/migrations/20260707_fix_delivery_flow_security.sql`
   - Ajoute `pickup_otp`, `delivery_otp`
   - Ajoute statut `accepted` au CHECK constraint
   - Ajoute colonnes de tracking OTP et GPS

2. **Webhook backend** : `railway-server/index.js`
   - Génère deux OTP distincts lors du paiement confirmé
   - Crée `delivery_assignments` avec les nouveaux champs

3. **Frontend vendeur** : `src/pages/OrderTrackingPage.tsx`
   - Affiche `pickup_otp` au vendeur
   - Bouton pour révéler le code

4. **Cron no-show** : `supabase/functions/handle_no_show_timeout.sql`
   - Fonction SQL pour gérer le timeout 90min
   - Vérifie `status = 'accepted'`

5. **RPC verify_pickup** : `supabase/functions/verify_pickup.sql`
   - Fonction RPC pour vérifier le pickup côté base de données
   - Vérifie OTP, photo obligatoire, distance GPS (100m)
   - Tracking des tentatives OTP (max 3)
   - Passage automatique en `disputed` après 3 tentatives

6. **RPC verify_delivery** : `supabase/functions/verify_delivery.sql`
   - Fonction RPC pour vérifier la delivery côté base de données
   - Vérifie OTP, photo obligatoire, distance GPS (100m)
   - Tracking des tentatives OTP (max 3)
   - Passage automatique en `disputed` après 3 tentatives

7. **Migration idempotence payout** : `supabase/migrations/20260707_add_payout_idempotence.sql`
   - Ajoute `idempotency_key` (UNIQUE) à `payouts`
   - Ajoute `provider_token` (UNIQUE) pour MoneyFusion
   - Ajoute `delivery_assignment_id` avec FK
   - Index pour les performances

8. **Migration RLS policies** : `supabase/migrations/20260707_add_delivery_assignments_rls.sql`
   - Active RLS sur `delivery_assignments`
   - Policies SELECT pour livreurs, vendeurs, acheteurs, admins
   - Policies UPDATE avec vérifications GPS/photo pour pickup et delivery
   - Policy UPDATE pour vendeurs (confirmation pickup)

9. **Migration résolution litige** : `supabase/migrations/20260707_add_dispute_resolution_fields.sql`
   - Ajoute `resolved_at`, `resolved_by`, `resolution_notes`
   - FK vers `users` pour `resolved_by`
   - Index pour les performances

**Côté DaloaDelivery**:
10. **Migration SQL** : `supabase/migrations/20260707_add_missing_delivery_assignments_fields.sql`
    - Ajoute champs de localisation (pickup/dropoff address)
    - Ajoute `delivery_price`, `delivery_photo_url`
    - Ajoute champs de litige (`disputed_at`, `dispute_reason`)
    - Crée index pour les performances

11. **Service** : `src/services/deliveryAssignmentService.ts`
    - `acceptAssignment()`: Statut `'accepted'` (pas `'picked_up'`)
    - `verifyPickup()`: Vérification OTP pickup + photo + GPS (100m)
    - `verifyDelivery()`: Vérification OTP delivery + photo + GPS (100m)
    - Tracking des tentatives OTP (max 3)

12. **Types** : `src/types/livreur.ts`
    - Interface `DeliveryAssignment` avec tous les champs de sécurité

13. **Modals** : `src/components/livreur/PickupVerificationModal.tsx`, `DeliveryVerificationModal.tsx`
    - Modal en 3 étapes: OTP → Photo → GPS
    - Photo obligatoire
    - Vérification GPS avec calcul de distance

14. **Dashboard** : `src/pages/DashboardCommandes.tsx`
    - Intégration des modals de vérification
    - Mise à jour automatique après vérification

## Stratégie d'Idempotence Payout (MoneyFusion)

### Analyse de l'API MoneyFusion

L'API MoneyFusion Payout fournit les mécanismes suivants pour l'idempotence :

- **Endpoint** : `POST https://pay.moneyfusion.net/api/v1/withdraw`
- **TokenPay** : Identifiant unique retourné lors de l'initiation d'un retrait
- **Webhooks** : `payout.session.completed`, `payout.session.cancelled`

### Stratégie d'implémentation

#### 1. Check-and-set atomique (côté base de données)

Avant d'initier un payout, vérifier qu'aucun payout n'existe déjà pour cet assignment :

```sql
-- Vérifier si un payout existe déjà pour cet assignment
SELECT COUNT(*) FROM payouts
WHERE delivery_assignment_id = :assignment_id
AND type IN ('seller', 'delivery');

-- Si count > 0, ne pas initier de nouveau payout
```

#### 2. Idempotency key basée sur delivery_assignments.id

Utiliser `delivery_assignments.id` comme identifiant unique pour chaque payout :

```javascript
// Générer un idempotency key unique
const idempotencyKey = `payout_${deliveryAssignmentId}_${type}`; // type = 'seller' ou 'delivery'

// Stocker dans la table payouts avant l'appel API
await supabase.from('payouts').insert({
  delivery_assignment_id: deliveryAssignmentId,
  type: type, // 'seller' ou 'delivery'
  amount: amount,
  recipient_phone: phone,
  idempotency_key: idempotencyKey,
  status: 'pending',
  created_at: new Date().toISOString()
});
```

#### 3. Stockage du tokenPay MoneyFusion

Après l'appel API, stocker le `tokenPay` retourné :

```javascript
const response = await fetch('https://pay.moneyfusion.net/api/v1/withdraw', {
  method: 'POST',
  headers: {
    'moneyfusion-private-key': API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    countryCode: 'ci',
    phone: phone,
    amount: amount,
    withdraw_mode: withdrawMode,
    webhook_url: webhookUrl
  })
});

const data = await response.json();
if (data.statut) {
  // Mettre à jour avec le tokenPay
  await supabase.from('payouts')
    .update({ provider_token: data.tokenPay })
    .eq('idempotency_key', idempotencyKey);
}
```

#### 4. Gestion du webhook avec idempotence

Dans le webhook payout, utiliser le `tokenPay` pour éviter les doublons :

```javascript
app.post('/payout-webhook', async (req, res) => {
  const { event, tokenPay, montant, numeroRetrait } = req.body;

  // Vérifier si ce payout existe déjà
  const { data: payout } = await supabase
    .from('payouts')
    .select('*')
    .eq('provider_token', tokenPay)
    .single();

  if (!payout) {
    // Payout inconnu, ignorer ou logger
    return res.json({ ok: false, message: 'Payout inconnu' });
  }

  // Vérifier si déjà traité
  if (payout.status === 'completed' || payout.status === 'failed') {
    return res.json({ ok: true, message: 'Déjà traité' });
  }

  // Mettre à jour le statut
  const newStatus = event === 'payout.session.completed' ? 'completed' : 'failed';
  await supabase.from('payouts')
    .update({ status: newStatus, completed_at: new Date().toISOString() })
    .eq('id', payout.id);

  res.json({ ok: true });
});
```

#### 5. Contrainte unique en base de données

Ajouter une contrainte unique pour empêcher les doublons :

```sql
ALTER TABLE payouts
ADD CONSTRAINT payouts_delivery_assignment_type_unique
UNIQUE (delivery_assignment_id, type);
```

### Points critiques

- **⚠️ Ne pas brancher le vrai payin/payout MoneyFusion en prod** tant que cette stratégie n'est pas implémentée et testée
- Le check-and-set atomique doit être fait **avant** l'appel API MoneyFusion
- Le `tokenPay` est la source de vérité côté MoneyFusion pour le suivi
- La contrainte unique en base de données est la dernière ligne de défense

## RLS Policies pour Vérifications GPS/Photo

### Problème

Les vérifications GPS et photo sont actuellement implémentées côté client (TypeScript service dans DaloaDelivery). Si l'app mobile utilise la clé anon Supabase, un livreur techniquement averti pourrait :

- Appeler directement l'API Supabase (REST/JS SDK) en contournant le service
- Sauter la vérification GPS
- Sauter la photo obligatoire
- Ignorer le tracking des tentatives OTP

### Solution : RLS Policies ou RPC Postgres

Les contraintes doivent être dupliquées au niveau **RLS policies** ou dans une **fonction Postgres (RPC)** appelée via `supabase.rpc()`.

#### Exemple de RLS Policy pour pickup

```sql
-- UPDATE autorisé vers 'picked_up' seulement si :
-- 1. pickup_photo_url IS NOT NULL
-- 2. pickup_gps_distance_m <= 100
-- 3. pickup_otp_attempts < 3

CREATE POLICY "delivery_assignments_pickup_update_policy"
ON public.delivery_assignments
FOR UPDATE
TO authenticated
USING (
  -- Seul le livreur assigné peut mettre à jour
  delivery_person_id = auth.uid()
  AND
  -- Vérifications pour transition vers 'picked_up'
  (
    -- Si on passe à 'picked_up', vérifier les contraintes
    (NEW.status = 'picked_up' AND OLD.status = 'accepted')
    AND
    NEW.pickup_photo_url IS NOT NULL
    AND
    NEW.pickup_gps_distance_m IS NOT NULL
    AND
    NEW.pickup_gps_distance_m <= 100
    AND
    NEW.pickup_otp_attempts <= 3
  )
  OR
  -- Autres mises à jour autorisées (ex: accepted_at)
  (NEW.status != 'picked_up')
);
```

#### Exemple de RLS Policy pour delivery

```sql
-- UPDATE autorisé vers 'delivered' seulement si :
-- 1. delivery_photo_url IS NOT NULL
-- 2. delivery_gps_distance_m <= 100
-- 3. delivery_otp_attempts < 3

CREATE POLICY "delivery_assignments_delivery_update_policy"
ON public.delivery_assignments
FOR UPDATE
TO authenticated
USING (
  delivery_person_id = auth.uid()
  AND
  (
    (NEW.status = 'delivered' AND OLD.status = 'in_transit')
    AND
    NEW.delivery_photo_url IS NOT NULL
    AND
    NEW.delivery_gps_distance_m IS NOT NULL
    AND
    NEW.delivery_gps_distance_m <= 100
    AND
    NEW.delivery_otp_attempts <= 3
  )
  OR
  (NEW.status != 'delivered')
);
```

#### Alternative : Fonction RPC Postgres

```sql
CREATE OR REPLACE FUNCTION verify_pickup(
  p_assignment_id uuid,
  p_otp text,
  p_photo_url text,
  p_gps_lat numeric,
  p_gps_lng numeric
)
RETURNS json AS $$
DECLARE
  assignment RECORD;
  seller RECORD;
  distance_m numeric;
BEGIN
  -- Récupérer l'assignment
  SELECT * INTO assignment
  FROM delivery_assignments
  WHERE id = p_assignment_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_not_found');
  END IF;

  -- Vérifier OTP
  IF assignment.pickup_otp != p_otp THEN
    UPDATE delivery_assignments
    SET pickup_otp_attempts = pickup_otp_attempts + 1
    WHERE id = p_assignment_id;

    IF assignment.pickup_otp_attempts + 1 >= 3 THEN
      UPDATE delivery_assignments
      SET status = 'disputed'
      WHERE id = p_assignment_id;
      RETURN json_build_object('success', false, 'reason', 'too_many_attempts');
    END IF;

    RETURN json_build_object('success', false, 'reason', 'invalid_otp', 'attempts', assignment.pickup_otp_attempts + 1);
  END IF;

  -- Vérifier photo
  IF p_photo_url IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'photo_required');
  END IF;

  -- Calculer distance GPS
  SELECT * INTO seller
  FROM users
  WHERE id = (SELECT seller_id FROM orders WHERE id = assignment.order_id);

  distance_m := calculate_distance(p_gps_lat, p_gps_lng, seller.lat, seller.lng);

  IF distance_m > 100 THEN
    RETURN json_build_object('success', false, 'reason', 'gps_distance_exceeded', 'distance', distance_m);
  END IF;

  -- Tout est OK, mettre à jour
  UPDATE delivery_assignments
  SET
    status = 'picked_up',
    pickup_photo_url = p_photo_url,
    pickup_gps = json_build_object('lat', p_gps_lat, 'lng', p_gps_lng),
    pickup_gps_distance_m = distance_m,
    picked_up_at = now()
  WHERE id = p_assignment_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

### Statut d'implémentation

| Contrainte | Côté client (DaloaDelivery) | RLS Policy | RPC Postgres |
|------------|----------------------------|-------------|--------------|
| Photo obligatoire | ✅ | ✅ Appliqué | ✅ Appliqué |
| Vérification GPS (100m) | ✅ | ✅ Appliqué | ✅ Appliqué |
| Tracking tentatives OTP | ✅ | ✅ Appliqué | ✅ Appliqué |

**✅ Implémenté** : RLS policies et RPC Postgres sont maintenant appliqués.

## GPS Spoofing

### Limitation du seuil de 100m

Le seuil de 100 mètres pour la vérification GPS est une bonne mesure contre :
- L'erreur GPS normale (précision GPS ~5-10m en conditions idéales)
- Les petites divergences de position

### Vulnérabilité au spoofing

Cependant, ce seuil ne protège pas contre le **GPS spoofing** :
- Facile sur Android avec le mode développeur
- Possible via des apps de fake GPS
- Un livreur et vendeur/acheteur complices peuvent falsifier les positions GPS en même temps que l'OTP

### Impact

Un scénario de fraude possible :
1. Le livreur et le vendeur se mettent d'accord
2. Le livreur utilise un fake GPS pour apparaître à 50m du vendeur
3. Le vendeur communique le `pickup_otp` au livreur
4. Le livreur valide le pickup sans se déplacer physiquement
5. Le même scénario peut se reproduire à la livraison avec l'acheteur

### Recommandations

- **Court terme** : Accepter cette limitation car vous êtes encore à zéro transaction réelle
- **Moyen terme** : Envisager des mesures supplémentaires :
  - Vérification de la cohérence des positions GPS (ex: vitesse de déplacement réaliste)
  - Utilisation de l'IP pour vérifier la localisation approximative
  - Demande de photo avec géolocalisation EXIF
  - Signature du vendeur/acheteur via l'app mobile

### Statut

| Mesure | Statut |
|--------|--------|
| Seuil GPS 100m | ✅ Implémenté |
| Protection anti-spoofing | ⏳ Non implémenté (accepté comme limitation) |

## Résolution du Statut Disputed

### Problème

Le statut `disputed` est actuellement un cul-de-sac :
- Un assignment passe en `disputed` après 3 tentatives OTP incorrectes
- Rien ne documente comment sortir de ce statut
- L'auto-release exclut correctement `disputed` (bien), mais ne dit pas ce qui se passe *après*

### Scénarios de disputed

Un assignment peut passer en `disputed` dans les cas suivants :
1. **Trop de tentatives OTP** (pickup ou delivery) : 3 tentatives incorrectes
2. **Distance GPS excessive** : > 100m entre livreur et vendeur/acheteur
3. **Litige manuel** : Signalement par une des parties

### Processus de résolution

La résolution des litiges est actuellement **gérée manuellement** via le canal Discord de modération.

#### Étape 1 : Notification

Quand un assignment passe en `disputed` :
- Le système notifie le support (via Discord ou autre canal)
- Les informations suivantes sont incluses :
  - `delivery_assignment_id`
  - `order_id`
  - `dispute_reason` (si disponible)
  - `disputed_at`
  - Parties impliquées (vendeur, acheteur, livreur)

#### Étape 2 : Investigation manuelle

L'équipe de support investigate :
- Consulte les logs et les preuves (photos, GPS)
- Contacte les parties impliquées
- Détermine la responsabilité

#### Étape 3 : Résolution

Selon le résultat de l'investigation, plusieurs issues possibles :

**Option A : Résolution en faveur du livreur/vendeur**
- L'assignment passe à `completed` ou `delivered`
- Les fonds sont libérés vers le vendeur et le livreur
- L'acheteur est remboursé si nécessaire

**Option B : Résolution en faveur de l'acheteur**
- L'assignment passe à `cancelled`
- L'acheteur est remboursé intégralement
- Le vendeur et le livreur ne sont pas payés

**Option C : Re-assignation à un autre livreur**
- L'assignment repasse à `awaiting_pickup`
- Un nouveau livreur peut accepter
- Le livreur original est pénalisé (score de fiabilité)

#### Étape 4 : Mise à jour manuelle en base de données

```sql
-- Résolution en faveur du livreur/vendeur
UPDATE delivery_assignments
SET status = 'delivered',
    resolved_at = now(),
    resolved_by = 'admin_user_id',
    resolution_notes = 'Investigation conclue : livreur innocent'
WHERE id = :assignment_id;

-- Résolution en faveur de l'acheteur
UPDATE delivery_assignments
SET status = 'cancelled',
    resolved_at = now(),
    resolved_by = 'admin_user_id',
    resolution_notes = 'Investigation conclue : remboursement acheteur'
WHERE id = :assignment_id;

-- Re-assignation
UPDATE delivery_assignments
SET status = 'awaiting_pickup',
    delivery_person_id = NULL,
    accepted_at = NULL,
    resolved_at = now(),
    resolved_by = 'admin_user_id',
    resolution_notes = 'Re-assignation suite litige'
WHERE id = :assignment_id;
```

### Automatisation future

Pour améliorer le processus, envisager :
- **Interface admin** : Dashboard pour gérer les litiges
- **Workflow structuré** : Formulaire de résolution avec options prédéfinies
- **Historique** : Tracking des résolutions pour analyse
- **Automatisation partielle** : Règles automatiques pour cas simples

### Statut d'implémentation

| Fonctionnalité | Statut |
|---------------|--------|
| Passage automatique en disputed (3 tentatives OTP) | ✅ Implémenté |
| Notification support | ⏳ À implémenter |
| Interface admin de résolution | ⏳ Non implémenté (géré via Discord) |
| Workflow de résolution documenté | ✅ Documenté ici |

**⚠️ Note** : Tant qu'il n'y a pas d'interface admin, la résolution se fait manuellement via Discord. Documenter explicitement ce processus pour éviter les angles morts en prod.

## Fee/Commission Routing

### Ventilation des fonds depuis escrow_transactions

Lorsqu'une commande est livrée avec succès (`status = delivered`), les fonds sont ventilés comme suit depuis `escrow_transactions` :

**Montants calculés** (stockés dans `escrow_transactions`) :
- `total_amount` : Montant total payé par l'acheteur
- `product_amount` : Prix du produit (sans livraison)
- `delivery_fee` : Frais de livraison (500 FCFA + 200 FCFA/km)
- `platform_fee` : Commission plateforme (6% du product_amount)
- `seller_amount` : Montant net pour le vendeur = product_amount - platform_fee

**Payouts déclenchés** (création d'enregistrements dans `payouts`) :

1. **Payout vendeur** :
   - `type` = `seller`
   - `amount` = `seller_amount`
   - `recipient_phone` : Téléphone du vendeur (depuis `users.phone`)
   - `provider_reference` : Référence Money Fusion du payout

2. **Payout livreur** :
   - `type` = `delivery`
   - `amount` = `delivery_fee`
   - `recipient_phone` : Téléphone du livreur (depuis `delivery_persons.phone`)
   - `provider_reference` : Référence Money Fusion du payout

**Commission plateforme** :
- La commission (`platform_fee`) reste dans le wallet plateforme (non redistribuée)
- Elle peut être utilisée pour couvrir les frais d'opération Money Fusion

### Audit financier

Pour l'audit financier, la requête suivante permet de vérifier la cohérence :

```sql
SELECT
  e.id,
  e.total_amount,
  e.product_amount,
  e.delivery_fee,
  e.platform_fee,
  e.seller_amount,
  e.platform_fee + e.delivery_fee + e.seller_amount as check_sum,
  (SELECT SUM(amount) FROM payouts WHERE escrow_id = e.id AND type = 'seller') as seller_payout,
  (SELECT SUM(amount) FROM payouts WHERE escrow_id = e.id AND type = 'delivery') as delivery_payout
FROM escrow_transactions e
WHERE e.status = 'released';
```

**Vérifications** :
- `check_sum` doit être égal à `total_amount`
- `seller_payout` doit être égal à `seller_amount`
- `delivery_payout` doit être égal à `delivery_fee`
