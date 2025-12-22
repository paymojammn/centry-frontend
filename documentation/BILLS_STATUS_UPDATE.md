# Bills Status Tabs Update

## Overview
Updated the bills page to use proper bill workflow statuses instead of generic statuses.

## Changes Made

### New Status Tabs
1. **All** - Shows all bills regardless of status
2. **Draft** - Bills in draft state (DRAFT status)
3. **Awaiting Approval** - Bills submitted and waiting for approval (SUBMITTED status)
4. **Awaiting Payment** - Bills approved and waiting to be paid (AUTHORISED status with amount due > 0)
5. **Paid** - Bills that have been paid (PAID status)
6. **Repeating** - Recurring bills (REPEATING status)

### Frontend Updates

#### Types (`/types/bill.ts`)
- Updated `BillStats` interface with new stat fields:
  - `total_all` - Total count of all bills
  - `total_draft` - Count of draft bills
  - `total_awaiting_approval` - Count of bills awaiting approval
  - `total_awaiting_payment` - Count of bills awaiting payment
  - `total_awaiting_payment_amount` - Total amount awaiting payment
  - `total_paid` - Count of paid bills
  - `total_repeating` - Count of repeating bills
  
- Updated `BillFilters` status type to:
  ```typescript
  status?: 'all' | 'draft' | 'awaiting_approval' | 'awaiting_payment' | 'paid' | 'repeating'
  ```

#### Bills Page (`/app/(dashboard)/bills/page.tsx`)
- Added `Clock` icon import for awaiting approval status
- Updated stats cards to 5 columns showing:
  - Draft (gray)
  - Awaiting Approval (yellow)
  - Awaiting Payment (blue) with amount
  - Paid (green)
  - Repeating (sage green)
  
- Updated tabs to new statuses
- Updated `handleStatusChange` to validate new statuses
- Enhanced status badge colors in table:
  - PAID: Green
  - DRAFT: Gray
  - SUBMITTED: Yellow
  - AUTHORISED: Blue
  - REPEATING: Purple

### Backend Updates

#### API Views (`/erp_xero/api_views.py`)

**Query Filtering:**
- `draft` - Filters bills with status='DRAFT'
- `awaiting_approval` - Filters bills with status='SUBMITTED'
- `awaiting_payment` - Filters bills with status='AUTHORISED' and amount_due > 0
- `paid` - Filters bills with status='PAID' or amount_due = 0
- `repeating` - Filters bills with status='REPEATING'
- `all` - Returns all bills (no filter applied)

**Statistics Endpoint:**
Updated `/api/v1/xero/bills/stats/` to return:
```json
{
  "total_all": 50,
  "total_draft": 5,
  "total_awaiting_approval": 3,
  "total_awaiting_payment": 12,
  "total_awaiting_payment_amount": "125000.00",
  "total_paid": 28,
  "total_repeating": 2,
  "overdue_count": 2,
  "overdue_amount": "50000.00"
}
```

## Status Workflow

```
DRAFT → SUBMITTED → AUTHORISED → PAID
           ↓
      (Awaiting      (Awaiting
       Approval)      Payment)
```

### Repeating Bills
Repeating bills can exist in any status and are tracked separately.

## Color Coding

| Status | Color | Badge Style |
|--------|-------|-------------|
| Draft | Gray | `bg-gray-100 text-gray-700` |
| Submitted (Awaiting Approval) | Yellow | `bg-yellow-100 text-yellow-700` |
| Authorised (Awaiting Payment) | Blue | `bg-blue-100 text-blue-700` |
| Paid | Green | `bg-green-100 text-green-700` |
| Repeating | Purple | `bg-purple-100 text-purple-700` |

## Xero Status Mapping

| Xero Status | Centry Tab | Description |
|-------------|------------|-------------|
| DRAFT | Draft | Bill is being created |
| SUBMITTED | Awaiting Approval | Bill submitted for approval |
| AUTHORISED | Awaiting Payment | Bill approved, ready to pay |
| PAID | Paid | Bill has been paid |
| REPEATING | Repeating | Recurring bill template |

## Usage

Users can now:
1. **View all bills** across different workflow stages
2. **Filter by workflow status** using the tabs
3. **See statistics** for each stage in the workflow
4. **Track progress** of bills from draft to paid
5. **Manage repeating bills** separately

## Testing Checklist

- [ ] All tab works - shows all bills
- [ ] Draft tab filters correctly
- [ ] Awaiting Approval tab shows SUBMITTED bills
- [ ] Awaiting Payment tab shows AUTHORISED bills with amount due
- [ ] Paid tab shows PAID bills
- [ ] Repeating tab shows recurring bills
- [ ] Stats cards display correct counts
- [ ] Awaiting Payment amount displays correctly
- [ ] Status badges have correct colors
- [ ] Tab navigation works smoothly
- [ ] Search works across all tabs

## Future Enhancements

1. **Approval Workflow**
   - Add approve/reject buttons for SUBMITTED bills
   - Show approval history
   - Multi-level approval chains

2. **Payment Processing**
   - Schedule payment from Awaiting Payment tab
   - Bulk payment for multiple bills
   - Payment method selection

3. **Repeating Bills**
   - Create new repeating bill templates
   - Edit repeating schedules
   - View upcoming instances
   - Pause/resume repeating bills

4. **Notifications**
   - Alert when bills need approval
   - Remind about upcoming due dates
   - Notify when bills are paid

5. **Analytics**
   - Time spent in each status
   - Average approval time
   - Payment trends
   - Vendor payment history
