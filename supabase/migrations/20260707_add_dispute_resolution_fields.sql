-- Migration pour ajouter les champs de résolution de litige à delivery_assignments
-- Date: 7 juillet 2026
-- Objectif: Permettre le tracking de la résolution manuelle des statuts disputed

-- 1. Ajouter les champs de résolution
ALTER TABLE public.delivery_assignments
ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS resolved_by uuid,
ADD COLUMN IF NOT EXISTS resolution_notes text;

-- 2. Ajouter la foreign key vers users pour resolved_by
ALTER TABLE public.delivery_assignments
ADD CONSTRAINT delivery_assignments_resolved_by_fkey
FOREIGN KEY (resolved_by) REFERENCES public.users(id);

-- 3. Ajouter un index sur resolved_at pour les performances
CREATE INDEX IF NOT EXISTS idx_delivery_assignments_resolved_at 
ON public.delivery_assignments(resolved_at);

-- 4. Ajouter des commentaires pour documenter les champs
COMMENT ON COLUMN public.delivery_assignments.resolved_at IS 'Timestamp quand le litige a été résolu manuellement par un admin';
COMMENT ON COLUMN public.delivery_assignments.resolved_by IS 'UUID de l''admin qui a résolu le litige';
COMMENT ON COLUMN public.delivery_assignments.resolution_notes IS 'Notes expliquant la décision de résolution (ex: livreur innocent, remboursement acheteur, re-assignation)';
