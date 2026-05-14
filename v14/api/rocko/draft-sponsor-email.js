// ═══════════════════════════════════════════════════════════════════════════
// Rocko Draft Sponsor Email Endpoint
// POST /api/rocko/draft-sponsor-email
// Generates AI-drafted sponsor outreach email
// ═══════════════════════════════════════════════════════════════════════════

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sponsor_id, sponsor_name, sponsor_tier, sponsor_url } = req.body;

  if (!sponsor_id || !sponsor_name) {
    return res.status(400).json({ error: 'sponsor_id and sponsor_name required' });
  }

  try {
    const prompt = `You are drafting a sponsor outreach email for RBTR (Rolling Borders Travel & Recovery), a 2027 overland expedition from UK to Singapore in a fully custom-converted VW Crafter.

Sponsor prospect:
- Name: ${sponsor_name}
- Tier: ${sponsor_tier || 'Unknown'}
${sponsor_url ? `- Website: ${sponsor_url}` : ''}

Draft a professional, compelling cold outreach email (max 200 words) that:
1. Introduces RBTR expedition (UK to Singapore, 2027, fully converted Crafter)
2. Explains why ${sponsor_name} is a perfect fit (align with their brand/products)
3. Proposes partnership (product sponsorship, content collaboration, social media exposure)
4. Includes clear call-to-action (quick call or email reply)
5. Signed "Ben Greenwood, RBTR Expedition Lead"

Tone: Professional but warm, genuine enthusiasm, not salesy.

Return ONLY the email body, no subject line, no "Subject:" prefix.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const emailDraft = response.content[0].text;

    return res.status(200).json({
      success: true,
      sponsor_id,
      sponsor_name,
      draft: emailDraft,
      subject: `Partnership Opportunity: RBTR Overland Expedition 2027`,
    });

  } catch (error) {
    console.error('[Draft Sponsor Email] Error:', error);
    return res.status(500).json({
      error: 'Failed to generate draft',
      message: error.message,
    });
  }
}
