'use strict';
// PSNM Customer Portal — Storage Status
// GET /api/customer/storage
// Returns: pallet count, locations, storage history

const { requireCustomerAuth } = require('./_middleware');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

async function sbQuery(table, filter) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const r = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!r.ok) return null;
  return r.json();
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = requireCustomerAuth(req);
  if (!auth.authorized) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    // Get all bookings (active + historical)
    const bookings = await sbQuery('psnm_bookings', `customer_id=eq.${auth.customer_id}&order=start_date.desc&limit=100`) || [];

    // Calculate current storage
    const activeBookings = bookings.filter(b => b.status === 'active');
    const currentPallets = activeBookings.reduce((sum, b) => sum + (b.pallet_count || 0), 0);
    const monthlyCharge = activeBookings.reduce((sum, b) => sum + (b.monthly_rate || 0), 0);

    // Group by location
    const locationBreakdown = activeBookings.reduce((acc, b) => {
      const loc = b.location_zone || 'Warehouse';
      if (!acc[loc]) acc[loc] = { location: loc, pallet_count: 0, monthly_rate: 0 };
      acc[loc].pallet_count += b.pallet_count || 0;
      acc[loc].monthly_rate += b.monthly_rate || 0;
      return acc;
    }, {});

    // Historical snapshot (last 12 months)
    const now = new Date();
    const history = [];
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const monthBookings = bookings.filter(b => {
        const start = new Date(b.start_date);
        const end = b.end_date ? new Date(b.end_date) : new Date();
        return start <= monthEnd && end >= month;
      });

      const palletCount = monthBookings.reduce((sum, b) => sum + (b.pallet_count || 0), 0);

      history.push({
        month: month.toISOString().slice(0, 7),
        pallet_count: palletCount,
      });
    }

    return res.status(200).json({
      ok: true,
      current_pallets: currentPallets,
      monthly_charge: monthlyCharge,
      locations: Object.values(locationBreakdown),
      active_bookings: activeBookings.map(b => ({
        id: b.id,
        pallet_count: b.pallet_count,
        location: b.location_zone || 'Warehouse',
        start_date: b.start_date,
        monthly_rate: b.monthly_rate,
      })),
      history,
    });

  } catch (e) {
    console.error('[storage] Error:', e.message);
    return res.status(500).json({ ok: false, error: 'Failed to fetch storage data' });
  }
};
