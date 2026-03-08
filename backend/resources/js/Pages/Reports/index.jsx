import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, Package, FolderKanban,
  Download, ChevronDown, AlertTriangle, CheckCircle2,
  BarChart3, Activity, Layers,
} from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart,
} from 'recharts';

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  blue:   '#3b82f6',
  green:  '#22c55e',
  red:    '#ef4444',
  orange: '#f97316',
  purple: '#a855f7',
  teal:   '#14b8a6',
  amber:  '#f59e0b',
  slate:  '#64748b',
  indigo: '#6366f1',
  rose:   '#f43f5e',
};
const PIE_PALETTE = [C.blue, C.green, C.orange, C.purple, C.teal, C.amber, C.red, C.slate, C.indigo, C.rose];

// ─── Formatters ───────────────────────────────────────────────────────────────
const php  = (v) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(v ?? 0);
const phpK = (v) => {
  const n = v ?? 0;
  return n >= 1_000_000 ? `₱${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `₱${(n / 1_000).toFixed(0)}K`
    : `₱${n}`;
};
const pct = (v) => `${parseFloat(v ?? 0).toFixed(1)}%`;
const num = (v) => new Intl.NumberFormat('en-PH').format(v ?? 0);

// ─── Shared tooltip content style ────────────────────────────────────────────
const tooltipContentStyle = {
  fontSize: 11,
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  padding: '8px 10px',
};

// ─── Custom Tooltips ──────────────────────────────────────────────────────────
const CurrencyTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-gray-900">{php(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const CountTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-2.5 text-xs">
      <p className="font-semibold text-gray-700 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-gray-900">{num(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// FIX: Pie label — only show for slices ≥5% to avoid overlap/clipping
const PieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── Reusable Donut with legend ───────────────────────────────────────────────
// FIX: Use fixed px values for innerRadius/outerRadius instead of height-derived
// fractions — avoids mismatched sizing across different height props
function DonutChart({ data, height = 200, formatValue = (v) => php(v), colors = PIE_PALETTE }) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center text-xs text-gray-400" style={{ height }}>
        No data available
      </div>
    );
  }

  // Fixed radii that look correct across all usage sites
  const innerR = 52;
  const outerR = 80;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={data}
          cx="40%"
          cy="50%"
          innerRadius={innerR}
          outerRadius={outerR}
          dataKey="value"
          labelLine={false}
          label={PieLabel}
          // FIX: ensure stroke separates adjacent slices cleanly
          stroke="#fff"
          strokeWidth={2}
        >
          {data.map((_, i) => (
            <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v, n) => [formatValue(v), n]}
          contentStyle={tooltipContentStyle}
        />
        <Legend
          layout="vertical"
          align="right"
          verticalAlign="middle"
          iconType="circle"
          iconSize={8}
          formatter={(v) => (
            <span style={{ fontSize: 11, color: '#374151' }}>{v}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 bg-gray-100 rounded-lg">
          <Icon size={16} className="text-gray-600" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, color = 'blue', icon: Icon }) {
  const map = {
    blue:   'bg-blue-50 border-blue-100 text-blue-700',
    green:  'bg-green-50 border-green-100 text-green-700',
    red:    'bg-red-50 border-red-100 text-red-700',
    orange: 'bg-orange-50 border-orange-100 text-orange-700',
    purple: 'bg-purple-50 border-purple-100 text-purple-700',
    teal:   'bg-teal-50 border-teal-100 text-teal-700',
    gray:   'bg-gray-50 border-gray-200 text-gray-800',
    amber:  'bg-amber-50 border-amber-100 text-amber-700',
  };
  return (
    <div className={`rounded-xl border p-3.5 ${map[color] ?? map.gray}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium opacity-70">{label}</span>
        {Icon && <Icon size={14} className="opacity-50" />}
      </div>
      <p className="text-xl font-bold leading-tight">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60 font-medium">{sub}</p>}
    </div>
  );
}

function ExportButton({ exportKey, exporting, onExport, routeName }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 h-8 text-xs"
          disabled={exporting[exportKey]}
        >
          <Download size={12} />
          {exporting[exportKey] ? 'Exporting…' : 'Export'}
          <ChevronDown size={11} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem className="text-xs" onClick={() => onExport(routeName, 'csv', exportKey)}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem className="text-xs" onClick={() => onExport(routeName, 'xlsx', exportKey)}>
          Export as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DataTable({ columns, rows, emptyMsg = 'No data available' }) {
  if (!rows?.length) {
    return <div className="text-center py-8 text-xs text-gray-400">{emptyMsg}</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`py-2.5 px-3 text-xs font-semibold text-gray-600 ${col.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
              {columns.map((col, ci) => (
                <td
                  key={ci}
                  className={`py-2.5 px-3 text-xs ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.render ? col.render(row, ri) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Reports({
  financialReport,
  inventoryReport,
  projectReport,
  trends,
  filters,
  options,
}) {
  const { data, setData, get } = useForm({
    date_range: filters.date_range || 'last_6_months',
    start_date: filters.start_date || '',
    end_date:   filters.end_date   || '',
    project_id: filters.project_id || '',
    client_id:  filters.client_id  || '',
  });

  const [exporting, setExporting] = useState({});
  const [activeTab, setActiveTab] = useState('financial');

  const handleFilter = () =>
    get(route('reports.index'), { preserveState: true, preserveScroll: true });

  const handleReset = () => {
    setData({ date_range: 'last_6_months', start_date: '', end_date: '', project_id: '', client_id: '' });
    router.get(route('reports.index'));
  };

  const buildExportUrl = (routeName, format = 'xlsx') => {
    const params = new URLSearchParams({ date_range: data.date_range, format });
    if (data.start_date) params.append('start_date', data.start_date);
    if (data.end_date)   params.append('end_date', data.end_date);
    if (data.project_id) params.append('project_id', data.project_id);
    if (data.client_id)  params.append('client_id', data.client_id);
    return route(routeName) + '?' + params.toString();
  };

  const handleExport = (routeName, format, key) => {
    setExporting((e) => ({ ...e, [key]: true }));
    window.open(buildExportUrl(routeName, format), '_blank');
    setTimeout(() => setExporting((e) => ({ ...e, [key]: false })), 1200);
  };

  // ── Chart data ────────────────────────────────────────────────────────────

  // FIX: Trend chart — ensure all numeric fields default to 0 (never undefined/null)
  // Backend sends: revenue, total_expenses, net_profit, labor_cost, material_cost, misc_cost
  const trendData = (trends || []).map((t) => ({
    month:        t.month,
    Revenue:      Number(t.revenue)        || 0,
    Expenses:     Number(t.total_expenses) || 0,
    'Net Profit': Number(t.net_profit)     || 0,
  }));

  // FIX: expenseStackData — keys must match backend (labor_cost, material_cost, misc_cost)
  // and dataKey names in <Bar> must match these object keys exactly
  const expenseStackData = (trends || []).map((t) => ({
    month:     t.month,
    Labor:     Number(t.labor_cost)    || 0,
    Materials: Number(t.material_cost) || 0,
    Misc:      Number(t.misc_cost)     || 0,
  }));

  // FIX: Filter out zero-value billing statuses so empty slices don't render
  const billingDonutData = Object.entries(financialReport?.billing_status || {})
    .map(([k, v]) => ({
      name:  k.charAt(0).toUpperCase() + k.slice(1),
      value: Number(v?.total) || 0,
    }))
    .filter((d) => d.value > 0);

  const expensePieData = [
    { name: 'Labor',         value: Number(financialReport?.expenses?.labor)         || 0 },
    { name: 'Materials',     value: Number(financialReport?.expenses?.materials)     || 0 },
    { name: 'Miscellaneous', value: Number(financialReport?.expenses?.miscellaneous) || 0 },
  ].filter((d) => d.value > 0);

  const projectStatusData = Object.entries(projectReport?.by_status || {})
    .map(([k, v]) => ({
      name:  k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      value: Number(v) || 0,
    }))
    .filter((d) => d.value > 0);

  const projectTypeData = Object.entries(projectReport?.by_type || {}).map(([k, v]) => ({
    type:     k,
    Projects: Number(v) || 0,
  }));

  // FIX: budgetData — clamp name at 18 chars and ensure numeric values
  const budgetData = (projectReport?.projects || []).slice(0, 8).map((p) => ({
    name:   (p.project_name?.length > 18 ? p.project_name.slice(0, 18) + '…' : p.project_name) || '—',
    Budget: Number(p.contract_amount) || 0,
    Spent:  Number(p.total_spent)     || 0,
  }));

  // FIX: categoryData — truncate at 12 chars for legibility on angled axis
  const categoryData = (inventoryReport?.by_category || []).map((c) => ({
    category: (c.category || 'Uncategorized').slice(0, 12),
    Items:    Number(c.count) || 0,
  }));

  const stockHealthData = [
    { name: 'Healthy',      value: Number(inventoryReport?.stock_health?.healthy)      || 0 },
    { name: 'Low Stock',    value: Number(inventoryReport?.stock_health?.low_stock)    || 0 },
    { name: 'Out of Stock', value: Number(inventoryReport?.stock_health?.out_of_stock) || 0 },
  ].filter((d) => d.value > 0);

  // FIX: mostUsedData — truncate name at 22 chars and use correct nested key
  const mostUsedData = (inventoryReport?.most_used || []).slice(0, 8).map((i) => ({
    name:      (i.inventoryItem?.item_name || 'Unknown').slice(0, 22),
    'Qty Used': Number(i.total_used) || 0,
  }));

  const stockHealthColors = [C.green, C.amber, C.red];

  const breadcrumbs = [
    { title: 'Home', href: route('dashboard') },
    { title: 'Reports & Analytics' },
  ];

  const tabs = [
    { key: 'financial', label: 'Financial', icon: DollarSign },
    { key: 'project',   label: 'Projects',  icon: FolderKanban },
    { key: 'inventory', label: 'Inventory', icon: Package },
  ];

  return (
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
      <Head title="Reports & Analytics" />
      <div className="w-full sm:px-3 lg:px-4 space-y-3 pb-6">

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3.5 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-900 rounded-lg">
                <BarChart3 size={16} className="text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900">Reports & Analytics</h2>
                <p className="text-xs text-gray-500">Comprehensive business intelligence for your projects</p>
              </div>
            </div>
            <Button
              onClick={() => handleExport('reports.export.all', 'xlsx', 'all')}
              disabled={exporting.all}
              size="sm"
              className="flex items-center gap-1.5 h-8 text-xs"
            >
              <Download size={13} />
              {exporting.all ? 'Exporting…' : 'Export All'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-2.5">
            <div className="min-w-[160px]">
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Date Range</Label>
              <Select value={data.date_range} onValueChange={(v) => setData('date_range', v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[
                    ['today',        'Today'],
                    ['this_week',    'This Week'],
                    ['this_month',   'This Month'],
                    ['last_month',   'Last Month'],
                    ['this_quarter', 'This Quarter'],
                    ['this_year',    'This Year'],
                    ['last_year',    'Last Year'],
                    ['last_6_months','Last 6 Months'],
                    ['custom',       'Custom Range'],
                  ].map(([v, l]) => (
                    <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {data.date_range === 'custom' && (
              <>
                <div className="min-w-[140px]">
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Start Date</Label>
                  <Input
                    type="date"
                    value={data.start_date}
                    onChange={(e) => setData('start_date', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="min-w-[140px]">
                  <Label className="text-xs font-medium text-gray-600 mb-1.5 block">End Date</Label>
                  <Input
                    type="date"
                    value={data.end_date}
                    onChange={(e) => setData('end_date', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </>
            )}

            <div className="min-w-[180px]">
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Project</Label>
              <Select
                value={data.project_id || 'all'}
                onValueChange={(v) => setData('project_id', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Projects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Projects</SelectItem>
                  {options.projects.map((p) => (
                    <SelectItem key={p.id} value={p.id.toString()} className="text-xs">
                      {p.project_code} – {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[180px]">
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Client</Label>
              <Select
                value={data.client_id || 'all'}
                onValueChange={(v) => setData('client_id', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Clients" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">All Clients</SelectItem>
                  {options.clients.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()} className="text-xs">
                      {c.client_code} – {c.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleFilter} size="sm" className="h-8 px-3 text-xs">Apply</Button>
              <Button onClick={handleReset} variant="outline" size="sm" className="h-8 px-3 text-xs">Reset</Button>
            </div>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <KpiCard
            label="Revenue Collected"
            value={php(financialReport?.revenue?.total_received)}
            sub={`Billed: ${php(financialReport?.revenue?.total_billed)}`}
            color="blue"
            icon={DollarSign}
          />
          <KpiCard
            label="Total Expenses"
            value={php(financialReport?.expenses?.total)}
            sub="Labor + Materials + Misc"
            color="red"
            icon={TrendingDown}
          />
          <KpiCard
            label="Net Profit"
            value={php(financialReport?.profit?.net)}
            sub={`Margin: ${pct(financialReport?.profit?.margin)}`}
            color={financialReport?.profit?.net >= 0 ? 'green' : 'red'}
            icon={TrendingUp}
          />
          <KpiCard
            label="Total Projects"
            value={num(projectReport?.summary?.total)}
            sub={`${projectReport?.summary?.active || 0} active`}
            color="purple"
            icon={FolderKanban}
          />
          <KpiCard
            label="Avg Completion"
            value={pct(projectReport?.summary?.avg_completion)}
            sub={`${projectReport?.summary?.overdue || 0} overdue`}
            color="amber"
            icon={Activity}
          />
          <KpiCard
            label="Inventory Items"
            value={num(inventoryReport?.summary?.active_items)}
            sub={`${inventoryReport?.summary?.low_stock_count || 0} low stock`}
            color={inventoryReport?.summary?.low_stock_count > 0 ? 'orange' : 'teal'}
            icon={Package}
          />
        </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 p-1.5 shadow-sm">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold flex-1 justify-center transition-all ${
                activeTab === key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={13} />{label}
            </button>
          ))}
        </div>
        </div>

        {/* ═══ FINANCIAL ═══ */}
        {activeTab === 'financial' && (
          <div className="space-y-3">

            {/* Revenue vs Expenses trend */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <SectionHeader
                icon={TrendingUp}
                title="Revenue vs Expenses Over Time"
                subtitle="Monthly revenue, total expenses, and net profit"
              >
                <ExportButton
                  exportKey="financial"
                  exporting={exporting}
                  onExport={handleExport}
                  routeName="reports.export.financial"
                />
              </SectionHeader>

              {/* FIX: ComposedChart — use zIndex-safe ordering: Bars first, Line on top.
                  Added barCategoryGap and barGap for visual breathing room.
                  Increased bottom margin to prevent XAxis label clipping. */}
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart
                    data={trendData}
                    margin={{ top: 8, right: 24, left: 8, bottom: 4 }}
                    barCategoryGap="20%"
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={phpK}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      width={64}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    {/* Bars render below the line */}
                    <Bar dataKey="Revenue"  fill={C.blue}  radius={[3, 3, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Expenses" fill={C.red}   radius={[3, 3, 0, 0]} maxBarSize={40} />
                    {/* Line renders on top */}
                    <Line
                      dataKey="Net Profit"
                      stroke={C.green}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: C.green, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                      type="monotone"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-xs text-gray-400">
                  No trend data for this period
                </div>
              )}
            </div>

            {/* Stacked expense breakdown + Expense composition donut */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <SectionHeader
                  icon={Layers}
                  title="Expense Breakdown by Month"
                  subtitle="Labor · Materials · Miscellaneous stacked"
                />
                {/* FIX: dataKeys MUST match the object keys in expenseStackData exactly:
                    Labor, Materials, Misc — these are correctly set above now */}
                {expenseStackData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={expenseStackData}
                      margin={{ top: 4, right: 8, left: 8, bottom: 4 }}
                      barCategoryGap="25%"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tickFormatter={phpK}
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        width={60}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CurrencyTooltip />} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      <Bar dataKey="Labor"     fill={C.blue}   stackId="a" />
                      <Bar dataKey="Materials" fill={C.orange} stackId="a" />
                      {/* FIX: only the top segment in a stack should have rounded top corners */}
                      <Bar dataKey="Misc"      fill={C.purple} stackId="a" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-xs text-gray-400">
                    No expense data for this period
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <SectionHeader icon={DollarSign} title="Expense Composition" subtitle="Total split across expense categories" />
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: 'Labor',     val: financialReport?.expenses?.labor,         cls: 'bg-blue-50 text-blue-700' },
                    { label: 'Materials', val: financialReport?.expenses?.materials,     cls: 'bg-orange-50 text-orange-700' },
                    { label: 'Misc',      val: financialReport?.expenses?.miscellaneous, cls: 'bg-purple-50 text-purple-700' },
                  ].map((e) => (
                    <div key={e.label} className={`text-center p-2 rounded-lg ${e.cls}`}>
                      <p className="text-xs text-gray-500">{e.label}</p>
                      <p className="text-sm font-bold">{phpK(e.val)}</p>
                    </div>
                  ))}
                </div>
                <DonutChart data={expensePieData} height={160} />
              </div>
            </div>

            {/* Billing status donut + Misc by type + collection health */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <SectionHeader icon={DollarSign} title="Billing Status" subtitle="Amount distribution across billing states" />
                <DonutChart data={billingDonutData} height={200} />
                <DataTable
                  columns={[
                    {
                      label: 'Status', key: 'status',
                      render: (r) => <span className="capitalize font-medium">{r.status}</span>,
                    },
                    { label: 'Count', key: 'count', align: 'right' },
                    {
                      label: 'Amount', key: 'total', align: 'right',
                      render: (r) => <span className="font-semibold">{php(r.total)}</span>,
                    },
                  ]}
                  rows={Object.entries(financialReport?.billing_status || {}).map(([s, v]) => ({
                    status: s,
                    count:  v.count,
                    total:  v.total,
                  }))}
                />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <SectionHeader icon={Layers} title="Miscellaneous Expenses" subtitle="Breakdown by expense type" />
                {Object.keys(financialReport?.expenses?.misc_by_type || {}).length > 0 ? (
                  <DataTable
                    columns={[
                      {
                        label: 'Type', key: 'type',
                        render: (r) => (
                          <span className="capitalize font-medium">{r.type?.replace(/_/g, ' ')}</span>
                        ),
                      },
                      { label: 'Count', key: 'count', align: 'right' },
                      {
                        label: 'Total', key: 'total', align: 'right',
                        render: (r) => (
                          <span className="font-semibold text-purple-700">{php(r.total)}</span>
                        ),
                      },
                    ]}
                    rows={Object.entries(financialReport?.expenses?.misc_by_type || {}).map(([t, v]) => ({
                      type:  t,
                      count: v.count,
                      total: v.total,
                    }))}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                    <CheckCircle2 size={28} className="mb-2 opacity-40" />
                    <p className="text-xs">No miscellaneous expenses in this period</p>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Collection Health</p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>Collection Rate</span>
                        <span className="font-semibold">{pct(financialReport?.revenue?.collection_rate)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(financialReport?.revenue?.collection_rate || 0, 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Outstanding</span>
                      <span className="font-semibold text-orange-600">{php(financialReport?.revenue?.outstanding)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ PROJECTS ═══ */}
        {activeTab === 'project' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <KpiCard label="Total Projects" value={num(projectReport?.summary?.total)}     color="gray"   icon={FolderKanban} />
              <KpiCard label="Active"         value={num(projectReport?.summary?.active)}    color="blue"   icon={Activity} />
              <KpiCard label="Completed"      value={num(projectReport?.summary?.completed)} color="green"  icon={CheckCircle2} />
              <KpiCard
                label="Overdue"
                value={num(projectReport?.summary?.overdue)}
                color={projectReport?.summary?.overdue > 0 ? 'red' : 'teal'}
                icon={AlertTriangle}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <SectionHeader icon={FolderKanban} title="Projects by Status">
                  <ExportButton
                    exportKey="project"
                    exporting={exporting}
                    onExport={handleExport}
                    routeName="reports.export.project-performance"
                  />
                </SectionHeader>
                {/* FIX: pass formatValue={num} so counts render correctly in tooltip */}
                <DonutChart data={projectStatusData} height={210} formatValue={num} />
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <SectionHeader icon={BarChart3} title="Projects by Type" />
                {projectTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={210}>
                    {/* FIX: increased left margin for YAxis label room */}
                    <BarChart
                      data={projectTypeData}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 12, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                      />
                      {/* FIX: width={100} to prevent long type names from being clipped */}
                      <YAxis
                        dataKey="type"
                        type="category"
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        width={100}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CountTooltip />} />
                      <Bar dataKey="Projects" radius={[0, 3, 3, 0]} maxBarSize={28}>
                        {projectTypeData.map((_, i) => (
                          <Cell key={`type-${i}`} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-xs text-gray-400">
                    No project type data
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <SectionHeader
                icon={TrendingUp}
                title="Budget vs Actual Spend"
                subtitle="Top projects by contract value"
              >
                <ExportButton
                  exportKey="budget"
                  exporting={exporting}
                  onExport={handleExport}
                  routeName="reports.export.budget"
                />
              </SectionHeader>
              {budgetData.length > 0 ? (
                /* FIX: bottom margin increased to 40 so angled XAxis labels are never clipped */
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={budgetData}
                    margin={{ top: 8, right: 24, left: 8, bottom: 40 }}
                    barCategoryGap="25%"
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#6b7280' }}
                      angle={-25}
                      textAnchor="end"
                      interval={0}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={phpK}
                      tick={{ fontSize: 11, fill: '#6b7280' }}
                      width={64}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="Budget" fill={C.blue}   radius={[3, 3, 0, 0]} maxBarSize={36} />
                    <Bar dataKey="Spent"  fill={C.orange} radius={[3, 3, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-xs text-gray-400">
                  No budget data for this period
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <SectionHeader
                icon={FolderKanban}
                title="Project Details"
                subtitle="Budget, spend, and completion status"
              />
              <DataTable
                columns={[
                  {
                    label: 'Project', key: 'project_name',
                    render: (r) => (
                      <div>
                        <p className="font-medium text-gray-900">{r.project_name}</p>
                        <p className="text-gray-400">{r.project_code} · {r.client_name}</p>
                      </div>
                    ),
                  },
                  {
                    label: 'Status', key: 'status',
                    render: (r) => {
                      const map = {
                        active:    'bg-blue-100 text-blue-700',
                        completed: 'bg-green-100 text-green-700',
                        on_hold:   'bg-amber-100 text-amber-700',
                        cancelled: 'bg-red-100 text-red-700',
                      };
                      return (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${map[r.status] || 'bg-gray-100 text-gray-600'}`}>
                          {r.is_overdue && <AlertTriangle size={9} />}
                          {r.status?.replace(/_/g, ' ')}
                        </span>
                      );
                    },
                  },
                  {
                    label: 'Completion', key: 'completion_percentage',
                    render: (r) => (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-[60px]">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(r.completion_percentage ?? 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold w-10 text-right">
                          {pct(r.completion_percentage)}
                        </span>
                      </div>
                    ),
                  },
                  {
                    label: 'Budget', key: 'contract_amount', align: 'right',
                    render: (r) => <span className="font-medium">{php(r.contract_amount)}</span>,
                  },
                  { label: 'Spent', key: 'total_spent', align: 'right', render: (r) => php(r.total_spent) },
                  {
                    label: 'Variance', key: 'variance', align: 'right',
                    render: (r) => (
                      <span className={`font-semibold ${r.variance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {php(r.variance)}
                      </span>
                    ),
                  },
                ]}
                rows={projectReport?.projects || []}
                emptyMsg="No projects found in this period"
              />
            </div>
          </div>
        )}

        {/* ═══ INVENTORY ═══ */}
        {activeTab === 'inventory' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <KpiCard label="Total Items"  value={num(inventoryReport?.summary?.total_items)}     color="gray"   icon={Package} />
              <KpiCard label="Active Items" value={num(inventoryReport?.summary?.active_items)}    color="blue"   icon={CheckCircle2} />
              <KpiCard
                label="Low Stock"
                value={num(inventoryReport?.summary?.low_stock_count)}
                color={inventoryReport?.summary?.low_stock_count > 0 ? 'orange' : 'green'}
                icon={AlertTriangle}
              />
              <KpiCard label="Total Value"  value={php(inventoryReport?.summary?.total_value)}     color="teal"   icon={DollarSign} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <SectionHeader icon={Activity} title="Stock Health Overview">
                  <ExportButton
                    exportKey="inventory"
                    exporting={exporting}
                    onExport={handleExport}
                    routeName="reports.export.inventory"
                  />
                </SectionHeader>
                {/* FIX: use DonutChart with explicit stockHealthColors for semantic color meaning */}
                <DonutChart
                  data={stockHealthData}
                  height={200}
                  formatValue={num}
                  colors={stockHealthColors}
                />
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    { label: 'Healthy',      val: inventoryReport?.stock_health?.healthy,      color: 'text-green-700 bg-green-50' },
                    { label: 'Low Stock',    val: inventoryReport?.stock_health?.low_stock,    color: 'text-amber-700 bg-amber-50' },
                    { label: 'Out of Stock', val: inventoryReport?.stock_health?.out_of_stock, color: 'text-red-700 bg-red-50' },
                  ].map((s) => (
                    <div key={s.label} className={`rounded-lg p-2 text-center ${s.color}`}>
                      <p className="text-lg font-bold">{s.val || 0}</p>
                      <p className="text-xs opacity-70">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <SectionHeader icon={BarChart3} title="Items by Category" subtitle="Count per category" />
                {categoryData.length > 0 ? (
                  /* FIX: bottom margin 44 to ensure angled category labels aren't clipped */
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={categoryData}
                      margin={{ top: 4, right: 8, left: 8, bottom: 44 }}
                      barCategoryGap="25%"
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis
                        dataKey="category"
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        angle={-30}
                        textAnchor="end"
                        interval={0}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CountTooltip />} />
                      <Bar dataKey="Items" radius={[3, 3, 0, 0]} maxBarSize={36}>
                        {categoryData.map((_, i) => (
                          <Cell key={`cat-${i}`} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-xs text-gray-400">
                    No category data
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <SectionHeader
                  icon={TrendingUp}
                  title="Most Used Items"
                  subtitle="By total quantity consumed in projects"
                />
                {mostUsedData.length > 0 ? (
                  /* FIX: left margin 120 to accommodate item name labels in horizontal bar */
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart
                      data={mostUsedData}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 16, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        allowDecimals={false}
                        axisLine={false}
                        tickLine={false}
                      />
                      {/* FIX: width 120 to prevent long item names being cut off */}
                      <YAxis
                        dataKey="name"
                        type="category"
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        width={120}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CountTooltip />} />
                      <Bar dataKey="Qty Used" radius={[0, 3, 3, 0]} maxBarSize={22}>
                        {mostUsedData.map((_, i) => (
                          <Cell key={`used-${i}`} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48 text-xs text-gray-400">
                    No usage data available
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <SectionHeader
                  icon={AlertTriangle}
                  title="Low Stock Alerts"
                  subtitle="Items at or below minimum stock level"
                />
                {inventoryReport?.low_stock_items?.length > 0 ? (
                  <DataTable
                    columns={[
                      {
                        label: 'Item', key: 'item_name',
                        render: (r) => (
                          <div>
                            <p className="font-medium text-gray-900">{r.item_name}</p>
                            <p className="text-gray-400">{r.item_code}</p>
                          </div>
                        ),
                      },
                      {
                        label: 'Category', key: 'category',
                        render: (r) => <span className="capitalize">{r.category || '—'}</span>,
                      },
                      {
                        label: 'Stock', key: 'current_stock', align: 'right',
                        render: (r) => (
                          <span className="font-bold text-orange-600">
                            {r.current_stock} {r.unit_of_measure}
                          </span>
                        ),
                      },
                      {
                        label: 'Min Level', key: 'min_stock_level', align: 'right',
                        render: (r) => (
                          <span className="text-gray-500">
                            {r.min_stock_level} {r.unit_of_measure}
                          </span>
                        ),
                      },
                    ]}
                    rows={inventoryReport?.low_stock_items || []}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-green-500">
                    <CheckCircle2 size={32} className="mb-2 opacity-50" />
                    <p className="text-xs text-gray-500">All items are sufficiently stocked</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <SectionHeader
                icon={Package}
                title="Top 10 Most Used Items"
                subtitle="Ranked by total quantity consumed in projects"
              />
              <DataTable
                columns={[
                  {
                    label: '#', key: '_rank',
                    render: (_, i) => <span className="text-gray-400 font-mono">{i + 1}</span>,
                  },
                  {
                    label: 'Item', key: 'item_name',
                    render: (r) => (
                      <div>
                        <p className="font-medium text-gray-900">{r.inventoryItem?.item_name}</p>
                        <p className="text-gray-400">{r.inventoryItem?.item_code}</p>
                      </div>
                    ),
                  },
                  {
                    label: 'Unit', key: 'unit',
                    render: (r) => <span className="text-gray-500">{r.inventoryItem?.unit_of_measure}</span>,
                  },
                  {
                    label: 'Qty Used', key: 'total_used', align: 'right',
                    render: (r) => <span className="font-bold text-blue-700">{num(r.total_used)}</span>,
                  },
                  {
                    label: 'Unit Price', key: 'unit_price', align: 'right',
                    render: (r) => php(r.inventoryItem?.unit_price),
                  },
                  {
                    label: 'Est. Value', key: 'value', align: 'right',
                    render: (r) => (
                      <span className="font-semibold">
                        {php((Number(r.total_used) || 0) * (Number(r.inventoryItem?.unit_price) || 0))}
                      </span>
                    ),
                  },
                ]}
                rows={inventoryReport?.most_used || []}
                emptyMsg="No usage data available"
              />
            </div>
          </div>
        )}

      </div>
    </AuthenticatedLayout>
  );
}