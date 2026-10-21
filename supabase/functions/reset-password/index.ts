// MockMaster — in-app password reset (no email link)
// Page: enter email + new password → this function updates Auth with service role.
//
// Deploy (must allow unauthenticated calls — user is logged out):
//   supabase functions deploy reset-password --no-verify-jwt
//   supabase secrets set ALLOWED_ORIGIN=https://your-domain.com   # optional

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

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

const hits = new Map<string, { n: number; t: number }>();
function rateLimit(key: string, max = 8, windowMs = 3600_000) {
  const now = Date.now();
  const cur = hits.get(key);
  if (!cur || now - cur.t > windowMs) {
    hits.set(key, { n: 1, t: now });
    return true;
  }
  if (cur.n >= max) return false;
  cur.n += 1;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json({ error: "Server not configured" }, 503);

  let payload: { email?: string; password?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Bad JSON" }, 400);
  }

  const email = String(payload?.email || "").trim().toLowerCase();
  const password = String(payload?.password || "");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: "Enter a valid email address" }, 400);
  }
  if (password.length < 8) {
    return json({ error: "Password must be at least 8 characters" }, 400);
  }
  if (password.length > 128) {
    return json({ error: "Password is too long" }, 400);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(`ip:${ip}`) || !rateLimit(`em:${email}`, 5)) {
    return json({ error: "Too many attempts. Try again later." }, 429);
  }

  // Look up user id by email via Auth Admin REST API
  let userId: string | null = null;
  try {
    const look = await fetch(
      `${url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
      },
    );
    if (look.ok) {
      const body = await look.json();
      // Response shape: { users: [...] } or a single user object
      if (Array.isArray(body?.users) && body.users.length) {
        const match = body.users.find(
          (u: { email?: string }) => (u.email || "").toLowerCase() === email,
        );
        userId = match?.id || body.users[0]?.id || null;
      } else if (body?.id && (body.email || "").toLowerCase() === email) {
        userId = body.id;
      }
    }
  } catch (e) {
    console.error("lookup", e);
  }

  // Fallback: list users pages (small projects)
  if (!userId) {
    try {
      const admin = createClient(url, serviceKey);
      for (let page = 1; page <= 5; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (error) break;
        const found = (data?.users || []).find(
          (u) => (u.email || "").toLowerCase() === email,
        );
        if (found) {
          userId = found.id;
          break;
        }
        if (!data?.users?.length || data.users.length < 200) break;
      }
    } catch (e) {
      console.error("listUsers", e);
    }
  }

  // Do not reveal whether the email exists
  if (!userId) {
    return json({
      ok: true,
      message: "If an account exists for this email, the password was updated. You can sign in now.",
    });
  }

  const admin = createClient(url, serviceKey);
  const { error: updErr } = await admin.auth.admin.updateUserById(userId, { password });
  if (updErr) {
    console.error("updateUserById", updErr);
    return json({ error: updErr.message || "Could not update password" }, 400);
  }

  return json({
    ok: true,
    message: "Password updated. You can sign in with your new password.",
  });
});
