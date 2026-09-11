const json = (value, status = 200, extra = {}) => new Response(JSON.stringify(value), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", ...extra }
});

function cors(request, env) {
  const origin = request.headers.get("origin") || "";
  return origin === env.APP_ORIGIN ? {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type",
    "vary": "Origin"
  } : {};
}

function validTimeZone(timeZone) {
  try {
    Intl.DateTimeFormat("en", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

function localParts(now, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(now).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute)
  };
}

async function sendDueReminders(env) {
  const { buildPushPayload } = await import("@block65/webcrypto-web-push");
  const vapid = {
    subject: env.VAPID_SUBJECT,
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY
  };
  const { results = [] } = await env.DB.prepare("SELECT * FROM subscriptions WHERE enabled = 1").all();
  const now = new Date();

  for (const row of results) {
    const local = localParts(now, row.timezone);
    const due = local.hour === row.hour && local.minute >= row.minute && local.minute < row.minute + 5;
    if (!due || row.last_sent_date === local.date) continue;
    try {
      const subscription = JSON.parse(row.subscription);
      const payload = await buildPushPayload({ data: JSON.stringify({
        title: "صد روز با جوشن کبیر",
        body: "وقت خواندن بند امروز جوشن کبیر است.",
        url: env.APP_ORIGIN
      }), options: { ttl: 3600 } }, subscription, vapid);
      const response = await fetch(subscription.endpoint, payload);
      if (!response.ok) throw Object.assign(new Error(`Push returned ${response.status}`), { statusCode: response.status });
      await env.DB.prepare("UPDATE subscriptions SET last_sent_date = ? WHERE endpoint = ?")
        .bind(local.date, row.endpoint).run();
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await env.DB.prepare("DELETE FROM subscriptions WHERE endpoint = ?").bind(row.endpoint).run();
      } else {
        console.error("Push failed", row.endpoint, error);
      }
    }
  }
}

export default {
  async fetch(request, env) {
    const headers = cors(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.headers.get("origin") && !headers["access-control-allow-origin"]) {
      return json({ error: "Origin not allowed" }, 403);
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return json({ ok: true, service: "jooshan-pwa-reminder" }, 200, headers);
    }
    if (request.method === "GET" && url.pathname === "/vapid-public-key") {
      return json({ publicKey: env.VAPID_PUBLIC_KEY }, 200, headers);
    }

    if (request.method === "POST" && url.pathname === "/subscriptions") {
      const body = await request.json();
      const subscription = body.subscription;
      const timezone = body.timezone;
      const hour = Number(body.hour ?? 9);
      const minute = Number(body.minute ?? 0);
      if (!subscription?.endpoint || !validTimeZone(timezone) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
        return json({ error: "Invalid subscription" }, 400, headers);
      }
      await env.DB.prepare(`INSERT INTO subscriptions
        (endpoint, subscription, timezone, hour, minute, enabled, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(endpoint) DO UPDATE SET subscription=excluded.subscription,
        timezone=excluded.timezone, hour=excluded.hour, minute=excluded.minute,
        enabled=1, updated_at=CURRENT_TIMESTAMP`)
        .bind(subscription.endpoint, JSON.stringify(subscription), timezone, hour, minute).run();
      return json({ ok: true }, 200, headers);
    }

    if (request.method === "DELETE" && url.pathname === "/subscriptions") {
      const { endpoint } = await request.json();
      if (endpoint) await env.DB.prepare("DELETE FROM subscriptions WHERE endpoint = ?").bind(endpoint).run();
      return json({ ok: true }, 200, headers);
    }

    return json({ error: "Not found" }, 404, headers);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sendDueReminders(env));
  }
};
