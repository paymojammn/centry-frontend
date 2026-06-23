"use client";

/**
 * Host-to-Host Connection manager for a bank account.
 *
 * Lists the SFTP/H2H connections attached to a bank account and lets the user
 * create, edit, test and delete them. The form is grouped into the four
 * sections the product spec calls for: Connection Details, Authentication,
 * File Format & Paths, and Status.
 */

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Server,
  Pencil,
  Trash2,
  Loader2,
  PlugZap,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  CircleDashed,
} from "lucide-react";
import { toast } from "sonner";
import {
  useSFTPCredentials,
  useCreateSFTPCredential,
  useUpdateSFTPCredential,
  useDeleteSFTPCredential,
  useTestSFTPCredential,
  type SFTPCredential,
  type SFTPCredentialInput,
} from "@/hooks/use-banking";

interface HostToHostDialogProps {
  open: boolean;
  onClose: () => void;
  bankAccountId: number;
  bankAccountName: string;
}

interface FormData {
  name: string;
  environment: "test" | "prod";
  host: string;
  port: number;
  username: string;
  timeout: number;
  auth_type: "password" | "key" | "key_password";
  password: string;
  private_key: string;
  key_passphrase: string;
  export_format: "pain.001" | "pain.002" | "pain.008" | "csv";
  upload_path: string;
  download_path: string;
  archive_path: string;
  is_active: boolean;
  is_default: boolean;
}

const DEFAULTS: FormData = {
  name: "",
  environment: "test",
  host: "",
  port: 22,
  username: "",
  timeout: 30,
  auth_type: "password",
  password: "",
  private_key: "",
  key_passphrase: "",
  export_format: "pain.001",
  upload_path: "Outbox",
  download_path: "Inbox",
  archive_path: "processed",
  is_active: true,
  is_default: false,
};

function StatusBadge({ status }: { status: SFTPCredential["connection_status"] }) {
  if (status === "connected") {
    return (
      <Badge variant="secondary" className="gap-1 text-emerald-600">
        <CheckCircle2 className="h-3 w-3" /> Connected
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" /> Error
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <CircleDashed className="h-3 w-3" /> Untested
    </Badge>
  );
}

export function HostToHostDialog({
  open,
  onClose,
  bankAccountId,
  bankAccountName,
}: HostToHostDialogProps) {
  const [view, setView] = useState<"list" | "form">("list");
  const [editing, setEditing] = useState<SFTPCredential | null>(null);

  const { data, isLoading } = useSFTPCredentials(bankAccountId);
  const connections = data?.results || [];

  const createMutation = useCreateSFTPCredential();
  const updateMutation = useUpdateSFTPCredential();
  const deleteMutation = useDeleteSFTPCredential();
  const testMutation = useTestSFTPCredential();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } =
    useForm<FormData>({ defaultValues: DEFAULTS });

  // Reset to the list whenever the dialog is (re)opened.
  useEffect(() => {
    if (open) {
      setView("list");
      setEditing(null);
    }
  }, [open]);

  const startCreate = () => {
    setEditing(null);
    reset(DEFAULTS);
    setView("form");
  };

  const startEdit = (cred: SFTPCredential) => {
    setEditing(cred);
    reset({
      name: cred.name || "",
      environment: cred.environment,
      host: cred.host,
      port: cred.port,
      username: cred.username,
      timeout: cred.timeout,
      auth_type: cred.auth_type,
      password: "",
      private_key: "",
      key_passphrase: "",
      export_format: cred.export_format,
      upload_path: cred.upload_path,
      download_path: cred.download_path,
      archive_path: cred.archive_path,
      is_active: cred.is_active,
      is_default: cred.is_default,
    });
    setView("form");
  };

  const onSubmit = (form: FormData) => {
    // Build payload; only send secrets the user actually typed so blanks
    // don't wipe stored credentials on edit.
    const payload: Partial<SFTPCredentialInput> = {
      name: form.name,
      environment: form.environment,
      host: form.host,
      port: Number(form.port),
      username: form.username,
      timeout: Number(form.timeout),
      auth_type: form.auth_type,
      export_format: form.export_format,
      upload_path: form.upload_path,
      download_path: form.download_path,
      archive_path: form.archive_path,
      is_active: form.is_active,
      is_default: form.is_default,
    };
    if (form.password) payload.password = form.password;
    if (form.private_key) payload.private_key = form.private_key;
    if (form.key_passphrase) payload.key_passphrase = form.key_passphrase;

    if (editing) {
      updateMutation.mutate(
        { id: editing.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Connection updated");
            setView("list");
          },
          onError: (e: any) =>
            toast.error(e?.response?.data?.detail || "Failed to update connection"),
        }
      );
    } else {
      createMutation.mutate(
        { ...payload, bank_account_id: bankAccountId } as SFTPCredentialInput,
        {
          onSuccess: () => {
            toast.success("Connection created");
            setView("list");
          },
          onError: (e: any) =>
            toast.error(e?.response?.data?.detail || "Failed to create connection"),
        }
      );
    }
  };

  const handleTest = (cred: SFTPCredential) => {
    testMutation.mutate(cred.id, {
      onSuccess: (res) =>
        res.success
          ? toast.success(res.message || "Connection successful")
          : toast.error(res.error || res.message || "Connection failed"),
      onError: () => toast.error("Connection test failed"),
    });
  };

  const handleDelete = (cred: SFTPCredential) => {
    deleteMutation.mutate(cred.id, {
      onSuccess: () => toast.success("Connection deleted"),
      onError: () => toast.error("Failed to delete connection"),
    });
  };

  const authType = watch("auth_type");
  const isActive = watch("is_active");
  const isDefault = watch("is_default");
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            Host-to-Host Connections
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {bankAccountName}
          </DialogDescription>
        </DialogHeader>

        {view === "list" ? (
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
              </div>
            ) : connections.length === 0 ? (
              <div className="text-center py-10">
                <Server className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No connections configured yet</p>
              </div>
            ) : (
              connections.map((cred) => (
                <div
                  key={cred.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/40"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground truncate">
                        {cred.name || cred.host}
                      </span>
                      <Badge variant="outline" className="uppercase text-[10px]">
                        {cred.environment}
                      </Badge>
                      {cred.is_default && (
                        <Badge variant="secondary" className="text-[10px]">Default</Badge>
                      )}
                      {!cred.is_active && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {cred.username}@{cred.host}:{cred.port}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={cred.connection_status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => handleTest(cred)}
                      disabled={testMutation.isPending}
                      title="Test connection"
                    >
                      {testMutation.isPending && testMutation.variables === cred.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <PlugZap className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => startEdit(cred)}
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(cred)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}

            <Button onClick={startCreate} className="w-full bg-primary hover:bg-primary/90 text-white">
              <Plus className="h-4 w-4 mr-2" /> Add Connection
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Connection Details */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Connection Details</h3>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Name</Label>
                <Input id="name" {...register("name")} placeholder="e.g., Stanbic Uganda SFTP"
                  className="h-10 bg-muted border-border" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="host" className="text-sm">Host *</Label>
                  <Input id="host" {...register("host", { required: "Host is required" })}
                    placeholder="sftp.bank.com" className="h-10 bg-muted border-border" />
                  {errors.host && <p className="text-xs text-destructive">{errors.host.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="port" className="text-sm">Port *</Label>
                  <Input id="port" type="number" {...register("port", { required: true, valueAsNumber: true })}
                    className="h-10 bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeout" className="text-sm">Timeout (s)</Label>
                  <Input id="timeout" type="number" {...register("timeout", { valueAsNumber: true })}
                    className="h-10 bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm">Username *</Label>
                  <Input id="username" {...register("username", { required: "Username is required" })}
                    className="h-10 bg-muted border-border" />
                  {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Environment</Label>
                  <Select value={watch("environment")} onValueChange={(v) => setValue("environment", v as FormData["environment"])}>
                    <SelectTrigger className="h-10 bg-muted border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test / UAT</SelectItem>
                      <SelectItem value="prod">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Authentication */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Authentication</h3>
              <div className="space-y-2">
                <Label className="text-sm">Method</Label>
                <Select value={authType} onValueChange={(v) => setValue("auth_type", v as FormData["auth_type"])}>
                  <SelectTrigger className="h-10 bg-muted border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="password">Username &amp; Password</SelectItem>
                    <SelectItem value="key">SSH Private Key</SelectItem>
                    <SelectItem value="key_password">SSH Key with Passphrase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {authType === "password" && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm">Password</Label>
                  <Input id="password" type="password" {...register("password")}
                    placeholder={editing?.has_password ? "•••••• (leave blank to keep)" : ""}
                    className="h-10 bg-muted border-border" />
                </div>
              )}
              {(authType === "key" || authType === "key_password") && (
                <div className="space-y-2">
                  <Label htmlFor="private_key" className="text-sm">Private Key (PEM)</Label>
                  <Textarea id="private_key" {...register("private_key")} rows={4}
                    placeholder={editing?.has_private_key ? "•••••• (leave blank to keep)" : "-----BEGIN OPENSSH PRIVATE KEY-----"}
                    className="bg-muted border-border resize-none font-mono text-xs" />
                </div>
              )}
              {authType === "key_password" && (
                <div className="space-y-2">
                  <Label htmlFor="key_passphrase" className="text-sm">Key Passphrase</Label>
                  <Input id="key_passphrase" type="password" {...register("key_passphrase")}
                    placeholder="(leave blank to keep)" className="h-10 bg-muted border-border" />
                </div>
              )}
            </section>

            {/* File Format & Paths */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">File Format &amp; Paths</h3>
              <div className="space-y-2">
                <Label className="text-sm">Export Format</Label>
                <Select value={watch("export_format")} onValueChange={(v) => setValue("export_format", v as FormData["export_format"])}>
                  <SelectTrigger className="h-10 bg-muted border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pain.001">pain.001 — Credit Transfer Initiation</SelectItem>
                    <SelectItem value="pain.002">pain.002 — Payment Status Report</SelectItem>
                    <SelectItem value="pain.008">pain.008 — Direct Debit Initiation</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="upload_path" className="text-sm">Upload Path</Label>
                  <Input id="upload_path" {...register("upload_path")} className="h-10 bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="download_path" className="text-sm">Download Path</Label>
                  <Input id="download_path" {...register("download_path")} className="h-10 bg-muted border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="archive_path" className="text-sm">Archive Path</Label>
                  <Input id="archive_path" {...register("archive_path")} className="h-10 bg-muted border-border" />
                </div>
              </div>
            </section>

            {/* Status */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Status</h3>
              <div className="space-y-4 p-4 bg-muted/80 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Active</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isActive ? "Connection can be used" : "Connection is disabled"}
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={(c) => setValue("is_active", c)}
                    className="data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Default</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isDefault ? "Default connection for this account" : "Set as default connection"}
                    </p>
                  </div>
                  <Switch checked={isDefault} onCheckedChange={(c) => setValue("is_default", c)}
                    className="data-[state=checked]:bg-primary" />
                </div>
              </div>
            </section>

            <DialogFooter className="pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setView("list")}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back
              </Button>
              <Button type="submit" disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-white">
                {isSaving ? "Saving..." : editing ? "Update Connection" : "Add Connection"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
