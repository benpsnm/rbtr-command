// ═══════════════════════════════════════════════════════════════════════════
// Customer Insurance Upload
// POST /api/customer/upload-insurance
// Uploads insurance documents to Supabase Storage
// ═══════════════════════════════════════════════════════════════════════════

import formidable from 'formidable';
import fs from 'fs';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Need service key for storage upload
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

export const config = {
  api: {
    bodyParser: false, // Disable body parsing for file uploads
  },
};

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify customer session
  const customer = getCustomerFromToken(req);
  if (!customer) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    // Parse form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read file buffer
    const fileBuffer = fs.readFileSync(file.filepath);

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.originalFilename || 'upload';
    const extension = originalName.split('.').pop();
    const filename = `${customer.customer_id}/${timestamp}-${originalName}`;

    // Upload to Supabase Storage
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/customer-uploads/${filename}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': file.mimetype || 'application/octet-stream',
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('[Upload to Supabase Storage failed]', errorText);
      return res.status(500).json({ error: 'Failed to upload file to storage' });
    }

    const uploadData = await uploadResponse.json();

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    // Get public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/customer-uploads/${filename}`;

    return res.status(200).json({
      success: true,
      filename: originalName,
      path: filename,
      url: publicUrl,
      size: file.size,
    });

  } catch (error) {
    console.error('[Upload Insurance Error]', error);
    return res.status(500).json({
      error: 'Failed to upload file',
      message: error.message,
    });
  }
}
