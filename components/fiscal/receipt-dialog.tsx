'use client';

import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { inertReceiptHtml } from '@/lib/fiscal';

/**
 * Printable fiscal receipt. The HTML is fetched with the auth header (the
 * receipt endpoint is not public) and shown in a sandboxed iframe: no
 * allow-scripts, so nothing in it can run; allow-same-origin only so the
 * parent can call print() on it; allow-modals for the print dialog.
 */
export function ReceiptDialog({
  html,
  title,
  onClose,
}: {
  html: string | null;
  title?: string;
  onClose: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    win.focus();
    win.print();
  };

  return (
    <Dialog open={html !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title || 'Fiscal receipt'}</DialogTitle>
          <DialogDescription>Preview of the receipt issued by the tax authority.</DialogDescription>
        </DialogHeader>
        {html !== null && (
          <iframe
            ref={frameRef}
            title="Fiscal receipt"
            sandbox="allow-same-origin allow-modals"
            srcDoc={inertReceiptHtml(html)}
            className="h-[60vh] w-full rounded-lg border border-border bg-background"
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
