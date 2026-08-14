CREATE TABLE IF NOT EXISTS public.user_feedbacks (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    dislikes TEXT,
    prefers_native_app BOOLEAN DEFAULT false,
    pricing_too_high BOOLEAN DEFAULT false,
    visibility_issue BOOLEAN DEFAULT false,
    recommended_features TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_feedbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own feedbacks"
    ON public.user_feedbacks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own feedbacks"
    ON public.user_feedbacks FOR SELECT
    USING (auth.uid() = user_id);
