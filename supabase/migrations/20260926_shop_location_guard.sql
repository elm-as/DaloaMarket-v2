-- Position des boutiques : contrôle de zone et historique.
--
-- Le 25/09, une boutique a été déplacée à 17 km du centre sans que personne
-- ne sache par qui ni depuis quel écran (la carte du site enregistrait au
-- moindre clic). Désormais, quel que soit le chemin d'écriture (site, app,
-- anciennes versions, console) :
--   * une position à plus de 10 km du centre de Daloa est refusée ;
--   * chaque changement est journalisé : ancienne et nouvelle position,
--     auteur, application (user-agent) et date.

CREATE TABLE IF NOT EXISTS public.shop_location_history (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  old_lat     double precision,
  old_lng     double precision,
  new_lat     double precision,
  new_lng     double precision,
  changed_by  uuid,
  user_agent  text,
  changed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shop_location_history_user_idx
  ON public.shop_location_history (user_id, changed_at DESC);

ALTER TABLE public.shop_location_history ENABLE ROW LEVEL SECURITY;

-- Le vendeur voit son propre historique, l'administration voit tout.
-- Aucune écriture client : seul le déclencheur écrit.
DROP POLICY IF EXISTS shop_location_history_read ON public.shop_location_history;
CREATE POLICY shop_location_history_read ON public.shop_location_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_admin_or_service_role());

REVOKE ALL ON public.shop_location_history FROM anon, authenticated;
GRANT SELECT ON public.shop_location_history TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_guard_shop_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
DECLARE
  v_headers json;
BEGIN
  IF NEW.shop_latitude IS NOT DISTINCT FROM OLD.shop_latitude
     AND NEW.shop_longitude IS NOT DISTINCT FROM OLD.shop_longitude THEN
    RETURN NEW;
  END IF;

  IF NEW.shop_latitude IS NOT NULL AND NEW.shop_longitude IS NOT NULL
     AND fn_straight_km(NEW.shop_latitude, NEW.shop_longitude, 6.8773, -6.4502) > 10 THEN
    RAISE EXCEPTION 'shop_location_outside_zone'
      USING ERRCODE = 'P0001',
            HINT = 'La boutique doit être placée à moins de 10 km du centre de Daloa.';
  END IF;

  NEW.shop_updated_at := now();

  BEGIN
    v_headers := NULLIF(current_setting('request.headers', true), '')::json;
  EXCEPTION WHEN others THEN
    v_headers := NULL;
  END;

  INSERT INTO shop_location_history (user_id, old_lat, old_lng, new_lat, new_lng, changed_by, user_agent)
  VALUES (NEW.id, OLD.shop_latitude, OLD.shop_longitude, NEW.shop_latitude, NEW.shop_longitude,
          auth.uid(), left(v_headers->>'user-agent', 300));

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_guard_shop_location() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_shop_location ON public.users;
CREATE TRIGGER trg_guard_shop_location
  BEFORE UPDATE OF shop_latitude, shop_longitude ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_guard_shop_location();
