// Backend payment routes are mounted under /payments/api/ (see Django's
// payments/urls.py). The default catch-all at app/api/[...path]/route.ts
// only proxies /api/*, so without this second handler /payments/api/ozow/...
// returns 404 from Next.js.
export { GET, POST, PUT, PATCH, DELETE } from '@/app/api/[...path]/route';
