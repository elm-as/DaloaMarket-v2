# Changements nécessaires pour DaloaDelivery

## Contexte
Les corrections de sécurité appliquées à DaloaMarket (séparation des OTP, statut 'accepted', etc.) nécessitent des modifications correspondantes dans DaloaDelivery pour assurer la compatibilité.

## 1. Changement du statut lors de l'acceptation

### Avant
```typescript
// Quand un livreur accepte une commande
await supabase.from('delivery_assignments').update({
  status: 'picked_up',  // ❌ Incorrect : passe directement à picked_up
  delivery_person_id: driverId
}).eq('id', assignmentId);
```

### Après
```typescript
// Quand un livreur accepte une commande
await supabase.from('delivery_assignments').update({
  status: 'accepted',  // ✅ Correct : statut intermédiaire
  delivery_person_id: driverId,
  accepted_at: new Date().toISOString()
}).eq('id', assignmentId);
```

## 2. Vérification du pickup_otp au lieu de delivery_otp

### Avant
```typescript
// Vérification OTP au ramassage (livreur côté vendeur)
const { data } = await supabase
  .from('delivery_assignments')
  .select('delivery_otp')
  .eq('id', assignmentId)
  .single();

if (inputOtp === data.delivery_otp) {
  // Valider le ramassage
}
```

### Après
```typescript
// Vérification OTP au ramassage (livreur côté vendeur)
const { data } = await supabase
  .from('delivery_assignments')
  .select('pickup_otp')
  .eq('id', assignmentId)
  .single();

if (inputOtp === data.pickup_otp) {
  // Valider le ramassage
  await supabase.from('delivery_assignments').update({
    status: 'picked_up',
    pickup_otp_attempts: data.pickup_otp_attempts + 1,
    pickup_photo_url: photoUrl,
    pickup_gps: { lat, lng },
    pickup_gps_distance_m: distance
  }).eq('id', assignmentId);
}
```

## 3. Vérification GPS avec seuil de 100m

### Ajouter la vérification de distance
```typescript
// Calculer la distance GPS entre livreur et vendeur
const distance = calculateDistance(
  driverLat, driverLng,
  sellerLat, sellerLng
);

if (distance > 100) {
  // Distance trop grande, refuser ou avertir
  throw new Error('Distance GPS trop élevée (> 100m)');
}
```

## 4. Photo obligatoire

### Avant
```typescript
// Photo optionnelle
if (photoUrl) {
  await supabase.from('delivery_assignments').update({
    pickup_photo_url: photoUrl
  }).eq('id', assignmentId);
}
```

### Après
```typescript
// Photo obligatoire
if (!photoUrl) {
  throw new Error('Photo de ramassage obligatoire');
}

await supabase.from('delivery_assignments').update({
  pickup_photo_url: photoUrl
}).eq('id', assignmentId);
```

## 5. Filtrage des commandes disponibles

### Avant
```typescript
// Livreurs voient les commandes avec awaiting_pickup
const { data } = await supabase
  .from('delivery_assignments')
  .select('*')
  .eq('status', 'awaiting_pickup')
  .eq('pickup_confirmed_by_seller', true)
  .is('delivery_person_id', null);
```

### Après (inchangé mais important de vérifier)
```typescript
// Livreurs voient les commandes avec awaiting_pickup (pas accepted)
const { data } = await supabase
  .from('delivery_assignments')
  .select('*')
  .eq('status', 'awaiting_pickup')  // Ne PAS inclure 'accepted'
  .eq('pickup_confirmed_by_seller', true)
  .is('delivery_person_id', null);
```

## 6. Gestion des tentatives OTP

### Ajouter le tracking des tentatives
```typescript
// Vérifier le nombre de tentatives avant d'incrémenter
const { data: assignment } = await supabase
  .from('delivery_assignments')
  .select('pickup_otp_attempts, delivery_otp_attempts')
  .eq('id', assignmentId)
  .single();

if (assignment.pickup_otp_attempts >= 3) {
  // Trop de tentatives, passer en litige
  await supabase.from('delivery_assignments').update({
    status: 'disputed'
  }).eq('id', assignmentId);
  throw new Error('Trop de tentatives incorrectes');
}
```

## 7. Exclusion du statut disputed pour auto-release

Si DaloaDelivery a un mécanisme d'auto-release, s'assurer d'exclure `disputed` :

```typescript
// Auto-release après 24h
await supabase.from('delivery_assignments')
  .update({
    buyer_confirmed_at: new Date().toISOString(),
    auto_released_at: new Date().toISOString(),
    status: 'auto_released'
  })
  .eq('id', assignmentId)
  .neq('status', 'disputed');  // Important : exclure disputed
```

## 8. Mise à jour de l'interface TypeScript

### Mettre à jour les types
```typescript
interface DeliveryAssignment {
  id: string;
  order_id: string;
  delivery_person_id: string | null;
  status: 'awaiting_pickup' | 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'auto_released' | 'disputed' | 'cancelled';
  pickup_confirmed_by_seller: boolean;
  pickup_confirmed_at: string | null;
  pickup_otp: string;  // Nouveau
  delivery_otp: string;
  pickup_otp_attempts: number;  // Nouveau
  delivery_otp_attempts: number;
  accepted_at: string | null;  // Nouveau
  pickup_gps_distance_m: number | null;  // Nouveau
  delivery_gps_distance_m: number | null;  // Nouveau
  // ... autres champs
}
```

## Statut d'implémentation

### Côté DaloaMarket (✅ Terminé)
- ✅ Migration SQL appliquée (`20260707_fix_delivery_flow_security.sql`)
- ✅ Webhook backend génère deux OTP distincts
- ✅ Frontend vendeur affiche `pickup_otp`
- ✅ Cron no-show créé pour gérer le timeout 90min
- ✅ Documentation complète du flow

### Côté DaloaDelivery (✅ Terminé - 7 juillet 2026)
Toutes les corrections de sécurité ont été appliquées par l'équipe DaloaDelivery :

| Modification | Priorité | Complexité | Statut |
|--------------|----------|------------|--------|
| Statut 'accepted' au lieu de 'picked_up' | 🔴 Critique | Faible | ✅ Appliqué |
| Utiliser `pickup_otp` au ramassage | 🔴 Critique | Faible | ✅ Appliqué |
| Vérification GPS (100m) | 🟠 Élevée | Moyenne | ✅ Appliqué |
| Photo obligatoire | 🟠 Élevée | Faible | ✅ Appliqué |
| Tracking tentatives OTP | 🟠 Élevée | Faible | ✅ Appliqué |
| Types TypeScript | 🟡 Moyenne | Faible | ✅ Appliqué |

#### Fichiers modifiés dans DaloaDelivery

1. **Migration SQL** : `supabase/migrations/20260707_add_missing_delivery_assignments_fields.sql`
   - Ajoute champs de localisation (pickup/dropoff address)
   - Ajoute `delivery_price`, `delivery_photo_url`
   - Ajoute champs de litige (`disputed_at`, `dispute_reason`)
   - Crée index pour les performances

2. **Service** : `src/services/deliveryAssignmentService.ts`
   - `acceptAssignment()`: Statut `'accepted'` (pas `'picked_up'`)
   - `verifyPickup()`: Vérification OTP pickup + photo + GPS (100m)
   - `verifyDelivery()`: Vérification OTP delivery + photo + GPS (100m)
   - Tracking des tentatives OTP (max 3)
   - Fonction utilitaire `calculateDistance()` (Haversine)

3. **Types** : `src/types/livreur.ts`
   - Interface `DeliveryAssignment` avec tous les champs de sécurité
   - Types pour les statuts incluant `'accepted'`

4. **Modals** : `src/components/livreur/PickupVerificationModal.tsx`, `DeliveryVerificationModal.tsx`
   - Modal en 3 étapes: OTP → Photo → GPS
   - Photo obligatoire
   - Vérification GPS avec calcul de distance
   - Gestion des erreurs et feedback utilisateur

5. **Dashboard** : `src/pages/DashboardCommandes.tsx`
   - Intégration des modals de vérification
   - Mise à jour automatique après vérification
   - Remplacement de `deliveryOrderService` par `deliveryAssignmentService`

## Checklist de migration

- [x] Mettre à jour le statut d'acceptation à 'accepted'
- [x] Ajouter `accepted_at` lors de l'acceptation
- [x] Changer la vérification OTP pour utiliser `pickup_otp` au ramassage
- [x] Ajouter la vérification de distance GPS (max 100m)
- [x] Rendre la photo obligatoire au ramassage et à la livraison
- [x] Ajouter le tracking des tentatives OTP
- [x] Mettre à jour les types TypeScript
- [x] Tester le flow complet de livraison
