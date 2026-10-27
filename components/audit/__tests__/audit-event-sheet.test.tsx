import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AuditEventSheet, KeyValueList } from '../audit-event-sheet';
import type { AuditLog } from '@/types/reports';

vi.mock('@/hooks/use-reports', () => ({
  useAuditLogDetail: (id: string | null) => ({
    data: id
      ? {
          ...event,
          request_id: 'req-abc-123',
          user_agent: 'Mozilla/5.0 (test)',
        }
      : undefined,
  }),
}));

const event: AuditLog = {
  id: 'evt-1',
  user: 7,
  user_name: 'Eseza Muwanga',
  user_email: 'eseza@example.com',
  user_ip: '10.0.0.8',
  action_type: 'recon.match',
  action_display: 'Transaction Matched',
  action_description: 'Matched bank transaction FT26060ABC to bill BILL-001',
  severity: 'info',
  severity_display: 'Information',
  module: 'recon',
  target_representation: 'FT26060ABC — Payment to supplier',
  timestamp: '2026-03-05T12:00:00Z',
  organization: 'org-1',
  organization_name: 'Acme Ltd',
  changes: { match_status: { old: 'unmatched', new: 'matched' } },
  metadata: { match_reference: 'BILL-001', matched_amount: '150000.00' },
  success: true,
  error_message: '',
};

describe('KeyValueList', () => {
  it('renders old → new for change entries and plain values for metadata', () => {
    render(
      <>
        <KeyValueList title="Changes" data={event.changes} emptyLabel="none" />
        <KeyValueList title="Metadata" data={event.metadata} emptyLabel="none" />
      </>
    );
    expect(screen.getByText('match_status')).toBeInTheDocument();
    expect(screen.getByText('unmatched')).toBeInTheDocument();
    expect(screen.getByText('matched')).toBeInTheDocument();
    expect(screen.getByText('match_reference')).toBeInTheDocument();
    expect(screen.getByText('BILL-001')).toBeInTheDocument();
  });

  it('shows the empty label when there is nothing to list', () => {
    render(<KeyValueList title="Changes" data={{}} emptyLabel="No field changes recorded." />);
    expect(screen.getByText('No field changes recorded.')).toBeInTheDocument();
  });
});

describe('AuditEventSheet', () => {
  it('shows the summary facts, the request id and the user agent from the detail fetch', () => {
    render(<AuditEventSheet event={event} onClose={() => {}} />);
    expect(screen.getByText('recon.match')).toBeInTheDocument();
    expect(screen.getByText('Eseza Muwanga')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.8')).toBeInTheDocument();
    expect(screen.getByText('Acme Ltd')).toBeInTheDocument();
    expect(screen.getByText('req-abc-123')).toBeInTheDocument();
    expect(screen.getByText(/Mozilla\/5.0 \(test\)/)).toBeInTheDocument();
  });

  it('renders nothing when no event is selected', () => {
    render(<AuditEventSheet event={null} onClose={() => {}} />);
    expect(screen.queryByText('Request ID')).not.toBeInTheDocument();
  });
});
