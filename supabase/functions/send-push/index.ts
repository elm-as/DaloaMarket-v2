import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * send-push — Envoi unifié de notifications push Expo aux utilisateurs Daloa.
 * Supporte :
 *  - Les envois ciblés (userIds: [...]) pour le chat, les commandes, les courses.
 *  - Les diffusions globales (broadcast: true) pour les annonces Admin.
 *  - Authentification : Service Role ou JWT utilisateur connecté.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");

  const isServiceRole = Boolean(SERVICE_ROLE && token === SERVICE_ROLE);
  let authUserId: string | null = null;

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  if (!isServiceRole) {
    if (!token) return json({ error: "Non autorisé" }, 401);
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return json({ error: "Jeton non valide" }, 401);
    }
    authUserId = userData.user.id;
  }

  let payload: {
    userIds?: string[];
    broadcast?: boolean;
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
    appType?: "market" | "delivery";
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON invalide" }, 400);
  }

  const { userIds, broadcast, title, body, data, appType } = payload;
  if (!title || !body) {
    return json({ error: "title et body sont requis" }, 400);
  }
  if (!broadcast && (!userIds || userIds.length === 0)) {
    return json({ error: "userIds requis si ce n'est pas une diffusion" }, 400);
  }

  // Si diffusion générale, vérifier que l'utilisateur est admin ou service_role
  if (broadcast && !isServiceRole) {
    const { data: userProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", authUserId!)
      .single();
    if (!userProfile || (userProfile.role !== "admin" && userProfile.role !== "superadmin")) {
      return json({ error: "Action réservée aux administrateurs" }, 403);
    }
  }

  let query = supabase
    .from("push_subscriptions")
    .select("expo_push_token")
    .eq("is_active", true);

  if (!broadcast && userIds && userIds.length > 0) {
    query = query.in("user_id", userIds);
  }
  if (appType) {
    query = query.eq("app_type", appType);
  }

  const { data: subs, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const tokens = Array.from(
    new Set(
      (subs ?? [])
        .map((s: { expo_push_token: string }) => s.expo_push_token)
        .filter((t: string) => typeof t === "string" && (t.startsWith("ExponentPushToken") || t.startsWith("ExpoPushToken")))
    )
  );

  if (tokens.length === 0) return json({ sent: 0, message: "Aucun token mobile actif" });

  const messages = tokens.map((to: string) => ({
    to,
    title,
    body,
    data: data ?? {},
    sound: "default",
    channelId: "default",
    priority: "high",
  }));

  const results: unknown[] = [];
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(chunk),
    });
    results.push(await res.json().catch(() => null));
  }

  return json({ sent: tokens.length, results });
});
