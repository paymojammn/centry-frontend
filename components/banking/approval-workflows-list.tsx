"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { approvalsApi, type ApprovalWorkflow, type ApprovalWorkflowInput } from "@/lib/approvals-api";

interface ApprovalWorkflowsListProps {
  organizationId?: string;
}

// ContentType id for erp_xero.XeroPaymentEvent is resolved from the first
// workflow on the server; for new rows we keep whatever content_type we see
// in existing rows. If there are no existing rows we seed defaults first.
export function ApprovalWorkflowsList({ organizationId }: ApprovalWorkflowsListProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ApprovalWorkflow | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["approval-workflows", organizationId],
    queryFn: () => approvalsApi.listWorkflows(organizationId, true),
    enabled: !!organizationId,
  });
  const workflows = data || [];

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["approval-workflows", organizationId] });

  const seedDefaults = useMutation({
    mutationFn: () => approvalsApi.seedDefaults(organizationId!),
    onSuccess: () => {
      invalidate();
      toast.success("Default workflows created");
    },
    onError: (err: Error) =>
      toast.error(err.message || "Failed to seed default workflows. Owner/admin role required."),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: number | string; is_active: boolean }) =>
      approvalsApi.updateWorkflow(id, { is_active }),
    onSuccess: () => {
      invalidate();
      toast.success("Workflow updated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update workflow"),
  });

  const toggleSelfApproval = useMutation({
    mutationFn: ({ id, allow_self_approval }: { id: number | string; allow_self_approval: boolean }) =>
      approvalsApi.updateWorkflow(id, { allow_self_approval }),
    onSuccess: () => {
      invalidate();
      toast.success("Workflow updated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update workflow"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => approvalsApi.deleteWorkflow(id),
    onSuccess: () => {
      invalidate();
      toast.success("Workflow deleted");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete workflow"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <ShieldCheck className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No approval workflows yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1 max-w-md mx-auto">
          Without a workflow, bill payments default to: one approver required,
          no self-approval. Seed the recommended starter set and tweak from there.
        </p>
        <Button
          size="sm"
          className="mt-4"
          onClick={() => seedDefaults.mutate()}
          disabled={seedDefaults.isPending || !organizationId}
        >
          {seedDefaults.isPending ? (
            <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Seeding…</>
          ) : (
            <><Plus className="h-4 w-4 mr-1.5" /> Seed default workflows</>
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <div className="text-sm text-muted-foreground">
          {workflows.length} workflow{workflows.length === 1 ? "" : "s"}
        </div>
        <Button
          size="sm"
          onClick={() => setIsCreateOpen(true)}
          disabled={!organizationId}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          New workflow
        </Button>
      </div>

      <table className="w-full table-professional">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Name</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Applies to</th>
            <th className="text-right text-xs font-medium text-muted-foreground px-6 py-3">Amount range</th>
            <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">Approvals</th>
            <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">Self-approval</th>
            <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">Active</th>
            <th className="w-10 px-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {workflows.map((wf) => (
            <tr key={wf.id} className="hover:bg-muted transition-colors">
              <td className="px-6 py-3">
                <div className="text-sm font-medium text-foreground">{wf.name}</div>
                <div className="text-xs text-muted-foreground">
                  {wf.required_permission} &middot; priority {wf.priority}
                </div>
              </td>
              <td className="px-6 py-3">
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  {wf.content_type_display} &middot; {wf.action}
                </span>
              </td>
              <td className="px-6 py-3 text-right text-sm">
                {wf.min_amount || wf.max_amount ? (
                  <>
                    {wf.min_amount ? parseFloat(wf.min_amount).toLocaleString() : "0"}
                    {" – "}
                    {wf.max_amount ? parseFloat(wf.max_amount).toLocaleString() : "∞"}
                  </>
                ) : (
                  <span className="text-muted-foreground">Any amount</span>
                )}
              </td>
              <td className="px-6 py-3 text-center text-sm font-medium">{wf.required_approvals}</td>
              <td className="px-6 py-3 text-center">
                <Switch
                  checked={wf.allow_self_approval}
                  onCheckedChange={(v) =>
                    toggleSelfApproval.mutate({ id: wf.id, allow_self_approval: v })
                  }
                />
              </td>
              <td className="px-6 py-3 text-center">
                <Switch
                  checked={wf.is_active}
                  onCheckedChange={(v) => toggleActive.mutate({ id: wf.id, is_active: v })}
                />
              </td>
              <td className="px-3 py-3 text-right">
                <button
                  type="button"
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                  onClick={() => setEditing(wf)}
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-destructive ml-1"
                  onClick={() => {
                    if (confirm(`Delete workflow "${wf.name}"?`)) deleteMutation.mutate(wf.id);
                  }}
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Create / Edit dialog */}
      <WorkflowEditor
        isOpen={isCreateOpen || !!editing}
        initial={editing}
        organizationId={organizationId}
        onClose={() => {
          setEditing(null);
          setIsCreateOpen(false);
        }}
        onSaved={() => {
          invalidate();
          setEditing(null);
          setIsCreateOpen(false);
        }}
      />
    </>
  );
}

interface WorkflowEditorProps {
  isOpen: boolean;
  initial: ApprovalWorkflow | null;
  organizationId?: string;
  contentTypeHint?: number;
  onClose: () => void;
  onSaved: () => void;
}

function WorkflowEditor({
  isOpen,
  initial,
  organizationId,
  onClose,
  onSaved,
}: WorkflowEditorProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [minAmount, setMinAmount] = useState(initial?.min_amount ?? "");
  const [maxAmount, setMaxAmount] = useState(initial?.max_amount ?? "");
  const [requiredApprovals, setRequiredApprovals] = useState(
    String(initial?.required_approvals ?? 1),
  );
  const [allowSelf, setAllowSelf] = useState(initial?.allow_self_approval ?? false);
  const [priority, setPriority] = useState(String(initial?.priority ?? 100));
  // What the workflow governs. Previously hardcoded to bill payments, so a
  // workflow created here could never apply to payouts.
  const [scopeKey, setScopeKey] = useState<string>("");
  const [requiredPermission, setRequiredPermission] = useState(
    initial?.required_permission ?? "payments.approve",
  );

  // Reset form when dialog opens with a different record.
  useMemo(() => {
    if (!isOpen) return;
    setName(initial?.name ?? "");
    setMinAmount(initial?.min_amount ?? "");
    setMaxAmount(initial?.max_amount ?? "");
    setRequiredApprovals(String(initial?.required_approvals ?? 1));
    setAllowSelf(initial?.allow_self_approval ?? false);
    setPriority(String(initial?.priority ?? 100));
    setRequiredPermission(initial?.required_permission ?? "payments.approve");
    setScopeKey(initial ? (initial.action === "payout" ? "payout" : "bill_payment") : "payout");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initial?.id]);

  // The (content_type, action) pair must match what the engine resolves, so
  // it comes from the server rather than being assembled here.
  const { data: scopeData } = useQuery({
    queryKey: ["approval-scopes"],
    queryFn: () => approvalsApi.getScopes(),
    staleTime: 300_000,
  });
  const scopes = scopeData?.results ?? [];

  const save = useMutation({
    mutationFn: async () => {
      const payload: Partial<ApprovalWorkflowInput> = {
        name,
        required_approvals: parseInt(requiredApprovals, 10) || 1,
        allow_self_approval: allowSelf,
        priority: parseInt(priority, 10) || 100,
        required_permission: requiredPermission,
        min_amount: minAmount || null,
        max_amount: maxAmount || null,
      };
      if (initial) {
        return approvalsApi.updateWorkflow(initial.id, payload);
      }
      const scope = scopes.find((sc) => sc.key === scopeKey) ?? scopes[0];
      if (!organizationId || !scope) {
        throw new Error("Missing organization or scope");
      }
      return approvalsApi.createWorkflow({
        ...(payload as ApprovalWorkflowInput),
        organization: organizationId,
        content_type: scope.content_type,
        action: scope.action,
      });
    },
    onSuccess: () => {
      toast.success(initial ? "Workflow updated" : "Workflow created");
      onSaved();
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save workflow"),
  });

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit workflow" : "New approval workflow"}</DialogTitle>
          <DialogDescription>
            Controls segregation of duties and maker-checker for bill payments in
            this organisation.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Applies to</label>
            {initial ? (
              // Re-pointing an existing workflow at a different object type
              // would silently orphan any approvals already recorded under it.
              <div className="h-9 flex items-center px-3 rounded-md border border-input bg-muted/50 text-sm">
                {initial.action === "payout" ? "Payouts (Rails)" : "Bill Payments"}
                <span className="ml-auto text-xs text-muted-foreground">not editable</span>
              </div>
            ) : (
              <select
                value={scopeKey}
                onChange={(e) => setScopeKey(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {scopes.map((sc) => (
                  <option key={sc.key} value={sc.key}>
                    {sc.label} — {sc.description}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard Payouts" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Min amount</label>
              <Input type="number" min="0" step="0.01" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="Unlimited below" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Max amount</label>
              <Input type="number" min="0" step="0.01" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Unlimited above" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Required approvals</label>
              <Input type="number" min="0" step="1" value={requiredApprovals} onChange={(e) => setRequiredApprovals(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Priority</label>
              <Input type="number" min="0" step="1" value={priority} onChange={(e) => setPriority(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Required permission</label>
            <Input value={requiredPermission} onChange={(e) => setRequiredPermission(e.target.value)} placeholder="payments.approve" />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={allowSelf}
              onChange={(e) => setAllowSelf(e.target.checked)}
            />
            <span>Allow self-approval (initiator can also approve)</span>
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
            {save.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
