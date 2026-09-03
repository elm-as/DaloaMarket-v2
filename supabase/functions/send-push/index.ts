import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * send-push — Envoi de notifications push Expo aux utilisateurs Daloa.
 *
 * Auth custom (déployer avec --no-verify-jwt) : l'appelant DOIT présenter la clé
 * service_role dans l'en-tête Authorization. Destiné aux appels serveur
 * (webhooks DB, autres Edge Functions) — jamais depuis le client mobile.
 *
 * Corps attendu (POST JSON) :
 *   { userIds: string[], title: string, body: string, data?: object, appType?: 'market'|'delivery' }
 *
 * Déploiement :
 *   supabase functions deploy send-push --no-verify-jwt --project-ref wjanjnoxzizxxhtbwyqd
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Méthode non autorisée" }, 405);

  // Auth : seule la clé service_role peut déclencher des envois.
  const auth = req.headers.get("Authorization") ?? "";
  if (!SERVICE_ROLE || auth !== `Bearer ${SERVICE_ROLE}`) {
    return json({ error: "Non autorisé" }, 401);
  }

  let payload: {
    userIds?: string[];
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

  const { userIds, title, body, data, appType } = payload;
  if (!userIds?.length || !title || !body) {
    return json({ error: "userIds, title et body sont requis" }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  let query = supabase
    .from("push_subscriptions")
    .select("expo_push_token")
    .in("user_id", userIds)
    .eq("is_active", true);
  if (appType) query = query.eq("app_type", appType);

  const { data: subs, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const tokens = (subs ?? [])
    .map((s: { expo_push_token: string }) => s.expo_push_token)
    .filter((t: string) => typeof t === "string" && t.startsWith("ExponentPushToken"));

  if (tokens.length === 0) return json({ sent: 0, message: "Aucun token actif" });

  // Expo accepte jusqu'à 100 messages par requête.
  const messages = tokens.map((to: string) => ({
    to,
    title,
    body,
    data: data ?? {},
    sound: "default",
    channelId: "default",
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
