'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X, Loader2 } from 'lucide-react';

interface CheckoutWidgetProps {
  sessionToken: string;
  onClose?: () => void;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

/**
 * Embeddable checkout widget that can be used in a modal or inline.
 * Uses an iframe to load the checkout page.
 */
export function CheckoutWidget({
  sessionToken,
  onClose,
  onSuccess,
  onError,
  className,
}: CheckoutWidgetProps) {
  const [loading, setLoading] = React.useState(true);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  const checkoutUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/checkout/${sessionToken}`;

  // Listen for messages from the iframe
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Verify origin
      if (event.origin !== window.location.origin) return;

      const { type, data } = event.data || {};

      switch (type) {
        case 'centry:checkout:success':
          onSuccess?.();
          break;
        case 'centry:checkout:error':
          onError?.(data?.message || 'Payment failed');
          break;
        case 'centry:checkout:close':
          onClose?.();
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose, onSuccess, onError]);

  return (
    <div className={cn('relative bg-white rounded-xl overflow-hidden shadow-xl', className)}>
      {/* Close Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/90 hover:bg-gray-100 transition-colors shadow-sm"
          aria-label="Close"
        >
          <X className="size-4 text-gray-600" />
        </button>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-5">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      )}

      {/* Checkout iframe */}
      <iframe
        ref={iframeRef}
        src={checkoutUrl}
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
        allow="payment"
        title="Centry Checkout"
      />
    </div>
  );
}

interface CheckoutModalProps extends CheckoutWidgetProps {
  isOpen: boolean;
}

/**
 * Modal wrapper for the checkout widget.
 */
export function CheckoutModal({
  isOpen,
  sessionToken,
  onClose,
  onSuccess,
  onError,
}: CheckoutModalProps) {
  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Widget */}
      <CheckoutWidget
        sessionToken={sessionToken}
        onClose={onClose}
        onSuccess={onSuccess}
        onError={onError}
        className="relative w-full max-w-md h-[600px] max-h-[90vh]"
      />
    </div>
  );
}
