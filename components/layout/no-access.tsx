'use client';

import { ShieldX, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface NoAccessProps {
  title?: string;
  description?: string;
  feature?: string;
}

export function NoAccess({
  title = 'Access Restricted',
  description = 'You don\'t have permission to view this page. Contact your organization admin to request access.',
  feature,
}: NoAccessProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="max-w-md w-full text-center px-6">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center mb-6">
          <ShieldX className="w-10 h-10 text-red-500 dark:text-red-400" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {title}
        </h1>

        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed mb-2">
          {description}
        </p>

        {/* Feature badge */}
        {feature && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-medium text-muted-foreground mb-8">
            Requires: <span className="text-foreground font-semibold">{feature}</span> role
          </div>
        )}

        {!feature && <div className="mb-8" />}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <Button
            variant="default"
            onClick={() => router.push('/organizations')}
            className="gap-2"
          >
            <Mail className="w-4 h-4" />
            Contact Admin
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground/60 mt-8">
          If you believe this is an error, ask your organization owner or admin to update your permissions.
        </p>
      </div>
    </div>
  );
}
