-- ============================================================================
-- Lot 2 de l'audit du 24/09/2026 : rôles à l'inscription
--
-- handle_new_user recopiait `raw_user_meta_data->>'role'`, une valeur fournie
-- par le client au moment de l'inscription. Deux conséquences :
--  * n'importe qui pouvait s'inscrire avec `role: 'admin'` ou 'superadmin' ;
--  * le web (depuis le 09/09) et le mobile (depuis le 03/09) envoient
--    `role: 'buyer'`, valeur refusée par la contrainte users_role_check :
--    toute inscription par e-mail échouait (« Database error saving new
--    user »). La dernière inscription e-mail réussie date du 09/09.
--
-- Le rôle n'est plus lu que sur une liste blanche : `livreur` est accepté (le
-- rôle ne donne aucun droit, il sert à l'affichage admin) ; tout le reste,
-- dont 'buyer' et 'admin', devient 'user'.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_signup_role(p_requested text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case lower(trim(coalesce(p_requested, '')))
           when 'livreur' then 'livreur'
           when 'delivery' then 'livreur'
           else 'user'
         end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_full_name text;
  v_avatar_url text;
  v_phone text;
  v_role text;
BEGIN
  -- Extraire le nom complet depuis les métadonnées (Google OAuth ou formulaire)
  v_full_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
    NULL
  );

  -- Extraire l'avatar (Google picture ou avatar_url personnalisé)
  v_avatar_url := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'avatar_url'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'picture'), ''),
    NULL
  );

  -- Extraire le téléphone
  v_phone := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), ''),
    NULLIF(TRIM(NEW.phone), ''),
    NULL
  );

  -- Rôle : liste blanche. Les métadonnées viennent du client, elles ne
  -- peuvent jamais accorder un rôle d'administration.
  v_role := public.fn_signup_role(NEW.raw_user_meta_data->>'role');

  INSERT INTO public.users (
    id,
    email,
    full_name,
    avatar_url,
    phone,
    role,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_avatar_url,
    v_phone,
    v_role,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(v_full_name, public.users.full_name),
    avatar_url = COALESCE(v_avatar_url, public.users.avatar_url),
    phone = COALESCE(v_phone, public.users.phone),
    role = CASE
      WHEN public.users.role = 'user' AND v_role = 'livreur' THEN 'livreur'
      ELSE public.users.role
    END;

  RETURN NEW;
END;
$function$;


-- ── Rôle livreur à la création de la fiche livreur ──────────────────────────
-- Le site livreur essayait d'écrire users.role depuis le navigateur, ce que
-- prevent_sensitive_user_self_update refuse (exception) : la mise à jour
-- entière échouait, nom, téléphone et numéro de versement compris. Le rôle est
-- désormais posé ici, côté base, et seulement depuis 'user'.
CREATE OR REPLACE FUNCTION public.trg_delivery_person_sets_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Autorise ce seul changement de rôle auprès de
  -- prevent_sensitive_user_self_update (voir plus bas).
  PERFORM set_config('daloa.system_role_grant', '1', true);
  UPDATE public.users
     SET role = 'livreur'
   WHERE id = NEW.user_id
     AND role = 'user';
  PERFORM set_config('daloa.system_role_grant', '', true);
  RETURN NULL;
END;
$function$;

-- prevent_sensitive_user_self_update tourne en SECURITY DEFINER : il ne peut
-- pas distinguer un changement de rôle fait par une fonction système d'un
-- changement demandé par l'utilisateur. Il reconnaît désormais l'indicateur de
-- transaction posé par trg_delivery_person_sets_role, que PostgREST ne permet
-- pas à un client de positionner.
CREATE OR REPLACE FUNCTION public.prevent_sensitive_user_self_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;
  IF COALESCE(current_setting('daloa.system_role_grant', true), '') = '1' THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin') THEN RETURN NEW; END IF;
  IF auth.uid() = OLD.id THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN RAISE EXCEPTION 'Not allowed to change role'; END IF;
    IF NEW.banned IS DISTINCT FROM OLD.banned THEN RAISE EXCEPTION 'Not allowed to change banned flag'; END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS delivery_person_sets_role ON public.delivery_persons;
CREATE TRIGGER delivery_person_sets_role
  AFTER INSERT ON public.delivery_persons
  FOR EACH ROW EXECUTE FUNCTION public.trg_delivery_person_sets_role();

-- Rattrapage : les livreurs déjà inscrits restés en 'user'.
UPDATE public.users u
   SET role = 'livreur'
  FROM public.delivery_persons dp
 WHERE dp.user_id = u.id
   AND u.role = 'user';
