-- =======================================================
-- Migration: Feature Seasons, Season Reset & Hall of Fame
-- =======================================================

-- 1. Add season and Hall of Fame fields to feature_suggestions
ALTER TABLE feature_suggestions 
ADD COLUMN IF NOT EXISTS season_id UUID,
ADD COLUMN IF NOT EXISTS season_name TEXT DEFAULT 'Saison 1',
ADD COLUMN IF NOT EXISTS author_name TEXT DEFAULT 'Membre DaloaMarket',
ADD COLUMN IF NOT EXISTS is_hall_of_fame BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Create feature_seasons table to track voting seasons
CREATE TABLE IF NOT EXISTS feature_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_number INT NOT NULL DEFAULT 1,
  season_name TEXT NOT NULL DEFAULT 'Saison 1',
  status TEXT DEFAULT 'active', -- 'active', 'archived'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  winner_feature_id UUID REFERENCES feature_suggestions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by season status
CREATE INDEX IF NOT EXISTS idx_feature_seasons_status ON feature_seasons(status);
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_season ON feature_suggestions(season_name);
CREATE INDEX IF NOT EXISTS idx_feature_suggestions_hall_of_fame ON feature_suggestions(is_hall_of_fame);

-- Enable RLS
ALTER TABLE feature_seasons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feature_seasons
CREATE POLICY "Public read feature_seasons" ON feature_seasons FOR SELECT USING (true);
CREATE POLICY "Public insert feature_seasons" ON feature_seasons FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update feature_seasons" ON feature_seasons FOR UPDATE USING (true);
CREATE POLICY "Public delete feature_seasons" ON feature_seasons FOR DELETE USING (true);
