import {
  DollarSign, Users, Calendar, TrendingUp, Package, Clock,
  CheckCircle2, AlertCircle, FileText, BarChart3, Target, Wallet,
  Receipt, Building2, MapPin, Tag, Activity, Sparkles, Download, ExternalLink,
  TrendingDown, AlertTriangle, ShieldCheck, Zap
} from 'lucide-react';
import { usePermission } from '@/utils/permissions';

const DOCUMENT_FIELDS = [
  { key: 'building_permit',          label: 'Building Permit'          },
  { key: 'business_permit',          label: 'Business Permit'          },
  { key: 'environmental_compliance', label: 'Environmental Compliance' },
  { key: 'contractor_license',       label: 'Contractor License'       },
  { key: 'surety_bond',              label: 'Surety Bond'              },
  { key: 'signed_contract',          label: 'Signed Contract'          },
  { key: 'notice_to_proceed',        label: 'Notice to Proceed'        },
];

export default function OverviewTab({ project, overviewData, boqData }) {
  const { has } = usePermission();

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
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return '---';
    return new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
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

  const { budget, billing, team, milestones, tasks, timeline } = overviewData;
  const boqPlannedTotal = boqData?.grand_total ?? 0;
  const boqActualTotal = boqData?.actual_total ?? 0;
  const boqContractVariance = boqData?.contract_variance ?? 0;
  const boqIsOverContract = boqData?.is_over_contract ?? false;

  const uploadedDocCount = DOCUMENT_FIELDS.filter(({ key }) => project[key]).length;

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
          <div className="flex gap-2 flex-wrap justify-end">
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
              <p className="text-sm font-bold text-gray-900">{project.project_type?.name || '---'}</p>
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
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="text-blue-600" size={16} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Documents</p>
              <p className="text-sm font-bold text-gray-900">{uploadedDocCount} / {DOCUMENT_FIELDS.length} uploaded</p>
            </div>
          </div>
        </div>

        {project.description && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 font-semibold mb-1">Description</p>
            <p className="text-sm text-gray-700 leading-relaxed">{project.description}</p>
          </div>
        )}
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Overall Progress</span>
            <span className={`text-sm font-bold ${
              overviewData.overall_progress === 100 ? 'text-green-700' :
              overviewData.overall_progress >= 50   ? 'text-blue-700'  :
              overviewData.overall_progress > 0     ? 'text-yellow-700': 'text-gray-400'
            }`}>
              {overviewData.overall_progress ?? 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner border border-gray-300 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${
                overviewData.overall_progress === 100 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                overviewData.overall_progress >= 50   ? 'bg-gradient-to-r from-blue-500 to-blue-600'  :
                overviewData.overall_progress > 0     ? 'bg-gradient-to-r from-yellow-500 to-yellow-600':
                                                        'bg-gray-300'
              }`}
              style={{ width: `${Math.min(overviewData.overall_progress ?? 0, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 font-medium">Based on milestone task completion</p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-4 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform">
              <DollarSign className="text-white" size={18} />
            </div>
            <span className="text-xs font-semibold text-blue-700 bg-blue-200 px-2 py-0.5 rounded">Contract Amount</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(budget.contract_amount)}</p>
        </div>

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

      {/* BOQ System Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl border border-cyan-200 p-4 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-cyan-500 rounded-lg group-hover:scale-110 transition-transform">
              <Target className="text-white" size={18} />
            </div>
            <span className="text-xs font-semibold text-cyan-700 bg-cyan-200 px-2 py-0.5 rounded">BOQ Planned</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(boqPlannedTotal)}</p>
          <p className="text-xs text-gray-600 mt-1 font-medium">Total scoped cost</p>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl border border-indigo-200 p-4 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-indigo-500 rounded-lg group-hover:scale-110 transition-transform">
              <Activity className="text-white" size={18} />
            </div>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-200 px-2 py-0.5 rounded">BOQ Actual</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(boqActualTotal)}</p>
          <p className="text-xs text-gray-600 mt-1 font-medium">Linked material + labor actuals</p>
        </div>

        <div className={`rounded-xl border p-4 shadow-sm hover:shadow-md transition-all group ${boqIsOverContract ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-200' : 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${boqIsOverContract ? 'bg-red-500' : 'bg-emerald-500'}`}>
              {boqIsOverContract ? <TrendingUp className="text-white" size={18} /> : <TrendingDown className="text-white" size={18} />}
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${boqIsOverContract ? 'text-red-700 bg-red-200' : 'text-emerald-700 bg-emerald-200'}`}>
              {boqIsOverContract ? 'Over Contract' : 'Within Contract'}
            </span>
          </div>
          <p className={`text-xl font-bold ${boqIsOverContract ? 'text-red-700' : 'text-emerald-700'}`}>
            {formatCurrency(Math.abs(boqContractVariance))}
          </p>
          <p className="text-xs text-gray-600 mt-1 font-medium">
            {boqIsOverContract ? 'Amount over contract' : 'Remaining contract room'}
          </p>
        </div>
      </div>

      {/* Budget & Billing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Budget Analysis */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg"><BarChart3 className="text-blue-600" size={18} /></div>
              Budget Breakdown
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-600 font-semibold">Budget Utilization</span>
                <span className="font-bold text-gray-900">{formatPercentage(budget.budget_utilization_percentage)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${Math.min(budget.budget_utilization_percentage, 100)}%` }} />
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2"><Clock className="text-blue-600" size={16} /><span className="text-sm font-bold text-gray-800">Labor Cost</span></div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(budget.total_labor_cost)}</span>
              </div>
              <p className="text-xs text-gray-600 mb-1.5 font-medium">{budget.total_labor_hours} hours worked</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full"
                  style={{ width: budget.contract_amount > 0 ? `${Math.min((budget.total_labor_cost / budget.contract_amount) * 100, 100)}%` : '0%' }} />
              </div>
            </div>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-lg p-3 border border-orange-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2"><Package className="text-orange-600" size={16} /><span className="text-sm font-bold text-gray-800">Material Cost</span></div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(budget.total_material_cost)}</span>
              </div>
              <p className="text-xs text-gray-600 mb-1.5 font-medium">{budget.total_material_quantity} units received</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-1.5 rounded-full"
                  style={{ width: budget.contract_amount > 0 ? `${Math.min((budget.total_material_cost / budget.contract_amount) * 100, 100)}%` : '0%' }} />
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-lg p-3 border border-purple-200">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2"><Receipt className="text-purple-600" size={16} /><span className="text-sm font-bold text-gray-800">Miscellaneous</span></div>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(budget.total_miscellaneous_expenses || 0)}</span>
              </div>
              <p className="text-xs text-gray-600 mb-1.5 font-medium">Project expenses</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-1.5 rounded-full"
                  style={{ width: budget.contract_amount > 0 ? `${Math.min(((budget.total_miscellaneous_expenses||0)/budget.contract_amount)*100,100)}%` : '0%' }} />
              </div>
            </div>
            <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-lg p-3 border-2 border-green-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><DollarSign className="text-green-700" size={16} /><span className="text-sm font-bold text-gray-800">Budget Remaining</span></div>
                <span className="text-base font-bold text-green-700">{formatCurrency(budget.budget_remaining)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-green-100 rounded-lg"><Receipt className="text-green-600" size={18} /></div>
              Financial Summary
            </h3>
            {/* Financial health badge */}
            {(() => {
              const contract = billing.contract_amount || 0;
              const billed   = billing.total_billed || 0;
              const variance = billing.variance || 0;
              if (contract <= 0) return null;
              const pct = (billed / contract) * 100;
              if (variance > 0) return (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                  <TrendingUp size={12} /> Over Contract
                </span>
              );
              if (pct >= 90) return (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                  <AlertTriangle size={12} /> Near Limit
                </span>
              );
              if (billed === 0) return (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200">
                  <Zap size={12} /> Not Yet Billed
                </span>
              );
              return (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                  <ShieldCheck size={12} /> Within Contract
                </span>
              );
            })()}
          </div>

          {/* Billing progress bar vs contract */}
          {(billing.contract_amount || 0) > 0 && (() => {
            const contract  = billing.contract_amount;
            const billed    = billing.total_billed || 0;
            const paid      = billing.total_paid || 0;
            const billedPct = Math.min((billed / contract) * 100, 100);
            const paidPct   = Math.min((paid / contract) * 100, 100);
            const isOver    = billed > contract;
            return (
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-600 font-semibold">Billed vs Contract</span>
                  <span className={`font-bold ${isOver ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatPercentage((billed / contract) * 100)}
                  </span>
                </div>
                <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-visible">
                  {/* Paid portion */}
                  <div
                    className="absolute top-0 left-0 h-3 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
                    style={{ width: `${paidPct}%` }}
                  />
                  {/* Billed-but-unpaid portion */}
                  {billedPct > paidPct && (
                    <div
                      className="absolute top-0 h-3 bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                      style={{ left: `${paidPct}%`, width: `${billedPct - paidPct}%` }}
                    />
                  )}
                  {/* Over-contract marker */}
                  {isOver && (
                    <div className="absolute top-0 right-0 h-3 w-1.5 rounded-r-full bg-red-500" />
                  )}
                </div>
                <div className="flex gap-3 mt-1.5 text-xs text-gray-500 font-medium">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" />Paid</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-400" />Billed (unpaid)</span>
                  {isOver && <span className="flex items-center gap-1 text-red-600 font-semibold"><div className="w-2 h-2 rounded-full bg-red-500" />Over contract</span>}
                </div>
              </div>
            );
          })()}

          {/* Key figures grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2.5 border border-gray-200">
              <p className="text-xs text-gray-500 font-semibold mb-0.5">Contract Amount</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(billing.contract_amount || 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2.5 border border-blue-200">
              <p className="text-xs text-gray-500 font-semibold mb-0.5">Total Billed</p>
              <p className="text-sm font-bold text-blue-800">{formatCurrency(billing.total_billed || 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2.5 border border-green-200">
              <p className="text-xs text-gray-500 font-semibold mb-0.5">Total Paid</p>
              <p className="text-sm font-bold text-green-700">{formatCurrency(billing.total_paid || 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-2.5 border border-orange-200">
              <p className="text-xs text-gray-500 font-semibold mb-0.5">Remaining Balance</p>
              <p className="text-sm font-bold text-orange-700">{formatCurrency(billing.total_remaining || 0)}</p>
            </div>
          </div>

          {/* Variance row */}
          {(billing.contract_amount || 0) > 0 && (() => {
            const variance = billing.variance || 0;
            const isOver   = variance > 0;
            const isUnder  = variance < 0;
            return (
              <div className={`flex items-center justify-between rounded-lg p-3 border ${
                isOver  ? 'bg-red-50 border-red-200' :
                isUnder ? 'bg-green-50 border-green-200' :
                          'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center gap-2">
                  {isOver  ? <TrendingUp  className="text-red-600"   size={16} /> :
                   isUnder ? <TrendingDown className="text-green-600" size={16} /> :
                             <ShieldCheck  className="text-gray-500"  size={16} />}
                  <span className={`text-sm font-bold ${
                    isOver ? 'text-red-700' : isUnder ? 'text-green-700' : 'text-gray-600'
                  }`}>
                    {isOver  ? 'Over-billed by' :
                     isUnder ? 'Under-billed by' :
                               'Exactly on contract'}
                  </span>
                </div>
                {variance !== 0 && (
                  <span className={`text-sm font-bold ${
                    isOver ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {formatCurrency(Math.abs(variance))}
                  </span>
                )}
              </div>
            );
          })()}

          {/* Payment progress + status counts */}
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
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
            <div className="flex gap-2">
              <span className={`flex-1 text-center px-2 py-1.5 rounded-lg text-xs font-bold ${getBillingStatusColor('paid')}`}>{billing.status_counts.paid} Paid</span>
              <span className={`flex-1 text-center px-2 py-1.5 rounded-lg text-xs font-bold ${getBillingStatusColor('partial')}`}>{billing.status_counts.partial} Partial</span>
              <span className={`flex-1 text-center px-2 py-1.5 rounded-lg text-xs font-bold ${getBillingStatusColor('unpaid')}`}>{billing.status_counts.unpaid} Unpaid</span>
            </div>
          </div>

          {/* Recent billings */}
          {billing.recent_billings?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-bold text-gray-700 mb-2">Recent Billings</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {billing.recent_billings.map((b) => (
                  <div key={b.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg p-2 border border-gray-200">
                    <div>
                      <p className="font-bold text-gray-900">{b.billing_code}</p>
                      <p className="text-gray-500">{formatDate(b.billing_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(b.billing_amount)}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getBillingStatusColor(b.status)}`}>{b.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded-lg"><Target className="text-indigo-600" size={18} /></div>
              Progress Overview
            </h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-bold text-gray-800">Milestones</span>
                <span className="text-xs text-gray-600 font-semibold">{milestones.completed} / {milestones.total} completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(milestones.completion_percentage, 100)}%` }} />
              </div>
              <div className="flex gap-3 mt-1.5 text-xs text-gray-600 font-medium">
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div>Completed: {milestones.completed}</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div>In Progress: {milestones.in_progress}</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-400 rounded-full"></div>Pending: {milestones.pending}</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-bold text-gray-800">Tasks</span>
                <span className="text-xs text-gray-600 font-semibold">{tasks.completed} / {tasks.total} completed</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(tasks.completion_percentage, 100)}%` }} />
              </div>
              <div className="flex gap-3 mt-1.5 text-xs text-gray-600 font-medium">
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full"></div>Completed: {tasks.completed}</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full"></div>In Progress: {tasks.in_progress}</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-400 rounded-full"></div>Pending: {tasks.pending}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <div className="p-1.5 bg-amber-100 rounded-lg"><Calendar className="text-amber-600" size={18} /></div>
              Timeline
            </h3>
            {timeline.is_overdue && (
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-red-200">
                <AlertCircle size={12} /> Overdue
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5 border border-gray-200">
              <div className="flex items-center gap-2"><Calendar className="text-blue-600" size={14} /><span className="text-xs font-semibold text-gray-700">Start Date</span></div>
              <span className="text-xs font-bold text-gray-900">{formatDate(timeline.start_date)}</span>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2.5 border border-gray-200">
              <div className="flex items-center gap-2"><Target className="text-indigo-600" size={14} /><span className="text-xs font-semibold text-gray-700">Planned End</span></div>
              <span className="text-xs font-bold text-gray-900">{formatDate(timeline.planned_end_date)}</span>
            </div>
            {timeline.actual_end_date && (
              <div className="flex items-center justify-between bg-green-50 rounded-lg p-2.5 border border-green-200">
                <div className="flex items-center gap-2"><CheckCircle2 className="text-green-600" size={14} /><span className="text-xs font-semibold text-gray-700">Actual End</span></div>
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
                    <p className={`text-base font-bold ${timeline.is_overdue ? 'text-red-700' : 'text-green-700'}`}>{timeline.days_remaining}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Budget Breakdown */}
      {budget.monthly_breakdown?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded-lg"><BarChart3 className="text-purple-600" size={18} /></div>
            Monthly Budget Breakdown (Last 6 Months)
          </h3>
          <div className="space-y-3">
            {budget.monthly_breakdown.map((month, index) => {
              const maxCost = Math.max(...budget.monthly_breakdown.map(m => m.labor_cost + m.material_cost + (m.miscellaneous_expenses || 0)));
              const totalCost = month.labor_cost + month.material_cost + (month.miscellaneous_expenses || 0);
              return (
                <div key={index} className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-800">{month.month}</span>
                    <span className="text-sm font-bold text-gray-900">{formatCurrency(totalCost)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 relative overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-l-full"
                      style={{ width: `${maxCost > 0 ? (month.labor_cost / maxCost) * 100 : 0}%` }} />
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 absolute top-0"
                      style={{ left: `${maxCost > 0 ? (month.labor_cost / maxCost) * 100 : 0}%`, width: `${maxCost > 0 ? (month.material_cost / maxCost) * 100 : 0}%` }} />
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 absolute top-0 rounded-r-full"
                      style={{ left: `${maxCost > 0 ? ((month.labor_cost + month.material_cost) / maxCost) * 100 : 0}%`, width: `${maxCost > 0 ? ((month.miscellaneous_expenses||0)/maxCost)*100 : 0}%` }} />
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
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded"></div><span className="text-xs text-gray-700 font-semibold">Labor</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded"></div><span className="text-xs text-gray-700 font-semibold">Materials</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded"></div><span className="text-xs text-gray-700 font-semibold">Miscellaneous</span></div>
          </div>
        </div>
      )}

      {/* Team Members Quick View */}
      {team.members?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <div className="p-1.5 bg-purple-100 rounded-lg"><Users className="text-purple-600" size={18} /></div>
            Team Members ({team.total_members})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {team.members.slice(0, 8).map((member) => (
              <div key={member.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2.5 border border-gray-200 hover:shadow-md transition-all">
                <p className="text-sm font-bold text-gray-900">
                  {member.assignable_name || member.user?.name ||
                    (member.employee?.first_name && member.employee?.last_name
                      ? `${member.employee.first_name} ${member.employee.last_name}`
                      : 'Unknown')}
                </p>
                <p className="text-xs text-gray-600 mt-0.5 font-medium">{member.role || '---'}</p>
                <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-xs font-bold capitalize ${
                  member.status === 'active' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}>{member.status}</span>
              </div>
            ))}
          </div>
          {team.members.length > 8 && (
            <p className="text-xs text-gray-600 mt-2.5 text-center font-semibold">+ {team.members.length - 8} more team members</p>
          )}
        </div>
      )}

      {/* Project Documents */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <FileText className="text-blue-600" size={18} />
          </div>
          Project Documents
          <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full border ${
            uploadedDocCount === DOCUMENT_FIELDS.length
              ? 'bg-green-100 text-green-700 border-green-200'
              : uploadedDocCount > 0
              ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
              : 'bg-gray-100 text-gray-500 border-gray-200'
          }`}>
            {uploadedDocCount}/{DOCUMENT_FIELDS.length} uploaded
          </span>
        </h3>

        {uploadedDocCount === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No documents uploaded yet.</p>
            <p className="text-xs mt-1">Edit the project to upload required documents.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {DOCUMENT_FIELDS.map(({ key, label }) => {
              const filename = project[key];
              if (!filename) return null;

              const fileUrl = route('project-management.document', { project: project.id, field: key });
              const ext = filename.split('.').pop()?.toLowerCase();
              const isImage = ['jpg','jpeg','png','webp'].includes(ext);
              const isPdf   = ext === 'pdf';
              const isDocx  = ['doc','docx'].includes(ext);

              return (
                <div
                  key={key}
                  className="group relative rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex-none"
                  style={{ width: '140px', height: '186px' }} /* portrait 3:4 */
                >
                  {/* ── Content area ── */}
                  {isImage ? (
                    <img
                      src={fileUrl}
                      alt={label}
                      className="w-full h-full object-cover"
                    />
                  ) : isPdf ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-red-50 px-3">
                      <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center shadow-sm">
                        <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-500" fill="currentColor">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v5h5v11H6z"/>
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-red-600 uppercase tracking-widest">PDF</p>
                        <p className="text-xs text-red-400 mt-0.5 leading-tight line-clamp-2">{label}</p>
                      </div>
                    </div>
                  ) : isDocx ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-blue-50 px-3">
                      <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
                        {/* Word-like W icon */}
                        <svg viewBox="0 0 24 24" className="w-8 h-8 text-blue-600" fill="currentColor">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v5h5v11H6z"/>
                          <text x="7" y="18" fontSize="6" fontWeight="bold" fill="white" fontFamily="Arial">W</text>
                        </svg>
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">DOCX</p>
                        <p className="text-xs text-blue-400 mt-0.5 leading-tight line-clamp-2">{label}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-50 px-3">
                      <FileText className="w-10 h-10 text-gray-400" />
                      <p className="text-xs text-gray-500 text-center line-clamp-2">{label}</p>
                    </div>
                  )}

                  {/* ── Hover overlay ── */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all duration-200 flex flex-col justify-end p-2 pointer-events-none group-hover:pointer-events-auto">
                    <p className="text-white text-xs font-semibold leading-tight opacity-0 group-hover:opacity-100 transition-opacity mb-2 drop-shadow">
                      {label}
                    </p>
                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/90 hover:bg-white rounded-lg text-xs font-semibold text-gray-700 hover:text-blue-600 transition-colors shadow"
                        title="View"
                      >
                        <ExternalLink size={11} /> View
                      </a>
                      <a
                        href={fileUrl}
                        download
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-white/90 hover:bg-white rounded-lg text-xs font-semibold text-gray-700 hover:text-green-600 transition-colors shadow"
                        title="Download"
                      >
                        <Download size={11} /> Save
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Ghost slots for missing docs */}
            {DOCUMENT_FIELDS.filter(({ key }) => !project[key]).map(({ key, label }) => (
              <div
                key={key}
                className="flex-none rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center gap-2 px-3 opacity-40"
                style={{ width: '140px', height: '186px' }}
              >
                <FileText className="h-7 w-7 text-gray-300" />
                <span className="text-xs text-gray-400 font-medium text-center leading-tight">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}