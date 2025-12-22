import {
  Briefcase,
  Building,
  FileText,
  LayoutGrid,
  Plug,
  Settings,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { MenuConfig } from "@/config/types";

export const MENU_SIDEBAR: MenuConfig = [
  {
    title: "Dashboard",
    icon: LayoutGrid,
    path: "/dashboard",
  },
  { heading: "Financial Management" },
  // Wallet - Commented out for later use
  // {
  //   title: "Wallet",
  //   icon: Wallet,
  //   path: "/wallet",
  // },
  {
    title: "Bills",
    icon: FileText,
    path: "/bills",
  },
  // Expenses - Commented out for later use
  // {
  //   title: "Expenses",
  //   icon: TrendingUp,
  //   path: "/expenses",
  // },
  {
    title: "Contacts",
    icon: Users,
    path: "/vendors",
  },
  // Mobile Money - Commented out for later use
  // {
  //   title: "Mobile Money",
  //   icon: TrendingUp,
  //   children: [
  //     { title: "Reconciliation", path: "/payments" },
  //     { title: "Make Payment", path: "/payments/new" },
  //     { title: "Scheduled", path: "/payments/scheduled" },
  //   ],
  // },
  {
    title: "Banking",
    icon: Building,
    children: [
      { title: "Import", path: "/banking" },
      { title: "Export", path: "/banking/export" },
      { title: "Transactions", path: "/banking/transactions" },
      { title: "Reconciliation", path: "/banking/reconciliation" },
      { title: "Accounts", path: "/banking/accounts" },
    ],
  },
  { heading: "Organization" },
  {
    title: "Organizations",
    icon: Briefcase,
    path: "/organizations",
  },
  // Integrations - Commented out for later use
  // {
  //   title: "Integrations",
  //   icon: Plug,
  //   path: "/integrations/xero",
  // },
  { heading: "Settings" },
  {
    title: "Account",
    icon: Settings,
    path: "/account/profile",
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
              { title: "Bills & Expenses", icon: FileText, path: "/bills" },
              { title: "Payments", icon: TrendingUp, path: "/payments" },
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
      { title: "Bills", icon: FileText, path: "/bills" },
      { title: "Payments", icon: TrendingUp, path: "/payments" },
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
