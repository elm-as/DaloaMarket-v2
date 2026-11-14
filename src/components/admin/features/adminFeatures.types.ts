export interface FeatureSuggestionItem {
  id: string;
  created_at: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'planned' | 'completed' | 'rejected' | 'under_review';
  upvotes_count: number;
  author_ip: string | null;
  author_name?: string;
  season_name?: string;
  is_hall_of_fame?: boolean;
  admin_notes?: string;
}

export interface FeatureSeasonItem {
  id: string;
  season_number: number;
  season_name: string;
  status: 'active' | 'archived';
  started_at: string;
}
