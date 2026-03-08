import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/Components/ui/table";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Label } from "@/Components/ui/label";
import { toast } from 'sonner';
import {
  Trash2, SquarePen, DollarSign, CreditCard, Filter, X, Search,
  Calendar, TrendingUp, ArrowUpDown, Archive,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { usePermission } from '@/utils/permissions';

import AddBilling   from './add';
import EditBilling  from './edit';
import DeleteBilling from './delete';
import AddPayment   from './add-payment';
import Transactions from './Transactions';

export default function BillingManagement() {
  const { has } = usePermission();

  const breadcrumbs = [
    { title: 'Home', href: route('dashboard') },
    { title: 'Billing Management' },
  ];

  const columns = [
    { header: 'Billing Code',   width: '10%' },
    { header: 'Project',        width: '15%' },
    { header: 'Billing Type',   width: '10%' },
    { header: 'Milestone',      width: '12%' },
    { header: 'Billing Amount', width: '10%' },
    { header: 'Billing Date',   width: '9%'  },
    { header: 'Due Date',       width: '9%'  },
    { header: 'Total Paid',     width: '9%'  },
    { header: 'Remaining',      width: '9%'  },
    { header: 'Status',         width: '7%'  },
    { header: 'Action',         width: '10%' },
  ];

  const pagination      = usePage().props.billings;
  const billings        = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const projects        = usePage().props.projects || [];
  const filters         = usePage().props.filters || {};
  const filterOptions   = usePage().props.filterOptions || {};
  const initialSearch   = usePage().props.search || '';
  const initialTab      = usePage().props.tab || 'billings';
  const transactionsData = usePage().props.transactions;

  const [searchInput,      setSearchInput]      = useState(initialSearch);
  const [showAddModal,     setShowAddModal]      = useState(false);
  const [showEditModal,    setShowEditModal]     = useState(false);
  const [editBilling,      setEditBilling]       = useState(null);
  const [showDeleteModal,  setShowDeleteModal]   = useState(false);
  const [deleteBilling,    setDeleteBilling]     = useState(null);
  const [showPaymentModal, setShowPaymentModal]  = useState(false);
  const [paymentBilling,   setPaymentBilling]    = useState(null);
  const [showFilterCard,   setShowFilterCard]    = useState(false);
  const [showSortCard,     setShowSortCard]      = useState(false);
  const [activeTab,        setActiveTab]         = useState(initialTab);

  const initFilters = (fp) => ({
    status:       fp?.status       || '',
    project_id:   fp?.project_id   || '',
    billing_type: fp?.billing_type || '',
    start_date:   fp?.start_date   || '',
    end_date:     fp?.end_date     || '',
  });

  const [localFilters, setLocalFilters] = useState(() => initFilters(filters));
  const pageProps = usePage().props;
  const [sortBy,    setSortBy]    = useState(pageProps.sort_by    || 'created_at');
  const [sortOrder, setSortOrder] = useState(pageProps.sort_order || 'desc');
  const debounceTimer = useRef(null);

  useEffect(() => {
    setLocalFilters(initFilters(filters));
  }, [filters.status, filters.project_id, filters.billing_type, filters.start_date, filters.end_date]);

  useEffect(() => {
    if (pageProps.sort_by)    setSortBy(pageProps.sort_by);
    if (pageProps.sort_order) setSortOrder(pageProps.sort_order);
  }, [pageProps.sort_by, pageProps.sort_order]);

  const statusColors = {
    unpaid:  'bg-red-100 text-red-800 border border-red-200',
    partial: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    paid:    'bg-green-100 text-green-800 border border-green-200',
  };
  const billingTypeColors = {
    fixed_price: 'bg-blue-100 text-blue-800 border border-blue-200',
    milestone:   'bg-purple-100 text-purple-800 border border-purple-200',
  };

  const capitalizeText = (t) =>
    t ? t.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : '';

  const activeFiltersCount = () =>
    [localFilters.status, localFilters.project_id, localFilters.billing_type,
     localFilters.start_date, localFilters.end_date].filter(Boolean).length;

  const handleFilterChange = (key, val) =>
    setLocalFilters(prev => ({ ...prev, [key]: val === 'all' ? '' : val }));

  const buildParams = (overrides = {}) => ({
    ...(searchInput?.trim() && { search: searchInput }),
    ...(localFilters.status       && { status:       localFilters.status }),
    ...(localFilters.project_id   && { project_id:   localFilters.project_id }),
    ...(localFilters.billing_type && { billing_type: localFilters.billing_type }),
    ...(localFilters.start_date   && { start_date:   localFilters.start_date }),
    ...(localFilters.end_date     && { end_date:     localFilters.end_date }),
    sort_by: sortBy, sort_order: sortOrder, tab: activeTab,
    ...overrides,
  });

  const applyFilters = (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    router.get(route('billing-management.index'), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowFilterCard(false),
    });
  };

  const applySort = () => {
    router.get(route('billing-management.index'), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowSortCard(false),
    });
  };

  const resetFilters = () => {
    setLocalFilters({ status: '', project_id: '', billing_type: '', start_date: '', end_date: '' });
    setSortBy('created_at'); setSortOrder('desc');
    router.get(route('billing-management.index'), { tab: activeTab, ...(searchInput?.trim() && { search: searchInput }) }, {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => { setShowFilterCard(false); setShowSortCard(false); },
    });
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.get(route('billing-management.index'), { tab: activeTab, ...(searchInput?.trim() && { search: searchInput }) }, {
        preserveState: true, preserveScroll: true, replace: true,
      });
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchInput, activeTab]);

  const handlePageClick = (url) => {
    if (!url) return;
    try {
      const page = new URL(url, window.location.origin).searchParams.get('page');
      router.get(route('billing-management.index'), buildParams({ page }), {
        preserveState: true, preserveScroll: true, replace: true,
      });
    } catch (e) { /* noop */ }
  };

  const handleArchive = (billing) => {
    router.post(route('billing-management.archive', billing.id), {}, {
      preserveScroll: true,
      onSuccess: (page) => {
        const flash = page.props.flash;
        if (flash?.error) toast.error(flash.error);
        else toast.success(`Billing "${billing.billing_code}" archived`);
      },
      onError: () => toast.error('Failed to archive billing.'),
    });
  };

  const formatNumber = (num) =>
    num != null ? parseFloat(num).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH') : '---';

  const pageLinks = Array.isArray(paginationLinks)
    ? paginationLinks.filter(l => l?.label && !isNaN(Number(l.label)))
    : [];
  const prevLink = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('next')) ?? null;
  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  const totalBillings = billings.length;
  const totalAmount   = billings.reduce((s, b) => s + parseFloat(b.billing_amount || 0), 0);
  const totalPaid     = billings.reduce((s, b) => s + parseFloat(b.total_paid     || 0), 0);
  const unpaidCount   = billings.filter(b => b.status === 'unpaid').length;

  return (
    <>
      {showAddModal    && <AddBilling    setShowAddModal={setShowAddModal}       projects={projects} />}
      {showEditModal   && <EditBilling   setShowEditModal={setShowEditModal}     billing={editBilling} />}
      {showDeleteModal && <DeleteBilling setShowDeleteModal={setShowDeleteModal} billing={deleteBilling} />}
      {showPaymentModal && <AddPayment   setShowPaymentModal={setShowPaymentModal} billing={paymentBilling} />}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Billing Management" />

        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow-lg sm:rounded-lg p-4 sm:p-6 mt-2 border border-gray-100">

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
              <div className="flex gap-4 w-max">
                {['billings', 'transactions'].map(tab => (
                  <button key={tab}
                    onClick={() => {
                      setActiveTab(tab);
                      router.get(route('billing-management.index'), { tab }, { preserveState: true, replace: true });
                    }}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition capitalize ${
                      activeTab === tab
                        ? 'border-zinc-700 text-zinc-700 font-semibold'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'transactions' ? (
              <Transactions transactions={transactionsData} search={initialSearch} />
            ) : (
              <>
                {/* Stats */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {[
                      { label: 'Total Billings', value: totalBillings, icon: DollarSign,  color: 'blue',   fmt: 'count' },
                      { label: 'Total Amount',   value: totalAmount,   icon: TrendingUp,  color: 'green',  fmt: 'currency' },
                      { label: 'Total Paid',     value: totalPaid,     icon: DollarSign,  color: 'purple', fmt: 'currency' },
                      { label: 'Unpaid',         value: unpaidCount,   icon: CreditCard,  color: 'red',    fmt: 'count' },
                    ].map(({ label, value, icon: Icon, color, fmt }) => (
                      <div key={label} className={`bg-gradient-to-br from-${color}-50 to-${color}-100 rounded-lg p-3 sm:p-4 border border-${color}-200`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className={`text-xs font-medium text-${color}-700 uppercase tracking-wide`}>{label}</p>
                            <p className={`${fmt === 'currency' ? 'text-sm sm:text-lg' : 'text-xl sm:text-2xl'} font-bold text-${color}-900 mt-1`}>
                              {fmt === 'currency' ? `₱${formatNumber(value)}` : value}
                            </p>
                          </div>
                          <div className={`bg-${color}-200 rounded-full p-2 sm:p-3`}>
                            <Icon className={`h-4 w-4 sm:h-5 sm:w-5 text-${color}-700`} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                  {/* Left: search + filter + sort + archive */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-80">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search billings by code, project..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-10 h-11 w-full border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Filter */}
                      <DropdownMenu open={showFilterCard} onOpenChange={(open) => { setShowFilterCard(open); if (open) setShowSortCard(false); }}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline"
                            className={`h-10 w-10 p-0 border-2 rounded-lg flex items-center justify-center relative ${activeFiltersCount() > 0 ? 'bg-zinc-100 border-zinc-400 text-zinc-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            title="Filters">
                            <Filter className="h-4 w-4" />
                            {activeFiltersCount() > 0 && (
                              <span className="absolute -top-1 -right-1 bg-zinc-700 text-white text-xs font-semibold rounded-full h-4 w-4 flex items-center justify-center">
                                {activeFiltersCount()}
                              </span>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" sideOffset={6}
                          className="w-80 p-0 rounded-xl shadow-xl border-2 border-gray-200 overflow-hidden flex flex-col max-h-[500px] bg-white"
                          style={{ zIndex: 40 }}>
                          <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-white" /><h3 className="text-sm font-semibold text-white">Filter Billings</h3></div>
                            <button onClick={() => setShowFilterCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                          </div>
                          <div className="p-4 overflow-y-auto flex-1 space-y-4">
                            {filterOptions.statuses?.length > 0 && (
                              <div>
                                <Label className="text-xs font-semibold text-gray-700 mb-2 block">Status</Label>
                                <Select value={localFilters.status || 'all'} onValueChange={(v) => handleFilterChange('status', v)}>
                                  <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                                  <SelectContent style={{ zIndex: 50 }}>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {filterOptions.statuses.map(s => <SelectItem key={s} value={s}>{capitalizeText(s)}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div>
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Project</Label>
                              <Select value={localFilters.project_id || 'all'} onValueChange={(v) => handleFilterChange('project_id', v)}>
                                <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Projects" /></SelectTrigger>
                                <SelectContent style={{ zIndex: 50 }}>
                                  <SelectItem value="all">All Projects</SelectItem>
                                  {projects.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.project_code} - {p.project_name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            {filterOptions.billingTypes?.length > 0 && (
                              <div>
                                <Label className="text-xs font-semibold text-gray-700 mb-2 block">Billing Type</Label>
                                <Select value={localFilters.billing_type || 'all'} onValueChange={(v) => handleFilterChange('billing_type', v)}>
                                  <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Types" /></SelectTrigger>
                                  <SelectContent style={{ zIndex: 50 }}>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {filterOptions.billingTypes.map(t => <SelectItem key={t} value={t}>{t === 'fixed_price' ? 'Fixed Price' : 'Milestone'}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div>
                              <Label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5"><Calendar className="h-3 w-3" />Date Range</Label>
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs text-gray-600 mb-1 block">Start Date</Label>
                                  <Input type="date" value={localFilters.start_date} onChange={(e) => setLocalFilters(p => ({ ...p, start_date: e.target.value }))} className="w-full h-9 border-gray-300 rounded-lg" />
                                </div>
                                <div>
                                  <Label className="text-xs text-gray-600 mb-1 block">End Date</Label>
                                  <Input type="date" value={localFilters.end_date} onChange={(e) => setLocalFilters(p => ({ ...p, end_date: e.target.value }))} className="w-full h-9 border-gray-300 rounded-lg" />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2 flex-shrink-0">
                            <Button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetFilters(); }} variant="outline" className="flex-1 border-gray-300 text-sm h-9" disabled={activeFiltersCount() === 0}>Clear All</Button>
                            <Button type="button" onClick={applyFilters} className="flex-1 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9">Apply Filters</Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Sort */}
                      <DropdownMenu open={showSortCard} onOpenChange={(open) => { setShowSortCard(open); if (open) setShowFilterCard(false); }}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-10 w-10 p-0 border-2 rounded-lg flex items-center justify-center bg-white border-gray-300 text-gray-700 hover:bg-gray-50" title="Sort">
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" sideOffset={6} className="w-72 p-0 rounded-xl shadow-xl border-2 border-gray-200 overflow-hidden flex flex-col bg-white" style={{ zIndex: 40 }}>
                          <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2"><ArrowUpDown className="h-4 w-4 text-white" /><h3 className="text-sm font-semibold text-white">Sort Billings</h3></div>
                            <button onClick={() => setShowSortCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                          </div>
                          <div className="p-4 space-y-4">
                            <div>
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Sort By</Label>
                              <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                                <SelectContent style={{ zIndex: 50 }}>
                                  <SelectItem value="created_at">Date Created</SelectItem>
                                  <SelectItem value="billing_code">Billing Code</SelectItem>
                                  <SelectItem value="billing_date">Billing Date</SelectItem>
                                  <SelectItem value="due_date">Due Date</SelectItem>
                                  <SelectItem value="billing_amount">Billing Amount</SelectItem>
                                  <SelectItem value="status">Status</SelectItem>
                                  <SelectItem value="billing_type">Billing Type</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Order</Label>
                              <Select value={sortOrder} onValueChange={setSortOrder}>
                                <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                                <SelectContent style={{ zIndex: 50 }}>
                                  <SelectItem value="asc">Ascending</SelectItem>
                                  <SelectItem value="desc">Descending</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                            <Button type="button" onClick={applySort} className="w-full bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9">Apply Sort</Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* ── Archive page link ── */}
                      {has('billing.archive') && (
                        <Button
                          variant="outline"
                          onClick={() => router.visit(route('billing-management.archived'))}
                          className="h-10 w-10 p-0 border-2 rounded-lg flex items-center justify-center bg-white border-gray-300 text-gray-700 hover:bg-amber-50 hover:border-amber-400 hover:text-amber-700 transition-colors"
                          title="View archived billings"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Right: Add Billing */}
                  {has('billing.create') && (
                    <Button onClick={() => setShowAddModal(true)}
                      className="w-full sm:w-auto bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md h-11 px-5 whitespace-nowrap text-sm flex items-center justify-center gap-2">
                      <SquarePen className="h-4 w-4" /><span>Add Billing</span>
                    </Button>
                  )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                  <Table className="min-w-[1400px] w-full">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        {columns.map((col, i) => (
                          <TableHead key={i} style={{ width: col.width }}
                            className="text-left font-bold px-3 sm:px-4 py-3 text-xs text-gray-700 uppercase tracking-wider">
                            {col.header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {billings.length > 0 ? billings.map((billing, index) => {
                        const billTotalPaid  = parseFloat(billing.total_paid    || 0);
                        const billingAmount  = parseFloat(billing.billing_amount || 0);
                        const remaining      = billingAmount - billTotalPaid;

                        return (
                          <TableRow key={billing.id}
                            className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <TableCell className="px-3 sm:px-4 py-3 text-sm font-semibold text-gray-900">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">{billing.billing_code || '---'}</span>
                            </TableCell>
                            <TableCell className="px-3 sm:px-4 py-3 text-sm">
                              <div className="font-medium text-gray-900">{billing.project?.project_code}</div>
                              <div className="text-xs text-gray-500">{billing.project?.project_name}</div>
                              {billing.project?.client && <div className="text-xs text-gray-400">{billing.project.client.client_name}</div>}
                            </TableCell>
                            <TableCell className="px-3 sm:px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${billingTypeColors[billing.billing_type] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                                {billing.billing_type === 'fixed_price' ? 'Fixed Price' : 'Milestone'}
                              </span>
                            </TableCell>
                            <TableCell className="px-3 sm:px-4 py-3 text-sm text-gray-700">
                              {billing.milestone ? <span>{billing.milestone.name}</span> : <span className="text-gray-400 italic">---</span>}
                            </TableCell>
                            <TableCell className="px-3 sm:px-4 py-3 text-sm font-bold text-gray-900">₱{formatNumber(billingAmount)}</TableCell>
                            <TableCell className="px-3 sm:px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(billing.billing_date)}</TableCell>
                            <TableCell className="px-3 sm:px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{formatDate(billing.due_date)}</TableCell>
                            <TableCell className="px-3 sm:px-4 py-3 text-sm font-medium text-green-600">₱{formatNumber(billTotalPaid)}</TableCell>
                            <TableCell className={`px-3 sm:px-4 py-3 text-sm font-medium ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>₱{formatNumber(remaining)}</TableCell>
                            <TableCell className="px-3 sm:px-4 py-3 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[billing.status] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                                {capitalizeText(billing.status || '')}
                              </span>
                            </TableCell>

                            {/* ── Action buttons per status ──
                                unpaid  → Add Payment + Edit + Delete
                                partial → Add Payment + Edit
                                paid    → Archive + Delete               */}
                            <TableCell className="px-3 sm:px-4 py-3 text-sm">
                              <div className="flex gap-1">
                                {/* unpaid + partial: Add Payment */}
                                {billing.status !== 'paid' && has('billing.add-payment') && (
                                  <button onClick={() => { setPaymentBilling(billing); setShowPaymentModal(true); }}
                                    className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 hover:text-green-700 transition-all border border-green-200 hover:border-green-300"
                                    title="Add Payment">
                                    <CreditCard size={14} />
                                  </button>
                                )}

                        

                                {/* unpaid + partial: Edit */}
                                {billing.status !== 'paid' && has('billing.update') && (
                                  <button onClick={() => { setEditBilling(billing); setShowEditModal(true); }}
                                    className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all border border-indigo-200 hover:border-indigo-300"
                                    title="Edit">
                                    <SquarePen size={14} />
                                  </button>
                                )}

                                {/* paid only: Archive */}
                                {billing.status === 'paid' && has('billing.archive') && (
                                  <button onClick={() => handleArchive(billing)}
                                    className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 hover:text-amber-700 transition-all border border-amber-200 hover:border-amber-300"
                                    title="Archive billing">
                                    <Archive size={14} />
                                  </button>
                                )}
                                {/* unpaid only: Delete */}
                                {billing.status === 'unpaid' && has('billing.delete') && (
                                  <button
                                    onClick={() => {
                                      setDeleteBilling(billing);
                                      setShowDeleteModal(true);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition-all border border-red-200 hover:border-red-300"
                                    title="Delete billing"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      }) : (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <div className="bg-gray-100 rounded-full p-4 mb-3"><Search className="h-8 w-8 text-gray-400" /></div>
                              <p className="text-gray-500 font-medium text-base">No billings found</p>
                              <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {showPagination && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-gray-200 gap-3">
                    <p className="text-sm text-gray-600 order-2 sm:order-1">
                      Showing <span className="font-semibold text-gray-900">{billings.length}</span> of{' '}
                      <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> billings
                    </p>
                    <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
                      <button disabled={!prevLink?.url} onClick={() => handlePageClick(prevLink?.url)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${!prevLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
                        Previous
                      </button>
                      {pageLinks.map((link, idx) => (
                        <button key={idx} disabled={!link?.url} onClick={() => handlePageClick(link?.url)}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all min-w-[36px] ${link?.active ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'} ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}>
                          {link?.label}
                        </button>
                      ))}
                      <button disabled={!nextLink?.url} onClick={() => handlePageClick(nextLink?.url)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${!nextLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </AuthenticatedLayout>
    </>
  );
}