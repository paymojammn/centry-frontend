'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { contactsApi } from '@/lib/contacts-api';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  CreditCard,
  ExternalLink,
  Calendar,
  User,
  Package,
  ShoppingCart,
  CheckCircle,
  Loader2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';

interface VendorDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Get contact initials for avatar
function getContactInitials(name: string): string {
  if (!name) return '?';
  const words = name.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function VendorDetailPage({ params }: VendorDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);

  const { data: contact, isLoading, error } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsApi.getContact(Number(id)),
    retry: 1,
  });

  const { data: paymentDetails, isLoading: loadingPayment } = useQuery({
    queryKey: ['contact-payment', id],
    queryFn: () => contactsApi.getContactPaymentDetails(id),
    enabled: !!contact,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="min-h-screen bg-muted">
        <div className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-9 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="bg-card rounded-lg border border-border text-center py-12">
            <AlertCircle className="h-8 w-8 text-[#D4944A] mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Error loading contact details</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Please try again</p>
          </div>
        </div>
      </div>
    );
  }

  const getTypeBadge = () => {
    if (contact.is_supplier && contact.is_customer) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
          Both
        </span>
      );
    }
    if (contact.is_supplier) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#6B8FB8]/10 text-[#6B8FB8]">
          <Package className="h-3 w-3" />
          Supplier
        </span>
      );
    }
    if (contact.is_customer) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary">
          <ShoppingCart className="h-3 w-3" />
          Customer
        </span>
      );
    }
    return null;
  };

  const getStatusBadge = () => {
    if (contact.contact_status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary">
          <CheckCircle className="h-3 w-3" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
        {contact.contact_status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="h-9 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-lg font-semibold text-foreground">Contact Details</h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              asChild
            >
              <a
                href={`https://go.xero.com/Contacts/View/${contact.contact_id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View in Xero
              </a>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* Contact Header Card */}
          <div className="bg-card rounded-lg border border-border">
            <div className="px-6 py-5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-semibold text-lg">
                  {getContactInitials(contact.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl font-semibold text-foreground">{contact.name}</h2>
                    {getTypeBadge()}
                    {getStatusBadge()}
                  </div>
                  {contact.organization_name && (
                    <p className="text-sm text-muted-foreground mt-1">{contact.organization_name}</p>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    {contact.email_address && (
                      <a
                        href={`mailto:${contact.email_address}`}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="h-4 w-4 text-muted-foreground/60" />
                        {contact.email_address}
                      </a>
                    )}
                    {contact.primary_phone && (
                      <a
                        href={`tel:${contact.primary_phone}`}
                        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Phone className="h-4 w-4 text-muted-foreground/60" />
                        {contact.primary_phone}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Contact Information */}
            <div className="bg-card rounded-lg border border-border">
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground/60" />
                  <h3 className="text-sm font-medium text-foreground">Contact Information</h3>
                </div>
              </div>
              <div className="px-6 py-4 space-y-4">
                {/* Email */}
                {contact.email_address && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground/60 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <a
                        href={`mailto:${contact.email_address}`}
                        className="text-sm text-foreground hover:text-primary truncate block"
                      >
                        {contact.email_address}
                      </a>
                    </div>
                  </div>
                )}

                {/* Primary Phone */}
                {contact.primary_phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground/60 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Primary Phone</p>
                      <a
                        href={`tel:${contact.primary_phone}`}
                        className="text-sm text-foreground hover:text-primary"
                      >
                        {contact.primary_phone}
                      </a>
                    </div>
                  </div>
                )}

                {/* Additional Phones */}
                {contact.phones && contact.phones.length > 0 && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground/60 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Additional Phones</p>
                      <div className="space-y-1 mt-1">
                        {contact.phones.map((phone, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
                              {phone.phone_type}
                            </span>
                            <a
                              href={`tel:${phone.phone_number}`}
                              className="text-sm text-foreground hover:text-primary"
                            >
                              {phone.phone_number}
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Organization */}
                {contact.organization_name && (
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground/60 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Organization</p>
                      <p className="text-sm text-foreground">{contact.organization_name}</p>
                    </div>
                  </div>
                )}

                {/* Created Date */}
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground/60 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm text-foreground">
                      {new Date(contact.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Last Updated */}
                {contact.updated_utc && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground/60 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Last Updated</p>
                      <p className="text-sm text-foreground">
                        {new Date(contact.updated_utc).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* No contact info */}
                {!contact.email_address && !contact.primary_phone && (!contact.phones || contact.phones.length === 0) && (
                  <p className="text-sm text-muted-foreground/60">No contact information available</p>
                )}
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-card rounded-lg border border-border">
              <div className="px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground/60" />
                  <h3 className="text-sm font-medium text-foreground">Payment Details</h3>
                </div>
              </div>
              <div className="px-6 py-4 space-y-4">
                {loadingPayment ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
                  </div>
                ) : paymentDetails ? (
                  <>
                    {/* Bank Account Name */}
                    {paymentDetails.bank_account_name && (
                      <div>
                        <p className="text-xs text-muted-foreground">Bank Account Name</p>
                        <p className="text-sm text-foreground mt-0.5">{paymentDetails.bank_account_name}</p>
                      </div>
                    )}

                    {/* Bank Account Number */}
                    {paymentDetails.bank_account_number && (
                      <div>
                        <p className="text-xs text-muted-foreground">Bank Account Number</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-sm text-foreground font-mono bg-muted px-2 py-0.5 rounded">
                            {paymentDetails.bank_account_number}
                          </code>
                          <button
                            onClick={() => copyToClipboard(paymentDetails.bank_account_number || '', 'Account number')}
                            className="text-muted-foreground/60 hover:text-muted-foreground"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bank Account Details */}
                    {paymentDetails.bank_account_details && (
                      <div>
                        <p className="text-xs text-muted-foreground">Bank Details</p>
                        <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">
                          {paymentDetails.bank_account_details}
                        </p>
                      </div>
                    )}

                    {/* Tax Type & Currency */}
                    <div className="flex gap-4">
                      {paymentDetails.accounts_payable_tax_type && (
                        <div>
                          <p className="text-xs text-muted-foreground">Tax Type</p>
                          <span className="inline-flex mt-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                            {paymentDetails.accounts_payable_tax_type}
                          </span>
                        </div>
                      )}
                      {paymentDetails.default_currency && (
                        <div>
                          <p className="text-xs text-muted-foreground">Currency</p>
                          <span className="inline-flex mt-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                            {paymentDetails.default_currency}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* No bank details warning */}
                    {!paymentDetails.bank_account_details &&
                     !paymentDetails.bank_account_number &&
                     !paymentDetails.bank_account_name && (
                      <div className="rounded-lg bg-[#D4B35A]/10 border border-[#D4B35A]/20 px-4 py-3">
                        <p className="text-sm text-[#D4B35A]">
                          No bank account details found. Import contacts CSV from Xero to update.
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground/60">No payment details available</p>
                )}

                {/* ERP Contact ID */}
                <div className="pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground">Xero Contact ID</p>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono truncate flex-1">
                      {contact.contact_id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(contact.contact_id, 'Contact ID')}
                      className="text-muted-foreground/60 hover:text-muted-foreground"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
