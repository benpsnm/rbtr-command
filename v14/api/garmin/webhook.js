'use strict';
// Garmin push notification webhook receiver
// Feature branch: feature/garmin-integration
// NOT DEPLOYED — awaiting Vercel restoration + Garmin developer app registration
//
// Garmin can push data to this endpoint rather than us polling.
// Register this URL in the Garmin Developer Console under "Webhook URL".
// Garmin sends a ping to verify (GET), then POST for data updates.
//
// Garmin webhook docs: https://developer.garmin.com/gc-developer-program/health-api/

const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
const GARMIN_WEBHOOK_SECRET = process.env.GARMIN_WEBHOOK_SECRET;

export default async function handler(req, res) {
  // Garmin verification ping (GET)
  if (req.method === 'GET') {
    const challenge = req.query['garmin-challenge'];
    if (challenge) {
      return res.json({ 'garmin-challenge': challenge });
    }
    return res.status(200).json({ ok: true, service: 'rbtr-garmin-webhook' });
  }

  if (req.method !== 'POST') return res.status(405).end();

  // Validate webhook signature if secret is configured
  if (GARMIN_WEBHOOK_SECRET) {
    const sig = req.headers['x-garmin-signature'];
    if (sig !== GARMIN_WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  try {
    const body = req.body;

    // Garmin sends arrays of wellness summaries
    const toProcess = [];

    if (body.dailies) {
      for (const d of body.dailies) {
        toProcess.push({
          date: d.calendarDate,
          resting_hr: d.restingHeartRateInBeatsPerMinute ?? null,
        });
      }
    }

    if (body.sleeps) {
      for (const s of body.sleeps) {
        const date = s.calendarDate;
        const existing = toProcess.find(r => r.date === date) || { date };
        existing.sleep_hours = s.durationInSeconds ? parseFloat((s.durationInSeconds / 3600).toFixed(1)) : null;
        existing.sleep_score = s.overallSleepScore?.value ?? null;
        existing.recovery_score = s.bodyBatteryChange ?? null;
        if (!toProcess.find(r => r.date === date)) toProcess.push(existing);
      }
    }

    if (body.hrv) {
      for (const h of body.hrv) {
        const date = h.calendarDate;
        const existing = toProcess.find(r => r.date === date) || { date };
        existing.hrv = h.lastNight5MinHighHrv ?? null;
        if (!toProcess.find(r => r.date === date)) toProcess.push(existing);
      }
    }

    if (toProcess.length) {
      await fetch(`${SUPABASE_URL}/rest/v1/rbtr_wellness_daily`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify(toProcess),
      });
    }

    res.json({ ok: true, processed: toProcess.length });
  } catch (err) {
    console.error('[garmin/webhook]', err);
    res.status(500).json({ error: err.message });
  }
}
