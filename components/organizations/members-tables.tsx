'use client';

/**
 * Tables for the Users panel: current members and pending invitations.
 * Pure presentation — every action is a callback owned by MembersPanel.
 */

import { format } from 'date-fns';
import { MoreVertical, Mail, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/layout/empty-state';
import { roleLabel, type OrganizationInvitation, type OrganizationMember } from '@/types/organization';

const ROLE_PILL: Record<string, string> = {
  owner: 'bg-warning-500/10 text-warning-700 border-warning-500/20',
  admin: 'bg-primary/10 text-primary border-primary/20',
  approver: 'bg-success-500/10 text-success-700 border-success-500/20',
  initiator: 'bg-info-500/10 text-info-700 border-info-500/20',
};
const NEUTRAL_PILL = 'bg-muted text-muted-foreground border-border';

export function RolePill({ role }: { role: string }) {
  return <span className={`status-pill ${ROLE_PILL[role] ?? NEUTRAL_PILL}`}>{roleLabel(role)}</span>;
}

function ActivePill({ active }: { active: boolean }) {
  return (
    <span
      className={`status-pill ${
        active ? 'bg-success-500/10 text-success-700 border-success-500/20' : NEUTRAL_PILL
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

const INVITE_PILL: Record<OrganizationInvitation['status'], string> = {
  pending: 'bg-warning-500/10 text-warning-700 border-warning-500/20',
  expired: 'bg-danger-500/10 text-danger-700 border-danger-500/20',
  accepted: 'bg-success-500/10 text-success-700 border-success-500/20',
};

function dateCell(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : format(d, 'dd MMM yyyy');
}

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

interface MembersTableProps {
  members: OrganizationMember[];
  canManage: boolean;
  canAssignOwner: boolean;
  currentUserId?: string;
  onChangeRole: (m: OrganizationMember) => void;
  onToggleActive: (m: OrganizationMember) => void;
  onRemove: (m: OrganizationMember) => void;
}

export function MembersTable({
  members,
  canManage,
  canAssignOwner,
  currentUserId,
  onChangeRole,
  onToggleActive,
  onRemove,
}: MembersTableProps) {
  if (members.length === 0) {
    return <EmptyState icon={UserPlus} title="No users yet" description="Invite someone to get started." />;
  }
  return (
    <table className="table-professional">
      <thead>
        <tr>
          <th>User</th>
          <th>Role</th>
          <th>Status</th>
          <th>Joined</th>
          {canManage && <th className="text-right">Actions</th>}
        </tr>
      </thead>
      <tbody>
        {members.map((m) => {
          const isSelf = !!currentUserId && m.user === currentUserId;
          const ownerLocked = m.role === 'owner' && !canAssignOwner;
          const locked = isSelf || ownerLocked;
          return (
            <tr key={m.id}>
              <td className="cell-primary">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initials(m.user_name, m.user_email)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate">
                      {m.user_name || m.user_email}
                      {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                    </div>
                    <span className="cell-sub">{m.user_email}</span>
                  </div>
                </div>
              </td>
              <td>
                <RolePill role={m.role} />
                {m.synced_from_erp && <span className="cell-sub">Synced from ERP</span>}
              </td>
              <td>
                <ActivePill active={m.is_active} />
              </td>
              <td className="cell-muted">{dateCell(m.joined_at)}</td>
              {canManage && (
                <td className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" mode="icon" aria-label={`Actions for ${m.user_email}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem disabled={locked} onClick={() => onChangeRole(m)}>
                        Change role
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={locked} onClick={() => onToggleActive(m)}>
                        {m.is_active ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={locked}
                        className="text-destructive focus:text-destructive"
                        onClick={() => onRemove(m)}
                      >
                        Remove from organization
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

interface InvitationsTableProps {
  invitations: OrganizationInvitation[];
  canManage: boolean;
  busyId?: string | null;
  onResend: (inv: OrganizationInvitation) => void;
  onCancel: (inv: OrganizationInvitation) => void;
}

export function InvitationsTable({ invitations, canManage, busyId, onResend, onCancel }: InvitationsTableProps) {
  if (invitations.length === 0) {
    return <EmptyState icon={Mail} title="No pending invitations" />;
  }
  return (
    <table className="table-professional">
      <thead>
        <tr>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Invited</th>
          <th>Expires</th>
          {canManage && <th className="text-right">Actions</th>}
        </tr>
      </thead>
      <tbody>
        {invitations.map((inv) => (
          <tr key={inv.id}>
            <td className="cell-primary">
              {inv.email}
              {inv.invited_by_name && <span className="cell-sub">Invited by {inv.invited_by_name}</span>}
            </td>
            <td>
              <RolePill role={inv.role} />
            </td>
            <td>
              <span className={`status-pill ${INVITE_PILL[inv.status] ?? NEUTRAL_PILL} capitalize`}>{inv.status}</span>
            </td>
            <td className="cell-muted">{dateCell(inv.invited_at)}</td>
            <td className="cell-muted">{dateCell(inv.expires_at)}</td>
            {canManage && (
              <td className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={busyId === inv.id} onClick={() => onResend(inv)}>
                    Resend
                  </Button>
                  <Button variant="ghost" size="sm" disabled={busyId === inv.id} onClick={() => onCancel(inv)}>
                    Cancel
                  </Button>
                </div>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
