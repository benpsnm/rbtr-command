'use strict';
// Marketplace — Photo Upload + Processing
// POST /api/marketplace/photos/upload (multipart)
// Processes photos into 3 sizes (full/preview/thumb), strips EXIF, optional watermark

const formidable = require('formidable');
const sharp = require('sharp');
const fs = require('fs');
const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
const WATERMARK_ENABLED = process.env.PHOTO_WATERMARK_ENABLED === 'true';

const BUCKET_NAME = 'marketplace-photos';
const MAX_FILE_SIZE = 12 * 1024 * 1024; // 12MB
const MAX_PHOTOS = 12;

const SIZES = {
  full: { width: 1600, height: 1200, quality: 85 },
  preview: { width: 800, height: 600, quality: 85 },
  thumb: { width: 400, height: 300, quality: 75 },
};

async function sbInsert(table, data) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!r.ok) {
    const err = await r.text().catch(() => 'unknown');
    throw new Error(`sbInsert ${r.status}: ${err.slice(0, 200)}`);
  }
  return r.json();
}

async function uploadToStorage(buffer, key) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${key}`;
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!r.ok) {
    const err = await r.text().catch(() => 'unknown');
    throw new Error(`Storage upload ${r.status}: ${err.slice(0, 200)}`);
  }

  return {
    key,
    public_url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${key}`,
  };
}

async function processPhoto(filePath, photoId) {
  const urls = {};
  const sizes = {};

  // Load original
  let img = sharp(filePath);

  // Strip EXIF metadata
  img = img.rotate(); // Auto-rotate based on EXIF, then strip

  // Generate 3 sizes
  for (const [sizeName, config] of Object.entries(SIZES)) {
    let processed = img.clone()
      .resize(config.width, config.height, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: config.quality });

    // Optional watermark (full and preview only)
    if (WATERMARK_ENABLED && (sizeName === 'full' || sizeName === 'preview')) {
      const watermarkText = 'PSNM 07506 255033';
      const svgWatermark = `
        <svg width="${config.width}" height="${config.height}">
          <text
            x="${config.width - 10}"
            y="${config.height - 10}"
            text-anchor="end"
            font-family="Arial"
            font-size="16"
            fill="white"
            fill-opacity="0.6"
          >${watermarkText}</text>
        </svg>
      `;
      processed = processed.composite([{
        input: Buffer.from(svgWatermark),
        gravity: 'southeast',
      }]);
    }

    const buffer = await processed.toBuffer();
    sizes[sizeName] = buffer.length;

    // Upload to Supabase Storage
    const key = `${photoId}_${sizeName}.jpg`;
    const { public_url } = await uploadToStorage(buffer, key);
    urls[sizeName] = public_url;
  }

  return { urls, sizes };
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: MAX_PHOTOS,
      keepExtensions: true,
      filter: ({ mimetype }) => {
        return mimetype === 'image/jpeg' || mimetype === 'image/png';
      },
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { fields, files } = await parseMultipart(req);

    const fileArray = files.photos
      ? (Array.isArray(files.photos) ? files.photos : [files.photos])
      : [];

    if (fileArray.length === 0) {
      return res.status(400).json({ ok: false, error: 'No photos uploaded' });
    }

    if (fileArray.length > MAX_PHOTOS) {
      return res.status(400).json({ ok: false, error: `Maximum ${MAX_PHOTOS} photos allowed` });
    }

    const results = [];

    for (const file of fileArray) {
      const photoId = crypto.randomUUID();
      const originalName = file.originalFilename || file.newFilename;

      // Process photo
      const { urls, sizes } = await processPhoto(file.filepath, photoId);

      // Save metadata to DB
      const [photoRecord] = await sbInsert('marketplace_photos', {
        id: photoId,
        listing_id: fields.listing_id || null,
        original_filename: originalName,
        size_bytes: file.size,
        full_url: urls.full,
        preview_url: urls.preview,
        thumb_url: urls.thumb,
        watermarked: WATERMARK_ENABLED,
      });

      results.push({
        photo_id: photoId,
        urls,
        sizes,
      });

      // Cleanup temp file
      fs.unlinkSync(file.filepath);
    }

    return res.status(200).json({
      ok: true,
      photos: results,
      count: results.length,
    });

  } catch (e) {
    console.error('[photos/upload] Error:', e.message);
    return res.status(500).json({ ok: false, error: 'Photo processing failed: ' + e.message });
  }
};
