'use client';

import { use, useState, type ReactNode } from 'react';
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
  params: Promise<{ id: string }>;
}

function getContactInitials(name: string): string {
  if (!name) return '?';
  const words = name.split(' ').filter(Boolean);
  const a = words[0]?.[0] ?? '';
  const b = words[1]?.[0] ?? '';
  if (a && b) return (a + b).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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
      <div className="min-h-screen bg-[rgb(var(--page-bg))] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="min-h-screen bg-[rgb(var(--page-bg))] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Contact not found</p>
          <Button variant="outline" size="sm" onClick={() => router.push('/erp/vendors')}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Contacts
          </Button>
        </div>
      </div>
    );
  }

  const typeBadge = (() => {
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
          <Package className="h-3 w-3" /> Supplier
        </span>
      );
    }
    if (contact.is_customer) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
          <ShoppingCart className="h-3 w-3" /> Customer
        </span>
      );
    }
    return null;
  })();

  const statusBadge =
    contact.contact_status === 'ACTIVE' ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#5C8A65]/10 text-[#5C8A65]">
        <CheckCircle className="h-3 w-3" /> Active
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
        {contact.contact_status}
      </span>
    );

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4 min-w-0">
              <Button variant="ghost" size="sm" onClick={() => router.push('/erp/vendors')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Contacts
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-foreground truncate">{contact.name}</h1>
                {contact.organization_name && (
                  <p className="text-sm text-muted-foreground truncate">{contact.organization_name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {typeBadge}
              {statusBadge}
              <Button variant="outline" size="sm" className="h-9" asChild>
                <a
                  href={`https://go.xero.com/Contacts/View/${contact.contact_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" /> View in Xero
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact information */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5">
                  <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary shrink-0">
                    <User className="h-4 w-4" />
                  </span>
                  Contact information
                </h2>
                {!editingInfo && (
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={startEdit}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                )}
              </div>

              {editingInfo ? (
                <div className="space-y-3">
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
                      <X className="h-3.5 w-3.5 mr-1" /> Cancel
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
              ) : (
                <div className="space-y-4">
                  <InfoRow
                    icon={Mail}
                    label="Email"
                    value={
                      contact.email_address ? (
                        <a href={`mailto:${contact.email_address}`} className="text-foreground hover:text-primary truncate block">
                          {contact.email_address}
                        </a>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )
                    }
                  />
                  <InfoRow
                    icon={Phone}
                    label="Phone"
                    value={
                      contact.primary_phone ? (
                        <a href={`tel:${contact.primary_phone}`} className="text-foreground hover:text-primary">
                          {contact.primary_phone}
                        </a>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )
                    }
                  />
                  {contact.phones && contact.phones.length > 0 && (
                    <InfoRow
                      icon={Phone}
                      label="Other phones"
                      value={
                        <div className="space-y-1">
                          {contact.phones.map((phone, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground/70 bg-muted px-1.5 py-0.5 rounded">
                                {phone.phone_type}
                              </span>
                              <span className="text-foreground">{phone.phone_number}</span>
                            </div>
                          ))}
                        </div>
                      }
                    />
                  )}
                  {contact.organization_name && (
                    <InfoRow icon={Building2} label="Organization" value={contact.organization_name} />
                  )}
                </div>
              )}
            </div>

            {/* Bank accounts */}
            <BankAccountsSection contactId={contact.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Identity */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-semibold">
                  {getContactInitials(contact.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{contact.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    {typeBadge}
                    {statusBadge}
                  </div>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2.5 mb-4">
                <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Calendar className="h-4 w-4" />
                </span>
                Dates
              </h2>
              <div className="space-y-3">
                <InfoRow icon={Calendar} label="Created" value={formatDate(contact.created_at)} />
                <InfoRow icon={Calendar} label="Last updated" value={formatDate(contact.updated_utc)} />
              </div>
            </div>

            {/* Xero reference */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-6">
              <p className="text-xs text-muted-foreground mb-1.5">Xero Contact ID</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded font-mono truncate flex-1">
                  {contact.contact_id}
                </code>
                <button
                  onClick={() => copyToClipboard(contact.contact_id, 'Contact ID')}
                  className="text-muted-foreground/60 hover:text-foreground"
                  aria-label="Copy contact ID"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground/60 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm text-foreground mt-0.5">{value}</div>
      </div>
    </div>
  );
}
