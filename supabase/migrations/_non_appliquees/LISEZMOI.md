# Migrations jamais appliquées — NE PAS REJOUER

Ces trois fichiers n'ont jamais été passés en production. L'audit du 24/09/2026
a créé les objets qui manquaient réellement, avec des droits fermés
(`20260924_lot3_admin_tables_and_rights.sql`). Les rejouer tels quels serait
dangereux :

| Fichier | Risque |
|---|---|
| `20260809_feature_seasons_and_hall_of_fame.sql` | Crée `feature_seasons` avec des politiques « Public insert / update / delete » : n'importe qui pourrait modifier les saisons. |
| `20260922_admin_financial_audit_logs.sql` | Remplace `resolve_delivery_dispute` par une version antérieure au durcissement. |
| `20260922_2_fix_driver_payout_flows.sql` | Remplace `create_delivery_payout` (version durcie du 03/09) par une version plus permissive, et change son type de retour (échec). |

Ils sont conservés ici pour l'historique, hors du dossier lu par `supabase db push`.
