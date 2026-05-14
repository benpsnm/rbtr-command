// ═══════════════════════════════════════════════════════════════════════════
// Voice Clone Create
// POST /api/voice/clone-create
// Uploads audio to ElevenLabs Voice Cloning API, stores voice_id in db
// ═══════════════════════════════════════════════════════════════════════════

import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

export const config = {
  api: {
    bodyParser: false,
  },
};

async function sbQuery(table, query = '', method = 'GET', body = null) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const headers = {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': method === 'POST' ? 'return=representation' : '',
  };

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!response.ok) {
    throw new Error(`Supabase error: ${await response.text()}`);
  }

  return method === 'POST' ? await response.json() : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const form = formidable({});

  try {
    const [fields, files] = await form.parse(req);
    const userId = fields.user_id[0];
    const voiceName = fields.voice_name[0];
    const audioFile = files.audio[0];

    if (!userId || !voiceName || !audioFile) {
      return res.status(400).json({ error: 'user_id, voice_name, and audio file required' });
    }

    // Upload to ElevenLabs Voice Cloning API
    const formData = new FormData();
    formData.append('name', voiceName);
    formData.append('files', fs.createReadStream(audioFile.filepath), audioFile.originalFilename || 'sample.webm');
    formData.append('description', `Custom voice for ${userId}`);

    const elvResponse = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        ...formData.getHeaders(),
      },
      body: formData,
    });

    if (!elvResponse.ok) {
      const error = await elvResponse.text();
      throw new Error(`ElevenLabs error: ${error}`);
    }

    const elvData = await elvResponse.json();

    // Save to database
    const voiceRecord = await sbQuery('user_voices', '', 'POST', {
      user_id: userId,
      voice_id: elvData.voice_id,
      voice_name: voiceName,
      is_active: false, // Don't auto-activate, user must explicitly set
    });

    // Clean up temp file
    fs.unlinkSync(audioFile.filepath);

    return res.status(200).json({
      success: true,
      voice_id: elvData.voice_id,
      voice_name: voiceName,
      record_id: voiceRecord[0].id,
    });

  } catch (error) {
    console.error('[Voice Clone Create] Error:', error);
    return res.status(500).json({
      error: 'Voice cloning failed',
      message: error.message,
    });
  }
}
