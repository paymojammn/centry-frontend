'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { contactsApi } from '@/lib/contacts-api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  Phone,
  Mail,
  Building2,
  CreditCard,
  ExternalLink,
  Calendar,
  User,
} from 'lucide-react';

interface VendorDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function VendorDetailPage({ params }: VendorDetailPageProps) {
  const router = useRouter();
  const { id } = use(params);
  
  const { data: contact, isLoading, error } = useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsApi.getContact(Number(id)),
    retry: 1,
  });

  const { data: paymentDetails } = useQuery({
    queryKey: ['contact-payment', id],
    queryFn: () => contactsApi.getContactPaymentDetails(id),
    enabled: !!contact,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading contact details...</p>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">
              Error loading contact details. Please try again.
            </p>
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{contact.name}</h1>
              <p className="text-muted-foreground mt-1">
                {contact.organization_name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {contact.is_supplier && (
              <Badge variant="primary">Supplier</Badge>
            )}
            {contact.is_customer && (
              <Badge variant="secondary">Customer</Badge>
            )}
            <Badge
              variant={contact.contact_status === 'ACTIVE' ? 'success' : 'outline'}
            >
              {contact.contact_status}
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email */}
              {contact.email_address && (
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">Email</p>
                    <a
                      href={`mailto:${contact.email_address}`}
                      className="text-sm text-primary hover:underline truncate block"
                    >
                      {contact.email_address}
                    </a>
                  </div>
                </div>
              )}

              {/* Primary Phone */}
              {contact.primary_phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Primary Phone</p>
                    <a
                      href={`tel:${contact.primary_phone}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {contact.primary_phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Additional Phones */}
              {contact.phones && contact.phones.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Additional Phones</p>
                  {contact.phones.map((phone, idx) => (
                    <div key={idx} className="flex items-center gap-2 ml-8">
                      <Badge variant="outline" className="text-xs">
                        {phone.phone_type}
                      </Badge>
                      <a
                        href={`tel:${phone.phone_number}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {phone.phone_number}
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Organization */}
              {contact.organization_name && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Organization</p>
                    <p className="text-sm text-muted-foreground">
                      {contact.organization_name}
                    </p>
                  </div>
                </div>
              )}

              {/* Created Date */}
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(contact.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Last Updated */}
              {contact.updated_utc && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Last Updated</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(contact.updated_utc).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Details
              </CardTitle>
              <CardDescription>
                Bank account and payment information from ERP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentDetails ? (
                <>
                  {/* Bank Account Name */}
                  {paymentDetails.bank_account_name && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Bank Account Name</p>
                      <p className="text-sm text-muted-foreground">
                        {paymentDetails.bank_account_name}
                      </p>
                    </div>
                  )}

                  {/* Bank Account Number */}
                  {paymentDetails.bank_account_number && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Bank Account Number</p>
                      <p className="text-sm font-mono text-muted-foreground">
                        {paymentDetails.bank_account_number}
                      </p>
                    </div>
                  )}

                  {/* Bank Account Details (full text) */}
                  {paymentDetails.bank_account_details && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Bank Account Details</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {paymentDetails.bank_account_details}
                      </p>
                    </div>
                  )}

                  {paymentDetails.accounts_payable_tax_type && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Tax Type</p>
                      <Badge variant="outline">
                        {paymentDetails.accounts_payable_tax_type}
                      </Badge>
                    </div>
                  )}

                  {paymentDetails.default_currency && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Currency</p>
                      <Badge variant="outline">
                        {paymentDetails.default_currency}
                      </Badge>
                    </div>
                  )}

                  {!paymentDetails.bank_account_details && 
                   !paymentDetails.bank_account_number && 
                   !paymentDetails.bank_account_name && (
                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                      <p className="text-sm text-yellow-800">
                        No bank account details found. Please import csv contacts from Xero to update this information.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Loading payment details...
                </p>
              )}

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">ERP Contact ID</p>
                <code className="text-xs bg-muted p-2 rounded block">
                  {contact.contact_id}
                </code>
              </div>

              <Button variant="outline" className="w-full" asChild>
                <a
                  href={`https://go.xero.com/Contacts/View/${contact.contact_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in Xero
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
