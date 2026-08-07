/**
 * Legacy route — single and bulk sending now live on the Pay Out page.
 */

import { redirect } from 'next/navigation';

export default function NewPaymentPage() {
  redirect('/payments/payout');
}
