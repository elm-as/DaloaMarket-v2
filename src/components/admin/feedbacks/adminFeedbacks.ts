export interface FeedbackRow {
  id: string;
  created_at: string;
  user_id: string | null;
  dislikes: string | null;
  recommended_features: string | null;
  source: string | null;
  admin_reply: string | null;
  replied_at: string | null;
  reply_channel: string | null;
  prefers_native_app: boolean | null;
  pricing_too_high: boolean | null;
  visibility_issue: boolean | null;
  search_navigation_issue: boolean | null;
  payment_security_issue: boolean | null;
  slow_response_issue: boolean | null;
  complex_checkout_issue: boolean | null;
  users?: {
    full_name: string | null;
    shop_name: string | null;
    phone: string | null;
    district: string | null;
  } | null;
  listings_count?: number;
}

export interface ParsedFeedback {
  rating: number | null;
  type: string | null;
  topics: string[];
  body: string;
}

/** Extrait la note, la catégorie, les thèmes et le texte brut d'un feedback. */
export function parseFeedback(raw: string | null): ParsedFeedback {
  const text = raw || '';
  const rating = text.match(/\[Note:\s*(\d)\s*\/\s*5/i);
  const type = text.match(/\[Type:\s*([^\]]+)\]/i);
  const topics = text.match(/\[Thèmes:\s*([^\]]+)\]/i);
  const body = text.replace(/\[(Type|Note|Thèmes):[^\]]*\]/gi, '').trim();
  return {
    rating: rating ? Number(rating[1]) : null,
    type: type ? type[1].trim() : null,
    topics: topics ? topics[1].split(',').map((t) => t.trim()).filter(Boolean) : [],
    body,
  };
}

export const FEEDBACK_FRICTIONS: { key: keyof FeedbackRow; label: string }[] = [
  { key: 'prefers_native_app', label: 'App native' },
  { key: 'pricing_too_high', label: 'Prix trop élevé' },
  { key: 'visibility_issue', label: 'Visibilité' },
  { key: 'search_navigation_issue', label: 'Recherche' },
  { key: 'payment_security_issue', label: 'Sécurité' },
  { key: 'slow_response_issue', label: 'Lenteur' },
  { key: 'complex_checkout_issue', label: 'Achat' },
];
