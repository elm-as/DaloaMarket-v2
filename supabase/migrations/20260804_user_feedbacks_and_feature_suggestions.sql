-- =======================================================
-- Migration: Add extra feedback fields & Feature Suggestions table
-- =======================================================

-- 1. Extend user_feedbacks table with new quick option flags
ALTER TABLE user_feedbacks 
ADD COLUMN IF NOT EXISTS search_navigation_issue BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payment_security_issue BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS slow_response_issue BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS complex_checkout_issue BOOLEAN DEFAULT FALSE;

-- 2. Create feature_suggestions table for tuto.daloamarket.com
CREATE TABLE IF NOT EXISTS feature_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'under_review', -- 'under_review', 'planned', 'in_progress', 'completed'
  upvotes_count INT DEFAULT 1,
  created_by_ip TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create feature_upvotes table to track votes by IP without auth
CREATE TABLE IF NOT EXISTS feature_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES feature_suggestions(id) ON DELETE CASCADE,
  user_ip TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_feature_user_ip UNIQUE (feature_id, user_ip)
);

-- Index for fast lookup by feature and IP
CREATE INDEX IF NOT EXISTS idx_feature_upvotes_feature_ip ON feature_upvotes(feature_id, user_ip);

-- Enable RLS
ALTER TABLE feature_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_upvotes ENABLE ROW LEVEL SECURITY;

-- Allow public read access to feature suggestions & upvotes
CREATE POLICY "Public read feature_suggestions" ON feature_suggestions FOR SELECT USING (true);
CREATE POLICY "Public insert feature_suggestions" ON feature_suggestions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update feature_suggestions" ON feature_suggestions FOR UPDATE USING (true);

CREATE POLICY "Public read feature_upvotes" ON feature_upvotes FOR SELECT USING (true);
CREATE POLICY "Public insert feature_upvotes" ON feature_upvotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete feature_upvotes" ON feature_upvotes FOR DELETE USING (true);
