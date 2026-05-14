'use strict';

// GET /api/onboarding/portal-data
// Customer-facing data endpoint. Requires portal_session cookie (customer auth).
// Returns customer's own record, pallets, quotes, agreements, bookings.

const { setCors, handlePreflight } = require('../standalone/_cors');
const { sbGet, sbPost } = require('../standalone/_db');
const { requirePortalAuth } = require('./_portal_auth');

module.exports = async (req, res) => {
  if (handlePreflight(req, res)) return;
  setCors(req, res);

  const auth = requirePortalAuth(req);
  if (!auth.authorized) return res.status(401).json({ ok: false, reason: auth.reason });

  const customerId = auth.customerId;

  try {
    // GET — fetch customer's own data
    if (req.method === 'GET') {
      const { section } = req.query;

      if (section === 'dashboard' || !section) {
        const [customer, pallets, upcomingBookings, recentQuotes] = await Promise.all([
          sbGet('psnm_customers', { id: `eq.${customerId}`, select: 'id,business_name,contact_name,email,status,became_live_at,volume_pallets_actual,goods_description,account_manager' }),
          // Active pallets from WMS (if customer name matches)
          sbGet('psnm_wms_pallets', { customer: `eq.${customerId}`, out: 'eq.false', select: 'id,location,description,date_in,weekly_rate,stype' }).catch(() => []),
          sbGet('psnm_pipeline_bookings', {
            customer_id: `eq.${customerId}`,
            status: 'eq.confirmed',
            select: 'id,booking_ref,booking_type,confirmed_date,confirmed_time,pallet_count,status',
            order: 'confirmed_date.asc',
            limit: 5,
          }),
          sbGet('psnm_quotes', {
            customer_id: `eq.${customerId}`,
            select: 'id,quote_number,quote_date,pallet_count,monthly_storage_cost,status,valid_until',
            order: 'created_at.desc',
            limit: 3,
          }),
        ]);

        const c = customer[0] || {};
        // Monthly bill estimate from most recent active quote
        const activeQuote = recentQuotes.find(q => q.status === 'accepted') || recentQuotes[0];
        const monthlyBill = activeQuote ? Number(activeQuote.monthly_storage_cost) : null;

        return res.status(200).json({
          ok: true,
          customer: c,
          pallet_count: pallets.length,
          monthly_bill_estimate: monthlyBill,
          upcoming_bookings: upcomingBookings,
          recent_quotes: recentQuotes,
        });
      }

      if (section === 'documents') {
        const [quotes, agreements] = await Promise.all([
          sbGet('psnm_quotes', { customer_id: `eq.${customerId}`, select: 'id,quote_number,quote_date,status,total_inc_vat', order: 'created_at.desc' }),
          sbGet('psnm_agreements', { customer_id: `eq.${customerId}`, select: 'id,agreement_number,agreement_date,status,effective_from', order: 'created_at.desc' }),
        ]);
        return res.status(200).json({ ok: true, quotes, agreements });
      }

      if (section === 'bookings') {
        const bookings = await sbGet('psnm_pipeline_bookings', {
          customer_id: `eq.${customerId}`,
          select: '*',
          order: 'created_at.desc',
          limit: 20,
        });
        return res.status(200).json({ ok: true, bookings });
      }

      return res.status(400).json({ error: 'unknown section' });
    }

    // POST — create booking request
    if (req.method === 'POST') {
      const { action } = req.query;

      if (action === 'book') {
        const {
          booking_type,
          requested_date,
          requested_time_slot,
          pallet_count,
          pallet_description,
          vehicle_reg,
          driver_name,
          driver_phone,
          haulier_name,
          notes,
        } = req.body;

        if (!booking_type) return res.status(400).json({ error: 'booking_type required' });
        if (!['inbound','outbound','devan_20ft','devan_40ft','collection','special'].includes(booking_type)) {
          return res.status(400).json({ error: 'invalid booking_type' });
        }

        const bookingRef = `PSN-BK-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;

        const row = {
          customer_id:      customerId,
          booking_ref:      bookingRef,
          booking_type,
          requested_date:   requested_date || null,
          requested_time_slot: requested_time_slot || null,
          pallet_count:     pallet_count ? parseInt(pallet_count) : null,
          pallet_description: pallet_description || null,
          vehicle_reg:      vehicle_reg || null,
          driver_name:      driver_name || null,
          driver_phone:     driver_phone || null,
          haulier_name:     haulier_name || null,
          notes:            notes || null,
          status:           'requested',
        };

        const created = await sbPost('psnm_pipeline_bookings', row);
        const booking = Array.isArray(created) ? created[0] : created;

        // Telegram alert to Ben
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (token && chatId) {
          const customers = await sbGet('psnm_customers', { id: `eq.${customerId}`, select: 'business_name' });
          const biz = customers[0]?.business_name || customerId;
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: `📦 New ${booking_type} request from ${biz}\nDate: ${requested_date || 'TBD'} · ${pallet_count || '?'} pallets\nRef: ${bookingRef}`,
            }),
          }).catch(() => null);
        }

        return res.status(201).json({ ok: true, booking_ref: bookingRef, booking });
      }

      return res.status(400).json({ error: 'unknown action' });
    }

    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    console.error('[onboarding/portal-data]', e.message);
    return res.status(500).json({ error: e.message });
  }
};
