import {
  BarChart3,
  Briefcase,
  Building,
  CreditCard,
  FileText,
  LayoutGrid,
  Plug,
  Send,
  Settings,
  TrendingUp,
  Users,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import { MenuConfig } from "@/config/types";

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
      { title: "ERP Sync", path: "/banking/reconciliation" },
      { title: "Accounts", path: "/banking/accounts" },
      { title: "Banks", path: "/banking/banks" },
    ],
  },
  {
    title: "Payments",
    icon: TrendingUp,
    requiredRole: "finance",
    children: [
      { title: "Pay In", path: "/payments/payin" },
      { title: "Pay Out", path: "/payments/payout" },
      { title: "Reconciliation", path: "/banking/collections" },
    ],
  },
  {
    title: "Rails",
    icon: Send,
    requiredRole: "finance",
    children: [
      { title: "Provider Accounts", path: "/banking/provider-accounts" },
      {
        title: "MTN",
        children: [
          { title: "Sign-off", path: "/payments/mtn-certification" },
        ],
      },
      {
        title: "Airtel",
        children: [
          { title: "Sign-off", path: "/payments/airtel-certification" },
        ],
      },
      {
        title: "Ozow",
        children: [
          { title: "Sign-off", path: "/banking/ozow/signoff" },
        ],
      },
      {
        title: "Onegate",
        children: [
          { title: "Sign-off", path: "/banking/onegate/signoff" },
        ],
      },
    ],
  },
  {
    title: "Lending",
    icon: CreditCard,
    requiredRole: "finance",
    children: [
      { title: "Loan Book", path: "/lending" },
      { title: "Collections", path: "/lending/collections" },
      { title: "Disbursements", path: "/lending/disbursements" },
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

// Simplified MENU_MEGA - using only available icons
// Component expects exactly 6 items: home, profiles, account, network, auth, store
export const MENU_MEGA: MenuConfig = [
  // [0] Home Item
  { title: "Dashboard", path: "/dashboard" },

  // [1] Public Profiles Item (Financial Management)
  {
    title: "Financial",
    children: [
      {
        title: "Core Features",
        children: [
          {
            children: [
              { title: "Bills & Expenses", icon: FileText, path: "/erp/bills" },
              { title: "Pay In", icon: TrendingUp, path: "/payments/payin" },
              { title: "Pay Out", icon: Send, path: "/payments/payout" },
              { title: "Banking", icon: Building, path: "/banking" },
            ],
          },
        ],
      },
    ],
  },

  // [2] My Account Item
  {
    title: "Account",
    children: [
      {
        title: "Settings",
        children: [
          {
            children: [
              { title: "Profile", icon: Settings, path: "/account/profile" },
              { title: "Security", icon: Settings, path: "/account/security" },
              {
                title: "Notifications",
                icon: Settings,
                path: "/account/notifications",
              },
            ],
          },
        ],
      },
    ],
  },

  // [3] Network Item
  {
    title: "Organization",
    children: [
      {
        title: "Management",
        children: [
          {
            children: [
              {
                title: "Organizations",
                icon: Briefcase,
                path: "/organizations",
              },
              { title: "Members", icon: Users, path: "/organizations/members" },
              { title: "Audit trail", icon: ShieldCheck, path: "/organizations/audit" },
            ],
          },
        ],
      },
    ],
  },

  // [4] Auth Item
  {
    title: "Integrations",
    children: [
      {
        title: "Connected Apps",
        children: [
          {
            children: [
              { title: "Xero", icon: Plug, path: "/integrations/xero" },
              {
                title: "QuickBooks",
                icon: Plug,
                path: "/integrations/quickbooks",
              },
            ],
          },
        ],
      },
    ],
  },

  // [5] Store Item
  {
    title: "Help",
    children: [
      {
        title: "Resources",
        children: [
          {
            children: [
              { title: "Documentation", icon: FileText, path: "/help/docs" },
              { title: "Support", icon: Users, path: "/help/support" },
            ],
          },
        ],
      },
    ],
  },
];

// Simplified MENU_MEGA_MOBILE - using only available icons
export const MENU_MEGA_MOBILE: MenuConfig = [
  { title: "Dashboard", path: "/dashboard" },
  {
    title: "Financial",
    children: [
      { title: "Bills", icon: FileText, path: "/erp/bills" },
      { title: "Pay In", icon: TrendingUp, path: "/payments/payin" },
      { title: "Pay Out", icon: Send, path: "/payments/payout" },
      { title: "Banking", icon: Building, path: "/banking" },
    ],
  },
  {
    title: "Organization",
    children: [
      { title: "Organizations", icon: Briefcase, path: "/organizations" },
      { title: "Integrations", icon: Plug, path: "/integrations" },
      { title: "Account", icon: Settings, path: "/account" },
    ],
  },
];
