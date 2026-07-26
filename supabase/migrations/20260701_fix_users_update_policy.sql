-- ============================================================================
-- Fix: Ajouter la policy UPDATE manquante sur la table users
-- Sans cette policy, les utilisateurs ne peuvent pas mettre à jour leur profil,
-- ce qui les bloque sur la page "complete-profile".
-- ============================================================================

-- Supprimer l'ancienne policy si elle existe
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Créer la policy UPDATE permettant à chacun de modifier sa propre ligne
CREATE POLICY "Users can update their own profile" 
  ON public.users 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
