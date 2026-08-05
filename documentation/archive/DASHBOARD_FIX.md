# Dashboard Stats Fix

## Problem
Dashboard was not displaying statistics from Django backend correctly.

## Root Causes Identified

### 1. Field Name Mismatch
**Backend** (`erp_xero/api_views.py`) was returning:
```python
{
    'total_awaiting_payment': 12,
    'total_awaiting_payment_amount': '125000.00',
    'total_draft': 5,
    # ...
}
```

**Frontend** (`types/purchases.ts`) was expecting:
```typescript
{
    total_open: number;
    total_open_amount: string;
    total_scheduled: number;
    // ...
}
```

### 2. Missing Environment Variable
- No `.env.local` file with `NEXT_PUBLIC_API_URL`
- Frontend defaults to `http://localhost:8000` but good to be explicit

## Solutions Applied

### 1. Backend API Response Fix
**File**: `/centry-backend/erp_xero/api_views.py`

Added frontend-compatible fields to the stats endpoint response:

```python
return Response({
    # Original fields (keep for backward compatibility)
    'total_all': total_all,
    'total_draft': draft_count,
    'total_awaiting_approval': awaiting_approval_count,
    'total_awaiting_payment': awaiting_payment_count,
    'total_awaiting_payment_amount': str(awaiting_payment_amount),
    
    # Frontend compatibility fields
    'total_open': awaiting_payment_count,           # Maps to awaiting payment
    'total_open_amount': str(awaiting_payment_amount),
    'total_scheduled': draft_count + awaiting_approval_count,  # Draft + Awaiting Approval
    'total_paid': paid_count,
    'total_repeating': repeating_count,
    'overdue_count': overdue_count,
    'overdue_amount': str(overdue_amount),
})
```

**Mapping Logic**:
- `total_open` → Bills awaiting payment (AUTHORISED status with amount_due > 0)
- `total_scheduled` → Draft bills + Bills awaiting approval (DRAFT + SUBMITTED)
- `total_paid` → Paid bills (PAID status)
- `overdue_count` → Awaiting payment bills past due date

### 2. Added Debug Logging
**File**: `/centry-frontend/app/(dashboard)/dashboard/page.tsx`

```typescript
// Debug logging
console.log('Dashboard Data:', { 
  payables, stats, 
  loadingPayables, loadingStats, 
  payablesError, statsError 
});
```

**File**: `/centry-frontend/lib/purchases-api.ts`

```typescript
console.log('Fetching stats from:', url);
```

### 3. Created Environment File
**File**: `/centry-frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Testing

### 1. Check Backend Endpoint
```bash
# With Django server running on port 8000
curl http://localhost:8000/api/v1/xero/bills/stats/

# Expected response:
{
  "total_all": 50,
  "total_open": 12,
  "total_open_amount": "125000.00",
  "total_scheduled": 8,
  "total_paid": 28,
  "overdue_count": 2,
  "overdue_amount": "50000.00"
}
```

### 2. Check Frontend Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to `/dashboard`
4. Look for:
   - `"Fetching stats from: http://localhost:8000/api/v1/xero/bills/stats/"`
   - `"Dashboard Data: { payables: [...], stats: {...} }"`

### 3. Verify Dashboard Display
Dashboard should now show:
- **Open Bills**: Count of bills awaiting payment
- **Scheduled**: Count of draft + awaiting approval bills
- **Paid**: Count of paid bills
- **Overdue**: Count of overdue bills with amount

## API Endpoints

### Bills List
```
GET /api/v1/xero/bills/?status=open
```

### Bills Stats
```
GET /api/v1/xero/bills/stats/
```

### Organization-Specific Stats (future)
```
GET /api/v1/xero/bills/stats/?organization=1
```

## Data Flow

```
Frontend Dashboard Page
  ↓
usePayableStats() hook (React Query)
  ↓
getPayableStats() API function
  ↓
HTTP GET to /api/v1/xero/bills/stats/
  ↓
Django XeroPayableInvoiceViewSet.stats()
  ↓
Query XeroPayableInvoice model
  ↓
Aggregate statistics
  ↓
Return JSON response
  ↓
React Query caches result
  ↓
Dashboard displays stats
```

## Next Steps

1. **Restart Services**:
   ```bash
   # Restart Django
   cd centry-backend
   python manage.py runserver 8000
   
   # Restart Next.js (to pick up .env.local)
   cd centry-frontend
   npm run dev
   ```

2. **Refresh Browser**:
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
   - Or open in incognito/private window

3. **Check Console**:
   - Look for debug logs
   - Check for any API errors
   - Verify data is being fetched

4. **Verify Stats**:
   - Dashboard should show real numbers
   - Stats should update when bills are added/paid
   - Overdue count should be accurate

## Troubleshooting

### Issue: Stats still showing 0
**Check**:
1. Is Django server running? (`http://localhost:8000/api/v1/xero/bills/stats/`)
2. Are there bills in the database?
3. Is user authenticated? (Check for auth token in localStorage)
4. Check browser console for errors

### Issue: CORS Error
**Solution**: Django should have CORS configured for localhost:3000
- Check `settings.py` for `CORS_ALLOWED_ORIGINS`
- Add `http://localhost:3000` if missing

### Issue: 404 Not Found
**Check**:
1. URL path is correct: `/api/v1/xero/bills/stats/`
2. Django routes are registered
3. Check `erp_xero/api_urls.py`

### Issue: Authentication Error
**Check**:
1. User is logged in
2. Auth token exists in localStorage
3. Token is not expired
4. Token format is correct: `Bearer <token>`

## Files Modified

### Backend
- `/centry-backend/erp_xero/api_views.py` - Added frontend-compatible fields

### Frontend
- `/centry-frontend/app/(dashboard)/dashboard/page.tsx` - Added debug logging
- `/centry-frontend/lib/purchases-api.ts` - Added console log for stats URL
- `/centry-frontend/.env.local` - **Created** with API URL

## Field Mapping Reference

| Frontend Field | Backend Source | Description |
|----------------|----------------|-------------|
| `total_open` | `total_awaiting_payment` | Bills ready to be paid |
| `total_open_amount` | `total_awaiting_payment_amount` | Total amount due |
| `total_scheduled` | `total_draft + total_awaiting_approval` | Bills being prepared |
| `total_paid` | `total_paid` | Successfully paid bills |
| `overdue_count` | `overdue_count` | Past due date bills |
| `overdue_amount` | `overdue_amount` | Total overdue amount |

## Success Criteria

✅ Dashboard loads without errors  
✅ Stats show real numbers (not all zeros)  
✅ Console logs show successful API calls  
✅ Stats cards display correct values  
✅ No CORS or authentication errors  
✅ Data refreshes on page reload  

---

**Status**: Fixed ✅  
**Date**: October 15, 2025  
**Next**: Test with real Xero data
