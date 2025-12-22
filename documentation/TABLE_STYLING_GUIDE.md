# Professional Table Styling Guide

Your Centry app now has refined, minimalistic table styles using your brand colors.

## Color Palette

| Style                  | Hex/Value                  | Use Case                                   |
| ---------------------- | -------------------------- | ------------------------------------------ |
| **Light Grey Divider** | `#E5E7EB`                  | Standard table lines — clean, barely-there |
| **Warm Neutral Grey**  | `#D1D5DB`                  | More visible on white backgrounds          |
| **Teal Accent Border** | `#638C80` (10–15% opacity) | For table headers or highlight rows        |
| **Hover/Selected Row** | `rgba(99, 140, 128, 0.15)` | Use for subtle row highlight               |

## Usage Examples

### 1. Professional Table (Recommended)

Use the `.table-professional` class for a complete, styled table:

```tsx
<table className="table-professional">
  <thead>
    <tr>
      <th>Vendor</th>
      <th>Amount</th>
      <th>Due Date</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>ABC Suppliers</td>
      <td>$2,500</td>
      <td>Oct 20, 2025</td>
      <td><Badge>Open</Badge></td>
    </tr>
    <tr>
      <td>XYZ Ltd</td>
      <td>$1,200</td>
      <td>Oct 15, 2025</td>
      <td><Badge variant="destructive">Overdue</Badge></td>
    </tr>
  </tbody>
</table>
```

**Features:**
- Light grey dividers between rows
- Teal accent border under headers
- Light teal background on header cells
- Hover effect on rows
- Clean, professional spacing

### 2. Custom Dividers

For more control, use individual divider classes:

```tsx
{/* Light dividers - subtle */}
<div className="divide-y divide-light">
  <div className="py-3">Row 1</div>
  <div className="py-3">Row 2</div>
</div>

{/* Warm dividers - more visible */}
<div className="divide-y divide-warm">
  <div className="py-3">Row 1</div>
  <div className="py-3">Row 2</div>
</div>

{/* Teal accent dividers - for emphasis */}
<div className="divide-y divide-accent">
  <div className="py-3">Header Section</div>
  <div className="py-3">Content Section</div>
</div>
```

### 3. Custom Row Hover

For list items or custom rows:

```tsx
<div className="space-y-2">
  <div className="table-row-hover p-4 rounded-lg border border-[var(--border)]">
    <p className="font-medium">Invoice #1001</p>
    <p className="text-sm text-muted-foreground">$2,500.00</p>
  </div>
  <div className="table-row-hover p-4 rounded-lg border border-[var(--border)]">
    <p className="font-medium">Invoice #1002</p>
    <p className="text-sm text-muted-foreground">$1,200.00</p>
  </div>
</div>
```

### 4. Using CSS Variables

For inline styles or custom components:

```tsx
// Light divider
<div style={{ borderBottom: '1px solid rgb(var(--divider-light))' }}>

// Warm divider
<div style={{ borderBottom: '1px solid rgb(var(--divider-warm))' }}>

// Teal accent
<div style={{ borderBottom: '2px solid var(--divider-teal)' }}>

// Hover background
<div style={{ backgroundColor: 'var(--hover-row)' }}>
```

### 5. Tailwind Utility Classes

Use the CSS variables with Tailwind:

```tsx
{/* Light divider border */}
<div className="border-b border-[rgb(var(--divider-light))]">

{/* Warm divider border */}
<div className="border-b border-[rgb(var(--divider-warm))]">

{/* Teal accent border */}
<div className="border-b-2" style={{ borderColor: 'var(--divider-teal)' }}>

{/* Hover background */}
<div className="hover:bg-[var(--hover-row)] transition-colors">
```

## Complete Example: Bills Table

```tsx
<Card>
  <CardHeader>
    <CardTitle>Bills to Pay</CardTitle>
  </CardHeader>
  <CardContent>
    <table className="table-professional">
      <thead>
        <tr>
          <th>Vendor</th>
          <th>Invoice #</th>
          <th className="text-right">Amount</th>
          <th>Due Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {bills.map((bill) => (
          <tr key={bill.id}>
            <td className="font-medium">{bill.vendor_name}</td>
            <td className="text-muted-foreground">{bill.invoice_number}</td>
            <td className="text-right font-medium">
              {formatCurrency(bill.total_amount, bill.currency_code)}
            </td>
            <td>{formatDate(bill.due_date)}</td>
            <td>
              <Badge variant={bill.is_overdue ? 'destructive' : 'secondary'}>
                {bill.status}
              </Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </CardContent>
</Card>
```

## Best Practices

1. **Use `.table-professional`** for data tables - it's pre-styled and consistent
2. **Light dividers** for most tables - they're subtle and professional
3. **Warm dividers** when you need more visibility
4. **Teal accents** for headers, sections, or important separators
5. **Hover states** are automatic with `.table-professional` or use `.table-row-hover`

## Design Principles

- **Minimalistic**: Clean lines, subtle colors
- **Professional**: Consistent spacing, clear hierarchy
- **Classic**: Timeless design that won't feel dated
- **Brand-aligned**: Uses #638C80 (sage green) as accent color

---

All these styles are defined in `/styles/globals.css` and use your brand colors!
