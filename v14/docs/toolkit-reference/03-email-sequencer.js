#!/usr/bin/env node
/**
 * RBTR/PSNM Cold Email Sequencer — Reference Spec
 * ─────────────────────────────────────────────────
 * Phase 4 reference. Production version runs inside wms.html / api/.
 *
 * Usage:
 *   node 03-email-sequencer.js [--csv prospects.csv] [--adapter console] [--dry-run]
 *
 * Adapters: console (default), sendgrid, postmark, smtp
 * CSV columns: company,contact,email,pallet_volume,postcode,touch_number
 *
 * DRY_RUN is ON by default. Set env DRY_RUN=false or pass --no-dry-run to send.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ── Config ─────────────────────────────────────────────────────────────────
const CONFIG = {
  dryRun:       process.env.DRY_RUN !== 'false' && !process.argv.includes('--no-dry-run'),
  adapter:      getArg('--adapter') || process.env.EMAIL_ADAPTER || 'console',
  csvPath:      getArg('--csv')     || process.env.CSV_PATH      || '03-prospects-sample.csv',
  fromEmail:    process.env.FROM_EMAIL    || 'ben@pstoragemidlands.co.uk',
  fromName:     process.env.FROM_NAME     || 'Ben Greenwood',
  bccEmail:     process.env.BCC_EMAIL     || '',
  sendgridKey:  process.env.SENDGRID_KEY  || '',
  postmarkKey:  process.env.POSTMARK_KEY  || '',
  smtpHost:     process.env.SMTP_HOST     || '',
  smtpPort:     parseInt(process.env.SMTP_PORT || '587'),
  smtpUser:     process.env.SMTP_USER     || '',
  smtpPass:     process.env.SMTP_PASS     || '',
  // Pacing: ms between sends (avoid spam flags)
  paceMs:       parseInt(process.env.PACE_MS || '3000'),
};

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : null;
}

// ── Templates ──────────────────────────────────────────────────────────────
// Source: stream-3-sponsor-outreach branch → FIRST_CONTACT_EMAILS/01–20_*.md
// Touch 1 = initial; Touch 2 = follow_up_1 (5-7 days); Touch 3 = follow_up_2 (14 days)
// Full 16-touch sequence: TOUCH_SEQUENCE_16.md in stream-3 branch
// Read via: git show stream-3-sponsor-outreach:docs/streams/3_sponsor_outreach/TOUCH_SEQUENCE_16.md

const TEMPLATES = {
  initial: {
    subject: (p) => `Pallet storage near you — ${p.postcode || 'Yorkshire/Midlands'}`,
    body: (p) => `Hi ${firstName(p.contact)},

I'm Ben Greenwood, director of Pallet Northern Storage Midlands — an ambient pallet storage facility at Hellaby, Rotherham (S66 8HR), just off the M18/M1.

${volumeLine(p)}

We specialise in flexible ambient pallet storage with no long-term contracts forced on you — though we do offer a first week free when customers commit to 12 weeks, which tends to suit businesses with a seasonal or growing storage need.

Current rates start at £3.95/pallet/week for up to 100 pallets, with volume discounts from 101+.

We're about 25 minutes from Sheffield city centre and 45 minutes from Leeds — quick access without city-centre costs.

Would it be worth a quick call this week to see if we could be useful to you?

Best regards,
Ben Greenwood
Director — Pallet Northern Storage Midlands
S66 8HR | T: 07XXX XXXXXX`,
  },

  follow_up_1: {
    subject: (p) => `Re: Pallet storage — ${p.company}`,
    body: (p) => `Hi ${firstName(p.contact)},

Just following up on my note from last week about pallet storage at our Hellaby facility.

If the timing's not right at the moment, no problem — I'm happy to pick this up whenever it suits. If you do have a storage requirement coming up (seasonal peaks, supplier changes, overflow capacity), it would be worth a 10-minute call.

We've got ${volumeAvailable(p)} and can typically have pallets moving within 3–5 working days of a contract being signed.

Happy to send a tailored quote if that helps.

Best,
Ben`,
  },

  follow_up_2: {
    subject: (p) => `Last note — pallet storage, ${p.company}`,
    body: (p) => `Hi ${firstName(p.contact)},

I'll keep this brief — last follow-up from me on this.

If pallet storage ever becomes relevant for ${p.company}, we're at S66 8HR, off the M18/M1. Ambient only, 1,602 spaces, flexible terms.

Feel free to get in touch whenever it suits.

Ben Greenwood
Pallet Northern Storage Midlands`,
  },
};

function firstName(name) { return (name || 'there').split(' ')[0]; }
function volumeLine(p) {
  if (p.pallet_volume && parseInt(p.pallet_volume) > 0) {
    return `I noticed you may have a requirement for around ${p.pallet_volume} pallets — we'd be well placed to help with that.`;
  }
  return `We work with businesses that need anywhere from a handful of pallets up to several hundred.`;
}
function volumeAvailable(p) {
  return 'space available from 20 pallets upwards';
}

// ── CSV parser (simple, no dependencies) ──────────────────────────────────
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.match(/("(?:[^"]|"")*"|[^,]*)/g)
      .map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  }).filter(r => r.email && r.email.includes('@'));
}

// ── Adapters ───────────────────────────────────────────────────────────────
const ADAPTERS = {
  console: async ({ to, subject, body, bcc, dryRun }) => {
    console.log('\n' + '─'.repeat(60));
    console.log(`TO:      ${to}`);
    if (bcc) console.log(`BCC:     ${bcc}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`\n${body}`);
    console.log('─'.repeat(60));
    if (dryRun) console.log('[DRY RUN — not sent]');
  },

  sendgrid: async ({ to, subject, body, bcc, dryRun }) => {
    if (dryRun) { ADAPTERS.console({ to, subject, body, bcc, dryRun }); return; }
    if (!CONFIG.sendgridKey) throw new Error('SENDGRID_KEY not set');
    const payload = {
      personalizations: [{ to: [{ email: to }], ...(bcc ? { bcc: [{ email: bcc }] } : {}) }],
      from: { email: CONFIG.fromEmail, name: CONFIG.fromName },
      subject,
      content: [{ type: 'text/plain', value: body }],
    };
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: { Authorization: `Bearer ${CONFIG.sendgridKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`SendGrid ${res.status}: ${await res.text()}`);
    console.log(`  ✓ Sent via SendGrid → ${to}`);
  },

  postmark: async ({ to, subject, body, bcc, dryRun }) => {
    if (dryRun) { ADAPTERS.console({ to, subject, body, bcc, dryRun }); return; }
    if (!CONFIG.postmarkKey) throw new Error('POSTMARK_KEY not set');
    const payload = {
      From: `${CONFIG.fromName} <${CONFIG.fromEmail}>`,
      To: to,
      Bcc: bcc || undefined,
      Subject: subject,
      TextBody: body,
      MessageStream: 'outbound',
    };
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: { 'X-Postmark-Server-Token': CONFIG.postmarkKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Postmark ${res.status}: ${await res.text()}`);
    console.log(`  ✓ Sent via Postmark → ${to}`);
  },

  smtp: async ({ to, subject, body, bcc, dryRun }) => {
    if (dryRun) { ADAPTERS.console({ to, subject, body, bcc, dryRun }); return; }
    // Requires 'nodemailer' to be installed: npm install nodemailer
    const nodemailer = require('nodemailer');
    const transport = nodemailer.createTransport({
      host: CONFIG.smtpHost, port: CONFIG.smtpPort, secure: CONFIG.smtpPort === 465,
      auth: { user: CONFIG.smtpUser, pass: CONFIG.smtpPass },
    });
    await transport.sendMail({
      from: `"${CONFIG.fromName}" <${CONFIG.fromEmail}>`,
      to, bcc: bcc || undefined, subject, text: body,
    });
    console.log(`  ✓ Sent via SMTP → ${to}`);
  },
};

// ── Touch → template mapping ───────────────────────────────────────────────
// Full 16-touch sequence defined in TOUCH_SEQUENCE_16.md (stream-3 branch).
// Ref spec maps touches 1–3 only. Production: extend with all 16 templates.
function getTemplate(touchNumber) {
  const n = parseInt(touchNumber) || 1;
  if (n === 1) return 'initial';
  if (n === 2) return 'follow_up_1';
  return 'follow_up_2';  // touches 3–16 all use follow_up_2 variant in ref spec
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📧 PSNM Email Sequencer`);
  console.log(`   Adapter:  ${CONFIG.adapter}`);
  console.log(`   DRY RUN:  ${CONFIG.dryRun}`);
  console.log(`   CSV:      ${CONFIG.csvPath}`);
  console.log(`   From:     ${CONFIG.fromName} <${CONFIG.fromEmail}>`);
  if (CONFIG.bccEmail) console.log(`   BCC:      ${CONFIG.bccEmail}`);

  if (!fs.existsSync(CONFIG.csvPath)) {
    console.error(`\n✗ CSV not found: ${CONFIG.csvPath}`);
    console.error(`  Create it from 03-prospects-sample.csv or set CSV_PATH env var.`);
    process.exit(1);
  }

  const csvText = fs.readFileSync(CONFIG.csvPath, 'utf8');
  const prospects = parseCSV(csvText);
  const adapter = ADAPTERS[CONFIG.adapter];
  if (!adapter) {
    console.error(`✗ Unknown adapter: ${CONFIG.adapter}. Options: console, sendgrid, postmark, smtp`);
    process.exit(1);
  }

  console.log(`\n   Prospects loaded: ${prospects.length}`);
  if (!prospects.length) { console.log('   Nothing to send.'); return; }

  let sent = 0, skipped = 0, errors = 0;

  for (const prospect of prospects) {
    const templateKey = getTemplate(prospect.touch_number);
    const template = TEMPLATES[templateKey];
    if (!template) { skipped++; continue; }

    const email = {
      to:      prospect.email,
      subject: template.subject(prospect),
      body:    template.body(prospect),
      bcc:     CONFIG.bccEmail || undefined,
      dryRun:  CONFIG.dryRun,
    };

    try {
      console.log(`\n→ ${prospect.company} (${prospect.email}) — touch ${prospect.touch_number||1} [${templateKey}]`);
      await adapter(email);
      sent++;

      // Production: update email_sends table with status='sent', sent_at=now()
      // and schedule next follow-up in email_sends.follow_up_due_date

      if (CONFIG.paceMs > 0 && !CONFIG.dryRun) {
        await new Promise(r => setTimeout(r, CONFIG.paceMs));
      }
    } catch (err) {
      console.error(`  ✗ Error for ${prospect.email}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`  Sent: ${sent}  Skipped: ${skipped}  Errors: ${errors}`);
  if (CONFIG.dryRun) console.log(`  DRY RUN — no emails were actually sent.`);
}

main().catch(err => { console.error(err); process.exit(1); });
