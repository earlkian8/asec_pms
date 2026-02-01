/**
 * Centralized color constants for the application
 */
export const AppColors = {
  primary: '#3B82F6',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  card: '#FFFFFF',
  background: '#F3F4F6',
  text: '#111827',
  textSecondary: '#4B5563',
  border: '#E5E7EB',
};

/**
 * Project status color mappings
 */
export const projectStatusColors: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  active: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
  'on-hold': { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  completed: { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
  pending: { bg: '#F3F4F6', text: '#4B5563', dot: '#6B7280' },
};

/**
 * Billing status color mappings
 */
export const billingStatusColors: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  unpaid: { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444' },
  partial: { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
  paid: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
};

/**
 * Payment status color mappings
 */
export const paymentStatusColors: Record<string, { bg: string; text: string }> =
  {
    pending: { bg: '#FEF3C7', text: '#92400E' },
    paid: { bg: '#D1FAE5', text: '#065F46' },
    failed: { bg: '#FEE2E2', text: '#991B1B' },
    cancelled: { bg: '#E5E7EB', text: '#4B5563' },
  };

/**
 * Milestone status color mappings
 */
export const milestoneStatusColors: Record<
  string,
  { bg: string; text: string; icon: string }
> = {
  completed: { bg: '#D1FAE5', text: '#065F46', icon: 'checkmark-circle' },
  'in-progress': { bg: '#DBEAFE', text: '#1E40AF', icon: 'time' },
  pending: { bg: '#F3F4F6', text: '#4B5563', icon: 'hourglass-outline' },
  'on-hold': { bg: '#FEF3C7', text: '#92400E', icon: 'pause-circle' },
};

/**
 * Issue priority color mappings
 */
export const issuePriorityColors: Record<string, { bg: string; text: string }> =
  {
    high: { bg: '#FEE2E2', text: '#DC2626' },
    medium: { bg: '#FEF3C7', text: '#D97706' },
    low: { bg: '#DBEAFE', text: '#2563EB' },
  };

/**
 * Issue status color mappings
 */
export const issueStatusColors: Record<string, { bg: string; text: string }> = {
  open: { bg: '#FEE2E2', text: '#DC2626' },
  'in-progress': { bg: '#DBEAFE', text: '#2563EB' },
  resolved: { bg: '#D1FAE5', text: '#059669' },
  closed: { bg: '#E5E7EB', text: '#6B7280' },
};

/**
 * Material status color mappings
 */
export const materialStatusColors: Record<string, { bg: string; text: string }> =
  {
    received: { bg: '#D1FAE5', text: '#059669' },
    partial: { bg: '#FEF3C7', text: '#D97706' },
    pending: { bg: '#E5E7EB', text: '#6B7280' },
  };
