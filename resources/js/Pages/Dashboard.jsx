import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import {
  FolderOpen,
  Users,
  DollarSign,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Target,
  BarChart3,
  Calendar,
  ArrowRight,
  Activity,
  PieChart
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function Dashboard({ statistics, recentProjects, recentBillings, monthlyData, alerts }) {
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

  const getBillingStatusColor = (status) => {
    const colors = {
      unpaid: 'bg-red-100 text-red-700',
      partial: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-green-100 text-green-700',
    };
    return colors[status] || colors.unpaid;
  };

  // Prepare chart data
  const revenueExpenseData = monthlyData.map(month => ({
    month: month.month,
    revenue: month.revenue,
    expenses: month.labor_cost + month.material_cost,
    labor: month.labor_cost,
    materials: month.material_cost,
    net: month.revenue - (month.labor_cost + month.material_cost)
  }));

  // Project status pie chart data
  const projectStatusData = Object.entries(statistics.projects.by_status || {}).map(([name, value]) => ({
    name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: value,
    color: name === 'active' ? '#10b981' : 
           name === 'completed' ? '#3b82f6' : 
           name === 'on_hold' ? '#f59e0b' : 
           name === 'cancelled' ? '#ef4444' : '#6b7280'
  }));

  // Billing status pie chart data
  const billingStatusData = Object.entries(statistics.billing.by_status || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: value,
    color: name === 'paid' ? '#10b981' : 
           name === 'partial' ? '#f59e0b' : '#ef4444'
  }));

  // Project type distribution
  const projectTypeData = Object.entries(statistics.projects.by_type || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: value
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    const breadcrumbs = [
    { title: "Home", href: route("dashboard") },
    { title: "Dashboard" },
  ];

    return (
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />

      <div className="w-full sm:px-6 lg:px-8 space-y-6">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Projects */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Projects</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.projects.total}</p>
                <p className="text-xs text-gray-500 mt-1">{statistics.projects.active} active</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FolderOpen className="text-blue-600" size={28} />
              </div>
            </div>
          </div>

          {/* Total Clients */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.clients.total}</p>
                <p className="text-xs text-gray-500 mt-1">{statistics.clients.active} active</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="text-purple-600" size={28} />
              </div>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(statistics.billing.total_paid)}</p>
                <p className="text-xs text-gray-500 mt-1">{formatCurrency(statistics.billing.total_remaining)} remaining</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="text-green-600" size={28} />
              </div>
            </div>
          </div>

          {/* Total Budget Used */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Budget Used</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(statistics.budget.total_budget_used)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Labor: {formatCurrency(statistics.budget.total_labor_cost)} | 
                  Materials: {formatCurrency(statistics.budget.total_material_cost)}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <TrendingUp className="text-orange-600" size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {(alerts.overdue_projects.length > 0 || alerts.overdue_billings.length > 0 || alerts.upcoming_due_dates.length > 0) && (
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              Alerts & Notifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Overdue Projects */}
              {alerts.overdue_projects.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-red-700">Overdue Projects</span>
                    <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded-full">
                      {alerts.overdue_projects.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {alerts.overdue_projects.slice(0, 3).map((project) => (
                      <div key={project.id} className="text-xs">
                        <p className="font-medium text-gray-900">{project.project_code}</p>
                        <p className="text-gray-600">{project.project_name}</p>
                        <p className="text-red-600">Due: {formatDate(project.planned_end_date)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Due Dates */}
              {alerts.upcoming_due_dates.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-yellow-700">Upcoming Deadlines</span>
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full">
                      {alerts.upcoming_due_dates.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {alerts.upcoming_due_dates.slice(0, 3).map((project) => (
                      <div key={project.id} className="text-xs">
                        <p className="font-medium text-gray-900">{project.project_code}</p>
                        <p className="text-gray-600">{project.project_name}</p>
                        <p className="text-yellow-600">Due: {formatDate(project.planned_end_date)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overdue Billings */}
              {alerts.overdue_billings.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-orange-700">Overdue Billings</span>
                    <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                      {alerts.overdue_billings.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {alerts.overdue_billings.slice(0, 3).map((billing) => (
                      <div key={billing.id} className="text-xs">
                        <p className="font-medium text-gray-900">{billing.billing_code}</p>
                        <p className="text-gray-600">{billing.project?.project_name}</p>
                        <p className="text-orange-600">Due: {formatDate(billing.due_date)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Charts Row 1: Revenue & Expenses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue & Expenses Line Chart */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="text-gray-600" size={20} />
              Revenue vs Expenses (Last 6 Months)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueExpenseData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorRevenue)"
                  name="Revenue"
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  fillOpacity={1} 
                  fill="url(#colorExpenses)"
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Net Profit Chart */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="text-gray-600" size={20} />
              Net Profit (Last 6 Months)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueExpenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Bar 
                  dataKey="net" 
                  fill="#3b82f6"
                  radius={[8, 8, 0, 0]}
                  name="Net Profit"
                >
                  {revenueExpenseData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 2: Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Status Pie Chart */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PieChart className="text-gray-600" size={20} />
              Project Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={projectStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>

          {/* Billing Status Pie Chart */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="text-gray-600" size={20} />
              Billing Status Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={billingStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {billingStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Charts Row 3: Expense Breakdown & Project Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Breakdown */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BarChart3 className="text-gray-600" size={20} />
              Expense Breakdown (Last 6 Months)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueExpenseData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar dataKey="labor" stackId="a" fill="#3b82f6" name="Labor Cost" radius={[0, 0, 0, 0]} />
                <Bar dataKey="materials" stackId="a" fill="#f59e0b" name="Material Cost" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Project Type Distribution */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="text-gray-600" size={20} />
              Project Type Distribution
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectTypeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" style={{ fontSize: '12px' }} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  width={100}
                />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Projects and Billings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FolderOpen className="text-gray-600" size={20} />
                Recent Projects
              </h3>
              <button
                onClick={() => router.get(route('project-management.index'))}
                className="text-sm text-zinc-700 hover:text-zinc-900 flex items-center gap-1 transition"
              >
                View All
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {recentProjects && recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <div
                    key={project.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => router.get(route('project-management.view', project.id))}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{project.project_name}</p>
                        <p className="text-xs text-gray-500 mt-1">{project.project_code}</p>
                        <p className="text-xs text-gray-500">{project.client?.client_name}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${getStatusColor(project.status)}`}>
                          {project.status?.replace('_', ' ')}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{formatPercentage(project.completion_percentage)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent projects</p>
              )}
            </div>
          </div>

          {/* Recent Billings */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <DollarSign className="text-gray-600" size={20} />
                Recent Billings
              </h3>
              <button
                onClick={() => router.get(route('billing-management.index'))}
                className="text-sm text-zinc-700 hover:text-zinc-900 flex items-center gap-1 transition"
              >
                View All
                <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-3">
              {recentBillings && recentBillings.length > 0 ? (
                recentBillings.map((billing) => (
                  <div
                    key={billing.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{billing.billing_code}</p>
                        <p className="text-xs text-gray-500 mt-1">{billing.project?.project_name}</p>
                        {billing.milestone && (
                          <p className="text-xs text-gray-400">Milestone: {billing.milestone.name}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(billing.billing_amount)}</p>
                        <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-semibold ${getBillingStatusColor(billing.status)}`}>
                          {billing.status}
                        </span>
                        </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No recent billings</p>
              )}
            </div>
          </div>
        </div>

        {/* Additional Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Milestones */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Milestones</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.milestones.total}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {statistics.milestones.completed} completed, {statistics.milestones.in_progress} in progress
                </p>
              </div>
              <div className="p-3 bg-indigo-100 rounded-full">
                <Target className="text-indigo-600" size={24} />
              </div>
            </div>
          </div>

          {/* Tasks */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.tasks.total}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {statistics.tasks.completed} completed, {statistics.tasks.in_progress} in progress
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <CheckCircle2 className="text-blue-600" size={24} />
              </div>
            </div>
          </div>

          {/* Team Members */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Team</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.team.total_members}</p>
                <p className="text-xs text-gray-500 mt-1">members across projects</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="text-purple-600" size={24} />
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Inventory Items</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.inventory.active_items}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {statistics.inventory.low_stock_items} low stock
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <Package className="text-orange-600" size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Billing Summary */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <DollarSign className="text-gray-600" size={20} />
            Billing Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Billed</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.billing.total_billed)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Paid</p>
              <p className="text-2xl font-bold text-green-700">{formatCurrency(statistics.billing.total_paid)}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Remaining</p>
              <p className="text-2xl font-bold text-orange-700">{formatCurrency(statistics.billing.total_remaining)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex gap-4">
              {Object.entries(statistics.billing.by_status || {}).map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getBillingStatusColor(status)}`}>
                    {status}
                  </span>
                  <span className="text-sm text-gray-600">{count}</span>
                </div>
              ))}
            </div>
          </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
