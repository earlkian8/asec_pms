import {
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  BarChart3,
  Target,
  Wallet,
  Receipt,
  Building2,
  MapPin,
  Tag,
  Percent,
  Activity,
  Sparkles
} from 'lucide-react';
import { usePermission } from '@/utils/permissions';

export default function OverviewTab({ project, overviewData }) {
  const { has } = usePermission();
  
  // If user doesn't have permission to view projects, show message
  if (!has('projects.view')) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">You don't have permission to view this project.</p>
        </div>
      </div>
    );
  }
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₱0.00';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return '---';
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatPercentage = (value) => {
    if (!value && value !== 0) return '0%';
    return `${parseFloat(value).toFixed(1)}%`;
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md',
      on_hold: 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-md',
      completed: 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-md',
      cancelled: 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md',
    };
    return colors[status] || colors.active;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md',
      medium: 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md',
      high: 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-md',
    };
    return colors[priority] || colors.medium;
  };

  const capitalizeFirst = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getBillingStatusColor = (status) => {
    const colors = {
      unpaid: 'bg-red-100 text-red-700 border border-red-200',
      partial: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
      paid: 'bg-green-100 text-green-700 border border-green-200',
    };
    return colors[status] || colors.unpaid;
  };

  if (!overviewData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Loading overview data...</p>
        </div>
      </div>
    );
  }

  const {
    budget,
    billing,
    team,
    milestones,
    tasks,
    timeline
  } = overviewData;

  return (
    <div className="w-full space-y-3">
      {/* Project Information Card */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{project.project_name}</h2>
              <Sparkles className="text-yellow-500" size={18} />
            </div>
            <p className="text-xs text-gray-500 font-medium">Code: {project.project_code}</p>
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${getStatusColor(project.status)}`}>
              {project.status?.replace('_', ' ')}
            </span>
            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${getPriorityColor(project.priority)}`}>
              {capitalizeFirst(project.priority)} Priority
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="text-blue-600" size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Client</p>
              <p className="text-sm font-bold text-gray-900">{project.client?.client_name || '---'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Tag className="text-purple-600" size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Type</p>
              <p className="text-sm font-bold text-gray-900 capitalize">{project.project_type || '---'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <MapPin className="text-green-600" size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Location</p>
              <p className="text-sm font-bold text-gray-900">{project.location || '---'}</p>
            </div>
          </div>
        </div>

        {project.description && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 font-semibold mb-1">Description</p>
            <p className="text-sm text-gray-700 leading-relaxed">{project.description}</p>
          </div>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Contract Amount */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
              <DollarSign className="text-white" size={18} />
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-2 py-0.5 rounded">Contract</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(budget.contract_amount)}</p>
        </div>

        {/* Budget Used */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-4 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-500 rounded-lg group-hover:scale-110 transition-transform">
              <TrendingUp className="text-white" size={18} />
            </div>
            <span className="text-xs font-semibold text-orange-700 bg-orange-200 px-2 py-0.5 rounded">{formatPercentage(budget.budget_utilization_percentage)}</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(budget.total_budget_used)}</p>
          <p className="text-xs text-gray-600 mt-1 font-medium">Budget Used</p>
        </div>

        {/* Total Paid */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-4 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500 rounded-lg group-hover:scale-110 transition-transform">
              <Wallet className="text-white" size={18} />
            </div>
            <span className="text-xs font-semibold text-green-700 bg-green-200 px-2 py-0.5 rounded">{formatPercentage(billing.payment_percentage)}</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(billing.total_paid)}</p>
          <p className="text-xs text-gray-600 mt-1 font-medium">Total Paid</p>
        </div>

        {/* Team Members */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-4 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform">
              <Users className="text-white" size={18} />
            </div>
            <span className="text-xs font-semibold text-purple-700 bg-purple-200 px-2 py-0.5 rounded">{team.active_members} Active</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{team.total_members}</p>
          <p className="text-xs text-gray-600 mt-1 font-medium">Team Members</p>
        </div>
      </div>

      {/* Budget Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Budget Analysis */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg">
                <BarChart3 className="text-blue-600" size={18} />
              </div>
              Budget Breakdown
            </h3>
          </div>

          <div className="space-y-3">
            {/* Budget Utilization Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-600 font-semibold">Budget Utilization</span>
                <span className="font-bold text-gray-900">{formatPercentage(budget.budget_utilization_percentage)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.min(budget.budget_utilization_percentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Labor Cost */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Clock className="text-blue-600" size={16} />
                  <span className="text-sm font-bold text-gray-800">Labor Cost</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(budget.total_labor_cost)}</span>
              </div>
              <p className="text-xs text-gray-600 mb-1.5 font-medium">{budget.total_labor_hours} hours worked</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full"
                  style={{
                    width: budget.contract_amount > 0
                      ? `${Math.min((budget.total_labor_cost / budget.contract_amount) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>

            {/* Material Cost */}
            <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-lg p-3 border border-orange-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Package className="text-orange-600" size={16} />
                  <span className="text-sm font-bold text-gray-800">Material Cost</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(budget.total_material_cost)}</span>
              </div>
              <p className="text-xs text-gray-600 mb-1.5 font-medium">{budget.total_material_quantity} units received</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-orange-600 h-1.5 rounded-full"
                  style={{
                    width: budget.contract_amount > 0
                      ? `${Math.min((budget.total_material_cost / budget.contract_amount) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>

            {/* Miscellaneous Expenses */}
            <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Receipt className="text-purple-600" size={16} />
                  <span className="text-sm font-bold text-gray-800">Miscellaneous</span>
                </div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(budget.total_miscellaneous_expenses || 0)}</span>
              </div>
              <p className="text-xs text-gray-600 mb-1.5 font-medium">Project expenses</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-purple-600 h-1.5 rounded-full"
                  style={{
                    width: budget.contract_amount > 0
                      ? `${Math.min(((budget.total_miscellaneous_expenses || 0) / budget.contract_amount) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>

            {/* Budget Remaining */}
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-3 border-2 border-green-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="text-green-700" size={16} />
                  <span className="text-sm font-bold text-gray-800">Budget Remaining</span>
                </div>
                <span className="text-base font-bold text-green-700">{formatCurrency(budget.budget_remaining)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-green-100 rounded-lg">
                <Receipt className="text-green-600" size={18} />
              </div>
              Billing Summary
            </h3>
          </div>

          <div className="space-y-3">
            {/* Payment Progress */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-600 font-semibold">Payment Progress</span>
                <span className="font-bold text-gray-900">{formatPercentage(billing.payment_percentage)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.min(billing.payment_percentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Billing Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2.5 border border-gray-200">
                <p className="text-xs text-gray-600 mb-0.5 font-semibold">Total Billed</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(billing.total_billed)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2.5 border border-green-200">
                <p className="text-xs text-gray-600 mb-0.5 font-semibold">Total Paid</p>
                <p className="text-base font-bold text-green-700">{formatCurrency(billing.total_paid)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-2.5 border border-orange-200">
                <p className="text-xs text-gray-600 mb-0.5 font-semibold">Remaining</p>
                <p className="text-base font-bold text-orange-700">{formatCurrency(billing.total_remaining)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2.5 border border-blue-200">
                <p className="text-xs text-gray-600 mb-0.5 font-semibold">Status</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getBillingStatusColor('paid')}`}>
                    {billing.status_counts.paid} Paid
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getBillingStatusColor('partial')}`}>
                    {billing.status_counts.partial} Partial
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getBillingStatusColor('unpaid')}`}>
                    {billing.status_counts.unpaid} Unpaid
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Billings */}
            {billing.recent_billings && billing.recent_billings.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs font-bold text-gray-700 mb-2">Recent Billings</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {billing.recent_billings.map((billingItem) => (
                    <div key={billingItem.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2 border border-gray-200">
                      <div>
                        <p className="font-bold text-gray-900">{billingItem.billing_code}</p>
                        <p className="text-gray-600">{formatDate(billingItem.billing_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(billingItem.billing_amount)}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getBillingStatusColor(billingItem.status)}`}>
                          {billingItem.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Milestones & Tasks Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg">
                <Target className="text-indigo-600" size={18} />
              </div>
              Progress Overview
            </h3>
          </div>

          <div className="space-y-4">
            {/* Milestones */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-bold text-gray-800">Milestones</span>
                <span className="text-xs text-gray-600 font-semibold">
                  {milestones.completed} / {milestones.total} completed
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.min(milestones.completion_percentage, 100)}%` }}
                />
              </div>
              <div className="flex gap-3 mt-1.5 text-xs text-gray-600 font-medium">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Completed: {milestones.completed}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  In Progress: {milestones.in_progress}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  Pending: {milestones.pending}
                </span>
              </div>
            </div>

            {/* Tasks */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-bold text-gray-800">Tasks</span>
                <span className="text-xs text-gray-600 font-semibold">
                  {tasks.completed} / {tasks.total} completed
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-600 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.min(tasks.completion_percentage, 100)}%` }}
                />
              </div>
              <div className="flex gap-3 mt-1.5 text-xs text-gray-600 font-medium">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Completed: {tasks.completed}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  In Progress: {tasks.in_progress}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  Pending: {tasks.pending}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 rounded-lg">
                <Calendar className="text-amber-600" size={18} />
              </div>
              Timeline
            </h3>
            {timeline.is_overdue && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-red-200">
                <AlertCircle size={12} />
                Overdue
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5 border border-gray-200">
              <div className="flex items-center gap-2">
                <Calendar className="text-blue-600" size={14} />
                <span className="text-xs font-semibold text-gray-700">Start Date</span>
              </div>
              <span className="text-xs font-bold text-gray-900">{formatDate(timeline.start_date)}</span>
            </div>

            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5 border border-gray-200">
              <div className="flex items-center gap-2">
                <Target className="text-indigo-600" size={14} />
                <span className="text-xs font-semibold text-gray-700">Planned End</span>
              </div>
              <span className="text-xs font-bold text-gray-900">{formatDate(timeline.planned_end_date)}</span>
            </div>

            {timeline.actual_end_date && (
              <div className="flex items-center justify-between bg-green-50 rounded-lg p-2.5 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-green-600" size={14} />
                  <span className="text-xs font-semibold text-gray-700">Actual End</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{formatDate(timeline.actual_end_date)}</span>
              </div>
            )}

            <div className="pt-2.5 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2.5 border border-blue-200">
                  <p className="text-xs text-gray-600 mb-0.5 font-semibold">Days Elapsed</p>
                  <p className="text-base font-bold text-gray-900">{timeline.days_elapsed}</p>
                </div>
                {timeline.days_remaining !== null && (
                  <div className={`rounded-lg p-2.5 border ${timeline.is_overdue ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' : 'bg-gradient-to-br from-green-50 to-green-100 border-green-200'}`}>
                    <p className="text-xs text-gray-600 mb-0.5 font-semibold">Days Remaining</p>
                    <p className={`text-base font-bold ${timeline.is_overdue ? 'text-red-700' : 'text-green-700'}`}>
                      {timeline.days_remaining}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Budget Breakdown Chart */}
      {budget.monthly_breakdown && budget.monthly_breakdown.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <BarChart3 className="text-purple-600" size={18} />
            </div>
            Monthly Budget Breakdown (Last 6 Months)
          </h3>
          <div className="space-y-3">
            {budget.monthly_breakdown.map((month, index) => {
              const maxCost = Math.max(
                ...budget.monthly_breakdown.map(m => m.labor_cost + m.material_cost + (m.miscellaneous_expenses || 0))
              );
              const totalCost = month.labor_cost + month.material_cost + (month.miscellaneous_expenses || 0);
              const percentage = maxCost > 0 ? (totalCost / maxCost) * 100 : 0;

              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-800">{month.month}</span>
                    <span className="text-sm font-bold text-gray-900">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-l-full"
                      style={{
                        width: `${maxCost > 0 ? (month.labor_cost / maxCost) * 100 : 0}%`
                      }}
                    />
                    <div
                      className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 absolute top-0"
                      style={{
                        left: `${maxCost > 0 ? (month.labor_cost / maxCost) * 100 : 0}%`,
                        width: `${maxCost > 0 ? (month.material_cost / maxCost) * 100 : 0}%`
                      }}
                    />
                    <div
                      className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 absolute top-0 rounded-r-full"
                      style={{
                        left: `${maxCost > 0 ? ((month.labor_cost + month.material_cost) / maxCost) * 100 : 0}%`,
                        width: `${maxCost > 0 ? ((month.miscellaneous_expenses || 0) / maxCost) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <div className="flex gap-3 text-xs text-gray-600 font-medium">
                    <span>Labor: {formatCurrency(month.labor_cost)}</span>
                    <span>Materials: {formatCurrency(month.material_cost)}</span>
                    <span>Misc: {formatCurrency(month.miscellaneous_expenses || 0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div>
              <span className="text-xs text-gray-700 font-semibold">Labor</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded"></div>
              <span className="text-xs text-gray-700 font-semibold">Materials</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded"></div>
              <span className="text-xs text-gray-700 font-semibold">Miscellaneous</span>
            </div>
          </div>
        </div>
      )}

      {/* Team Members Quick View */}
      {team.members && team.members.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <Users className="text-purple-600" size={18} />
            </div>
            Team Members ({team.total_members})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {team.members.slice(0, 8).map((member) => (
              <div key={member.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2.5 border border-gray-200 hover:shadow-md transition-all">
                <p className="text-sm font-bold text-gray-900">
                  {member.assignable_name || 
                   member.user?.name || 
                   (member.employee?.first_name && member.employee?.last_name 
                     ? `${member.employee.first_name} ${member.employee.last_name}` 
                     : 'Unknown')}
                </p>
                <p className="text-xs text-gray-600 mt-0.5 font-medium">{member.role || '---'}</p>
                <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-xs font-bold ${
                  member.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>
                  {member.status}
                </span>
              </div>
            ))}
          </div>
          {team.members.length > 8 && (
            <p className="text-xs text-gray-600 mt-2.5 text-center font-semibold">
              + {team.members.length - 8} more team members
            </p>
          )}
        </div>
      )}
    </div>
  );
}
