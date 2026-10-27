/**
 * /payments — the old "Mobile Money Reconciliation" screen. Inflow matching now
 * lives on Banking › Collections, which covers bank statements and mobile
 * money together for every ERP.
 */

import { redirect } from 'next/navigation';

export default function PaymentsPage() {
  redirect('/banking/collections');
}
