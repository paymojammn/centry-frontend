import {
  BarChart3,
  Building,
  CreditCard,
  LayoutGrid,
  Receipt,
  Send,
  Stamp,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { MenuConfig } from "@/config/types";

/**
 * The sidebar.
 *
 * `requiredRole: "finance"` items show to finance users and org owners/admins.
 * `feature` items show only when the selected organization has that feature
 * on (lib/features.ts); a group whose children are all off is hidden too.
 * Routes behind a feature stay reachable by URL but render a FeatureGate.
 */
export const MENU_SIDEBAR: MenuConfig = [
  {
    title: "Dashboard",
    icon: LayoutGrid,
    path: "/dashboard",
  },
  { heading: "Financial Management" },
  {
    title: "ERP",
    icon: Wallet,
    requiredRole: "finance",
    children: [
      { title: "Invoices", path: "/erp/invoices" },
      { title: "Bills", path: "/erp/bills" },
      { title: "Vendors", path: "/erp/vendors" },
    ],
  },
  {
    title: "Banking",
    icon: Building,
    requiredRole: "finance",
    children: [
      { title: "Dashboard", path: "/banking/export" },
      { title: "Payments", path: "/banking/transactions" },
      { title: "Collections", path: "/banking/collections" },
      { title: "Approvals", path: "/banking/approvals" },
      { title: "ERP Sync", path: "/banking/reconciliation" },
      { title: "Accounts", path: "/banking/accounts" },
      { title: "Banks", path: "/banking/banks" },
    ],
  },
  {
    title: "Expenses",
    icon: Receipt,
    path: "/expenses",
    feature: "expenses",
  },
  {
    title: "Payments",
    icon: TrendingUp,
    requiredRole: "finance",
    feature: "mobile_money",
    children: [
      { title: "Pay In", path: "/payments/payin" },
      { title: "Pay Out", path: "/payments/payout" },
      { title: "Reconciliation", path: "/banking/collections" },
    ],
  },
  {
    // Certification tooling for the mobile-money rails. Provider Accounts is
    // reachable from the rail selector on Pay In / Pay Out, not from here.
    title: "Rails",
    icon: Send,
    requiredRole: "finance",
    feature: "mobile_money",
    children: [
      {
        title: "MTN",
        children: [
          { title: "Sign-off", path: "/payments/mtn-certification", feature: "rails_certification" },
        ],
      },
      {
        title: "Airtel",
        children: [
          { title: "Sign-off", path: "/payments/airtel-certification", feature: "rails_certification" },
        ],
      },
      {
        title: "Ozow",
        children: [
          { title: "Sign-off", path: "/banking/ozow/signoff", feature: "rails_certification" },
        ],
      },
      {
        title: "Onegate",
        children: [
          { title: "Sign-off", path: "/banking/onegate/signoff", feature: "rails_certification" },
        ],
      },
    ],
  },
  {
    title: "Lending",
    icon: CreditCard,
    requiredRole: "finance",
    feature: "lending",
    children: [
      { title: "Loan Book", path: "/lending" },
      { title: "Collections", path: "/lending/collections" },
      { title: "Disbursements", path: "/lending/disbursements" },
    ],
  },
  {
    title: "Fiscalization",
    icon: Stamp,
    requiredRole: "finance",
    feature: "fiscalization",
    children: [
      { title: "Documents", path: "/fiscal/documents" },
      { title: "Connections", path: "/fiscal/connections" },
      { title: "Goods & Stock", path: "/fiscal/goods" },
      { title: "Lookups", path: "/fiscal/lookups" },
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    children: [
      { title: "Overview", path: "/reports" },
      { title: "Payments", path: "/reports/payments" },
      { title: "Exceptions", path: "/reports/exceptions" },
      { title: "Expenses", path: "/reports/expenses" },
    ],
  },
];
