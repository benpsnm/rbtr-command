// ═══════════════════════════════════════════════════════════════════════════
// Customer Portal Data API Dispatcher
// Handles all customer data endpoints
// ═══════════════════════════════════════════════════════════════════════════

import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

async function sbQuery(table, query = '', method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' || method === 'PATCH' ? 'return=representation' : '',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) return method === 'GET' ? [] : null;
  return method === 'GET' || method === 'POST' || method === 'PATCH' ? await response.json() : null;
}

function getCustomerFromToken(req) {
  try {
    const cookies = req.headers.cookie?.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {}) || {};

    const token = cookies.psnm_customer_session;
    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'customer') return null;

    return decoded;
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Dashboard Stats
// ═══════════════════════════════════════════════════════════════════════════
async function handleStats(customer) {
  // Get current pallet count
  const movements = await sbQuery(
    'psnm_pallet_movements',
    `customer_id=eq.${customer.customer_id}&select=quantity,movement_type`
  );

  let palletCount = 0;
  movements.forEach(m => {
    if (m.movement_type === 'in') palletCount += m.quantity;
    if (m.movement_type === 'out') palletCount -= m.quantity;
  });

  // Get active bookings count
  const bookings = await sbQuery(
    'psnm_bookings',
    `customer_id=eq.${customer.customer_id}&status=eq.active`
  );

  // Get outstanding invoices
  const invoices = await sbQuery(
    'psnm_invoices',
    `customer_id=eq.${customer.customer_id}&status=eq.pending&select=amount_due`
  );

  const currentBalance = invoices.reduce((sum, inv) => sum + (inv.amount_due || 0), 0);

  // Get next scheduled invoice
  const upcomingInvoices = await sbQuery(
    'psnm_invoices',
    `customer_id=eq.${customer.customer_id}&status=eq.draft&order=due_date.asc&limit=1&select=due_date`
  );

  const nextInvoiceDate = upcomingInvoices.length > 0
    ? new Date(upcomingInvoices[0].due_date).toLocaleDateString()
    : null;

  return {
    pallet_count: Math.max(0, palletCount),
    booking_count: bookings.length,
    current_balance: currentBalance,
    next_invoice_date: nextInvoiceDate,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Active Bookings
// ═══════════════════════════════════════════════════════════════════════════
async function handleBookings(customer) {
  const bookings = await sbQuery(
    'psnm_bookings',
    `customer_id=eq.${customer.customer_id}&status=eq.active&select=*&order=start_date.desc`
  );

  return bookings;
}

// ═══════════════════════════════════════════════════════════════════════════
// Recent Activity (Pallet Movements)
// ═══════════════════════════════════════════════════════════════════════════
async function handleActivity(customer) {
  const movements = await sbQuery(
    'psnm_pallet_movements',
    `customer_id=eq.${customer.customer_id}&select=*&order=movement_date.desc&limit=10`
  );

  return movements;
}

// ═══════════════════════════════════════════════════════════════════════════
// Invoice History
// ═══════════════════════════════════════════════════════════════════════════
async function handleInvoices(customer) {
  const invoices = await sbQuery(
    'psnm_invoices',
    `customer_id=eq.${customer.customer_id}&select=*&order=created_at.desc&limit=20`
  );

  return invoices;
}

// ═══════════════════════════════════════════════════════════════════════════
// Storage Details
// ═══════════════════════════════════════════════════════════════════════════
async function handleStorage(customer) {
  // Get current pallet count by movement type
  const movements = await sbQuery(
    'psnm_pallet_movements',
    `customer_id=eq.${customer.customer_id}&select=*&order=movement_date.desc`
  );

  let totalIn = 0;
  let totalOut = 0;

  movements.forEach(m => {
    if (m.movement_type === 'in') totalIn += m.quantity;
    if (m.movement_type === 'out') totalOut += m.quantity;
  });

  return {
    current_count: Math.max(0, totalIn - totalOut),
    total_in: totalIn,
    total_out: totalOut,
    movements: movements.slice(0, 10),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Get Account Info
// ═══════════════════════════════════════════════════════════════════════════
async function handleGetAccount(customer) {
  const customers = await sbQuery(
    'psnm_customers',
    `id=eq.${customer.customer_id}&select=*`
  );

  return customers.length > 0 ? customers[0] : null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Update Account Info
// ═══════════════════════════════════════════════════════════════════════════
async function handleUpdateAccount(customer, body) {
  const { company_name, contact_name, phone, address } = body;

  const updated = await sbQuery(
    'psnm_customers',
    `id=eq.${customer.customer_id}`,
    'PATCH',
    {
      company_name,
      contact_name,
      phone,
      address,
    }
  );

  return updated;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  // Get customer from session
  const customer = getCustomerFromToken(req);
  if (!customer) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const path = req.url.replace('/api/customer/data', '').split('?')[0];

  try {
    // Route by path
    if (path === '/stats' && req.method === 'GET') {
      const stats = await handleStats(customer);
      return res.status(200).json(stats);
    }

    if (path === '/bookings' && req.method === 'GET') {
      const bookings = await handleBookings(customer);
      return res.status(200).json(bookings);
    }

    if (path === '/activity' && req.method === 'GET') {
      const activity = await handleActivity(customer);
      return res.status(200).json(activity);
    }

    if (path === '/invoices' && req.method === 'GET') {
      const invoices = await handleInvoices(customer);
      return res.status(200).json(invoices);
    }

    if (path === '/storage' && req.method === 'GET') {
      const storage = await handleStorage(customer);
      return res.status(200).json(storage);
    }

    if (path === '/account' && req.method === 'GET') {
      const account = await handleGetAccount(customer);
      return res.status(200).json(account);
    }

    if (path === '/account' && req.method === 'PATCH') {
      const updated = await handleUpdateAccount(customer, req.body);
      return res.status(200).json(updated);
    }

    return res.status(404).json({ error: 'Not found' });

  } catch (error) {
    console.error('[Customer Data Error]', error);
    return res.status(500).json({
      error: 'Failed to fetch data',
      message: error.message,
    });
  }
}
