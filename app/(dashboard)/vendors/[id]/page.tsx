'use client';

import { use, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { contactsApi } from '@/lib/contacts-api';
import { useUpdateContactDetails } from '@/hooks/use-contacts';
import BankAccountsSection from '@/components/vendors/BankAccountsSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  ExternalLink,
  Calendar,
  User,
  Package,
  ShoppingCart,
  CheckCircle,
  Loader2,
  AlertCircle,
  Copy,
  Pencil,
  Check,
  X,
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
  const a = words[0]?.[0] ?? '';
  const b = words[1]?.[0] ?? '';
  if (a && b) return (a + b).toUpperCase();
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

  const updateDetails = useUpdateContactDetails(Number(id));
  const [editingInfo, setEditingInfo] = useState(false);
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const startEdit = () => {
    setEditEmail(contact?.email_address || '');
    setEditPhone(contact?.phone || '');
    setEditingInfo(true);
  };

  const saveInfo = () => {
    updateDetails.mutate(
      { email_address: editEmail.trim() || null, phone: editPhone.trim() },
      {
        onSuccess: () => {
          toast.success('Contact updated');
          setEditingInfo(false);
        },
        onError: (e: Error) => toast.error(e?.message || 'Could not update contact'),
      },
    );
  };

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
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground/60" />
                  <h3 className="text-sm font-medium text-foreground">Contact Information</h3>
                </div>
                {!editingInfo && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={startEdit}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              <div className="px-6 py-4 space-y-4">
                {editingInfo && (
                  <div className="rounded-xl border border-border p-3 space-y-3 bg-muted/20">
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Email</label>
                      <Input
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="email@vendor.com"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Phone</label>
                      <Input
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="Phone number"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs"
                        onClick={() => setEditingInfo(false)}
                        disabled={updateDetails.isPending}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 text-xs text-white hover:opacity-90"
                        style={{ backgroundColor: 'var(--foreground)' }}
                        onClick={saveInfo}
                        disabled={updateDetails.isPending}
                      >
                        {updateDetails.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </div>
                )}
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

            {/* Bank accounts (Centry-managed, used to pay this vendor) + Xero ref */}
            <div className="space-y-6">
              <BankAccountsSection contactId={contact.id} />

              <div className="bg-card rounded-lg border border-border px-6 py-4">
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
  );
}
