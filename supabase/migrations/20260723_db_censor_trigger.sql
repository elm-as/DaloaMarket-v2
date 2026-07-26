-- Migration: Trigger SQL de Censure Anti-Fuite (Data Loss Prevention)
-- Emplacement: DaloaMarket-v2/supabase/migrations/20260723_db_censor_trigger.sql
-- Description: Empêche l'envoi de numéros de téléphone et réseaux sociaux directement en DB (Supabase API Client bypass)

CREATE OR REPLACE FUNCTION censor_message_content()
RETURNS TRIGGER AS $$
DECLARE
  clean_content TEXT;
  censor_replacement TEXT := '[Coordonnées masquées par sécurité]';
BEGIN
  clean_content := NEW.content;

  IF clean_content IS NULL OR clean_content = '' THEN
    RETURN NEW;
  END IF;

  -- 1. Censure des séquences téléphoniques (ex: 0708091011, 07 08 09 10 11, +225...)
  -- Détecte 8 à 14 chiffres isolés ou séparés par des espaces/points/tirets
  IF clean_content ~* '(?:\+?225[\s\.\-]?|0)[1-9](?:[\s\.\-]?\d){8}' THEN
    -- Exception pour les UUID (ex: ID de commande ou listing)
    IF NOT (clean_content ~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}') THEN
      clean_content := regexp_replace(
        clean_content,
        '(?:\+?225[\s\.\-]?|0)[1-9](?:[\s\.\-]?\d){8}',
        censor_replacement,
        'gi'
      );
    END IF;
  END IF;

  -- 2. Censure des mots-clés de contact direct & réseaux sociaux
  clean_content := regexp_replace(
    clean_content,
    'whatsapp|wa\.me|insta(?:gram)?|snap(?:chat)?|telegram|t\.me|facebook|fb|messenger|tiktok|appel(?:le)?[- ]moi|mon num(?:[ée]ro)?|mon contact',
    censor_replacement,
    'gi'
  );

  NEW.content := clean_content;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer ou remplacer le trigger sur la table messages
DROP TRIGGER IF EXISTS trigger_censor_message ON messages;

CREATE TRIGGER trigger_censor_message
BEFORE INSERT OR UPDATE ON messages
FOR EACH ROW
EXECUTE FUNCTION censor_message_content();
