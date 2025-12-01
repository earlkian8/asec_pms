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
  Activity
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
      planning: 'bg-gray-100 text-gray-700',
      active: 'bg-green-100 text-green-700',
      on_hold: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-blue-100 text-blue-700',
      cancelled: 'bg-red-100 text-red-700',
    };
    return colors[status] || colors.planning;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
    };
    return colors[priority] || colors.medium;
  };

  const getBillingStatusColor = (status) => {
    const colors = {
      unpaid: 'bg-red-100 text-red-700',
      partial: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-green-100 text-green-700',
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
    <div className="w-full space-y-6">
      {/* Project Information Card */}
      <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{project.project_name}</h2>
            <p className="text-sm text-gray-500">Project Code: {project.project_code}</p>
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(project.status)}`}>
              {project.status?.replace('_', ' ')}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${getPriorityColor(project.priority)}`}>
              {project.priority}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="flex items-center gap-3">
            <Building2 className="text-gray-400" size={20} />
            <div>
              <p className="text-xs text-gray-500">Client</p>
              <p className="text-sm font-semibold text-gray-900">{project.client?.client_name || '---'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Tag className="text-gray-400" size={20} />
            <div>
              <p className="text-xs text-gray-500">Type</p>
              <p className="text-sm font-semibold text-gray-900 capitalize">{project.project_type || '---'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="text-gray-400" size={20} />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <p className="text-sm font-semibold text-gray-900">{project.location || '---'}</p>
            </div>
          </div>
        </div>

        {project.description && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Description</p>
            <p className="text-sm text-gray-700">{project.description}</p>
          </div>
        )}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Contract Amount */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Contract Amount</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(budget.contract_amount)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        {/* Budget Used */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Budget Used</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(budget.total_budget_used)}</p>
              <p className="text-xs text-gray-500 mt-1">{formatPercentage(budget.budget_utilization_percentage)} utilized</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingUp className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(billing.total_paid)}</p>
              <p className="text-xs text-gray-500 mt-1">{formatPercentage(billing.payment_percentage)} of billed</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Wallet className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Team Members</p>
              <p className="text-2xl font-bold text-gray-900">{team.total_members}</p>
              <p className="text-xs text-gray-500 mt-1">{team.active_members} active</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Budget Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Analysis */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="text-gray-600" size={20} />
              Budget Breakdown
            </h3>
          </div>

          <div className="space-y-4">
            {/* Budget Utilization Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Budget Utilization</span>
                <span className="font-semibold text-gray-900">{formatPercentage(budget.budget_utilization_percentage)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(budget.budget_utilization_percentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Labor Cost */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="text-blue-600" size={18} />
                  <span className="text-sm font-medium text-gray-700">Labor Cost</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(budget.total_labor_cost)}</span>
              </div>
              <p className="text-xs text-gray-500">{budget.total_labor_hours} hours worked</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: budget.contract_amount > 0
                      ? `${Math.min((budget.total_labor_cost / budget.contract_amount) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>

            {/* Material Cost */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="text-orange-600" size={18} />
                  <span className="text-sm font-medium text-gray-700">Material Cost</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(budget.total_material_cost)}</span>
              </div>
              <p className="text-xs text-gray-500">{budget.total_material_quantity} units received</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{
                    width: budget.contract_amount > 0
                      ? `${Math.min((budget.total_material_cost / budget.contract_amount) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>

            {/* Miscellaneous Expenses */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Receipt className="text-purple-600" size={18} />
                  <span className="text-sm font-medium text-gray-700">Miscellaneous Expenses</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatCurrency(budget.total_miscellaneous_expenses || 0)}</span>
              </div>
              <p className="text-xs text-gray-500">Project expenses</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{
                    width: budget.contract_amount > 0
                      ? `${Math.min(((budget.total_miscellaneous_expenses || 0) / budget.contract_amount) * 100, 100)}%`
                      : '0%'
                  }}
                />
              </div>
            </div>

            {/* Budget Remaining */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="text-green-600" size={18} />
                  <span className="text-sm font-medium text-gray-700">Budget Remaining</span>
                </div>
                <span className="text-sm font-semibold text-green-700">{formatCurrency(budget.budget_remaining)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Billing Summary */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Receipt className="text-gray-600" size={20} />
              Billing Summary
            </h3>
          </div>

          <div className="space-y-4">
            {/* Payment Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Payment Progress</span>
                <span className="font-semibold text-gray-900">{formatPercentage(billing.payment_percentage)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(billing.payment_percentage, 100)}%` }}
                />
              </div>
            </div>

            {/* Billing Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Total Billed</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(billing.total_billed)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Total Paid</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(billing.total_paid)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Remaining</p>
                <p className="text-lg font-semibold text-orange-600">{formatCurrency(billing.total_remaining)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <div className="flex gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getBillingStatusColor('paid')}`}>
                    {billing.status_counts.paid} Paid
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getBillingStatusColor('partial')}`}>
                    {billing.status_counts.partial} Partial
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getBillingStatusColor('unpaid')}`}>
                    {billing.status_counts.unpaid} Unpaid
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Billings */}
            {billing.recent_billings && billing.recent_billings.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">Recent Billings</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {billing.recent_billings.map((billingItem) => (
                    <div key={billingItem.id} className="flex items-center justify-between text-xs bg-gray-50 rounded p-2">
                      <div>
                        <p className="font-medium text-gray-900">{billingItem.billing_code}</p>
                        <p className="text-gray-500">{formatDate(billingItem.billing_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(billingItem.billing_amount)}</p>
                        <span className={`px-2 py-0.5 rounded text-xs ${getBillingStatusColor(billingItem.status)}`}>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Milestones & Tasks Progress */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Target className="text-gray-600" size={20} />
              Progress Overview
            </h3>
          </div>

          <div className="space-y-6">
            {/* Milestones */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Milestones</span>
                <span className="text-sm text-gray-500">
                  {milestones.completed} / {milestones.total} completed
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(milestones.completion_percentage, 100)}%` }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-600">
                <span>Completed: {milestones.completed}</span>
                <span>In Progress: {milestones.in_progress}</span>
                <span>Pending: {milestones.pending}</span>
              </div>
            </div>

            {/* Tasks */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Tasks</span>
                <span className="text-sm text-gray-500">
                  {tasks.completed} / {tasks.total} completed
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(tasks.completion_percentage, 100)}%` }}
                />
              </div>
              <div className="flex gap-4 mt-2 text-xs text-gray-600">
                <span>Completed: {tasks.completed}</span>
                <span>In Progress: {tasks.in_progress}</span>
                <span>Pending: {tasks.pending}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Information */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="text-gray-600" size={20} />
              Timeline
            </h3>
            {timeline.is_overdue && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold flex items-center gap-1">
                <AlertCircle size={14} />
                Overdue
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="text-gray-400" size={16} />
                <span className="text-sm text-gray-600">Start Date</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatDate(timeline.start_date)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="text-gray-400" size={16} />
                <span className="text-sm text-gray-600">Planned End Date</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">{formatDate(timeline.planned_end_date)}</span>
            </div>

            {timeline.actual_end_date && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-gray-400" size={16} />
                  <span className="text-sm text-gray-600">Actual End Date</span>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatDate(timeline.actual_end_date)}</span>
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">Days Elapsed</p>
                  <p className="text-lg font-semibold text-gray-900">{timeline.days_elapsed}</p>
                </div>
                {timeline.days_remaining !== null && (
                  <div className={`rounded-lg p-3 ${timeline.is_overdue ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <p className="text-xs text-gray-500 mb-1">Days Remaining</p>
                    <p className={`text-lg font-semibold ${timeline.is_overdue ? 'text-red-600' : 'text-gray-900'}`}>
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
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="text-gray-600" size={20} />
            Monthly Budget Breakdown (Last 6 Months)
          </h3>
          <div className="space-y-4">
            {budget.monthly_breakdown.map((month, index) => {
              const maxCost = Math.max(
                ...budget.monthly_breakdown.map(m => m.labor_cost + m.material_cost + (m.miscellaneous_expenses || 0))
              );
              const totalCost = month.labor_cost + month.material_cost + (month.miscellaneous_expenses || 0);
              const percentage = maxCost > 0 ? (totalCost / maxCost) * 100 : 0;

              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">{month.month}</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4 relative overflow-hidden">
                    <div
                      className="bg-blue-500 h-4 rounded-l-full"
                      style={{
                        width: `${maxCost > 0 ? (month.labor_cost / maxCost) * 100 : 0}%`
                      }}
                    />
                    <div
                      className="bg-orange-500 h-4 absolute top-0"
                      style={{
                        left: `${maxCost > 0 ? (month.labor_cost / maxCost) * 100 : 0}%`,
                        width: `${maxCost > 0 ? (month.material_cost / maxCost) * 100 : 0}%`
                      }}
                    />
                    <div
                      className="bg-purple-500 h-4 absolute top-0 rounded-r-full"
                      style={{
                        left: `${maxCost > 0 ? ((month.labor_cost + month.material_cost) / maxCost) * 100 : 0}%`,
                        width: `${maxCost > 0 ? ((month.miscellaneous_expenses || 0) / maxCost) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Labor: {formatCurrency(month.labor_cost)}</span>
                    <span>Materials: {formatCurrency(month.material_cost)}</span>
                    <span>Misc: {formatCurrency(month.miscellaneous_expenses || 0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-xs text-gray-600">Labor Cost</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-xs text-gray-600">Material Cost</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-xs text-gray-600">Miscellaneous Expenses</span>
            </div>
          </div>
        </div>
      )}

      {/* Team Members Quick View */}
      {team.members && team.members.length > 0 && (
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="text-gray-600" size={20} />
            Team Members ({team.total_members})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {team.members.slice(0, 6).map((member) => (
              <div key={member.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-sm font-semibold text-gray-900">{member.user?.name || 'Unknown'}</p>
                <p className="text-xs text-gray-500 mt-1">{member.role || '---'}</p>
                <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-semibold ${
                  member.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {member.status}
                </span>
              </div>
            ))}
          </div>
          {team.members.length > 6 && (
            <p className="text-sm text-gray-500 mt-4 text-center">
              + {team.members.length - 6} more team members
            </p>
          )}
        </div>
      )}
    </div>
  );
}

