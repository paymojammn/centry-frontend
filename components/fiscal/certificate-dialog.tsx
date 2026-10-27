'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useUploadFiscalCertificate } from '@/hooks/use-fiscal';
import type { FiscalConnection } from '@/types/fiscal';

const ACCEPTED = /\.(p12|pfx)$/i;

/** Upload the taxpayer signing certificate (.p12 / .pfx + password). */
export function CertificateDialog({
  connection,
  onClose,
}: {
  connection: FiscalConnection | null;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const upload = useUploadFiscalCertificate();

  useEffect(() => {
    if (!connection) {
      setFile(null);
      setPassword('');
    }
  }, [connection]);

  const fileOk = !!file && ACCEPTED.test(file.name);

  const submit = () => {
    if (!connection || !file || !fileOk) return;
    upload.mutate({ id: connection.id, file, password }, { onSuccess: onClose });
  };

  return (
    <Dialog open={!!connection} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{connection?.has_certificate ? 'Replace certificate' : 'Upload certificate'}</DialogTitle>
          <DialogDescription>
            The signing certificate for TIN {connection?.tin}. It is validated and stored encrypted; it is never
            shown again.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="cert-file" className="text-sm font-medium text-foreground">
              Certificate file (.p12 / .pfx)
            </label>
            <Input
              id="cert-file"
              type="file"
              accept=".p12,.pfx,application/x-pkcs12"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && !fileOk && <p className="text-xs text-destructive">Choose a .p12 or .pfx file.</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cert-password" className="text-sm font-medium text-foreground">
              Certificate password
            </label>
            <Input
              id="cert-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={upload.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!fileOk || upload.isPending}>
            {upload.isPending ? 'Uploading…' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
