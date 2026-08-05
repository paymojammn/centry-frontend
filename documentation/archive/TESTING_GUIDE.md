# Frontend Testing Guide - Bank Statement Reconciliation

## Overview

You can now test the complete bank statement import and reconciliation workflow directly from the frontend at:

**URL:** `http://localhost:3000/banking`

## What You'll See

### 1. Quick Start Guide
- Step-by-step instructions for testing
- Highlights the `IsReconciled: false` feature
- Links to verify in Xero

### 2. Five Tabs

#### **Overview Tab**
- Statistics on imports and transactions
- Visual breakdown by provider
- Recent imports list

#### **Upload Tab**
- Upload CAMT.053 XML or CSV files
- Select bank provider (Stanbic, DFCU, etc.)
- Choose Xero connection
- Real-time upload progress

#### **Imports Tab**
- List of all uploaded bank files
- Status indicators (completed, processing, failed)
- Transaction counts
- Click to view details

#### **Transactions Tab**
- All transactions from selected import
- Filter by type (DEBIT/CREDIT)
- Filter by sync status (Synced/Pending)
- Search by description, reference, amount
- Color-coded amounts (red=debit, green=credit)

#### **Sync Tab**
- **Bank → Xero** sync button
- **Reconciliation Info Card** showing:
  - How transactions are mapped (CREDIT→RECEIVE, DEBIT→SPEND)
  - 5-step verification process for Xero
  - Direct link to open Xero reconciliation
  - What you can do in Xero's reconciliation screen

## Testing Steps

### Step 1: Start the Frontend

```bash
cd centry-frontend
npm run dev
```

Navigate to: `http://localhost:3000/banking`

### Step 2: Upload a Bank File

1. Click the **Upload** tab
2. Select your CAMT.053 XML file (or use a sample from `centry-backend/sample_bank_files/`)
3. Choose bank provider (e.g., "Stanbic Bank Uganda")
4. Select your Xero connection
5. Click **Upload**

**Expected Result:**
- ✅ Success message
- ✅ File appears in Imports tab
- ✅ Transactions parsed and visible

### Step 3: Review Transactions

1. Click the **Imports** tab
2. Click on your uploaded file
3. Automatically switches to **Transactions** tab

**What to Check:**
- Transaction dates are correct
- Descriptions match bank statement
- Amounts are accurate
- Types are correct (DEBIT/CREDIT)
- All show "Pending" status (yellow badge)

### Step 4: Sync to Xero

1. Click the **Sync** tab
2. Ensure your import is selected (blue info box)
3. Enter bank account code (e.g., "090")
4. Click **Sync** button

**Expected Result:**
- ✅ Progress indicator shows
- ✅ Success toast notification
- ✅ Transaction status changes to "Synced" (green badge)

### Step 5: View Reconciliation Info

In the **Sync** tab, scroll down to see the **Bank Reconciliation Workflow** card.

**Key Information Displayed:**
- **Transaction Mapping:**
  - CREDIT → RECEIVE (money in)
  - DEBIT → SPEND (money out)
  - IsReconciled → false
  
- **5-Step Verification:**
  1. Log in to Xero
  2. Go to Accounting → Bank Accounts
  3. Click your bank account
  4. Click Reconcile tab
  5. See unreconciled transactions

- **Action Button:**
  - "Open Xero Bank Accounts" (if you have synced transactions)
  - Opens Xero in new tab

### Step 6: Verify in Xero

1. Click "Open Xero Bank Accounts" button (or navigate manually)
2. Select your bank account
3. Click the **Reconcile** tab

**What You Should See:**
- ✅ Your synced transactions appear as **unreconciled**
- ✅ Correct transaction type (SPEND/RECEIVE)
- ✅ Correct amounts and dates
- ✅ Can click to match to invoices/bills

### Step 7: Test Reconciliation

In Xero's reconciliation screen:

1. Click on a transaction
2. Xero shows matching options:
   - Match to existing invoice/bill
   - Create new transaction
   - Split across accounts
3. Select a match or create new
4. Click **Reconcile**

**Expected Result:**
- ✅ Transaction marked as reconciled
- ✅ Green checkmark appears
- ✅ Removed from unreconciled list

## Visual Elements

### Transaction Status Badges

- 🟢 **Green (Synced):** Successfully synced to Xero
- 🟡 **Yellow (Pending):** Awaiting sync
- 🔴 **Red (Failed):** Sync error occurred
- ⚪ **Gray (Skipped):** Intentionally skipped

### Transaction Type Indicators

- 🔴 **Red Arrow Down:** DEBIT (money out)
- 🟢 **Green Arrow Up:** CREDIT (money in)

### Reconciliation Info Card

- 🔵 **Blue Border:** Informational card
- **Numbered Steps:** Easy-to-follow verification process
- **Code Badges:** Technical details (IsReconciled: false)
- **External Link:** Direct to Xero

## API Endpoints Used

The frontend communicates with these backend endpoints:

```
GET    /api/v1/banking/providers/          - List bank providers
GET    /api/v1/banking/imports/            - List file imports
POST   /api/v1/banking/imports/            - Upload bank file
GET    /api/v1/banking/transactions/       - List transactions
POST   /api/v1/banking/imports/{id}/sync/  - Sync to Xero
GET    /api/v1/banking/imports/stats/      - Get statistics
```

## Sample Data

If you need sample bank files for testing:

```bash
cd centry-backend/sample_bank_files/
ls -la
# Should show CAMT.053 XML samples
```

## Troubleshooting

### Issue: Upload Button Disabled
**Fix:** Ensure you've selected both a file and bank provider

### Issue: No Transactions Showing
**Fix:** 
- Check Imports tab for upload status
- Verify file was parsed successfully
- Look for error messages in browser console

### Issue: Sync Button Disabled
**Fix:**
- Select an import from Imports tab first
- Ensure ERP connection is selected
- Check backend is running

### Issue: "No ERP connections found"
**Fix:**
- Connect Xero in Organizations settings first
- Refresh the page

### Issue: Transactions Don't Appear in Xero
**Fix:**
- Check Xero connection is active
- Verify bank account code is correct
- Check backend logs for sync errors

### Issue: Transactions Already Reconciled in Xero
**Fix:**
- This shouldn't happen with new code
- Verify backend has `IsReconciled: false` in sync
- May need to re-sync after backend update

## Browser Console Commands

For debugging, you can check localStorage:

```javascript
// Check auth token
localStorage.getItem('token')

// Check organization
localStorage.getItem('organization')

// Clear and re-authenticate
localStorage.clear()
location.reload()
```

## Network Tab Debugging

To see API calls:

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Filter by "Fetch/XHR"
4. Perform actions (upload, sync)
5. Click on requests to see:
   - Request payload
   - Response data
   - Status codes

**Look for:**
- POST `/api/v1/banking/imports/` - File upload
- POST `/api/v1/banking/imports/{id}/sync/` - Sync request
- Response should include `IsReconciled: false` in payload

## Expected User Flow

```
Landing on /banking
       ↓
Read Quick Start Guide
       ↓
Upload Tab → Select file → Upload
       ↓
Imports Tab → See upload success
       ↓
Transactions Tab → Review transactions
       ↓
Sync Tab → Click "Bank → Xero"
       ↓
View Reconciliation Info
       ↓
Click "Open Xero Bank Accounts"
       ↓
Xero opens → Navigate to Reconcile
       ↓
See unreconciled transactions
       ↓
Match to invoices/bills
       ↓
Click Reconcile
       ↓
✅ Complete!
```

## Component Structure

```
app/(dashboard)/banking/page.tsx
├── BankingQuickStart
├── Tabs
│   ├── Overview
│   │   └── StatsOverview
│   ├── Upload
│   │   └── FileUpload
│   ├── Imports
│   │   └── ImportHistory
│   ├── Transactions
│   │   └── TransactionList
│   └── Sync
│       ├── SyncDashboard
│       └── ReconciliationInfo  ← NEW!
```

## What's New

### 1. ReconciliationInfo Component
- Shows how transactions are synced
- 5-step Xero verification guide
- Direct link to Xero
- Explains `IsReconciled: false` flag

### 2. BankingQuickStart Component
- Step-by-step testing guide
- Highlights key feature
- Quick reference for users

### 3. Enhanced Sync Dashboard
- Includes reconciliation info card
- Shows when transactions are synced
- Conditional "Open Xero" button

## Success Indicators

✅ **Frontend Working When:**
- Banking page loads without errors
- Can upload files successfully
- Transactions appear after upload
- Sync completes without errors
- Reconciliation info displays correctly

✅ **Backend Working When:**
- File uploads return 200/201
- Transactions are parsed from CAMT.053
- Sync endpoint returns success
- `IsReconciled: false` in response payload

✅ **Xero Integration Working When:**
- Transactions appear in Xero
- Status shows as "unreconciled"
- Can match to invoices
- Reconciliation completes successfully

## Quick Test Checklist

- [ ] Frontend running on localhost:3000
- [ ] Backend running on localhost:8000
- [ ] Can access /banking page
- [ ] Quick start guide visible
- [ ] Upload tab functional
- [ ] File upload succeeds
- [ ] Transactions tab shows data
- [ ] Sync tab accessible
- [ ] Sync to Xero works
- [ ] Reconciliation info displays
- [ ] Can open Xero from link
- [ ] Transactions appear in Xero as unreconciled

## Next Steps

After successful frontend testing:

1. **User Acceptance Testing**
   - Have accountants test the workflow
   - Verify reconciliation matches expectations
   - Collect feedback on UI/UX

2. **Performance Testing**
   - Upload large files (1000+ transactions)
   - Test sync speed
   - Check pagination

3. **Error Handling**
   - Test with invalid files
   - Test network failures
   - Test Xero connection issues

4. **Documentation**
   - Create user guide
   - Record demo video
   - Write FAQ

## Support

If you encounter issues:

1. Check browser console for errors
2. Check Network tab for failed requests
3. Review backend logs: `tail -f nohup.out`
4. Verify Xero connection is active
5. Check sample files are valid CAMT.053

## Summary

The frontend now provides a complete testing interface for the bank statement reconciliation feature. Users can:

- Upload bank files
- Review transactions
- Sync to Xero with `IsReconciled: false`
- See clear instructions for verification
- Open Xero directly to reconcile

All with a clean, professional UI and helpful guidance throughout the process.
