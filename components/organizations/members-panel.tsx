'use client';

/**
 * Users panel — members and pending invitations of one organization, with
 * the admin actions (invite, change role, activate/deactivate, remove,
 * resend/cancel invitation). Shared by /organizations/members and the
 * organization detail page's Users tab.
 *
 * Write actions are shown only to Owners/Admins of the selected organization
 * (and superusers); the backend enforces the same rule.
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Mail, ShieldCheck, UserCheck, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentCard, ContentCardHeader } from '@/components/layout/content-card';
import { LoadingState } from '@/components/layout/loading-state';
import { MetricTile } from '@/components/reports/MetricTile';
import { useCurrentUser, useCanManageOrganization } from '@/hooks/use-user';
import {
  useCancelInvitation,
  useInvitations,
  useMemberships,
  useRemoveMembership,
  useResendInvitation,
  useSendInvitation,
  useToggleMembership,
  useUpdateMembership,
} from '@/hooks/use-organization';
import type { MembershipRole, OrganizationInvitation, OrganizationMember } from '@/types/organization';
import { InvitationsTable, MembersTable } from './members-tables';
import { ChangeRoleDialog, ConfirmActionDialog, InviteUserDialog, type ConfirmState } from './members-dialogs';

interface MembersPanelProps {
  organizationId: string | null | undefined;
  organizationName?: string;
}

function errorMessage(e: unknown, fallback: string) {
  return e instanceof Error && e.message ? e.message : fallback;
}

export function MembersPanel({ organizationId, organizationName }: MembersPanelProps) {
  const { data: user } = useCurrentUser();
  const canManage = useCanManageOrganization(organizationId);
  const myRole = user?.organizations?.find((o) => o.id === organizationId)?.membership_role;
  const canAssignOwner = !!user?.is_superuser || myRole === 'owner';

  const { data: membershipsData, isLoading: membersLoading } = useMemberships(organizationId);
  const { data: invitationsData, isLoading: invitesLoading } = useInvitations(organizationId);

  const members = useMemo(() => membershipsData?.results ?? [], [membershipsData]);
  const invitations = useMemo(
    () => (invitationsData?.results ?? []).filter((i) => !i.accepted),
    [invitationsData]
  );

  const sendInvitation = useSendInvitation();
  const resendInvitation = useResendInvitation();
  const cancelInvitation = useCancelInvitation();
  const updateMembership = useUpdateMembership();
  const toggleMembership = useToggleMembership();
  const removeMembership = useRemoveMembership();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<OrganizationMember | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [busyInvitation, setBusyInvitation] = useState<string | null>(null);

  const summary = useMemo(() => {
    const active = members.filter((m) => m.is_active);
    return {
      active: active.length,
      admins: active.filter((m) => m.role === 'owner' || m.role === 'admin').length,
      approvers: active.filter((m) => m.role === 'approver').length,
      initiators: active.filter((m) => m.role === 'initiator').length,
      pending: invitations.length,
    };
  }, [members, invitations]);

  if (!organizationId) {
    return <LoadingState />;
  }

  const handleInvite = ({ email, role }: { email: string; role: MembershipRole }) => {
    sendInvitation.mutate(
      { email, role, organization: organizationId },
      {
        onSuccess: (inv) => {
          setInviteOpen(false);
          toast.success(
            inv.email_sent === false
              ? `Invitation saved for ${inv.email}, but the email could not be sent`
              : `Invitation sent to ${inv.email}`
          );
        },
        onError: (e) => toast.error(errorMessage(e, 'Could not send invitation')),
      }
    );
  };

  const handleChangeRole = (role: MembershipRole) => {
    if (!roleTarget) return;
    updateMembership.mutate(
      { id: roleTarget.id, data: { role } },
      {
        onSuccess: () => {
          setRoleTarget(null);
          toast.success('Role updated');
        },
        onError: (e) => toast.error(errorMessage(e, 'Could not change role')),
      }
    );
  };

  const askToggleActive = (m: OrganizationMember) => {
    const activate = !m.is_active;
    setConfirm({
      title: activate ? 'Activate user' : 'Deactivate user',
      description: activate
        ? `${m.user_name || m.user_email} will regain access to ${organizationName ?? 'this organization'}.`
        : `${m.user_name || m.user_email} will lose access to ${organizationName ?? 'this organization'} until re-activated.`,
      confirmLabel: activate ? 'Activate' : 'Deactivate',
      destructive: !activate,
      onConfirm: () =>
        toggleMembership.mutate(
          { id: m.id, activate },
          {
            onSuccess: () => {
              setConfirm(null);
              toast.success(activate ? 'User activated' : 'User deactivated');
            },
            onError: (e) => toast.error(errorMessage(e, 'Could not update user')),
          }
        ),
    });
  };

  const askRemove = (m: OrganizationMember) => {
    setConfirm({
      title: 'Remove user',
      description: `Remove ${m.user_name || m.user_email} from ${organizationName ?? 'this organization'}? They can be invited again later.`,
      confirmLabel: 'Remove',
      destructive: true,
      onConfirm: () =>
        removeMembership.mutate(m.id, {
          onSuccess: () => {
            setConfirm(null);
            toast.success('User removed');
          },
          onError: (e) => toast.error(errorMessage(e, 'Could not remove user')),
        }),
    });
  };

  const handleResend = (inv: OrganizationInvitation) => {
    setBusyInvitation(inv.id);
    resendInvitation.mutate(inv.id, {
      onSuccess: (res) => toast.success(res.message || `Invitation resent to ${inv.email}`),
      onError: (e) => toast.error(errorMessage(e, 'Could not resend invitation')),
      onSettled: () => setBusyInvitation(null),
    });
  };

  const askCancelInvitation = (inv: OrganizationInvitation) => {
    setConfirm({
      title: 'Cancel invitation',
      description: `The invitation link sent to ${inv.email} will stop working.`,
      confirmLabel: 'Cancel invitation',
      destructive: true,
      onConfirm: () =>
        cancelInvitation.mutate(inv.id, {
          onSuccess: () => {
            setConfirm(null);
            toast.success('Invitation cancelled');
          },
          onError: (e) => toast.error(errorMessage(e, 'Could not cancel invitation')),
        }),
    });
  };

  const confirmPending =
    toggleMembership.isPending || removeMembership.isPending || cancelInvitation.isPending;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile label="Active users" value={summary.active} icon={Users} />
        <MetricTile label="Owners & admins" value={summary.admins} icon={ShieldCheck} />
        <MetricTile
          label="Approvers / Initiators"
          value={`${summary.approvers} / ${summary.initiators}`}
          icon={UserCheck}
        />
        <MetricTile label="Pending invitations" value={summary.pending} icon={Mail} tone={summary.pending ? 'warning' : 'default'} />
      </div>

      <ContentCard noPadding>
        <ContentCardHeader className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Users</h3>
            <p className="text-xs text-muted-foreground">People with access to {organizationName ?? 'this organization'}</p>
          </div>
          {canManage && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4" />
              Invite user
            </Button>
          )}
        </ContentCardHeader>
        {membersLoading ? (
          <LoadingState />
        ) : (
          <MembersTable
            members={members}
            canManage={canManage}
            canAssignOwner={canAssignOwner}
            currentUserId={user?.id}
            onChangeRole={setRoleTarget}
            onToggleActive={askToggleActive}
            onRemove={askRemove}
          />
        )}
      </ContentCard>

      <ContentCard noPadding>
        <ContentCardHeader>
          <h3 className="text-sm font-semibold text-foreground">Pending invitations</h3>
          <p className="text-xs text-muted-foreground">Invitations expire 7 days after they are sent</p>
        </ContentCardHeader>
        {invitesLoading ? (
          <LoadingState />
        ) : (
          <InvitationsTable
            invitations={invitations}
            canManage={canManage}
            busyId={busyInvitation}
            onResend={handleResend}
            onCancel={askCancelInvitation}
          />
        )}
      </ContentCard>

      <InviteUserDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        organizationName={organizationName}
        canAssignOwner={canAssignOwner}
        isPending={sendInvitation.isPending}
        onSubmit={handleInvite}
      />
      <ChangeRoleDialog
        open={!!roleTarget}
        onOpenChange={(o) => !o && setRoleTarget(null)}
        memberName={roleTarget?.user_name || roleTarget?.user_email}
        currentRole={roleTarget?.role}
        canAssignOwner={canAssignOwner}
        isPending={updateMembership.isPending}
        onSubmit={handleChangeRole}
      />
      <ConfirmActionDialog state={confirm} onClose={() => setConfirm(null)} isPending={confirmPending} />
    </div>
  );
}
