import { redirect } from 'next/navigation';

/**
 * Legacy `/erp/vendors/<XeroContact id>` links (pre ERP-routed detail pages).
 * The numeric id was always a Xero / QBO-mirrored contact, so send it to the
 * Xero detail route; anything else goes back to the list. next.config.mjs
 * also redirects the numeric form before routing — this covers the rest.
 */
export default async function LegacyVendorRedirect({
  params,
}: {
  params: Promise<{ erp: string }>;
}) {
  const { erp } = await params;
  if (/^\d+$/.test(erp)) redirect(`/erp/vendors/xero/${erp}`);
  redirect('/erp/vendors');
}
