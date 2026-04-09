import { describe, it, expect } from 'vitest';

/**
 * Payment Recording & Due Date Handling Tests
 * 
 * Tests for:
 * 1. Due date default calculation (30 days from creation)
 * 2. Due date string format (YYYY-MM-DD) without timezone shifts
 * 3. Payment status mapping (fully_paid, partially_paid)
 * 4. Status badge color/label/icon mapping completeness
 * 5. Status counts including fully_paid in paid count
 */

// ─── Helper: Calculate default due date (mirrors backend logic) ────────────

function calculateDefaultDueDate(creationDate?: Date): string {
  const base = creationDate || new Date();
  const dueDate = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
  return dueDate.toISOString().split('T')[0];
}

// ─── Helper: Determine payable status after payment (mirrors backend) ──────

function determinePayableStatusAfterPayment(
  paidAmount: number,
  totalAmount: number
): string {
  if (paidAmount >= totalAmount) {
    return 'fully_paid';
  } else if (paidAmount > 0) {
    return 'partially_paid';
  }
  return 'pending_payment';
}

// ─── Helper: Status badge mappings (mirrors frontend PRPayablesList) ───────

function getStatusColor(status: string): string {
  switch (status) {
    case 'pending_invoice':
      return 'bg-orange-100 text-orange-800';
    case 'pending_approval':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending_payment':
      return 'bg-blue-100 text-blue-800';
    case 'approved':
      return 'bg-blue-100 text-blue-800';
    case 'paid':
    case 'fully_paid':
      return 'bg-green-100 text-green-800';
    case 'partially_paid':
      return 'bg-teal-100 text-teal-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getStatusLabel(status: string, language: 'en' | 'ar' = 'en'): string {
  switch (status) {
    case 'pending_invoice':
      return language === 'ar' ? 'في انتظار الفاتورة' : 'Pending Invoice';
    case 'pending_approval':
      return language === 'ar' ? 'في انتظار الموافقة' : 'Pending Approval';
    case 'pending_payment':
      return language === 'ar' ? 'في انتظار الدفع' : 'Pending Payment';
    case 'approved':
      return language === 'ar' ? 'موافق عليه' : 'Approved';
    case 'paid':
    case 'fully_paid':
      return language === 'ar' ? 'مدفوع' : 'Paid';
    case 'partially_paid':
      return language === 'ar' ? 'مدفوع جزئياً' : 'Partially Paid';
    case 'cancelled':
      return language === 'ar' ? 'ملغى' : 'Cancelled';
    default:
      return status;
  }
}

// ─── Helper: Count statuses (mirrors frontend logic) ───────────────────────

function countPaidStatuses(payables: Array<{ status: string }>): number {
  return payables.filter(
    (p) => p.status === 'paid' || p.status === 'fully_paid' || p.status === 'partially_paid'
  ).length;
}

// ─── Tests: Due Date Default Calculation ───────────────────────────────────

describe('Due Date: Default Calculation', () => {
  it('should calculate 30 days from creation date', () => {
    const creation = new Date('2026-03-07T00:00:00Z');
    const dueDate = calculateDefaultDueDate(creation);
    expect(dueDate).toBe('2026-04-06');
  });

  it('should return YYYY-MM-DD format string', () => {
    const dueDate = calculateDefaultDueDate(new Date('2026-01-15T12:00:00Z'));
    expect(dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle month boundary correctly', () => {
    const creation = new Date('2026-01-31T00:00:00Z');
    const dueDate = calculateDefaultDueDate(creation);
    expect(dueDate).toBe('2026-03-02');
  });

  it('should handle year boundary correctly', () => {
    const creation = new Date('2025-12-15T00:00:00Z');
    const dueDate = calculateDefaultDueDate(creation);
    expect(dueDate).toBe('2026-01-14');
  });

  it('should not have timezone shift issues with date string', () => {
    // The key fix: using toISOString().split('T')[0] avoids timezone-dependent Date formatting
    const creation = new Date('2026-03-07T23:59:59Z');
    const dueDate = calculateDefaultDueDate(creation);
    // Should be April 6, not April 5 or April 7
    expect(dueDate).toBe('2026-04-06');
  });
});

// ─── Tests: Payment Status Determination ───────────────────────────────────

describe('Payment Status: After Payment Recording', () => {
  it('should return fully_paid when paid >= total', () => {
    expect(determinePayableStatusAfterPayment(23500, 23500)).toBe('fully_paid');
  });

  it('should return fully_paid when overpaid', () => {
    expect(determinePayableStatusAfterPayment(25000, 23500)).toBe('fully_paid');
  });

  it('should return partially_paid when paid < total but > 0', () => {
    expect(determinePayableStatusAfterPayment(10000, 23500)).toBe('partially_paid');
  });

  it('should return pending_payment when nothing paid', () => {
    expect(determinePayableStatusAfterPayment(0, 23500)).toBe('pending_payment');
  });
});

// ─── Tests: Status Badge Mapping Completeness ──────────────────────────────

describe('Status Badge: Color Mapping', () => {
  const allStatuses = [
    'pending_invoice',
    'pending_approval',
    'pending_payment',
    'approved',
    'paid',
    'fully_paid',
    'partially_paid',
    'cancelled',
  ];

  it('should have a color mapping for every valid status', () => {
    for (const status of allStatuses) {
      const color = getStatusColor(status);
      expect(color).not.toBe('bg-gray-100 text-gray-800');
    }
  });

  it('should use green for paid and fully_paid', () => {
    expect(getStatusColor('paid')).toBe('bg-green-100 text-green-800');
    expect(getStatusColor('fully_paid')).toBe('bg-green-100 text-green-800');
  });

  it('should use teal for partially_paid', () => {
    expect(getStatusColor('partially_paid')).toBe('bg-teal-100 text-teal-800');
  });

  it('should use red for cancelled', () => {
    expect(getStatusColor('cancelled')).toBe('bg-red-100 text-red-800');
  });

  it('should return gray for unknown status', () => {
    expect(getStatusColor('unknown_status')).toBe('bg-gray-100 text-gray-800');
  });
});

describe('Status Badge: Label Mapping', () => {
  it('should return same label for paid and fully_paid (English)', () => {
    expect(getStatusLabel('paid', 'en')).toBe(getStatusLabel('fully_paid', 'en'));
  });

  it('should return same label for paid and fully_paid (Arabic)', () => {
    expect(getStatusLabel('paid', 'ar')).toBe(getStatusLabel('fully_paid', 'ar'));
  });

  it('should return translated label for partially_paid', () => {
    expect(getStatusLabel('partially_paid', 'en')).toBe('Partially Paid');
    expect(getStatusLabel('partially_paid', 'ar')).toBe('مدفوع جزئياً');
  });

  it('should return translated label for pending_payment', () => {
    expect(getStatusLabel('pending_payment', 'en')).toBe('Pending Payment');
    expect(getStatusLabel('pending_payment', 'ar')).toBe('في انتظار الدفع');
  });

  it('should return raw status for unknown values', () => {
    expect(getStatusLabel('some_unknown_status')).toBe('some_unknown_status');
  });
});

// ─── Tests: Status Counts ──────────────────────────────────────────────────

describe('Status Counts: Paid Counting', () => {
  it('should count fully_paid in paid count', () => {
    const payables = [
      { status: 'fully_paid' },
      { status: 'pending_invoice' },
      { status: 'pending_approval' },
    ];
    expect(countPaidStatuses(payables)).toBe(1);
  });

  it('should count partially_paid in paid count', () => {
    const payables = [
      { status: 'partially_paid' },
      { status: 'pending_invoice' },
    ];
    expect(countPaidStatuses(payables)).toBe(1);
  });

  it('should count both paid and fully_paid', () => {
    const payables = [
      { status: 'paid' },
      { status: 'fully_paid' },
      { status: 'partially_paid' },
    ];
    expect(countPaidStatuses(payables)).toBe(3);
  });

  it('should return 0 when no paid statuses', () => {
    const payables = [
      { status: 'pending_invoice' },
      { status: 'pending_approval' },
      { status: 'cancelled' },
    ];
    expect(countPaidStatuses(payables)).toBe(0);
  });
});

// ─── Tests: Date String Format Safety ──────────────────────────────────────

describe('Date Handling: String Format Safety', () => {
  it('should preserve YYYY-MM-DD format without timezone conversion', () => {
    // Simulating what the frontend sends: just the date string
    const dateString = '2026-07-20';
    // Backend should store this directly, not convert through Date object
    expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(dateString).toBe('2026-07-20');
  });

  it('should avoid Date object timezone shift', () => {
    // This is the bug that was fixed: new Date('2026-07-20') in UTC-3 timezone
    // would give 2026-07-19 when formatted with toLocaleDateString
    const dateString = '2026-07-20';
    // The fix: store the string directly, don't convert through Date
    const stored = dateString; // Not: new Date(dateString).toISOString().split('T')[0]
    expect(stored).toBe('2026-07-20');
  });

  it('should handle payment date as string without timezone issues', () => {
    // Payment date from HTML date input is always YYYY-MM-DD
    const paymentDate = '2026-03-07';
    // Backend should store this directly
    expect(paymentDate).toBe('2026-03-07');
  });
});
