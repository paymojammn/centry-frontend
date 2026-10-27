'use client';

/**
 * Dialogs for the Users panel: invite someone, change a member's role, and a
 * generic confirm for destructive actions (remove / deactivate / cancel).
 */

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ASSIGNABLE_ROLES,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  type MembershipRole,
} from '@/types/organization';

interface RoleSelectProps {
  value: MembershipRole;
  onChange: (role: MembershipRole) => void;
  /** Only owners may hand out the Owner role. */
  canAssignOwner: boolean;
  id?: string;
}

export function RoleSelect({ value, onChange, canAssignOwner, id }: RoleSelectProps) {
  const roles = ASSIGNABLE_ROLES.filter((r) => r !== 'owner' || canAssignOwner);
  // A legacy role (manager/member) stays selectable only while it is the current value.
  const options = roles.includes(value) ? roles : [value, ...roles];
  return (
    <Select value={value} onValueChange={(v) => onChange(v as MembershipRole)}>
      <SelectTrigger id={id} size="lg">
        <SelectValue placeholder="Select a role" />
      </SelectTrigger>
      <SelectContent>
        {options.map((role) => (
          <SelectItem key={role} value={role}>
            <span className="flex flex-col text-left">
              <span>{ROLE_LABELS[role]}</span>
              <span className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface InviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationName?: string;
  canAssignOwner: boolean;
  isPending: boolean;
  onSubmit: (data: { email: string; role: MembershipRole }) => void;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  organizationName,
  canAssignOwner,
  isPending,
  onSubmit,
}: InviteDialogProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MembershipRole>('initiator');

  useEffect(() => {
    if (open) {
      setEmail('');
      setRole('initiator');
    }
  }, [open]);

  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite user</DialogTitle>
          <DialogDescription>
            They will receive an email with a link to join{' '}
            {organizationName ? <span className="font-medium text-foreground">{organizationName}</span> : 'this organization'}.
            The link is valid for 7 days.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid && !isPending) onSubmit({ email: email.trim().toLowerCase(), role });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <RoleSelect id="invite-role" value={role} onChange={setRole} canAssignOwner={canAssignOwner} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || isPending}>
              {isPending ? 'Sending…' : 'Send invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName?: string;
  currentRole?: MembershipRole;
  canAssignOwner: boolean;
  isPending: boolean;
  onSubmit: (role: MembershipRole) => void;
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  memberName,
  currentRole,
  canAssignOwner,
  isPending,
  onSubmit,
}: ChangeRoleDialogProps) {
  const [role, setRole] = useState<MembershipRole>(currentRole ?? 'viewer');
  useEffect(() => {
    if (open) setRole(currentRole ?? 'viewer');
  }, [open, currentRole]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            Choose the role for {memberName ? <span className="font-medium text-foreground">{memberName}</span> : 'this user'}.
            Changes apply immediately.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="change-role">Role</Label>
          <RoleSelect id="change-role" value={role} onChange={setRole} canAssignOwner={canAssignOwner} />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => onSubmit(role)} disabled={isPending || role === currentRole}>
            {isPending ? 'Saving…' : 'Save role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface ConfirmState {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
}

interface ConfirmDialogProps {
  state: ConfirmState | null;
  onClose: () => void;
  isPending: boolean;
}

export function ConfirmActionDialog({ state, onClose, isPending }: ConfirmDialogProps) {
  return (
    <AlertDialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state?.title}</AlertDialogTitle>
          <AlertDialogDescription>{state?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            className={state?.destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            onClick={(e) => {
              e.preventDefault();
              state?.onConfirm();
            }}
          >
            {isPending ? 'Working…' : state?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
