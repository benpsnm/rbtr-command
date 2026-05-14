// ═══════════════════════════════════════════════════════════════════════════
// Temporary SQL execution endpoint for migrations
// POST /api/rocko/v2/exec-sql
// Body: { sql: "CREATE TABLE..." }
// Auth: Bearer CRON_SECRET
// ═══════════════════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth check
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { sql } = req.body;
  if (!sql) {
    return res.status(400).json({ error: 'sql required' });
  }

  // Use pg library to execute raw SQL
  // Since pg is not available, we'll use a workaround via Supabase SQL editor API
  // For now, return instructions to run manually

  return res.status(200).json({
    status: 'manual_execution_required',
    message: 'Execute the SQL in Supabase dashboard SQL editor',
    sql_preview: sql.substring(0, 200) + '...',
    instructions: [
      '1. Go to https://supabase.com/dashboard/project/mpxgyobotiqcawmqlhbf/sql/new',
      '2. Paste the migration SQL from v14/supabase/migrations/078_rocko_v2_schema.sql',
      '3. Click Run',
      '4. Verify tables created: rocko_v2_sessions, rocko_v2_messages, rocko_v2_integrations'
    ]
  });
}
