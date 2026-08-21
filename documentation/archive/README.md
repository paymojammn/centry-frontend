# Archived dev notes

One-time fix logs and progress notes from 2025 development ("what I fixed
today" write-ups). Kept for history only — several contain claims that are now
wrong:

- Ports/paths: the dashboard is `/dashboard` on port **3000** (`next dev`),
  not `/layout-1/dashboard` on 3001.
- `NEXT_PUBLIC_API_URL` must be the bare backend origin
  (`http://localhost:8000`) — **never** with an `/api/v1` suffix; endpoints in
  `config/api.ts` already include it.
- The brand primary is `#5C8A65` (`--brand-primary: 92 138 101` in
  `styles/globals.css`), not the older `#638C80` these notes quote.
- `CURRENCY_CONVERSION_GUIDE`'s endpoints are disabled in the backend
  (`baihu/urls.py` has the include commented out) — every path in it 404s.
- `TESTING_GUIDE`'s tabbed `/banking` UI no longer exists; `/banking`
  redirects to `/banking/export`.

Do not follow instructions from these files.
