import { useState, useEffect, useRef } from 'react';
import { usePage, router } from '@inertiajs/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Label } from "@/Components/ui/label";
import { Checkbox } from "@/Components/ui/checkbox";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/Components/ui/select";
import { toast } from 'sonner';
import { 
  Trash2, 
  SquarePen, 
  Plus,
  Filter,
  Search,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Eye,
  X,
  ArrowUpDown,
  PackageCheck,
  PackageX,
  PackageSearch,
  PackagePlus,
} from 'lucide-react';
import { usePermission } from '@/utils/permissions';
import AddReceivingReport from './add';
import EditReceivingReport from './edit';
import DeleteReceivingReport from './delete';
import DeleteMaterialAllocation from './delete-allocation';
import ViewMaterialAllocation from './view';
import BulkReceivingReport from './bulk-receive';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';

export default function MaterialAllocationTab({ project, materialAllocationData }) {
  const { has } = usePermission();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllocationModal, setShowDeleteAllocationModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editReceivingReport, setEditReceivingReport] = useState(null);
  const [deleteReceivingReport, setDeleteReceivingReport] = useState(null);
  const [deleteAllocation, setDeleteAllocation] = useState(null);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [viewAllocation, setViewAllocation] = useState(null);

  // ── Bulk selection ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState([]);

  const pagination = materialAllocationData?.allocations;
  const allocations = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const filters = materialAllocationData?.filters || {};
  const initialSearch = materialAllocationData?.search || '';
  const budgetSummary = materialAllocationData?.budgetSummary || {
    contract_amount: 0,
    total_allocated_cost: 0,
    total_received_cost: 0,
    budget_remaining: 0,
  };

  // Only allocations that still have remaining qty can be bulk-received
  const receivableAllocations = allocations.filter(a => {
    const remaining = (a.quantity_allocated || 0) - (a.quantity_received || 0);
    return remaining > 0;
  });

  const selectedAllocations = allocations.filter(a => selectedIds.includes(a.id));

  const toggleAll = (checked) => {
    if (checked) {
      setSelectedIds(receivableAllocations.map(a => a.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const isAllSelected =
    receivableAllocations.length > 0 &&
    receivableAllocations.every(a => selectedIds.includes(a.id));

  const isIndeterminate =
    selectedIds.length > 0 && !isAllSelected;

  // ── Filters / sort / search ───────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [showSortCard, setShowSortCard] = useState(false);
  const debounceTimer = useRef(null);

  const initializeFilters = (fp) => ({
    status:     fp?.status     || 'all',
    start_date: fp?.start_date || '',
    end_date:   fp?.end_date   || '',
  });

  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const [sortBy,    setSortBy]    = useState(materialAllocationData?.sort_by    || 'created_at');
  const [sortOrder, setSortOrder] = useState(materialAllocationData?.sort_order || 'desc');

  useEffect(() => {
    setLocalFilters(initializeFilters(filters));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.start_date, filters.end_date]);

  useEffect(() => {
    if (materialAllocationData?.sort_by)    setSortBy(materialAllocationData.sort_by);
    if (materialAllocationData?.sort_order) setSortOrder(materialAllocationData.sort_order);
  }, [materialAllocationData?.sort_by, materialAllocationData?.sort_order]);

  const activeFiltersCount = () => {
    let count = 0;
    if (localFilters.status && localFilters.status !== 'all') count++;
    if (localFilters.start_date) count++;
    if (localFilters.end_date)   count++;
    return count;
  };

  const handleFilterChange = (type, value) => {
    setLocalFilters(prev => ({ ...prev, [type]: value === 'all' ? 'all' : value }));
  };

  const buildParams = (overrides = {}) => ({
    ...(searchInput && { search: searchInput }),
    ...(localFilters.status && localFilters.status !== 'all' && { status_filter: localFilters.status }),
    ...(localFilters.start_date && { start_date: localFilters.start_date }),
    ...(localFilters.end_date   && { end_date:   localFilters.end_date }),
    sort_by:    sortBy,
    sort_order: sortOrder,
    ...overrides,
  });

  const navigate = (params) =>
    router.get(route('project-management.view', project.id), params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });

  const applyFilters = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    navigate(buildParams());
    setShowFilterCard(false);
  };

  const applySort = () => {
    navigate(buildParams());
    setShowSortCard(false);
  };

  const resetFilters = () => {
    setLocalFilters({ status: 'all', start_date: '', end_date: '' });
    setSortBy('created_at');
    setSortOrder('desc');
    navigate({ search: searchInput });
    setShowFilterCard(false);
    setShowSortCard(false);
  };

  const handleSearch = (e) => setSearchInput(e.target.value);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => navigate(buildParams()), 300);
    return () => clearTimeout(debounceTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handlePageClick = (url) => {
    if (!url) return;
    try {
      const page = new URL(url, window.location.origin).searchParams.get('page');
      navigate(buildParams({ ...(page && { page }) }));
    } catch (e) { console.error(e); }
  };

  const pageLinks  = Array.isArray(paginationLinks) ? paginationLinks.filter(l => l?.label && !isNaN(Number(l.label))) : [];
  const prevLink   = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink   = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('next'))     ?? null;
  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount ?? 0);

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  }) : '---';

  const formatStatus = (status) => {
    const map = {
      pending:  { label: 'Pending',  icon: Clock,         bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
      partial:  { label: 'Partial',  icon: AlertCircle,   bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200'   },
      received: { label: 'Received', icon: CheckCircle2,  bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200'  },
    };
    return map[status] || { label: status || '---', icon: Clock, bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
  };

  const getStatusBadge = (status) => {
    const s = formatStatus(status);
    const Icon = s.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium border ${s.bg} ${s.text} ${s.border}`}>
        <Icon size={12} />{s.label}
      </span>
    );
  };

  const calculateProgress = (a) => {
    if (!a.quantity_allocated || a.quantity_allocated === 0) return 0;
    return Math.min(Math.round(((a.quantity_received || 0) / a.quantity_allocated) * 100), 100);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalAllocations    = allocations.length;
  const pendingAllocations  = allocations.filter(a => a.status === 'pending').length;
  const partialAllocations  = allocations.filter(a => a.status === 'partial').length;
  const receivedAllocations = allocations.filter(a => a.status === 'received').length;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">

      {/* ── Quick Stats ── */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total Allocations', value: totalAllocations,   icon: Package,       from: 'from-blue-50',   to: 'to-blue-100',   border: 'border-blue-200',   text: 'text-blue-700',   num: 'text-blue-900',   iconBg: 'bg-blue-200',   iconColor: 'text-blue-700'   },
            { label: 'Pending',           value: pendingAllocations,  icon: Clock,         from: 'from-yellow-50', to: 'to-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700', num: 'text-yellow-900', iconBg: 'bg-yellow-200', iconColor: 'text-yellow-700' },
            { label: 'Partial',           value: partialAllocations,  icon: PackageSearch, from: 'from-indigo-50', to: 'to-indigo-100', border: 'border-indigo-200', text: 'text-indigo-700', num: 'text-indigo-900', iconBg: 'bg-indigo-200', iconColor: 'text-indigo-700' },
            { label: 'Received',          value: receivedAllocations, icon: PackageCheck,  from: 'from-green-50',  to: 'to-green-100',  border: 'border-green-200',  text: 'text-green-700',  num: 'text-green-900',  iconBg: 'bg-green-200',  iconColor: 'text-green-700'  },
          ].map(({ label, value, icon: Icon, from, to, border, text, num, iconBg, iconColor }) => (
            <div key={label} className={`bg-gradient-to-br ${from} ${to} rounded-lg p-3 sm:p-4 border ${border}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium ${text} uppercase tracking-wide`}>{label}</p>
                  <p className={`text-xl sm:text-2xl font-bold ${num} mt-1`}>{value}</p>
                </div>
                <div className={`${iconBg} rounded-full p-2 sm:p-3`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bulk Action Bar — appears when rows are selected ── */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between mb-4 px-4 py-3 bg-zinc-900 text-white rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-white text-zinc-900 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {selectedIds.length}
            </div>
            <span className="text-sm font-medium">
              {selectedIds.length} allocation{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => setShowBulkModal(true)}
              className="bg-white text-zinc-900 hover:bg-zinc-100 flex items-center gap-2 text-xs font-semibold shadow-none h-8 px-3"
            >
              <PackagePlus size={14} />
              Bulk Receive
            </Button>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Clear selection"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Search + Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search allocations by item name, code, or notes..."
              value={searchInput}
              onChange={handleSearch}
              className="pl-10 h-11 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="flex gap-2">

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
              <DropdownMenuContent align="end" className="w-96 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col max-h-[500px] bg-white">
                <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-white" />
                    <h3 className="text-base font-semibold text-white">Filter Allocations</h3>
                  </div>
                  <button onClick={() => setShowFilterCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  <div className="mb-4">
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Status</Label>
                    <Select value={localFilters.status || 'all'} onValueChange={(v) => handleFilterChange('status', v)}>
                      <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mb-4">
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                      <Calendar className="h-3 w-3" /> Date Range
                    </Label>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="ma_start_date" className="text-xs text-gray-600 mb-1 block">Start Date</Label>
                        <Input id="ma_start_date" type="date" value={localFilters.start_date}
                          onChange={e => setLocalFilters(p => ({ ...p, start_date: e.target.value }))}
                          className="w-full h-9 border-gray-300 rounded-lg" />
                      </div>
                      <div>
                        <Label htmlFor="ma_end_date" className="text-xs text-gray-600 mb-1 block">End Date</Label>
                        <Input id="ma_end_date" type="date" value={localFilters.end_date}
                          onChange={e => setLocalFilters(p => ({ ...p, end_date: e.target.value }))}
                          className="w-full h-9 border-gray-300 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2 flex-shrink-0">
                  <Button type="button" onClick={resetFilters} variant="outline"
                    className="flex-1 border-gray-300 hover:bg-gray-100 text-sm h-9"
                    disabled={activeFiltersCount() === 0}>
                    Clear
                  </Button>
                  <Button type="button" onClick={applyFilters}
                    className="flex-1 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9">
                    Apply Filters
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort */}
            <DropdownMenu open={showSortCard} onOpenChange={(open) => { setShowSortCard(open); if (open) setShowFilterCard(false); }}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"
                  className="h-10 w-10 p-0 border-2 rounded-lg flex items-center justify-center bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  title="Sort">
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col max-h-[300px] bg-white">
                <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-white" />
                    <h3 className="text-base font-semibold text-white">Sort Allocations</h3>
                  </div>
                  <button onClick={() => setShowSortCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  <div className="mb-4">
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Date Created</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                        <SelectItem value="quantity_allocated">Quantity Allocated</SelectItem>
                        <SelectItem value="quantity_received">Quantity Received</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mb-4">
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Order</Label>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex-shrink-0">
                  <Button type="button" onClick={applySort}
                    className="w-full bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9">
                    Apply Sort
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
        <Table className="min-w-[1060px] w-full">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">

              {/* Checkbox header */}
              <TableHead className="w-10 px-4 py-4">
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={isIndeterminate}
                  onCheckedChange={toggleAll}
                  disabled={receivableAllocations.length === 0}
                  aria-label="Select all"
                />
              </TableHead>

              {[
                { label: 'Item',      w: '20%' },
                { label: 'Code',      w: '10%' },
                { label: 'Allocated', w: '12%' },
                { label: 'Received',  w: '12%' },
                { label: 'Remaining', w: '11%' },
                { label: 'Status',    w: '10%' },
                { label: 'Progress',  w: '10%' },
                { label: 'Actions',   w: '11%' },
              ].map((col) => (
                <TableHead key={col.label}
                  className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider"
                  style={{ width: col.w }}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.length > 0 ? (
              allocations.map((allocation, index) => {
                const item      = allocation.inventory_item || allocation.inventoryItem || {};
                const remaining = (allocation.quantity_allocated || 0) - (allocation.quantity_received || 0);
                const progress  = calculateProgress(allocation);
                const isSelected = selectedIds.includes(allocation.id);
                const canReceive = remaining > 0;

                return (
                  <TableRow key={allocation.id}
                    className={`border-b border-gray-100 transition-colors duration-150 ${
                      isSelected
                        ? 'bg-zinc-50 border-l-2 border-l-zinc-400'
                        : index % 2 === 0 ? 'bg-white hover:bg-blue-50/50' : 'bg-gray-50/30 hover:bg-blue-50/50'
                    }`}>

                    {/* Checkbox cell */}
                    <TableCell className="px-4 py-4">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(allocation.id)}
                        disabled={!canReceive}
                        aria-label={`Select ${item.item_name || 'item'}`}
                      />
                    </TableCell>

                    <TableCell className="px-4 py-4 text-sm font-medium text-gray-900">
                      {item.item_name || 'Unknown'}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-gray-700">
                      {item.item_code || '---'}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm font-bold text-gray-900">
                      {allocation.quantity_allocated} <span className="font-normal text-gray-500 text-xs">{item.unit_of_measure || 'units'}</span>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-gray-700">
                      {allocation.quantity_received || 0} <span className="text-gray-500 text-xs">{item.unit_of_measure || 'units'}</span>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-gray-700">
                      <span className={remaining === 0 ? 'text-green-600 font-medium' : ''}>
                        {remaining} <span className="text-gray-500 text-xs">{item.unit_of_measure || 'units'}</span>
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm">
                      {getStatusBadge(allocation.status)}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2.5 max-w-[80px] shadow-inner">
                          <div className={`h-2.5 rounded-full transition-all duration-500 ${
                            progress === 100 ? 'bg-green-500' :
                            progress >= 50  ? 'bg-blue-500' :
                            progress > 0    ? 'bg-yellow-500' : 'bg-gray-300'
                          }`} style={{ width: `${progress}%` }} />
                        </div>
                        <span className={`text-xs font-semibold w-7 ${
                          progress === 100 ? 'text-green-600' :
                          progress >= 50  ? 'text-blue-600' :
                          progress > 0    ? 'text-yellow-600' : 'text-gray-500'
                        }`}>{progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm">
                      <div className="flex gap-1.5">
                        {canReceive && has('material-allocations.receiving-report') && (
                          <button
                            onClick={() => { setSelectedAllocation(allocation); setShowAddModal(true); }}
                            className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all border border-blue-200 hover:border-blue-300"
                            title="Add Receiving Report">
                            <Plus size={16} />
                          </button>
                        )}
                        {has('material-allocations.view') && (
                          <button
                            onClick={() => { setViewAllocation(allocation); setShowViewModal(true); }}
                            className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all border border-indigo-200 hover:border-indigo-300"
                            title="View Details">
                            <Eye size={16} />
                          </button>
                        )}
                        {has('material-allocations.delete') &&
                          (allocation.receiving_reports_count ?? allocation.receivingReports?.length ?? 0) === 0 && (
                          <button
                            onClick={() => { setDeleteAllocation(allocation); setShowDeleteAllocationModal(true); }}
                            className="p-2 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition-all border border-red-200 hover:border-red-300"
                            title="Delete Allocation">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-gray-100 rounded-full p-4 mb-3">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium text-base">No material allocations found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {showPagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-gray-200 gap-4">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{allocations.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> allocations
          </div>
          <div className="flex items-center space-x-2">
            <button disabled={!prevLink?.url}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${!prevLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}
              onClick={() => handlePageClick(prevLink?.url)}>Previous</button>
            {pageLinks.map((link, idx) => (
              <button key={idx} disabled={!link?.url}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all min-w-[40px] ${link?.active ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'} ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}
                onClick={() => handlePageClick(link?.url)}>{link?.label || ''}</button>
            ))}
            <button disabled={!nextLink?.url}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${!nextLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}
              onClick={() => handlePageClick(nextLink?.url)}>Next</button>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {showAddModal && selectedAllocation && (
        <AddReceivingReport setShowAddModal={setShowAddModal} project={project} allocation={selectedAllocation} budgetSummary={budgetSummary} />
      )}
      {showEditModal && editReceivingReport && (
        <EditReceivingReport setShowEditModal={setShowEditModal} project={project} allocation={editReceivingReport.allocation} receivingReport={editReceivingReport} budgetSummary={budgetSummary} />
      )}
      {showDeleteModal && deleteReceivingReport && (
        <DeleteReceivingReport setShowDeleteModal={setShowDeleteModal} project={project} allocation={deleteReceivingReport.allocation} receivingReport={deleteReceivingReport} />
      )}
      {showDeleteAllocationModal && deleteAllocation && (
        <DeleteMaterialAllocation setShowDeleteModal={setShowDeleteAllocationModal} project={project} allocation={deleteAllocation} />
      )}
      {showViewModal && viewAllocation && (
        <ViewMaterialAllocation setShowViewModal={setShowViewModal} project={project} allocation={viewAllocation} />
      )}
      {showBulkModal && selectedAllocations.length > 0 && (
        <BulkReceivingReport
          setShowBulkModal={setShowBulkModal}
          project={project}
          allocations={selectedAllocations}
          onSuccess={() => {
            setSelectedIds([]);
            setShowBulkModal(false);
          }}
        />
      )}
    </div>
  );
}