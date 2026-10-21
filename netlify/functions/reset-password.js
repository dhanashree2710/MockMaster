/**
 * MockMaster — forgot password (no email link)
 * Deployed automatically with the site on Netlify.
 *
 * In Netlify Dashboard → Site settings → Environment variables, set:
 *   SUPABASE_URL=https://uajfitgssxwgbgaueeex.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=<from Supabase → Settings → API → service_role>
 *
 * Never put the service_role key in the frontend.
 */

const hits = new Map();

function rateLimit(key, max = 8, windowMs = 3600000) {
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

function json(status, body) {
  return {
    statusCode: status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return json(200, { ok: true });
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }

  const url = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return json(503, {
      error:
        'Password service not configured. In Netlify → Environment variables set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then redeploy.',
    });
  }

  let payload = {};
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Bad JSON' });
  }

  const email = String(payload.email || '')
    .trim()
    .toLowerCase();
  const password = String(payload.password || '');

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: 'Enter a valid email address' });
  }
  if (password.length < 8) {
    return json(400, { error: 'Password must be at least 8 characters' });
  }
  if (password.length > 128) {
    return json(400, { error: 'Password is too long' });
  }

  const ip =
    (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    event.headers['client-ip'] ||
    'unknown';
  if (!rateLimit('ip:' + ip) || !rateLimit('em:' + email, 5)) {
    return json(429, { error: 'Too many attempts. Try again later.' });
  }

  // Find user by email
  let userId = null;
  try {
    const look = await fetch(
      url.replace(/\/$/, '') +
        '/auth/v1/admin/users?email=' +
        encodeURIComponent(email),
      {
        headers: {
          Authorization: 'Bearer ' + serviceKey,
          apikey: serviceKey,
        },
      }
    );
    if (look.ok) {
      const body = await look.json();
      if (Array.isArray(body.users) && body.users.length) {
        const match = body.users.find(
          (u) => (u.email || '').toLowerCase() === email
        );
        userId = (match && match.id) || body.users[0].id || null;
      } else if (body.id && (body.email || '').toLowerCase() === email) {
        userId = body.id;
      }
    }
  } catch (e) {
    console.error('lookup', e);
  }

  // Fallback list (first pages)
  if (!userId) {
    try {
      for (let page = 1; page <= 5 && !userId; page++) {
        const res = await fetch(
          url.replace(/\/$/, '') +
            '/auth/v1/admin/users?page=' +
            page +
            '&per_page=200',
          {
            headers: {
              Authorization: 'Bearer ' + serviceKey,
              apikey: serviceKey,
            },
          }
        );
        if (!res.ok) break;
        const body = await res.json();
        const users = body.users || [];
        const found = users.find(
          (u) => (u.email || '').toLowerCase() === email
        );
        if (found) userId = found.id;
        if (users.length < 200) break;
      }
    } catch (e) {
      console.error('list', e);
    }
  }

  if (!userId) {
    // Same message whether or not account exists
    return json(200, {
      ok: true,
      message:
        'If an account exists for this email, the password was updated. You can sign in now.',
    });
  }

  try {
    const upd = await fetch(
      url.replace(/\/$/, '') + '/auth/v1/admin/users/' + userId,
      {
        method: 'PUT',
        headers: {
          Authorization: 'Bearer ' + serviceKey,
          apikey: serviceKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: password }),
      }
    );
    if (!upd.ok) {
      const errBody = await upd.text();
      console.error('update', upd.status, errBody);
      let msg = 'Could not update password';
      try {
        msg = JSON.parse(errBody).msg || JSON.parse(errBody).error_description || msg;
      } catch (_) {}
      return json(400, { error: msg });
    }
  } catch (e) {
    console.error('update fetch', e);
    return json(500, { error: 'Could not update password' });
  }

  return json(200, {
    ok: true,
    message: 'Password updated. You can sign in with your new password.',
  });
};
