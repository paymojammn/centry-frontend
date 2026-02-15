import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, StatusDot, StatusIndicator } from '@/components/layout/status-badge';

describe('StatusBadge', () => {
  it('renders the status label', () => {
    render(<StatusBadge status="paid" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('renders a custom label when provided', () => {
    render(<StatusBadge status="paid" label="Completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('formats status label from snake_case', () => {
    render(<StatusBadge status="awaiting_approval" />);
    expect(screen.getByText('Awaiting Approval')).toBeInTheDocument();
  });

  it('applies correct background color for paid status', () => {
    const { container } = render(<StatusBadge status="paid" variant="solid" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.backgroundColor).toBe('rgb(107, 155, 113)');
  });

  it('applies correct background color for failed status', () => {
    const { container } = render(<StatusBadge status="failed" variant="solid" />);
    const badge = container.firstChild as HTMLElement;
    expect(badge.style.backgroundColor).toBe('rgb(184, 92, 92)');
  });

  it('renders with different sizes', () => {
    const { rerender, container } = render(<StatusBadge status="draft" size="sm" />);
    expect(container.firstChild).toHaveClass('text-[10px]');

    rerender(<StatusBadge status="draft" size="lg" />);
    expect(container.firstChild).toHaveClass('text-sm');
  });
});

describe('StatusDot', () => {
  it('renders a colored dot', () => {
    const { container } = render(<StatusDot status="paid" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.style.backgroundColor).toBe('rgb(107, 155, 113)');
  });

  it('renders with lg size class', () => {
    const { container } = render(<StatusDot status="paid" size="lg" />);
    const dot = container.firstChild as HTMLElement;
    expect(dot.className).toContain('w-2.5');
  });
});

describe('StatusIndicator', () => {
  it('renders label and dot', () => {
    render(<StatusIndicator status="paid" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('renders custom label', () => {
    render(<StatusIndicator status="paid" label="Success" />);
    expect(screen.getByText('Success')).toBeInTheDocument();
  });
});
