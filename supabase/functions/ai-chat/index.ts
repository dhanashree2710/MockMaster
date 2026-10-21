// MockMaster — AI proxy (Supabase Edge Function)
// The LLM key lives ONLY here (as a secret). The app calls this function with
// the user's login token; nothing sensitive ships inside the Android app.
//
// Deploy:
//   supabase functions deploy ai-chat
//   supabase secrets set GROQ_API_KEY=gsk_xxx
//   (optional) supabase secrets set AI_MODEL=llama-3.3-70b-versatile ALLOWED_ORIGIN=https://app.yourdomain.com
//
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = Deno.env.get("AI_MODEL") ?? "llama-3.3-70b-versatile";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const MAX_PER_HOUR = 20;
const MAX_PER_DAY = 80;
const MAX_CHARS = 24000;

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) return json({ error: "AI service not configured" }, 503);

  // 1) Who is calling?
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Login required" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: "Invalid session" }, 401);
  const userId = userData.user.id;

  // 2) Validate input
  let payload: any;
  try { payload = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  const messages = payload?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 12) {
    return json({ error: "Invalid messages" }, 400);
  }
  let total = 0;
  for (const m of messages) {
    if (!m || !["system", "user", "assistant"].includes(m.role) || typeof m.content !== "string") {
      return json({ error: "Invalid message" }, 400);
    }
    total += m.content.length;
  }
  if (total > MAX_CHARS) return json({ error: "Input too long" }, 413);
  const temperature = Math.min(1, Math.max(0, Number(payload?.temperature ?? 0.6)));

  // 3) Rate limit per user (service role bypasses RLS on ai_usage_log)
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const [{ count: h }, { count: d }] = await Promise.all([
    admin.from("ai_usage_log").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", hourAgo),
    admin.from("ai_usage_log").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", dayAgo),
  ]);
  if ((h ?? 0) >= MAX_PER_HOUR || (d ?? 0) >= MAX_PER_DAY) {
    return json({ error: "Daily AI limit reached. Please try again later." }, 429);
  }
  await admin.from("ai_usage_log").insert({ user_id: userId });

  // 4) Call the model
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: MODEL,
      temperature,
      response_format: { type: "json_object" },
      messages,
    }),
  });
  if (!res.ok) {
    console.error("Groq error", res.status, (await res.text()).slice(0, 300));
    return json({ error: "AI provider error" }, 502);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return json({ content });
});
