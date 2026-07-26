-- ============================================================================
-- Fix: Ajouter la policy UPDATE manquante sur messages
-- Sans cette policy, le .update({ read: true }) est bloqué silencieusement
-- par RLS, ce qui empêche de marquer les messages comme lus.
-- ============================================================================

-- Supprimer l'ancienne policy si elle existe (nettoyage)
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
DROP POLICY IF EXISTS "Receivers can mark messages as read" ON public.messages;

-- Créer une policy UPDATE qui permet au receiver de marquer ses messages comme lus
-- Le receiver doit pouvoir mettre read=true sur les messages qu'il reçoit
CREATE POLICY "Receivers can mark messages as read"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Ajouter un index pour accélérer les requêtes de comptage non-lus
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread 
  ON public.messages(receiver_id) 
  WHERE read = false;
