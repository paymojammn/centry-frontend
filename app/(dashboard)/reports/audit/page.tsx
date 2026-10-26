import { redirect } from "next/navigation";

/** The audit trail moved under Organization; keep old links working. */
export default function AuditRedirect() {
  redirect("/organizations/audit");
}
