/**
 * Shared API response and request types for the client app.
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface DashboardStatistics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalBudget: number;
  totalSpent: number;
  onTimeProjects: number;
  overdueProjects: number;
}

export interface DashboardProject {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'completed' | 'pending';
  progress: number;
  startDate: string;
  expectedCompletion: string;
  budget: number;
  spent: number;
  location: string;
  projectManager: string;
}

export interface BillingProject {
  id: number;
  project_code: string;
  project_name: string;
}

export interface BillingMilestone {
  id: number;
  name: string;
}

export interface BillingPayment {
  id: number;
  payment_code: string;
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'cancelled';
  reference_number: string | null;
  notes: string | null;
  paid_by_client: boolean;
  paymongo_payment_intent_id: string | null;
  paymongo_source_id: string | null;
  created_at: string;
}

export interface Billing {
  id: number;
  billing_code: string;
  billing_type: 'fixed_price' | 'milestone';
  billing_amount: number;
  billing_date: string;
  due_date: string | null;
  status: 'unpaid' | 'partial' | 'paid';
  description: string | null;
  project: BillingProject;
  milestone: BillingMilestone | null;
  total_paid: number;
  remaining_amount: number;
  payment_percentage: number;
  payments: BillingPayment[];
}
