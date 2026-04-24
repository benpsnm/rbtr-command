# Overnight Report — 23/24 April 2026

All 5 workstreams completed. v3.5-system-complete tagged on main. One item requires your action before the site goes live.

---

## ACTION REQUIRED: Deploy to Vercel

The code is merged to main and tagged. You need to run these commands from your terminal:

```bash
cd /Users/bengreenwood/Desktop/rbtr-command/v14
vercel deploy          # preview deploy first — note the URL
# smoke test on preview URL (see checklist below)
vercel deploy --prod   # production deploy
```

**Smoke test checklist before production deploy:**
- [ ] Log in as Ben — verify all 8 portals load
- [ ] Click each portal's top-level sections — no stuck spinners, no iframes
- [ ] In PSNM → Atlas Today: confirm call queue renders with scored leads
- [ ] In PSNM → SOPs: confirm 6 SOPs appear and "Start SOP" works
- [ ] In Ben → Contacts: confirm Nate, Dale, Sarah appear
- [ ] Bell icon top-right in any portal → drawer opens
- [ ] Log in as Sarah — verify she sees only Sarah / House / Financials
- [ ] Check Telegram for most recent morning brief (confirm audio delivered)

---

## Migrations to run in Supabase

If any of these haven't been applied yet, run them in order via the Supabase SQL editor:

- `32_ben_portal_tables.sql`
- `32_eternal_tables.sql`
- `32_house_tables.sql`
- `32_psnm_templates.sql`
- `32_rbtr_atlas_tables.sql`
- `32_sarah_tables.sql`
- `33_contacts_crm.sql`
- `34_sops.sql`
- `35_notifications.sql`

---

## Nothing deferred to Opus

No architecture decisions or hard refactors were flagged during the session. Everything completed as specced.
