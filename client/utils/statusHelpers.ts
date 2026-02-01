import {
  projectStatusColors,
  billingStatusColors,
  paymentStatusColors,
  milestoneStatusColors,
  issuePriorityColors,
  issueStatusColors,
  materialStatusColors,
} from '@/constants/colors';

/**
 * Get project status colors
 */
export function getProjectStatusColors(
  status: string
): { bg: string; text: string; dot: string } {
  return projectStatusColors[status] || projectStatusColors.pending;
}

/**
 * Get billing status colors
 */
export function getBillingStatusColors(
  status: string
): { bg: string; text: string; dot: string } {
  return billingStatusColors[status] || billingStatusColors.unpaid;
}

/**
 * Get payment status colors
 */
export function getPaymentStatusColors(status: string): {
  bg: string;
  text: string;
} {
  return paymentStatusColors[status] || paymentStatusColors.pending;
}

/**
 * Get milestone status colors
 */
export function getMilestoneStatusColors(status: string): {
  bg: string;
  text: string;
  icon: string;
} {
  return milestoneStatusColors[status] || milestoneStatusColors.pending;
}

/**
 * Get issue priority colors
 */
export function getIssuePriorityColors(status: string): {
  bg: string;
  text: string;
} {
  return issuePriorityColors[status] || issuePriorityColors.medium;
}

/**
 * Get issue status colors
 */
export function getIssueStatusColors(status: string): {
  bg: string;
  text: string;
} {
  return issueStatusColors[status] || issueStatusColors.open;
}

/**
 * Get material status colors
 */
export function getMaterialStatusColors(status: string): {
  bg: string;
  text: string;
} {
  return materialStatusColors[status] || materialStatusColors.pending;
}

/**
 * Get role icon configuration
 */
export function getRoleIcon(role: string): {
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
} {
  const roleLower = role.toLowerCase();
  if (
    roleLower.includes('manager') ||
    roleLower.includes('lead') ||
    roleLower.includes('supervisor')
  ) {
    return {
      icon: 'briefcase-outline',
      color: '#3B82F6',
      borderColor: '#3B82F650',
      bgColor: '#3B82F615',
    };
  } else if (
    roleLower.includes('engineer') ||
    roleLower.includes('architect') ||
    roleLower.includes('designer')
  ) {
    return {
      icon: 'hammer-outline',
      color: '#8B5CF6',
      borderColor: '#8B5CF650',
      bgColor: '#8B5CF615',
    };
  } else if (
    roleLower.includes('worker') ||
    roleLower.includes('labor') ||
    roleLower.includes('technician')
  ) {
    return {
      icon: 'construct-outline',
      color: '#F59E0B',
      borderColor: '#F59E0B50',
      bgColor: '#F59E0B15',
    };
  } else if (
    roleLower.includes('admin') ||
    roleLower.includes('coordinator')
  ) {
    return {
      icon: 'document-text-outline',
      color: '#10B981',
      borderColor: '#10B98150',
      bgColor: '#10B98115',
    };
  } else {
    return {
      icon: 'person-outline',
      color: '#6B7280',
      borderColor: '#6B728050',
      bgColor: '#6B728015',
    };
  }
}
