-- Règles de livraison selon le mode de paiement (décision du 28/09).
--
--   En ligne + domicile   : course publique DaloaDelivery, codes de ramassage et de remise.
--   En ligne + retrait    : pas de course ; l'acheteur donne son code au vendeur.
--   Espèces  + domicile   : le vendeur livre lui-même ou via SES livreurs affiliés ;
--                           aucune course publique, aucun code acheteur
--                           (l'acheteur paie à la réception).
--   Espèces  + retrait    : pas de course, pas de code ; le vendeur valide l'encaissement.
--
-- Avant : deux politiques de lecture se cumulaient ; l'une laissait tout livreur
-- voir les courses privées (espèces), l'autre laissait tout utilisateur connecté
-- lire les courses en attente, adresses comprises. Les retraits en boutique
-- confirmés pouvaient aussi apparaître dans la liste des livreurs.

DROP POLICY IF EXISTS delivery_assignments_select_available ON public.delivery_assignments;
DROP POLICY IF EXISTS delivery_assignments_select_public_or_affiliated ON public.delivery_assignments;

-- Courses à prendre : réservées aux livreurs, livraison à domicile uniquement ;
-- une course privée n'est visible que des livreurs affiliés à son vendeur.
-- (Ses propres courses restent lisibles via delivery_assignments_select_own.)
CREATE POLICY delivery_assignments_select_pool ON public.delivery_assignments
  FOR SELECT TO authenticated
  USING (
    status = 'awaiting_pickup'
    AND delivery_person_id IS NULL
    AND EXISTS (
      SELECT 1 FROM orders o
       WHERE o.id = delivery_assignments.order_id
         AND o.delivery_mode = 'delivery'
    )
    AND EXISTS (
      SELECT 1 FROM delivery_persons dp
       WHERE dp.user_id = auth.uid()
         AND (
           delivery_assignments.is_private IS NOT TRUE
           OR EXISTS (
             SELECT 1 FROM seller_delivery_affiliations sda
              WHERE sda.delivery_person_id = dp.id
                AND sda.seller_id = delivery_assignments.seller_id
                AND sda.status = 'active'
           )
         )
    )
  );

-- Acceptation : mêmes règles que la lecture.
CREATE OR REPLACE FUNCTION public.accept_delivery_assignment(p_assignment_id uuid, p_delivery_person_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_dp     uuid;
  v_assign record;
begin
  select id into v_dp from delivery_persons where user_id = auth.uid();
  if v_dp is null then
    return json_build_object('success', false, 'reason', 'not_a_delivery_person');
  end if;

  select da.*, o.delivery_mode as order_delivery_mode
    into v_assign
    from delivery_assignments da
    join orders o on o.id = da.order_id
   where da.id = p_assignment_id;

  if not found or v_assign.order_delivery_mode <> 'delivery' then
    return json_build_object('success', false, 'reason', 'assignment_unavailable');
  end if;

  if v_assign.is_private is true and not exists (
    select 1 from seller_delivery_affiliations sda
     where sda.delivery_person_id = v_dp
       and sda.seller_id = v_assign.seller_id
       and sda.status = 'active'
  ) then
    return json_build_object('success', false, 'reason', 'not_affiliated');
  end if;

  update delivery_assignments
     set status = 'accepted', delivery_person_id = v_dp,
         accepted_at = now(), updated_at = now()
   where id = p_assignment_id
     and status = 'awaiting_pickup'
     and delivery_person_id is null;

  if not found then
    return json_build_object('success', false, 'reason', 'assignment_unavailable');
  end if;

  return json_build_object('success', true, 'status', 'accepted');
end;
$function$;

-- Remise d'une commande payée en espèces : pas de code acheteur (il paie à la
-- réception, rien n'est bloqué). Le livreur affilié valide « livré et encaissé ».
DO $$
DECLARE
  v_def text;
  v_new text;
BEGIN
  v_def := pg_get_functiondef(
    'public.verify_delivery(uuid,text,text,double precision,double precision)'::regprocedure
  );
  v_new := replace(v_def,
    E'  if coalesce(assignment.delivery_otp, '''') <> coalesce(p_otp, '''') then\n',
    E'  if coalesce(order_record.payment_method, ''online'') not in (''cod'', ''cash'', ''cash_at_shop'')\n'
    || E'     and coalesce(assignment.delivery_otp, '''') <> coalesce(p_otp, '''') then\n');
  IF v_new = v_def THEN
    RAISE EXCEPTION 'verify_delivery : contrôle OTP attendu introuvable';
  END IF;
  EXECUTE v_new;
END $$;
