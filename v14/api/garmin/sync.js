'use strict';
// Garmin daily data sync — fetches last 24h of wellness data and upserts into rbtr_wellness_daily
// Feature branch: feature/garmin-integration
// NOT DEPLOYED — awaiting Vercel restoration + Garmin developer app registration
//
// Called by:
//   - Cron job: daily at 07:00 (after morning brief generation)
//   - Manual trigger: Command Centre → Wellness → Garmin card → "Sync Now"
//
// Garmin Health API docs: https://developer.garmin.com/gc-developer-program/health-api/
// Registration: https://developer.garmin.com/gc-developer-program/agreement/

const GARMIN_CLIENT_ID      = process.env.GARMIN_CLIENT_ID;
const GARMIN_CLIENT_SECRET  = process.env.GARMIN_CLIENT_SECRET;
const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

async function getTokens() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rbtr_wellness_garmin_tokens?id=eq.ben&limit=1`, {
    headers: { 'apikey': SUPABASE_SERVICE_ROLE, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}` },
  });
  const rows = await res.json();
  if (!rows.length) throw new Error('Garmin not connected — run OAuth flow first');
  return rows[0];
}

async function refreshIfNeeded(tokens) {
  if (new Date(tokens.expires_at) > new Date(Date.now() + 60000)) return tokens.access_token;

  const res = await fetch('https://connectapi.garmin.com/oauth-service/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(`${GARMIN_CLIENT_ID}:${GARMIN_CLIENT_SECRET}`).toString('base64'),
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: tokens.refresh_token }),
  });

  const fresh = await res.json();
  await fetch(`${SUPABASE_URL}/rest/v1/rbtr_wellness_garmin_tokens?id=eq.ben`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
      'Content-Type': 'application/json', 'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      access_token: fresh.access_token,
      expires_at: new Date(Date.now() + fresh.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });
  return fresh.access_token;
}

async function garminGet(path, token) {
  const res = await fetch(`https://apis.garmin.com/wellness-api/rest${path}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Garmin API ${path} → ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  // Accept GET (manual trigger) or POST (cron)
  try {
    const tokens    = await getTokens();
    const token     = await refreshIfNeeded(tokens);
    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Fetch wellness endpoints in parallel
    const [dailies, sleeps, hrv] = await Promise.all([
      garminGet(`/dailies?startDate=${yesterday}&endDate=${today}`, token).catch(() => []),
      garminGet(`/sleeps?startDate=${yesterday}&endDate=${today}`, token).catch(() => []),
      garminGet(`/hrv?startDate=${yesterday}&endDate=${today}`, token).catch(() => []),
    ]);

    // Parse most recent values
    const latestDaily = dailies?.[dailies.length - 1] || {};
    const latestSleep = sleeps?.[sleeps.length - 1] || {};
    const latestHrv   = hrv?.[hrv.length - 1] || {};

    const upsertData = {
      date: yesterday,          // yesterday's data synced this morning
      sleep_hours:    latestSleep.durationInSeconds ? parseFloat((latestSleep.durationInSeconds / 3600).toFixed(1)) : null,
      sleep_score:    latestSleep.overallSleepScore?.value ?? null,
      hrv:            latestHrv.lastNight5MinHighHrv ?? null,
      resting_hr:     latestDaily.restingHeartRateInBeatsPerMinute ?? null,
      recovery_score: latestSleep.bodyBatteryChange ?? null,  // Garmin uses Body Battery as recovery proxy
    };

    // Upsert into rbtr_wellness_daily (merge — preserve any Ben-entered fields)
    await fetch(`${SUPABASE_URL}/rest/v1/rbtr_wellness_daily`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(upsertData),
    });

    res.json({ ok: true, synced: upsertData });
  } catch (err) {
    console.error('[garmin/sync]', err);
    res.status(500).json({ error: err.message });
  }
}
