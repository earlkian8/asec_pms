import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Users,
  Package,
  FileText,
  Calendar,
  Filter,
  Download,
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
import { Button } from '@/Components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';

export default function Reports({ 
  projectPerformance, 
  financialReport, 
  clientReport, 
  inventoryReport, 
  teamProductivity, 
  budgetReport, 
  trends,
  filters,
  options 
}) {
  const { data, setData, get } = useForm({
    date_range: filters.date_range || 'last_6_months',
    start_date: filters.start_date || '',
    end_date: filters.end_date || '',
    project_id: filters.project_id || '',
    client_id: filters.client_id || '',
  });

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₱0.00';
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value) => {
    if (!value && value !== 0) return '0%';
    return `${parseFloat(value).toFixed(1)}%`;
  };

  const handleFilter = () => {
    get(route('reports.index'), {
      preserveState: true,
      preserveScroll: true,
    });
  };

  const handleReset = () => {
    setData({
      date_range: 'last_6_months',
      start_date: '',
      end_date: '',
      project_id: '',
      client_id: '',
    });
    router.get(route('reports.index'));
  };

  // Chart colors
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Prepare chart data
  const trendsData = trends || [];
  const projectStatusData = Object.entries(projectPerformance?.by_status || {}).map(([name, value]) => ({
    name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: value,
    color: name === 'active' ? '#10b981' : 
           name === 'completed' ? '#3b82f6' : 
           name === 'on_hold' ? '#f59e0b' : 
           name === 'cancelled' ? '#ef4444' : '#6b7280'
  }));

  const projectTypeData = Object.entries(projectPerformance?.by_type || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: value
  }));

  const billingStatusData = Object.entries(financialReport?.billing_status || {}).map(([status, data]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1),
    value: parseFloat(data.total || 0),
    count: data.count || 0
  }));

  const breadcrumbs = [
    { title: "Home", href: route("dashboard") },
    { title: "Reports & Analytics" },
  ];

  return (
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
      <Head title="Reports & Analytics" />

      <div className="w-full sm:px-3 lg:px-4 space-y-3">

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <Label htmlFor="date_range" className="text-xs font-medium text-gray-700 mb-1.5 block">Date Range</Label>
              <Select value={data.date_range} onValueChange={(value) => setData('date_range', value)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="this_quarter">This Quarter</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="last_year">Last Year</SelectItem>
                  <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {data.date_range === 'custom' && (
              <>
                <div className="flex-1 min-w-[150px]">
                  <Label htmlFor="start_date" className="text-xs font-medium text-gray-700 mb-1.5 block">Start Date</Label>
                  <Input
                    type="date"
                    value={data.start_date}
                    onChange={(e) => setData('start_date', e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="flex-1 min-w-[150px]">
                  <Label htmlFor="end_date" className="text-xs font-medium text-gray-700 mb-1.5 block">End Date</Label>
                  <Input
                    type="date"
                    value={data.end_date}
                    onChange={(e) => setData('end_date', e.target.value)}
                    className="h-9"
                  />
                </div>
              </>
            )}
            <div className="flex-1 min-w-[180px]">
              <Label htmlFor="project" className="text-xs font-medium text-gray-700 mb-1.5 block">Project</Label>
              <Select value={data.project_id || 'all'} onValueChange={(value) => setData('project_id', value === 'all' ? '' : value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {options.projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.project_code} - {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <Label htmlFor="client" className="text-xs font-medium text-gray-700 mb-1.5 block">Client</Label>
              <Select value={data.client_id || 'all'} onValueChange={(value) => setData('client_id', value === 'all' ? '' : value)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All Clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {options.clients.map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.client_code} - {client.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleFilter} className="h-9 px-4 text-sm font-medium">
                Apply Filters
              </Button>
              <Button onClick={handleReset} variant="outline" className="h-9 px-4 text-sm font-medium">
                Reset
              </Button>
            </div>
          </div>
        </div>

        {/* Project Performance Report */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="text-gray-600" size={18} />
              Project Performance
            </h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded p-2.5 border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Total Projects</p>
              <p className="text-xl font-bold text-gray-900">{projectPerformance?.summary?.total || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded p-2.5 border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Completed</p>
              <p className="text-xl font-bold text-green-700">{projectPerformance?.summary?.completed || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-2.5 border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Active</p>
              <p className="text-xl font-bold text-blue-700">{projectPerformance?.summary?.active || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded p-2.5 border border-orange-200">
              <p className="text-xs text-gray-600 mb-1">Avg Completion</p>
              <p className="text-xl font-bold text-orange-700">{formatPercentage(projectPerformance?.summary?.avg_completion || 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Projects by Status</h4>
              <ResponsiveContainer width="100%" height={220}>
                <RechartsPieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {projectStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Projects by Type</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={projectTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '13px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '13px' }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Financial Report */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="text-gray-600" size={18} />
              Financial Report
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded p-2.5 border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Total Revenue</p>
              <p className="text-xl font-bold text-blue-700">{formatCurrency(financialReport?.revenue?.total_received || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Billed: {formatCurrency(financialReport?.revenue?.total_billed || 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded p-2.5 border border-red-200">
              <p className="text-xs text-gray-600 mb-1">Total Expenses</p>
              <p className="text-xl font-bold text-red-700">{formatCurrency(financialReport?.expenses?.total || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">
                Labor: {formatCurrency(financialReport?.expenses?.labor || 0)} | 
                Materials: {formatCurrency(financialReport?.expenses?.materials || 0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded p-2.5 border border-green-200">
              <p className="text-xs text-gray-600 mb-1">Net Profit</p>
              <p className="text-xl font-bold text-green-700">{formatCurrency(financialReport?.profit?.net || 0)}</p>
              <p className="text-xs text-gray-500 mt-1">Margin: {formatPercentage(financialReport?.profit?.margin || 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Revenue vs Expenses Trend</h4>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendsData}>
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
                  <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '13px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '13px' }} tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRevenue)" name="Revenue" />
                  <Area type="monotone" dataKey="total_expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpenses)" name="Expenses" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Billing Status</h4>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={billingStatusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" style={{ fontSize: '13px' }} />
                  <YAxis stroke="#6b7280" style={{ fontSize: '13px' }} tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Amount" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Budget Report */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="text-gray-600" size={18} />
              Budget vs Actual
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded p-2.5 border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Total Budget</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(budgetReport?.summary?.total_budget || 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded p-2.5 border border-orange-200">
              <p className="text-xs text-gray-600 mb-1">Total Spent</p>
              <p className="text-xl font-bold text-orange-700">{formatCurrency(budgetReport?.summary?.total_spent || 0)}</p>
            </div>
            <div className={`rounded p-2.5 border ${(budgetReport?.summary?.total_variance || 0) >= 0 ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'}`}>
              <p className="text-xs text-gray-600 mb-1">Variance</p>
              <p className={`text-xl font-bold ${(budgetReport?.summary?.total_variance || 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(budgetReport?.summary?.total_variance || 0)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatPercentage(budgetReport?.summary?.variance_percentage || 0)}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-2 py-2.5 text-xs font-semibold text-gray-700">Project</th>
                  <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Budget</th>
                  <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Spent</th>
                  <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Variance</th>
                  <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Variance %</th>
                </tr>
              </thead>
              <tbody>
                {budgetReport?.projects?.slice(0, 10).map((project) => (
                  <tr key={project.project_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-2 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.project_name}</p>
                        <p className="text-xs text-gray-500">{project.project_code}</p>
                      </div>
                    </td>
                    <td className="text-right p-2 py-2.5 text-sm text-gray-900">{formatCurrency(project.budget)}</td>
                    <td className="text-right p-2 py-2.5 text-sm text-gray-900">{formatCurrency(project.total_spent)}</td>
                    <td className={`text-right p-2 py-2.5 text-sm font-semibold ${project.variance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(project.variance)}
                    </td>
                    <td className={`text-right p-2 py-2.5 text-sm ${project.variance_percentage >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatPercentage(project.variance_percentage)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Team Productivity & Inventory Reports */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Team Productivity */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Users className="text-gray-600" size={18} />
              Team Productivity
            </h3>
            <div className="space-y-2 mb-2">
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-xs text-gray-600">Total Hours</span>
                <span className="text-base font-bold text-gray-900">{teamProductivity?.summary?.total_hours || 0}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-xs text-gray-600">Total Cost</span>
                <span className="text-base font-bold text-gray-900">{formatCurrency(teamProductivity?.summary?.total_cost || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-xs text-gray-600">Avg Hourly Rate</span>
                <span className="text-base font-bold text-gray-900">{formatCurrency(teamProductivity?.summary?.avg_hourly_rate || 0)}</span>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Top Performers</h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {teamProductivity?.by_user?.slice(0, 5).map((user, index) => (
                  <div key={user.user_id} className="flex justify-between items-center p-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded border border-gray-200">
                    <div>
                      <p className="text-xs font-medium text-gray-900">{user.user_name}</p>
                      <p className="text-xs text-gray-500">{user.total_hours} hours</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-700">{formatCurrency(user.total_cost)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Inventory Report */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <Package className="text-gray-600" size={18} />
              Inventory Summary
            </h3>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded p-2.5 border border-gray-200">
                <p className="text-xs text-gray-600 mb-1">Total Items</p>
                <p className="text-lg font-bold text-gray-900">{inventoryReport?.summary?.total_items || 0}</p>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-red-100 rounded p-2.5 border border-red-200">
                <p className="text-xs text-gray-600 mb-1">Low Stock</p>
                <p className="text-lg font-bold text-red-700">{inventoryReport?.summary?.low_stock_count || 0}</p>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Low Stock Items</h4>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {inventoryReport?.low_stock_items?.length > 0 ? (
                  inventoryReport.low_stock_items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-gradient-to-r from-red-50 to-red-100 rounded border border-red-200">
                      <div>
                        <p className="text-xs font-medium text-gray-900">{item.item_name}</p>
                        <p className="text-xs text-gray-500">{item.item_code}</p>
                      </div>
                      <span className="text-xs font-semibold text-red-700">
                        {item.current_stock} {item.unit_of_measure}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-2">No low stock items</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Client Report */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <Users className="text-gray-600" size={18} />
            Top Clients
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-2 py-2.5 text-xs font-semibold text-gray-700">Client</th>
                  <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Total Projects</th>
                  <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Active</th>
                  <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Completed</th>
                  <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Contract Value</th>
                </tr>
              </thead>
              <tbody>
                {clientReport?.top_clients?.map((client) => (
                  <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-2 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{client.client_name}</p>
                        <p className="text-xs text-gray-500">{client.client_code} • {client.client_type}</p>
                      </div>
                    </td>
                    <td className="text-right p-2 py-2.5 text-sm text-gray-900">{client.total_projects}</td>
                    <td className="text-right p-2 py-2.5 text-sm text-blue-700">{client.active_projects}</td>
                    <td className="text-right p-2 py-2.5 text-sm text-green-700">{client.completed_projects}</td>
                    <td className="text-right p-2 py-2.5 text-sm font-semibold text-gray-900">{formatCurrency(client.total_contract_value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

