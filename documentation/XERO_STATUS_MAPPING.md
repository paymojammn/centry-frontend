# Xero Bill Status Mapping

## Status Flow

```
Xero Status          →    Centry Tab/Status
════════════════════════════════════════════
DRAFT                →    Draft
SUBMITTED            →    Awaiting Approval
AUTHORISED           →    Awaiting Payment ✓
PAID                 →    Paid
REPEATING            →    Repeating
VOIDED/DELETED       →    Failed
```

## Detailed Mapping

### Draft Status
- **Xero Status:** `DRAFT`
- **Centry Status:** `draft`
- **Tab:** Draft
- **Description:** Bill is being created or edited
- **Color:** Gray (`bg-gray-100 text-gray-700`)

### Awaiting Approval Status
- **Xero Status:** `SUBMITTED`
- **Centry Status:** `awaiting_approval`
- **Tab:** Awaiting Approval
- **Description:** Bill has been submitted and is waiting for approval
- **Color:** Yellow (`bg-yellow-100 text-yellow-700`)

### Awaiting Payment Status ✓
- **Xero Status:** `AUTHORISED`
- **Centry Status:** `awaiting_payment`
- **Tab:** Awaiting Payment
- **Description:** Bill has been approved/authorised and is ready to be paid
- **Filter:** AUTHORISED status with `amount_due > 0`
- **Color:** Blue (`bg-blue-100 text-blue-700`)
- **Note:** This is the key status - bills that are approved and need payment

### Paid Status
- **Xero Status:** `PAID`
- **Centry Status:** `paid`
- **Tab:** Paid
- **Description:** Bill has been fully paid
- **Filter:** PAID status OR `amount_due = 0`
- **Color:** Green (`bg-green-100 text-green-700`)

### Repeating Status
- **Xero Status:** `REPEATING`
- **Centry Status:** `repeating`
- **Tab:** Repeating
- **Description:** Recurring bill template
- **Color:** Purple (`bg-purple-100 text-purple-700`)

### Failed Status
- **Xero Status:** `VOIDED` or `DELETED`
- **Centry Status:** `failed`
- **Tab:** Not shown in tabs (handled separately)
- **Description:** Bill has been voided or deleted
- **Color:** Red (if displayed)

## Implementation Details

### Backend Serializer (`erp_xero/serializers.py`)
```python
def get_payable_status(self, obj):
    """Map Xero status to Payable status"""
    status_map = {
        'DRAFT': 'draft',
        'SUBMITTED': 'awaiting_approval',
        'AUTHORISED': 'awaiting_payment',  # ✓ Key mapping
        'PAID': 'paid',
        'REPEATING': 'repeating',
        'VOIDED': 'failed',
        'DELETED': 'failed',
    }
    return status_map.get(obj.status, 'draft')
```

### Backend Filtering (`erp_xero/api_views.py`)
```python
if status_filter == 'awaiting_payment':
    # Show AUTHORISED invoices with amount due > 0
    queryset = queryset.filter(
        status='AUTHORISED',
        amount_due__gt=0
    )
```

### Frontend Display (`app/(dashboard)/bills/page.tsx`)
```typescript
// Status badge styling
bill.status === 'AUTHORISED' ? 'bg-blue-100 text-blue-700' : ...
```

## Business Logic

### Why AUTHORISED = Awaiting Payment?

In Xero's workflow:
1. **DRAFT** - Bill is being created
2. **SUBMITTED** - Bill is submitted for approval (if approval workflow is enabled)
3. **AUTHORISED** - Bill is approved and authorized for payment
   - This means the bill has been reviewed and approved
   - It's ready to be paid but payment hasn't been made yet
   - This is the "Awaiting Payment" state
4. **PAID** - Payment has been processed and reconciled

### Key Points

1. **AUTHORISED bills are approved bills waiting for payment** - this is why they belong in "Awaiting Payment"

2. **Amount Due Check** - We filter `amount_due > 0` to ensure we only show bills that actually need payment (some AUTHORISED bills might have partial payments)

3. **Payment Action** - When viewing bills in the "Awaiting Payment" tab, users can:
   - Schedule payments
   - Make payments
   - Mark as paid (which changes status to PAID in Xero)

## User Workflow

### For Accounts Payable Staff:

1. **Review Draft Bills** (Draft tab)
   - Check bills being created
   - Verify information

2. **Approve Bills** (Awaiting Approval tab)
   - Review submitted bills
   - Approve or reject

3. **Process Payments** (Awaiting Payment tab) ✓
   - **This is where AUTHORISED bills appear**
   - Schedule payment dates
   - Initiate payment processing
   - Mark as paid once completed

4. **Verify Paid Bills** (Paid tab)
   - Confirm payments processed
   - Reconcile accounts

5. **Manage Recurring Bills** (Repeating tab)
   - Set up repeating payments
   - Adjust schedules

## Statistics

The stats dashboard reflects this mapping:
- **Awaiting Payment Count** = Number of AUTHORISED bills with amount_due > 0
- **Awaiting Payment Amount** = Sum of amount_due for all AUTHORISED bills

This gives users a clear view of:
- How many bills need to be paid
- Total amount that needs to be paid

## Summary

✅ **AUTHORISED status correctly maps to "Awaiting Payment"**

This mapping makes sense because:
- The bill has been authorized/approved
- It's ready to be paid
- Payment hasn't been made yet
- It's waiting for payment processing

The implementation is now consistent across:
- Backend serializer (status mapping)
- Backend filtering (query logic)
- Frontend display (tabs, badges, stats)
- Business logic (workflow)
