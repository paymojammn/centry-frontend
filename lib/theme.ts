/**
 * Centry Design System - Theme Constants
 *
 * This file defines the consistent color scheme and design tokens
 * used across the entire application. Inspired by Xero's clean design.
 *
 * STATUS COLORS (for bills, payments, expenses):
 * - #4E97D1 Blue - Draft
 * - #fed652 Mustard – Awaiting Approval
 * - #f77f00 Orange – Awaiting Payment
 * - #49a034 Green – Paid/Success
 * - #bec3c6 Grey - Repeating/Neutral
 */

// Primary status colors used across bills, payments, and expenses
export const STATUS_COLORS = {
  draft: {
    bg: '#4E97D1',
    text: '#ffffff',
    light: '#E8F2FA',
    border: '#4E97D1',
  },
  awaiting_approval: {
    bg: '#fed652',
    text: '#7a5c00',
    light: '#FFF9E5',
    border: '#fed652',
  },
  awaiting_payment: {
    bg: '#f77f00',
    text: '#ffffff',
    light: '#FFF0E5',
    border: '#f77f00',
  },
  paid: {
    bg: '#49a034',
    text: '#ffffff',
    light: '#E8F5E5',
    border: '#49a034',
  },
  repeating: {
    bg: '#bec3c6',
    text: '#4a5568',
    light: '#F5F6F7',
    border: '#bec3c6',
  },
  failed: {
    bg: '#dc2626',
    text: '#ffffff',
    light: '#FEE2E2',
    border: '#dc2626',
  },
} as const;

// Processing queue specific status colors
export const PROCESSING_STATUS_COLORS = {
  pending_approval: STATUS_COLORS.awaiting_approval,
  processing: STATUS_COLORS.draft,
  pending: STATUS_COLORS.repeating,
  sent: STATUS_COLORS.awaiting_payment,
  success: STATUS_COLORS.paid,
  failed: STATUS_COLORS.failed,
} as const;

// Page layout constants
export const LAYOUT = {
  maxWidth: 'max-w-7xl',
  pageBg: 'bg-[#f8f9fa]',
  headerBg: 'bg-white',
  cardBg: 'bg-white',
  borderColor: 'border-gray-200',
  borderLight: 'border-gray-100',
} as const;

// Typography
export const TYPOGRAPHY = {
  pageTitle: 'text-xl font-semibold text-gray-900',
  sectionTitle: 'text-sm font-medium text-gray-900',
  label: 'text-xs font-medium text-gray-500 uppercase tracking-wide',
  body: 'text-sm text-gray-900',
  bodyMuted: 'text-sm text-gray-600',
  small: 'text-xs text-gray-500',
} as const;

// Spacing
export const SPACING = {
  page: 'px-6 py-6',
  header: 'px-6',
  headerHeight: 'h-16',
  card: 'p-4',
  cardLarge: 'p-6',
  gap: 'gap-4',
  gapSmall: 'gap-3',
  gapLarge: 'gap-6',
} as const;

// Common component styles
export const COMPONENTS = {
  // Buttons
  primaryButton: 'bg-[#1c252c] text-white hover:bg-[#2d3a44]',
  secondaryButton: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
  successButton: `text-white hover:opacity-90`,
  dangerButton: `text-white hover:opacity-90`,

  // Inputs
  input: 'h-9 bg-white border-gray-200 text-sm',
  select: 'h-9 bg-white border-gray-200 text-sm',

  // Cards
  card: 'bg-white rounded-lg border border-gray-200',
  cardWithShadow: 'bg-white rounded-lg border border-gray-200 shadow-sm',

  // Tables
  tableHeader: 'border-b border-gray-200 bg-gray-50',
  tableHeaderCell: 'px-4 py-3 text-left text-xs font-medium text-gray-600',
  tableRow: 'transition-colors hover:bg-gray-50',
  tableRowSelected: 'bg-blue-50',
  tableCell: 'px-4 py-3',

  // Tabs
  tabActive: 'border-[#1c252c] text-[#1c252c]',
  tabInactive: 'border-transparent text-gray-500 hover:text-gray-700',

  // Badges
  badge: 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium',

  // Checkbox
  checkbox: 'w-4 h-4 rounded border-gray-300 text-[#1c252c] focus:ring-[#1c252c]',
} as const;

// Helper function to get status color
export function getStatusColor(status: string) {
  const statusLower = status.toLowerCase().replace(/ /g, '_');

  switch (statusLower) {
    case 'draft':
      return STATUS_COLORS.draft;
    case 'submitted':
    case 'awaiting_approval':
    case 'pending_approval':
    case 'pending_manager_approval':
    case 'pending_finance_approval':
      return STATUS_COLORS.awaiting_approval;
    case 'authorised':
    case 'awaiting_payment':
    case 'processing':
      return STATUS_COLORS.awaiting_payment;
    case 'paid':
    case 'success':
    case 'approved':
    case 'success_payment':
      return STATUS_COLORS.paid;
    case 'repeating':
    case 'pending':
      return STATUS_COLORS.repeating;
    case 'failed':
    case 'rejected':
    case 'failed_payment':
    case 'error_payment':
      return STATUS_COLORS.failed;
    default:
      return STATUS_COLORS.repeating;
  }
}

// Format large numbers with K/M suffix
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

// Get initials from name
export function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const words = name.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Format date for display
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format relative date
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}
