// ═══════════════════════════════════════════════════════════════════════════
// Google API Helper
// Handles token refresh + Gmail/Calendar API calls
// ═══════════════════════════════════════════════════════════════════════════

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders() {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
}

// ── Token Management ─────────────────────────────────────────────────────────

async function getTokens(userId = 'ben') {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/rocko_v2_integrations?user_id=eq.${userId}&service=eq.google&limit=1`,
    { headers: sbHeaders() }
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Google tokens');
  }

  const integrations = await response.json();
  if (!integrations || integrations.length === 0) {
    throw new Error('No Google integration found. Run OAuth flow first.');
  }

  return integrations[0];
}

async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!response.ok) {
    throw new Error('Token refresh failed');
  }

  const tokens = await response.json();
  return tokens;
}

async function getValidAccessToken(userId = 'ben') {
  const integration = await getTokens(userId);
  const expiresAt = new Date(integration.expires_at);
  const now = new Date();

  // Token expires within 5 minutes — refresh it
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const newTokens = await refreshAccessToken(integration.refresh_token);

    // Update in database
    await fetch(
      `${SUPABASE_URL}/rest/v1/rocko_v2_integrations?user_id=eq.${userId}&service=eq.google`,
      {
        method: 'PATCH',
        headers: sbHeaders(),
        body: JSON.stringify({
          access_token: newTokens.access_token,
          expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString()
        })
      }
    );

    return newTokens.access_token;
  }

  return integration.access_token;
}

// ── Gmail API ────────────────────────────────────────────────────────────────

export async function gmailSearch(query, maxResults = 10, userId = 'ben') {
  const accessToken = await getValidAccessToken(userId);

  // Search messages
  const searchResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!searchResponse.ok) {
    const error = await searchResponse.json();
    throw new Error(`Gmail search failed: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await searchResponse.json();
  return {
    query,
    result_count: data.resultSizeEstimate || 0,
    messages: data.messages || []
  };
}

export async function gmailRead(messageId, userId = 'ben') {
  const accessToken = await getValidAccessToken(userId);

  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gmail read failed: ${error.error?.message || 'Unknown error'}`);
  }

  const message = await response.json();
  const headers = message.payload?.headers || [];

  // Extract key headers
  const from = headers.find(h => h.name === 'From')?.value || '';
  const to = headers.find(h => h.name === 'To')?.value || '';
  const subject = headers.find(h => h.name === 'Subject')?.value || '';
  const date = headers.find(h => h.name === 'Date')?.value || '';

  // Extract body
  let body = '';
  if (message.payload?.body?.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  } else if (message.payload?.parts) {
    // Multi-part message — find text/plain part
    const textPart = message.payload.parts.find(p => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
    }
  }

  return {
    id: message.id,
    thread_id: message.threadId,
    from,
    to,
    subject,
    date,
    snippet: message.snippet,
    body: body.substring(0, 2000) // Limit to 2000 chars
  };
}

export async function gmailDraft(to, subject, body, userId = 'ben') {
  const accessToken = await getValidAccessToken(userId);

  // Create RFC 2822 email
  const email = [
    `To: ${to}`,
    `Subject: ${subject}`,
    '',
    body
  ].join('\r\n');

  const encodedMessage = Buffer.from(email).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/drafts',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: {
          raw: encodedMessage
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gmail draft failed: ${error.error?.message || 'Unknown error'}`);
  }

  const draft = await response.json();
  return {
    draft_id: draft.id,
    message_id: draft.message?.id,
    status: 'draft_created',
    to,
    subject
  };
}

// ── Calendar API ─────────────────────────────────────────────────────────────

export async function calendarCheck(daysAhead = 7, userId = 'ben') {
  const accessToken = await getValidAccessToken(userId);

  const now = new Date();
  const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    `timeMin=${now.toISOString()}&timeMax=${endDate.toISOString()}&` +
    `singleEvents=true&orderBy=startTime&maxResults=50`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Calendar check failed: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const events = (data.items || []).map(event => ({
    id: event.id,
    summary: event.summary || '(No title)',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    location: event.location || null,
    attendees: event.attendees?.length || 0
  }));

  return {
    days_ahead: daysAhead,
    event_count: events.length,
    events
  };
}

export async function calendarSuggestTime(duration_minutes = 30, days_ahead = 7, userId = 'ben') {
  const accessToken = await getValidAccessToken(userId);

  const now = new Date();
  const endDate = new Date(now.getTime() + days_ahead * 24 * 60 * 60 * 1000);

  // Fetch existing events
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    `timeMin=${now.toISOString()}&timeMax=${endDate.toISOString()}&` +
    `singleEvents=true&orderBy=startTime`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Calendar fetch failed: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const events = data.items || [];

  // Find gaps in schedule
  const suggestions = [];
  let currentTime = new Date(now.getTime() + 60 * 60 * 1000); // Start 1 hour from now

  for (let day = 0; day < days_ahead; day++) {
    const dayStart = new Date(currentTime);
    dayStart.setHours(9, 0, 0, 0); // 9 AM
    const dayEnd = new Date(currentTime);
    dayEnd.setHours(17, 0, 0, 0); // 5 PM

    // Get events for this day
    const dayEvents = events.filter(e => {
      const eventStart = new Date(e.start?.dateTime || e.start?.date);
      return eventStart >= dayStart && eventStart <= dayEnd;
    });

    // Find first gap >= duration_minutes
    let slotStart = dayStart;
    for (const event of dayEvents) {
      const eventStart = new Date(event.start?.dateTime || event.start?.date);
      const gapMinutes = (eventStart - slotStart) / (1000 * 60);

      if (gapMinutes >= duration_minutes) {
        suggestions.push({
          start: slotStart.toISOString(),
          end: new Date(slotStart.getTime() + duration_minutes * 60 * 1000).toISOString(),
          duration_minutes
        });
        break;
      }

      slotStart = new Date(event.end?.dateTime || event.end?.date);
    }

    if (suggestions.length >= 3) break;
    currentTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);
  }

  return {
    duration_minutes,
    suggestions: suggestions.slice(0, 3)
  };
}
