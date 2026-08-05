# Centry Frontend

Next.js web app for the Centry finance platform — the main dashboard for
organizations (ERP sync, invoices/bills, banking, payments, checkout config)
plus the public Checkout API docs and legal pages.

- **Backend:** [`centry-backend`](../centry-backend) (Django) —
  `https://api.getcentry.io` (prod) / `https://staging-api.getcentry.io`
  (staging), local `http://localhost:8000`
- Sibling portals: [`centry-merchant`](../centry-merchant) (merchant portal,
  port 3001) and [`centry-fund`](../centry-fund) (fund portal, port 3002)

## Local development

```bash
npm install
# .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000  (bare origin — NO /api/v1 suffix,
# endpoints in config/api.ts already include it)
npm run dev          # http://localhost:3000
```

Sign-in is ERP OAuth (Xero, QuickBooks, ERPNext) via the backend — it must be
running with a provider configured.

## Scripts

- `npm run dev` / `npm run build`
- `npm start` — serves on `${PORT:-8080}` (Azure App Service convention)
- `npm run sync:docs` — regenerates `app/docs/_generated/openapi-checkout.json`
  from the backend's OpenAPI schema; run it after checkout API changes so the
  in-app docs stay truthful

## Docs in this repo

- `app/docs/checkout/` — the public Checkout API documentation page (rendered
  in-app, partly generated from the OpenAPI schema)
- `documentation/` — working notes that are still accurate
  (Xero status mapping, bills integration, table styling, logo)
- `documentation/archive/` — historical dev logs; do not follow them

## Conventions

- Brand primary is `#5C8A65` (`--brand-primary: 92 138 101` in
  `styles/globals.css`); the logo SVGs use a single `#1E3A2F`.
- Semantic Tailwind tokens only — never arbitrary `[rgb(var(--brand-...))]/N`
  classes (Tailwind v4 silently drops the opacity).
- Deployed to Azure App Service (see the GitHub workflow /
  `AZURE_WEBAPP_PUBLISH_PROFILE`); `.env.production` bakes the API origin at
  build time.
