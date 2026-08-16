import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://wjanjnoxzizxxhtbwyqd.supabase.co";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_BLrm_nNwAjmvcwrjxL6BYA_VGdKOx2a";

const hasValidCredentials =
  !!supabaseUrl &&
  !!supabaseKey &&
  supabaseUrl !== "https://your-project-ref.supabase.co" &&
  supabaseKey !== "sb_publishable_your-key" &&
  supabaseKey !== "REMPLACER_PAR_TA_CLE_SERVICE_ROLE" &&
  (supabaseKey.startsWith("sb_publishable_") || supabaseKey.startsWith("eyJ"));

export const supabase = hasValidCredentials
  ? createClient<Database>(supabaseUrl, supabaseKey)
  : createClient<Database>("https://placeholder.supabase.co", "placeholder-key");

export const isSupabaseConfigured = hasValidCredentials;