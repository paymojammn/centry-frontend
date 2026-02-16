'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const customerSchema = z.object({
  customer_email: z.string().email('Please enter a valid email address'),
  customer_phone: z.string().optional(),
  customer_name: z.string().optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  initialEmail?: string;
  initialPhone?: string;
  initialName?: string;
  requiresPhone?: boolean;
  onSubmit: (data: CustomerFormData) => void;
  loading?: boolean;
}

export function CustomerForm({
  initialEmail = '',
  initialPhone = '',
  initialName = '',
  requiresPhone = false,
  onSubmit,
  loading = false,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(
      requiresPhone
        ? customerSchema.extend({
            customer_phone: z.string().min(10, 'Please enter a valid phone number'),
          })
        : customerSchema
    ),
    defaultValues: {
      customer_email: initialEmail,
      customer_phone: initialPhone,
      customer_name: initialName,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="customer_email">Email address</Label>
        <Input
          id="customer_email"
          type="email"
          placeholder="you@example.com"
          {...register('customer_email')}
          aria-invalid={!!errors.customer_email}
        />
        {errors.customer_email && (
          <p className="text-xs text-destructive">{errors.customer_email.message}</p>
        )}
      </div>

      {/* Phone (if required for mobile money) */}
      {requiresPhone && (
        <div className="space-y-2">
          <Label htmlFor="customer_phone">Phone number</Label>
          <Input
            id="customer_phone"
            type="tel"
            placeholder="+256 700 000000"
            {...register('customer_phone')}
            aria-invalid={!!errors.customer_phone}
          />
          {errors.customer_phone && (
            <p className="text-xs text-destructive">{errors.customer_phone.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            You will receive a payment prompt on this number
          </p>
        </div>
      )}

      {/* Name (optional) */}
      <div className="space-y-2">
        <Label htmlFor="customer_name">
          Name <span className="text-muted-foreground/60">(optional)</span>
        </Label>
        <Input
          id="customer_name"
          type="text"
          placeholder="John Doe"
          {...register('customer_name')}
        />
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Continue to payment'
        )}
      </Button>
    </form>
  );
}
