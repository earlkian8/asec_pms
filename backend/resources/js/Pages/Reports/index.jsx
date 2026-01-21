import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
  DollarSign,
  Users,
  Package,
  FileText,
  Download,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';

export default function Reports({ 
  projectPerformance, 
  financialReport, 
  clientReport, 
  inventoryReport, 
  teamProductivity, 
  budgetReport, 
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

  const [exporting, setExporting] = useState({});

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

  const buildExportUrl = (routeName, format = 'xlsx') => {
    const params = new URLSearchParams({
      date_range: data.date_range,
      format: format,
    });
    
    if (data.start_date) params.append('start_date', data.start_date);
    if (data.end_date) params.append('end_date', data.end_date);
    if (data.project_id) params.append('project_id', data.project_id);
    if (data.client_id) params.append('client_id', data.client_id);
    
    return route(routeName) + '?' + params.toString();
  };

  const handleExport = (routeName, format, exportKey) => {
    setExporting({ ...exporting, [exportKey]: true });
    const url = buildExportUrl(routeName, format);
    window.open(url, '_blank');
    setTimeout(() => {
      setExporting({ ...exporting, [exportKey]: false });
    }, 1000);
  };

  const handleExportAll = () => {
    setExporting({ ...exporting, all: true });
    const url = buildExportUrl('reports.export.all', 'xlsx');
    window.open(url, '_blank');
    setTimeout(() => {
      setExporting({ ...exporting, all: false });
    }, 1000);
  };

  const breadcrumbs = [
    { title: "Home", href: route("dashboard") },
    { title: "Reports & Analytics" },
  ];

  return (
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
      <Head title="Reports & Analytics" />

      <div className="w-full sm:px-3 lg:px-4 space-y-3">
        {/* Export All Button */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Reports & Analytics</h2>
              <p className="text-sm text-gray-500 mt-1">Export comprehensive reports in CSV or Excel format</p>
            </div>
            <Button 
              onClick={handleExportAll}
              disabled={exporting.all}
              className="flex items-center gap-2"
            >
              <Download size={16} />
              {exporting.all ? 'Exporting...' : 'Export All Reports'}
            </Button>
          </div>
        </div>

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={exporting.projectPerformance}>
                  <Download size={14} />
                  {exporting.projectPerformance ? 'Exporting...' : 'Export'}
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('reports.export.project-performance', 'csv', 'projectPerformance')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('reports.export.project-performance', 'xlsx', 'projectPerformance')}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

          {/* Projects by Status Table */}
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Projects by Status</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-2 py-2.5 text-xs font-semibold text-gray-700">Status</th>
                    <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(projectPerformance?.by_status || {}).map(([status, count]) => (
                    <tr key={status} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-2 py-2.5 text-sm text-gray-900 capitalize">{status.replace('_', ' ')}</td>
                      <td className="text-right p-2 py-2.5 text-sm text-gray-900">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Projects by Type Table */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Projects by Type</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-2 py-2.5 text-xs font-semibold text-gray-700">Type</th>
                    <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(projectPerformance?.by_type || {}).map(([type, count]) => (
                    <tr key={type} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-2 py-2.5 text-sm text-gray-900">{type}</td>
                      <td className="text-right p-2 py-2.5 text-sm text-gray-900">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={exporting.financial}>
                  <Download size={14} />
                  {exporting.financial ? 'Exporting...' : 'Export'}
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('reports.export.financial', 'csv', 'financial')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('reports.export.financial', 'xlsx', 'financial')}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

          {/* Billing Status Table */}
          <div>
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Billing Status Breakdown</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left p-2 py-2.5 text-xs font-semibold text-gray-700">Status</th>
                    <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Count</th>
                    <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Total Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(financialReport?.billing_status || {}).map(([status, data]) => (
                    <tr key={status} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-2 py-2.5 text-sm text-gray-900 capitalize">{status}</td>
                      <td className="text-right p-2 py-2.5 text-sm text-gray-900">{data.count || 0}</td>
                      <td className="text-right p-2 py-2.5 text-sm text-gray-900">{formatCurrency(data.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Budget Report */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="text-gray-600" size={18} />
              Budget vs Actual
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={exporting.budget}>
                  <Download size={14} />
                  {exporting.budget ? 'Exporting...' : 'Export'}
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('reports.export.budget', 'csv', 'budget')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('reports.export.budget', 'xlsx', 'budget')}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                {budgetReport?.projects?.map((project) => (
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
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Users className="text-gray-600" size={18} />
                Team Productivity
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={exporting.teamProductivity}>
                    <Download size={14} />
                    {exporting.teamProductivity ? 'Exporting...' : 'Export'}
                    <ChevronDown size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('reports.export.team-productivity', 'csv', 'teamProductivity')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('reports.export.team-productivity', 'xlsx', 'teamProductivity')}>
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-2 py-2.5 text-xs font-semibold text-gray-700">User</th>
                      <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Hours</th>
                      <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamProductivity?.by_user?.slice(0, 10).map((user) => (
                      <tr key={user.user_id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-2 py-2.5 text-sm text-gray-900">{user.user_name}</td>
                        <td className="text-right p-2 py-2.5 text-sm text-gray-900">{user.total_hours}</td>
                        <td className="text-right p-2 py-2.5 text-sm text-gray-900">{formatCurrency(user.total_cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Inventory Report */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Package className="text-gray-600" size={18} />
                Inventory Summary
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={exporting.inventory}>
                    <Download size={14} />
                    {exporting.inventory ? 'Exporting...' : 'Export'}
                    <ChevronDown size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('reports.export.inventory', 'csv', 'inventory')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('reports.export.inventory', 'xlsx', 'inventory')}>
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
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
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left p-2 py-2.5 text-xs font-semibold text-gray-700">Item</th>
                      <th className="text-right p-2 py-2.5 text-xs font-semibold text-gray-700">Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryReport?.low_stock_items?.length > 0 ? (
                      inventoryReport.low_stock_items.map((item) => (
                        <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="p-2 py-2.5">
                            <div>
                              <p className="text-xs font-medium text-gray-900">{item.item_name}</p>
                              <p className="text-xs text-gray-500">{item.item_code}</p>
                            </div>
                          </td>
                          <td className="text-right p-2 py-2.5 text-sm text-red-700 font-semibold">
                            {item.current_stock} {item.unit_of_measure}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="2" className="p-2 py-2.5 text-xs text-gray-500 text-center">No low stock items</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Client Report */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Users className="text-gray-600" size={18} />
              Top Clients
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2" disabled={exporting.client}>
                  <Download size={14} />
                  {exporting.client ? 'Exporting...' : 'Export'}
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('reports.export.client', 'csv', 'client')}>
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('reports.export.client', 'xlsx', 'client')}>
                  Export as Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
