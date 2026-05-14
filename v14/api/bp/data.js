// ═══════════════════════════════════════════════════════════════════════════
// Booking Proof Data API
// GET/POST /api/bp/{endpoint}
// Handles properties, cleaners, claims, cleanings, billing
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function sbQuery(table, query = '', method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : method === 'PATCH' ? 'return=representation' : '',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${error}`);
  }

  return method === 'GET' || method === 'POST' || method === 'PATCH' ? await response.json() : null;
}

export default async function handler(req, res) {
  const path = req.url.replace('/api/bp/', '').split('?')[0];

  try {
    // Properties
    if (path === 'properties') {
      if (req.method === 'GET') {
        const properties = await sbQuery('bp_properties', 'order=created_at.desc&select=*');
        return res.status(200).json(properties);
      }
    }

    // Cleaners
    if (path === 'cleaners') {
      if (req.method === 'GET') {
        const cleaners = await sbQuery('bp_cleaners', 'order=name.asc&select=*');
        return res.status(200).json(cleaners);
      }
    }

    // Cleanings
    if (path === 'cleanings') {
      if (req.method === 'GET') {
        const { month } = req.query;
        let query = 'order=cleaned_at.desc&select=*';

        if (month === 'current') {
          const startOfMonth = new Date();
          startOfMonth.setDate(1);
          startOfMonth.setHours(0, 0, 0, 0);
          query = `cleaned_at=gte.${startOfMonth.toISOString()}&${query}`;
        }

        const cleanings = await sbQuery('bp_cleanings', query);
        return res.status(200).json(cleanings);
      }
    }

    // Claims
    if (path === 'claims') {
      if (req.method === 'GET') {
        const { status } = req.query;
        let query = 'order=created_at.desc&select=*';

        if (status) {
          query = `status=eq.${status}&${query}`;
        }

        const claims = await sbQuery('bp_damage_claims', query);
        return res.status(200).json(claims);
      }

      if (req.method === 'POST') {
        const { property_id, description, estimated_cost } = req.body;

        const claim = await sbQuery('bp_damage_claims', '', 'POST', {
          property_id,
          description,
          estimated_cost: estimated_cost || 0,
          status: 'open',
        });

        return res.status(200).json(claim[0]);
      }
    }

    // Billing
    if (path === 'billing') {
      if (req.method === 'GET') {
        const invoices = await sbQuery('bp_invoices', 'order=created_at.desc&select=*');
        return res.status(200).json(invoices);
      }
    }

    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('[BP Data] Error:', error);
    return res.status(500).json({
      error: 'Request failed',
      message: error.message,
    });
  }
}
