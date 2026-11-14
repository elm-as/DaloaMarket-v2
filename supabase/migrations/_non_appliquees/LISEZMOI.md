# Migrations jamais appliquées ou remplacées — NE PAS REJOUER

Les fichiers de ce dossier sont exclus de `supabase db push` et ne doivent pas être exécutés dans Supabase SQL Editor :

## 1. Migrations d'audit non sécurisées (24/09/2026)

| Fichier | Risque |
|---|---|
| `20260809_feature_seasons_and_hall_of_fame.sql` | Crée `feature_seasons` avec des politiques « Public insert / update / delete » : n'importe qui pourrait modifier les saisons. |
| `20260922_admin_financial_audit_logs.sql` | Remplace `resolve_delivery_dispute` par une version antérieure au durcissement. |
| `20260922_2_fix_driver_payout_flows.sql` | Remplace `create_delivery_payout` (version durcie du 03/09) par une version plus permissive, et change son type de retour (échec). |

## 2. Anciennes migrations V2 liées à DaloaCash / écrasées (remplacées par `20261115_1`..`4`)

| Fichier | Raison |
|---|---|
| `20261023_daloa_cash_referrals.sql` | Fonctionnalité DaloaCash supprimée du produit (web & mobile). |
| `20261030_v2_users_grants_and_grouped_rpc.sql` | Référençait `daloa_cash_balance`, `referral_code`, `daloa_cash_discount` -> remplacée par `20261115_2` et `20261115_3`. |
| `20261031_v2_unified_create_cod_order.sql` | Appelait `apply_daloa_cash_to_order` -> remplacée par `20261115_4`. |
| `20261101_zero_reserve_fee_cash_orders.sql` | Appelait `apply_daloa_cash_to_order` et écrasait la simulation `is_test_user` -> remplacée par `20261115_4`. |
| `20261021_express_delivery_runs.sql`, `20261024_grouped_multi_seller_delivery.sql`, `20261031_fix_daloadelivery_v1_and_v2.sql` | Consolidées proprement et rendues idempotentes dans `20261115_1`..`20261115_3`. |
