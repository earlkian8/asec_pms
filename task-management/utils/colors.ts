export const AppColors = {
  primary: '#3B82F6', // blue-500
  primaryDark: '#2563EB', // blue-600
  primaryLight: '#60A5FA', // blue-400
  secondary: '#8B5CF6', // purple-500
  success: '#10B981', // green-500
  warning: '#F59E0B', // amber-500
  error: '#EF4444', // red-500
  info: '#3B82F6',
  
  // Status colors
  pending: '#6B7280', // gray-500
  inProgress: '#3B82F6', // blue-500
  completed: '#10B981', // green-500
  
  // Priority colors
  low: '#6B7280', // gray-500
  medium: '#F59E0B', // amber-500
  high: '#EF4444', // red-500
  critical: '#DC2626', // red-600
  
  // Issue status colors
  open: '#EF4444',
  resolved: '#10B981',
  closed: '#6B7280',
  
  // Backgrounds
  background: '#F3F4F6', // gray-100
  backgroundDark: '#0f172a',
  card: '#FFFFFF', // white
  cardDark: '#1e293b',
  
  // Text
  text: '#111827', // gray-900
  textDark: '#f1f5f9',
  textSecondary: '#4B5563', // gray-600
  textSecondaryDark: '#94a3b8',
  
  // Borders
  border: '#E5E7EB', // gray-200
  borderDark: '#334155',
  
  // Shadows
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.3)',
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return AppColors.pending;
    case 'in_progress':
    case 'in-progress':
      return AppColors.inProgress;
    case 'completed':
      return AppColors.completed;
    case 'active':
      return AppColors.completed;
    case 'on-hold':
      return AppColors.warning;
    default:
      return AppColors.textSecondary;
  }
};

export const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'low':
      return AppColors.low;
    case 'medium':
      return AppColors.medium;
    case 'high':
      return AppColors.high;
    case 'critical':
      return AppColors.critical;
    default:
      return AppColors.textSecondary;
  }
};

export const getIssueStatusColor = (status: string) => {
  switch (status) {
    case 'open':
      return AppColors.open;
    case 'in_progress':
      return AppColors.inProgress;
    case 'resolved':
      return AppColors.resolved;
    case 'closed':
      return AppColors.closed;
    default:
      return AppColors.textSecondary;
  }
};
