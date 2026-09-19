-- Migration: Autoriser la lecture publique des annonces actives ET vendues
-- Date: 2026-09-19
-- Contexte : Lorsqu'un article est vendu, un visiteur arrivant avec un lien direct
-- (partage WhatsApp, réseaux sociaux, favoris) doit voir que l'article est VENDU
-- et se voir recommander des articles similaires disponibles, au lieu d'une erreur
-- 404 "Annonce introuvable ou supprimée".
-- Les annonces supprimées ('deleted') restent strictement invisibles pour le public.

DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings;
DROP POLICY IF EXISTS "Anyone can view active or sold listings" ON public.listings;

CREATE POLICY "Anyone can view active or sold listings"
ON public.listings
FOR SELECT
TO public
USING (status IN ('active', 'sold'));
