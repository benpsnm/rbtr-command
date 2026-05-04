# Task 1 — WMS Codebase Location

## Primary file

```
/Users/bengreenwood/Desktop/psnm/WMS/PSNM_v14_LIVE.html
```

Single-file HTML app, 4,077 lines. No build system. No framework. No package.json.

## Deployed URL

```
https://remarkable-marshmallow-ed4a0b.netlify.app/
```

Source: `/Users/bengreenwood/Desktop/psnm/psnm wms .webloc`

## macOS App

`PSNM WMS.app` on the Desktop is a web clip (PWA install) pointing at the Netlify URL.
It is not a native app — it is a browser window pinned to that URL.

## Companion / development versions in same directory

| File | Lines | Status |
|------|-------|--------|
| `PSNM_v14_LIVE.html` | 4,077 | **Current production** — deployed to Netlify |
| `PSNM_v14_LIVE.bak.html` | 4,077 | Identical backup of above |
| `PSNM_v14.html` | (unknown) | Dev version pre-live |
| `PSNM_WMS_PWA_index.html` | 3,700 | Older PWA version — no Supabase |
| `PSNM_WMS_v10.html` | 1,936 | Much earlier version |
| `PSNM_WMS_v2_FIXED.html`, `v5`, `v8`, `v9` | — | Legacy dev versions |

## Critical finding: CC already has its own WMS

```
/Users/bengreenwood/Desktop/rbtr-command/v14/public/wms.html
```

This is **5,254 lines** — 1,177 lines more than the standalone. It is the same WMS but
with Atlas v2 email generation and a Strategy tab added. It serves from the Command
Centre's Vercel deployment, not the Netlify URL.

**Both WMS versions connect to the same Supabase project: `mpxgyobotiqcawmqlhbf`**

The standalone Netlify WMS is effectively an older, unsupported fork of the CC WMS.
