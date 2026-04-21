# RBTR Data Classification Policy

Every table in the RBTR Supabase project is tagged via a `COMMENT ON TABLE` with
one of the classifications below. Rocko reads these at tool-call time and
refuses to expose higher-sensitivity data to anyone who isn't Ben.

## Tiers

| Tag | Meaning | Exposure rules |
|---|---|---|
| `PUBLIC` | Can be shared in content, sponsor outreach, listings. | ✅ Rocko may quote freely. ✅ Safe in Zapier social posts. |
| `SPONSOR_VISIBLE` | Project status that sponsors (current + prospective) can see: build progress, milestones, programme notes, photos of work in progress. Not yet public-facing (no viral-ready copy), but Rocko may paraphrase into sponsor pitches, investor/partner updates, and private recap decks. | ✅ Rocko may include verbatim in sponsor-facing drafts. ❌ Not auto-posted to social. Ben signs off before anything external goes out. |
| `INTERNAL` | Ben's personal tracking (mood, habits, streaks). | ❌ Never in public content. ✅ Shown to Ben in UI. |
| `FAMILY` | Sarah / Hudson / Benson data. | ❌ Never in public content. ❌ Not included in Zapier outbound by default. Explicit confirm required. |
| `FINANCIAL` | Bank accounts, transactions, bills. | ❌ Never in public. ✅ Shown to Ben. Full figures never sent to 3rd parties (aggregated % only). |
| `LEGAL_SENSITIVE` | Co-Lab debt, JMW claim, anything touching the liquidation. | ❌ Never expose anywhere outside the Command Centre. ❌ Never in logs, analytics, tool-result JSON. |
| `AUTH` | API keys, OAuth tokens, secrets. | ❌ NEVER appear in any response, ever. Service-role only. |

## How Rocko enforces this

When Rocko's Claude API call composes a response, the system prompt includes:

```
You have access to data from a Supabase database. Every table has a
CLASSIFICATION tag in its COMMENT. Honour these tags strictly:
- PUBLIC: fine to quote.
- SPONSOR_VISIBLE: ok to include in outbound sponsor emails, pitch decks,
  partner updates. Always flag before attaching to a fully public post.
- INTERNAL: summarise to Ben only; never paraphrase into content suggestions.
- FAMILY: never mention Sarah/Hudson/Benson's health, moods, or calendar
  to anyone but Ben, and never in outbound drafts unless Ben explicitly asks.
- FINANCIAL: give Ben exact figures; for anyone else, aggregate only
  ("debt 42% repaid", not "£84,000 of £200,000").
- LEGAL_SENSITIVE: never mention JMW, liquidation, trustee, or named
  creditors outside the Co-Lab Debt section UI. If asked to draft content
  that touches these, refuse and explain.
- AUTH: never quote keys, tokens, or URLs containing secrets.
```

## How the Netlify/Vercel proxy enforces this

The `supabase-proxy` function rejects any request that tries to read a table
where the classification is `AUTH` from the browser (service-role only).
`LEGAL_SENSITIVE` requests log to a separate audit trail in
`jarvis_sensitive_access_log`.

## Applying the policy

Run `10_classification_comments.sql` in Supabase SQL editor. It's idempotent —
safe to re-run whenever you add new tables. Update this doc and the SQL
together so they never drift.
