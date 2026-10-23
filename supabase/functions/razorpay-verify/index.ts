// MockMaster — verify a Razorpay payment and record the purchase.
// Checks the HMAC signature with the secret key, then confirms with Razorpay
// that the payment is captured for the right order and amount.
//
// Deploy:
//   supabase functions deploy razorpay-verify
//   (uses the same RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET secrets as razorpay-order)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

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

  let b: { order_id?: string; payment_id?: string; signature?: string };
  try { b = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }
  const orderId = String(b?.order_id ?? ""), paymentId = String(b?.payment_id ?? ""), signature = String(b?.signature ?? "");
  if (!orderId || !paymentId || !signature) return json({ error: "Missing payment details" }, 400);

  // 1) signature
  const expected = await hmacHex(keySecret, `${orderId}|${paymentId}`);
  if (!safeEqual(expected, signature.toLowerCase())) return json({ error: "Invalid payment signature" }, 400);

  // 2) the order must be ours, for this user
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: order } = await admin.from("razorpay_orders").select("*").eq("order_id", orderId).maybeSingle();
  if (!order || order.user_id !== userId) return json({ error: "Unknown order" }, 404);

  // 3) ask Razorpay: payment belongs to this order, right amount, captured
  const pr = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: "Basic " + btoa(`${keyId}:${keySecret}`) },
  });
  if (!pr.ok) { console.error("razorpay payment", pr.status); return json({ error: "Could not confirm payment" }, 502); }
  const pay = await pr.json();
  if (pay.order_id !== orderId || pay.amount !== order.amount_paise || pay.currency !== "INR" ||
      !(pay.status === "captured" || pay.status === "authorized")) {
    return json({ error: "Payment not confirmed" }, 400);
  }

  // 4) record (idempotent)
  const { error } = await admin.from("reward_purchases").upsert({
    user_id: userId, reward_id: order.reward_id, order_id: orderId,
    payment_id: paymentId, amount_paise: order.amount_paise,
  }, { onConflict: "order_id", ignoreDuplicates: true });
  if (error && !/duplicate/i.test(error.message)) {
    console.error("purchase insert", error);
    return json({ error: "Could not save purchase" }, 500);
  }
  return json({ ok: true, reward_id: order.reward_id });
});
