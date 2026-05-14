'use strict';
// PSNM Customer Portal — Insurance Evidence Upload
// POST /api/customer/insurance/upload (multipart)
// Uploads file to Supabase Storage, records in customer metadata

const { requireCustomerAuth } = require('../_middleware');
const formidable = require('formidable');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

const BUCKET_NAME = 'customer-insurance-evidence';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

async function sbUpdate(table, match, data) {
  const qs = Object.entries(match).map(([k, v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
  const url = `${SUPABASE_URL}/rest/v1/${table}?${qs}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => 'unknown');
    throw new Error(`sbUpdate ${r.status}: ${err.slice(0, 200)}`);
  }
  return r.json();
}

async function uploadToStorage(filePath, fileName, customerId) {
  const fileBuffer = fs.readFileSync(filePath);
  const storageKey = `${customerId}/${Date.now()}-${fileName}`;

  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${storageKey}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: fileBuffer,
  });

  if (!r.ok) {
    const err = await r.text().catch(() => 'unknown');
    throw new Error(`Storage upload ${r.status}: ${err.slice(0, 200)}`);
  }

  return {
    key: storageKey,
    public_url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${storageKey}`,
  };
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
    });

    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Cookie');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const auth = requireCustomerAuth(req);
  if (!auth.authorized) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  try {
    const { fields, files } = await parseMultipart(req);

    if (!files.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded' });
    }

    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const originalName = file.originalFilename || file.newFilename;

    // Upload to Supabase Storage
    const { key, public_url } = await uploadToStorage(file.filepath, originalName, auth.customer_id);

    // Update customer record with insurance evidence URL
    await sbUpdate('psnm_customers', { id: auth.customer_id }, {
      insurance_evidence_url: public_url,
      insurance_evidence_uploaded_at: new Date().toISOString(),
    });

    // Cleanup temp file
    fs.unlinkSync(file.filepath);

    return res.status(200).json({
      ok: true,
      message: 'Insurance evidence uploaded successfully',
      url: public_url,
      uploaded_at: new Date().toISOString(),
    });

  } catch (e) {
    console.error('[insurance/upload] Error:', e.message);
    return res.status(500).json({ ok: false, error: 'Upload failed: ' + e.message });
  }
};
