-- Ajout du champ stock pour limiter les quantites commandables
ALTER TABLE listings ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 1;
