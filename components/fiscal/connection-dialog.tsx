'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useCreateFiscalConnection, useFiscalCredentialSchema, useUpdateFiscalConnection } from '@/hooks/use-fiscal';
import {
  FISCAL_COUNTRIES,
  FISCAL_ENVIRONMENTS,
  buildCredentialsPayload,
  credentialFieldsFor,
  isCredentialSet,
  jsonCredentialError,
  missingRequiredCredentials,
} from '@/lib/fiscal';
import type { FiscalConnection, FiscalConnectionFields, FiscalCountryCode } from '@/types/fiscal';

const EMPTY: FiscalConnectionFields = {
  country_code: 'UG',
  tin: '',
  device_no: '',
  taxpayer_id: '',
  environment: 'test',
  online_mode: true,
  legal_name: '',
  business_name: '',
  email: '',
  mobile: '',
  address: '',
  industry_code: '',
  auto_fiscalize: false,
  writeback_enabled: false,
};

function fieldsFrom(c: FiscalConnection): FiscalConnectionFields {
  return {
    country_code: c.country_code,
    tin: c.tin ?? '',
    device_no: c.device_no ?? '',
    taxpayer_id: c.taxpayer_id ?? '',
    environment: c.environment,
    online_mode: c.online_mode,
    legal_name: c.legal_name ?? '',
    business_name: c.business_name ?? '',
    email: c.email ?? '',
    mobile: c.mobile ?? '',
    address: c.address ?? '',
    industry_code: c.industry_code ?? '',
    auto_fiscalize: c.auto_fiscalize,
    writeback_enabled: c.writeback_enabled,
  };
}

const TEXT_FIELDS: { key: keyof FiscalConnectionFields; label: string; type?: string; required?: boolean }[] = [
  { key: 'tin', label: 'TIN', required: true },
  { key: 'device_no', label: 'Device number' },
  { key: 'taxpayer_id', label: 'Taxpayer ID' },
  { key: 'industry_code', label: 'Industry code' },
  { key: 'legal_name', label: 'Legal name' },
  { key: 'business_name', label: 'Business name' },
  { key: 'email', label: 'Email', type: 'email' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'address', label: 'Address' },
];

const TOGGLES: { key: 'online_mode' | 'auto_fiscalize' | 'writeback_enabled'; label: string; help: string }[] = [
  { key: 'online_mode', label: 'Online mode', help: 'Submit directly to the authority (off = offline enabler).' },
  { key: 'auto_fiscalize', label: 'Auto-fiscalize', help: 'Fiscalize ERP invoices automatically when they sync.' },
  { key: 'writeback_enabled', label: 'Write back to ERP', help: 'Attach the FDN / receipt to the source invoice.' },
];

/** Add / edit a fiscal connection with country-specific, write-only credentials. */
export function ConnectionDialog({
  open,
  onOpenChange,
  organizationId,
  connection,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string | null;
  /** Present when editing. */
  connection?: FiscalConnection | null;
}) {
  const isEdit = !!connection;
  const [fields, setFields] = useState<FiscalConnectionFields>(EMPTY);
  const [creds, setCreds] = useState<Record<string, string>>({});
  const create = useCreateFiscalConnection();
  const update = useUpdateFiscalConnection();
  const isPending = create.isPending || update.isPending;
  // Server schema when available; static CREDENTIAL_FIELDS otherwise.
  const { data: schema } = useFiscalCredentialSchema(open);

  useEffect(() => {
    if (!open) return;
    setFields(connection ? fieldsFrom(connection) : EMPTY);
    setCreds({});
  }, [open, connection]);

  const setField = <K extends keyof FiscalConnectionFields>(key: K, value: FiscalConnectionFields[K]) =>
    setFields((f) => ({ ...f, [key]: value }));

  const credentialFields = credentialFieldsFor(fields.country_code, schema);
  const setKeys = connection?.credential_keys ?? [];
  const missing = missingRequiredCredentials(fields.country_code, creds, setKeys, schema);
  const jsonErrors: Record<string, string> = {};
  for (const f of credentialFields) {
    const err = f.input === 'json' ? jsonCredentialError(creds[f.key] ?? '') : null;
    if (err) jsonErrors[f.key] = err;
  }
  const valid =
    fields.tin.trim().length > 0 &&
    missing.length === 0 &&
    Object.keys(jsonErrors).length === 0 &&
    (isEdit || !!organizationId);

  const submit = () => {
    if (!valid) return;
    const credentials = buildCredentialsPayload(fields.country_code, creds, schema);
    const done = { onSuccess: () => onOpenChange(false) };
    if (connection) {
      // Country is fixed once created; blank credentials keep their stored value.
      const { country_code: _country, ...rest } = fields;
      void _country;
      update.mutate({ id: connection.id, payload: { ...rest, ...(credentials ? { credentials } : {}) } }, done);
    } else if (organizationId) {
      create.mutate({ ...fields, organization_id: organizationId, ...(credentials ? { credentials } : {}) }, done);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit fiscal connection' : 'Add fiscal connection'}</DialogTitle>
          <DialogDescription>
            Taxpayer details and authority credentials. Credentials are write-only: leave a field blank to keep its
            stored value.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="fc-country" className="text-sm font-medium text-foreground">
                Country
              </label>
              <Select
                value={fields.country_code}
                onValueChange={(v) => {
                  setField('country_code', v as FiscalCountryCode);
                  setCreds({});
                }}
                disabled={isEdit}
              >
                <SelectTrigger id="fc-country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FISCAL_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label} ({c.authority})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="fc-env" className="text-sm font-medium text-foreground">
                Environment
              </label>
              <Select value={fields.environment} onValueChange={(v) => setField('environment', v as FiscalConnectionFields['environment'])}>
                <SelectTrigger id="fc-env">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FISCAL_ENVIRONMENTS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {TEXT_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <label htmlFor={`fc-${f.key}`} className="text-sm font-medium text-foreground">
                  {f.label}
                  {f.required && <span className="text-destructive"> *</span>}
                </label>
                <Input
                  id={`fc-${f.key}`}
                  type={f.type ?? 'text'}
                  value={String(fields[f.key] ?? '')}
                  onChange={(e) => setField(f.key, e.target.value as never)}
                />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {TOGGLES.map((t) => (
              <div key={t.key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.help}</p>
                </div>
                <Switch checked={fields[t.key]} onCheckedChange={(v) => setField(t.key, v)} aria-label={t.label} />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Credentials</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {credentialFields.map((f) => {
                const isSet = isCredentialSet(f.key, setKeys);
                const isMissing = missing.includes(f.key);
                return (
                  <div key={f.key} className={`space-y-1.5 ${f.input === 'textarea' || f.input === 'json' ? 'sm:col-span-2' : ''}`}>
                    <label htmlFor={`fc-cred-${f.key}`} className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                      {f.label}
                      {f.required && !isSet && <span className="text-destructive">*</span>}
                      {isSet && (
                        <span className="inline-flex items-center gap-1 text-xs font-normal text-primary">
                          <CheckCircle2 className="h-3 w-3" /> set
                        </span>
                      )}
                    </label>
                    {f.input === 'textarea' || f.input === 'json' ? (
                      <Textarea
                        id={`fc-cred-${f.key}`}
                        rows={f.input === 'json' ? 3 : 4}
                        spellCheck={false}
                        autoComplete="off"
                        className={`font-mono text-xs ${f.secret ? '[-webkit-text-security:disc]' : ''}`}
                        placeholder={isSet ? 'Leave blank to keep' : f.placeholder}
                        value={creds[f.key] ?? ''}
                        aria-invalid={isMissing || !!jsonErrors[f.key] || undefined}
                        onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                      />
                    ) : f.options ? (
                      <Select value={creds[f.key] ?? ''} onValueChange={(v) => setCreds((c) => ({ ...c, [f.key]: v }))}>
                        <SelectTrigger id={`fc-cred-${f.key}`}>
                          <SelectValue placeholder={isSet ? 'Keep stored value' : 'Select'} />
                        </SelectTrigger>
                        <SelectContent>
                          {f.options.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id={`fc-cred-${f.key}`}
                        type={f.secret ? 'password' : 'text'}
                        autoComplete={f.secret ? 'new-password' : 'off'}
                        placeholder={isSet ? 'Leave blank to keep' : f.placeholder}
                        value={creds[f.key] ?? ''}
                        aria-invalid={isMissing || undefined}
                        onChange={(e) => setCreds((c) => ({ ...c, [f.key]: e.target.value }))}
                      />
                    )}
                    {jsonErrors[f.key] && <p className="text-xs text-destructive">{jsonErrors[f.key]}</p>}
                    {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!valid || isPending}>
            {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add connection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
