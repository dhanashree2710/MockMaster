// MockMaster — create a Razorpay order for a paid unlock.
// The PRICE is decided here (never by the browser).
//
// Deploy:
//   supabase functions deploy razorpay-order
//   supabase secrets set RAZORPAY_KEY_ID=rzp_live_xxx RAZORPAY_KEY_SECRET=xxx
//   (optional) supabase secrets set ALLOWED_ORIGIN=https://app.yourdomain.com
// Keep PRICES_INR in sync with Utils.REWARDS in assets/js/utils.js.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const PRICES_INR: Record<string, number> = {
  exec360: 25,
  voiceReplay: 15,
  atsOptimizer: 9,
  tier1Pack: 30,
};
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  if (!keyId || !keySecret) return json({ error: "Payments not configured" }, 503);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return json({ error: "Login required" }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: u, error: uErr } = await userClient.auth.getUser();
  if (uErr || !u?.user) return json({ error: "Invalid session" }, 401);
  const userId = u.user.id;

  let body: { reward_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  const rewardId = String(body?.reward_id ?? "");
  const price = PRICES_INR[rewardId];
  if (!price) return json({ error: "Unknown reward" }, 400);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data: owned } = await admin.from("reward_purchases").select("id")
    .eq("user_id", userId).eq("reward_id", rewardId).maybeSingle();
  if (owned) return json({ already: true });

  // light abuse limit: max 10 orders per user per hour
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from("razorpay_orders").select("order_id", { count: "exact", head: true })
    .eq("user_id", userId).gte("created_at", hourAgo);
  if ((count ?? 0) >= 10) return json({ error: "Too many attempts. Try again later." }, 429);

  const amount = price * 100; // paise
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Basic " + btoa(`${keyId}:${keySecret}`) },
    body: JSON.stringify({
      amount, currency: "INR",
      receipt: `${rewardId}_${Date.now()}`.slice(0, 40),
      notes: { user_id: userId, reward_id: rewardId },
    }),
  });
  if (!res.ok) {
    console.error("razorpay order", res.status, (await res.text()).slice(0, 300));
    return json({ error: "Could not start payment" }, 502);
  }
  const order = await res.json();
  const { error: insErr } = await admin.from("razorpay_orders").insert({
    order_id: order.id, user_id: userId, reward_id: rewardId, amount_paise: amount,
  });
  if (insErr) { console.error("order insert", insErr); return json({ error: "Could not start payment" }, 500); }

  return json({ order_id: order.id, amount, currency: "INR", key_id: keyId });
});
