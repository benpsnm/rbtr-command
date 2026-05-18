// ═══════════════════════════════════════════════════════════════════════════
// Rocko STT Proxy
// POST /api/rocko/stt
// Proxies speech-to-text requests to OpenAI Whisper API server-side
// ═══════════════════════════════════════════════════════════════════════════

import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false, // formidable handles multipart
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

  if (!OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'STT unavailable',
      message: 'OPENAI_API_KEY not configured server-side',
      fallback: 'text_input',
    });
  }

  try {
    // Parse multipart form data
    const form = formidable({ maxFileSize: 10 * 1024 * 1024 }); // 10MB limit

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const audioFile = files.file;
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Read file as buffer for native FormData
    const audioBuffer = fs.readFileSync(audioFile[0].filepath);
    const audioBlob = new Blob([audioBuffer], {
      type: audioFile[0].mimetype || 'audio/webm',
    });

    // Forward to OpenAI Whisper API using native FormData
    const formData = new FormData();
    formData.append('file', audioBlob, audioFile[0].originalFilename || 'audio.webm');
    formData.append('model', 'whisper-1');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    // Clean up temp file
    fs.unlinkSync(audioFile[0].filepath);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Rocko STT] Whisper API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'Whisper API failed',
        message: errorText,
        fallback: 'text_input',
      });
    }

    const result = await response.json();
    return res.status(200).json(result);

  } catch (error) {
    console.error('[Rocko STT] Error:', error);
    return res.status(500).json({
      error: 'STT processing failed',
      message: error.message,
      fallback: 'text_input',
    });
  }
}
