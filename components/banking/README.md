# Banking Integration - Frontend Components

Comprehensive UI components for managing bank file imports and syncing with accounting systems (Xero).

## 📁 Components

### 1. `StatsOverview` (`stats-overview.tsx`)
Displays comprehensive statistics dashboard with:
- **Main Metrics Cards**:
  - Total Imports
  - Total Transactions
  - Synced Transactions (with percentage)
  - Pending Transactions
  - Failed Transactions
- **By Provider Breakdown**: Shows imports and transactions per bank provider
- **Recent Imports**: Latest 5 imports with sync status

**Props:**
- `dateFrom?: string` - Filter from date (YYYY-MM-DD)
- `dateTo?: string` - Filter to date (YYYY-MM-DD)

**API Used:** `GET /api/banking/imports/stats/`

---

### 2. `TransactionList` (`transaction-list.tsx`)
Advanced transaction table with filtering and search:

**Features:**
- **Search**: Description, reference, amount
- **Filters**: 
  - Transaction type (Debit/Credit)
  - Sync status (Synced/Pending)
- **Table Columns**:
  - Date (formatted)
  - Description (truncated)
  - Reference
  - Type (with icon)
  - Amount (color-coded)
  - Sync Status (badge)

**Props:**
- `fileImportId?: number` - Filter by specific import

**API Used:** `GET /api/banking/transactions/`

---

### 3. `SyncDashboard` (`sync-dashboard.tsx`)
Sync control panel for bidirectional Xero integration:

**Features:**
- **Connection Selector**: Choose ERP connection (Xero organization)
- **Bank → Xero Sync**:
  - Bank account code input
  - Auto-approve option
  - Sync button with loading state
- **Xero → Bank Sync**:
  - Status filter (Authorised/Paid)
  - Date filter (if_modified_since)
  - Pull button with loading state
- **Real-time Feedback**: Toast notifications for success/error

**Props:**
- `selectedImportId?: number` - Import to sync to Xero
- `onSyncComplete?: () => void` - Callback after sync

**APIs Used:**
- `GET /api/banking/imports/erp-connections/`
- `POST /api/banking/imports/{id}/sync/`
- `POST /api/banking/imports/sync-from-xero/`

---

### 4. `FileUpload` (`file-upload.tsx`)
Bank file upload interface:

**Features:**
- File picker (CSV/Excel support)
- Bank provider selector
- ERP connection selector
- Upload progress
- Form validation
- Success/error notifications

**Props:**
- `onUploadComplete?: () => void` - Callback after upload

**API Used:** `POST /api/banking/imports/`

---

### 5. `ImportHistory` (`import-history.tsx`)
List of all bank file imports with status:

**Features:**
- Table view of imports
- Status badges (Synced/Partial/Pending/Failed)
- Click to select import
- Sync progress indicators
- Formatted dates

**Props:**
- `onSelectImport?: (id: number) => void` - Click handler
- `selectedImportId?: number` - Currently selected import

**API Used:** `GET /api/banking/imports/`

---

## 📄 Main Page

### `app/banking/page.tsx`
Comprehensive banking integration page with tabs:

**Tabs:**
1. **Overview** - Statistics dashboard (StatsOverview)
2. **Upload** - File upload form (FileUpload)
3. **Imports** - Import history table (ImportHistory)
4. **Transactions** - Transaction list with filters (TransactionList)
5. **Sync** - Sync control panel (SyncDashboard)

**Features:**
- Tab navigation between all views
- Cross-component state management
- Auto-refresh after operations
- Context-aware navigation (e.g., select import → shows transactions)

---

## 🔗 API Hooks (`hooks/use-banking.ts`)

All components use React Query hooks for data fetching:

### Data Fetching
- `useBankProviders()` - Get available bank providers
- `useERPConnections(provider?)` - Get ERP connections
- `useBankImports(filters?)` - Get file imports
- `useImportStats(filters?)` - Get statistics
- `useBankTransactions(filters?)` - Get transactions

### Mutations
- `useUploadBankFile()` - Upload bank file
- `useSyncToXero()` - Sync transactions to Xero
- `useSyncFromXero()` - Pull transactions from Xero

---

## 🎨 UI Components Used

- **shadcn/ui**: Card, Button, Table, Badge, Select, Input, Tabs
- **lucide-react**: Icons for all UI elements
- **date-fns**: Date formatting
- **sonner**: Toast notifications
- **React Query**: Data fetching and caching

---

## 🚀 Usage Example

```tsx
import BankingPage from '@/app/banking/page';

// In your route/layout
export default function BankingRoute() {
  return <BankingPage />;
}
```

**Navigation:** Banking → Integration (in sidebar)

---

## 🔄 Data Flow

1. **Upload Flow**:
   ```
   FileUpload → API (POST /imports/) → ImportHistory refresh
   ```

2. **Sync to Xero Flow**:
   ```
   ImportHistory (select) → SyncDashboard → API (POST /imports/{id}/sync/)
   → Stats refresh + Transaction refresh
   ```

3. **Sync from Xero Flow**:
   ```
   SyncDashboard → API (POST /sync-from-xero/) → Transaction refresh
   ```

4. **View Flow**:
   ```
   Overview (stats) → Imports (select) → Transactions (view/filter)
   ```

---

## ✅ Features Implemented

- ✅ Complete CRUD for bank imports
- ✅ Bidirectional Xero sync
- ✅ Comprehensive statistics
- ✅ Transaction filtering and search
- ✅ Real-time status updates
- ✅ Error handling with user feedback
- ✅ Responsive design
- ✅ Type-safe with TypeScript
- ✅ Loading states everywhere
- ✅ Empty states with CTAs

---

## 📊 Statistics Available

The stats overview provides:
- Total imports count
- Total transactions count
- Synced transactions (with percentage)
- Pending transactions
- Failed transactions
- Breakdown by bank provider
- Recent imports list

---

## 🔐 Authentication

All API calls require JWT authentication via:
```typescript
import { get, post } from '@/lib/api';
```

The API client automatically includes the auth token from localStorage.

---

## 🎯 Next Steps

To enhance the banking integration:

1. **Add bulk operations**:
   - Bulk approve transactions
   - Bulk sync multiple imports
   - Bulk delete

2. **Add reconciliation view**:
   - Match transactions
   - Confidence scoring
   - Manual matching

3. **Add export functionality**:
   - Export to CSV
   - Export to Excel
   - Export to PDF

4. **Add filters**:
   - Date range picker
   - Amount range
   - Multiple providers

5. **Add real-time updates**:
   - WebSocket for sync status
   - Progress bars for long operations
   - Live statistics

---

## 🐛 Known Issues

None currently reported.

---

## 📝 Notes

- Date formats use `date-fns` for consistent formatting
- All monetary amounts are formatted with locale-aware separators
- Colors follow the app theme (green for credit, red for debit)
- Status badges are consistent across all components
- All tables are responsive and mobile-friendly
