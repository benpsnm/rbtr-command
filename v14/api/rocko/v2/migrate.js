// ═══════════════════════════════════════════════════════════════════════════
// Temporary migration endpoint for Rocko v2
// POST /api/rocko/v2/migrate
// Executes SQL migration with service role privileges
// ═══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.split(' ')[1] !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { sql } = req.body;
  if (!sql) {
    return res.status(400).json({ error: 'sql required in body' });
  }

  try {
    // Execute SQL via pg_sql using Supabase function execution
    // We'll create the tables by calling the Supabase management API

    // Split into individual statements and execute each
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s.length > 10);

    const results = [];

    for (const stmt of statements) {
      console.log('Executing:', stmt.substring(0, 80) + '...');

      // Use PostgREST query endpoint
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          query: stmt
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        // Log but continue - some statements might fail if already exist
        console.log(`Statement execution status: ${response.status} - ${errorText}`);
        results.push({ stmt: stmt.substring(0, 60), status: response.status, error: errorText });
      } else {
        results.push({ stmt: stmt.substring(0, 60), status: 'ok' });
      }
    }

    // Verify tables exist
    const checkResponse = await fetch(`${SUPABASE_URL}/rest/v1/rocko_v2_sessions?limit=1`, {
      method: 'HEAD',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      }
    });

    const tablesExist = checkResponse.status === 200 || checkResponse.status === 206;

    return res.status(200).json({
      status: 'complete',
      statements_executed: results.length,
      tables_verified: tablesExist,
      results
    });

  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({
      error: 'Migration failed',
      message: error.message
    });
  }
}
