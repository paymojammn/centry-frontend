/**
 * Collection Request Types (Pay In)
 *
 * The inbound mirror of `types/payment-request.ts`. A collection request asks
 * one or many payers to send money; each payer is tracked as its own item so
 * a bulk receive can be followed — and retried — one number at a time.
 */

export type CollectionRequestStatus =
  | 'draft'
  | 'processing'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled';

export type CollectionItemStatus =
  | 'pending'
  | 'requested'
  | 'success'
  | 'failed'
  | 'expired';

export type CollectionType = 'single' | 'bulk';

export type CollectionMethod = 'mobile_money' | 'bank' | 'card';

export interface CollectionPayer {
  name: string;
  phone: string;
  amount: number | string;
}

export interface CollectionRequestItem {
  id: string;
  sequence: number;
  payer_name: string;
  payer_phone: string;
  amount: string;
  currency: string;
  reference: string;
  status: CollectionItemStatus;
  status_display: string;
  provider_name: string;
  provider_reference: string;
  error_message: string;
  requested_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionRequest {
  id: string;
  organization_id: string;
  organization_name: string;
  collection_type: CollectionType;
  collection_type_display: string;
  collection_method: CollectionMethod;
  collection_method_display: string;
  amount: string;
  collected_amount: string;
  currency: string;
  payers: CollectionPayer[];
  total_payers: number;
  description: string;
  destination_provider_account: string | null;
  destination_provider: string | null;
  reference: string;
  status: CollectionRequestStatus;
  status_display: string;
  processing_error: string;
  created_by: string | null;
  created_by_name: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
  dispatched_at: string | null;
  completed_at: string | null;
  items: CollectionRequestItem[];
}

/** List responses omit `items` to keep payloads small. */
export type CollectionRequestSummary = Omit<CollectionRequest, 'items'>;

export interface CreateCollectionRequestPayload {
  organization_id: string;
  collection_type: CollectionType;
  collection_method?: CollectionMethod;
  /** Single collection */
  payer_name?: string;
  payer_phone?: string;
  amount?: number;
  /** Bulk collection */
  payers?: CollectionPayer[];
  currency?: string;
  description?: string;
  destination_provider_account_id?: string;
  /** Send the request-to-pay push immediately (default true). */
  dispatch?: boolean;
}

export interface CollectionStats {
  total: number;
  draft: number;
  processing: number;
  completed: number;
  partial: number;
  failed: number;
  total_collected: string;
  awaiting_count: number;
  total_awaiting_amount: string;
}

export interface CollectionProviderAccount {
  id: string;
  provider: string;
  name: string;
  country: string;
  is_default: boolean;
}

export interface CollectionRequestFilters {
  organization_id?: string;
  status?: CollectionRequestStatus | 'all';
  collection_type?: CollectionType;
  my_requests?: boolean;
}
