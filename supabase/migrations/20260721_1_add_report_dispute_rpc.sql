-- ============================================================================
-- MIGRATION: 20260721_1_add_report_dispute_rpc.sql
-- ============================================================================
-- Ajoute la fonction permettant aux utilisateurs (livreur, vendeur, acheteur)
-- d'interrompre une commande en cours et de la signaler en litige ('disputed').
-- ============================================================================

CREATE OR REPLACE FUNCTION public.report_delivery_dispute(
  p_assignment_id uuid,
  p_reason text
)
RETURNS json AS $$
DECLARE
  v_assignment record;
  v_order record;
  v_user_id uuid;
BEGIN
  -- 1. Récupérer l'ID de l'utilisateur authentifié
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not_authenticated');
  END IF;

  -- 2. Récupérer l'assignation de livraison
  SELECT * INTO v_assignment FROM public.delivery_assignments WHERE id = p_assignment_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'assignment_not_found');
  END IF;

  -- 3. Récupérer la commande associée
  SELECT * INTO v_order FROM public.orders WHERE id = v_assignment.order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'order_not_found');
  END IF;

  -- 4. Vérifier si l'utilisateur est autorisé (Acheteur, Vendeur, Livreur assigné, ou Admin)
  IF v_order.buyer_id != v_user_id 
     AND v_order.seller_id != v_user_id 
     AND (v_assignment.delivery_person_id IS NULL OR 
          (SELECT user_id FROM public.delivery_persons WHERE id = v_assignment.delivery_person_id) != v_user_id)
     AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_user_id AND role IN ('admin', 'superadmin')) 
  THEN
    RETURN json_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  -- 5. Mettre à jour l'assignation de livraison en statut litige
  UPDATE public.delivery_assignments
  SET 
    status = 'disputed',
    disputed_at = now(),
    dispute_reason = p_reason,
    updated_at = now()
  WHERE id = p_assignment_id;

  -- 6. Mettre à jour le statut global de la commande
  UPDATE public.orders
  SET 
    status = 'disputed',
    updated_at = now()
  WHERE id = v_assignment.order_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.report_delivery_dispute TO authenticated;
