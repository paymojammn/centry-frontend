import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MembersTable, InvitationsTable } from '../members-tables';
import { membershipHasPermission } from '@/hooks/use-user';
import { ASSIGNABLE_ROLES, roleLabel } from '@/types/organization';
import type { OrganizationInvitation, OrganizationMember } from '@/types/organization';

const member = (over: Partial<OrganizationMember>): OrganizationMember => ({
  id: 'm1',
  user: 'u1',
  user_email: 'ann@acme.test',
  user_name: 'Ann Admin',
  organization: 'org1',
  organization_name: 'Acme',
  role: 'approver',
  is_active: true,
  permissions: {},
  joined_at: '2026-01-05T10:00:00Z',
  synced_from_erp: false,
  ...over,
});

const invitation: OrganizationInvitation = {
  id: 'i1',
  organization: 'org1',
  organization_name: 'Acme',
  email: 'new@acme.test',
  role: 'initiator',
  permissions: {},
  invited_by: 'u1',
  invited_by_name: 'Ann Admin',
  invited_at: '2026-01-05T10:00:00Z',
  expires_at: '2026-01-12T10:00:00Z',
  accepted: false,
  is_expired: false,
  status: 'pending',
};

describe('role vocabulary', () => {
  it('offers Owner, Admin, Approver, Initiator, Viewer for new assignments only', () => {
    expect(ASSIGNABLE_ROLES).toEqual(['owner', 'admin', 'approver', 'initiator', 'viewer']);
    expect(ASSIGNABLE_ROLES).not.toContain('manager');
    expect(ASSIGNABLE_ROLES).not.toContain('member');
  });

  it('still labels legacy roles when present', () => {
    expect(roleLabel('manager')).toBe('Manager');
    expect(roleLabel('approver')).toBe('Approver');
  });
});

describe('membershipHasPermission', () => {
  it('mirrors backend role defaults for the maker-checker roles', () => {
    expect(membershipHasPermission('approver', {}, 'payments.approve')).toBe(true);
    expect(membershipHasPermission('approver', {}, 'payments.edit')).toBe(false);
    expect(membershipHasPermission('initiator', {}, 'payments.create')).toBe(true);
    expect(membershipHasPermission('initiator', {}, 'payments.approve')).toBe(false);
    expect(membershipHasPermission('viewer', {}, 'payments.view')).toBe(true);
  });

  it('lets an explicit per-app grant override the role default', () => {
    expect(membershipHasPermission('viewer', { payments: { approve: true } }, 'payments.approve')).toBe(true);
    expect(membershipHasPermission('approver', { payments: { approve: false } }, 'payments.approve')).toBe(false);
  });

  it('gives owners and admins everything', () => {
    expect(membershipHasPermission('owner', {}, 'anything.manage')).toBe(true);
    expect(membershipHasPermission('admin', {}, 'anything.manage')).toBe(true);
  });
});

describe('MembersTable', () => {
  const noop = vi.fn();

  it('hides the actions column for read-only members', () => {
    render(
      <MembersTable
        members={[member({})]}
        canManage={false}
        canAssignOwner={false}
        onChangeRole={noop}
        onToggleActive={noop}
        onRemove={noop}
      />
    );
    expect(screen.getByText('Ann Admin')).toBeInTheDocument();
    expect(screen.getByText('Approver')).toBeInTheDocument();
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Actions for/)).not.toBeInTheDocument();
  });

  it('shows row actions for admins and marks the current user', () => {
    render(
      <MembersTable
        members={[member({}), member({ id: 'm2', user: 'u2', user_name: 'Bob', user_email: 'bob@acme.test', role: 'viewer' })]}
        canManage
        canAssignOwner={false}
        currentUserId="u1"
        onChangeRole={noop}
        onToggleActive={noop}
        onRemove={noop}
      />
    );
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('(you)')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Actions for/)).toHaveLength(2);
  });

  it('renders an empty state when there are no members', () => {
    render(
      <MembersTable members={[]} canManage canAssignOwner onChangeRole={noop} onToggleActive={noop} onRemove={noop} />
    );
    expect(screen.getByText('No users yet')).toBeInTheDocument();
  });
});

describe('InvitationsTable', () => {
  it('shows resend/cancel only to admins', () => {
    const { rerender } = render(
      <InvitationsTable invitations={[invitation]} canManage={false} onResend={vi.fn()} onCancel={vi.fn()} />
    );
    expect(screen.getByText('new@acme.test')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.queryByText('Resend')).not.toBeInTheDocument();

    rerender(<InvitationsTable invitations={[invitation]} canManage onResend={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('Resend')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});
