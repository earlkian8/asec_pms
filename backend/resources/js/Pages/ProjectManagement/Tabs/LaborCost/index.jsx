import { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/Components/ui/table";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Label } from "@/Components/ui/label";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/Components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { toast } from 'sonner';
import {
  Trash2, SquarePen, Plus, Filter, Search, Calendar,
  X, ArrowUpDown, Users, CheckCircle2,
  Clock, Lock, Send, ChevronDown, ChevronRight,
  PhilippinePeso, Eye, XCircle,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/Components/ui/dialog";
import { Textarea } from "@/Components/ui/textarea";
import { usePermission } from '@/utils/permissions';
import AddLaborCost from './add';
import EditLaborCost from './edit';
import DeleteLaborCost from './delete';
import ViewLaborCost from './view';

export default function LaborCostTab({ project, laborCostData }) {
  const { has } = usePermission();

  const [showAddModal,    setShowAddModal]    = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal,   setShowViewModal]   = useState(false);
  const [editLaborCost,   setEditLaborCost]   = useState(null);
  const [deleteLaborCost, setDeleteLaborCost] = useState(null);
  const [viewLaborCost,   setViewLaborCost]   = useState(null);
  const [expandedRows,    setExpandedRows]    = useState(new Set());
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget,    setRejectTarget]    = useState(null);
  const [rejectReason,    setRejectReason]    = useState('');
  const [rejecting,       setRejecting]       = useState(false);

  const pagination   = laborCostData?.laborCosts;
  const laborCosts   = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const filters      = laborCostData?.filters || {};
  const totalGrossPay   = parseFloat(laborCostData?.totalGrossPay   || 0);
  const totalDays       = parseFloat(laborCostData?.totalDays       || 0);
  const totalDraft      = parseInt(laborCostData?.totalDraft        || 0);
  const totalSubmitted  = parseInt(laborCostData?.totalSubmitted     || 0);

  const [searchInput,    setSearchInput]    = useState(laborCostData?.search || '');
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [showSortCard,   setShowSortCard]   = useState(false);
  const debounceTimer = useRef(null);

  const initFilters = (f) => ({
    date_from: f?.date_from || '',
    date_to:   f?.date_to   || '',
    status:    f?.status    || 'all',
  });

  const [localFilters, setLocalFilters] = useState(() => initFilters(filters));
  const [sortBy,    setSortBy]    = useState(laborCostData?.sort_by    || 'period_start');
  const [sortOrder, setSortOrder] = useState(laborCostData?.sort_order || 'desc');

  useEffect(() => { setLocalFilters(initFilters(filters)); }, [filters.date_from, filters.date_to, filters.status]);
  useEffect(() => {
    if (laborCostData?.sort_by)    setSortBy(laborCostData.sort_by);
    if (laborCostData?.sort_order) setSortOrder(laborCostData.sort_order);
  }, [laborCostData?.sort_by, laborCostData?.sort_order]);

  const activeFiltersCount = () => {
    let c = 0;
    if (localFilters.date_from) c++;
    if (localFilters.date_to)   c++;
    if (localFilters.status && localFilters.status !== 'all') c++;
    return c;
  };

  const buildParams = (overrides = {}) => ({
    ...(searchInput?.trim() && { search: searchInput }),
    ...(localFilters.date_from && { date_from: localFilters.date_from }),
    ...(localFilters.date_to   && { date_to:   localFilters.date_to }),
    ...(localFilters.status && localFilters.status !== 'all' && { status_filter: localFilters.status }),
    sort_by:    sortBy,
    sort_order: sortOrder,
    ...overrides,
  });

  const navigate = (params) =>
    router.get(route('project-management.view', project.id), params, {
      preserveState: true, preserveScroll: true, replace: true,
    });

  const applyFilters = (e) => { e?.preventDefault(); navigate(buildParams()); setShowFilterCard(false); };
  const applySort    = ()  => { navigate(buildParams()); setShowSortCard(false); };
  const resetFilters = ()  => {
    setLocalFilters({ date_from: '', date_to: '', status: 'all' });
    setSortBy('period_start'); setSortOrder('desc');
    navigate({ search: searchInput });
    setShowFilterCard(false); setShowSortCard(false);
  };

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

  const formatCurrency = (v) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2 }).format(v || 0);
  const formatDate     = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const getAttendanceSummary = (attendance) => {
    if (!attendance) return { P: 0, A: 0, HD: 0 };
    const counts = { P: 0, A: 0, HD: 0 };
    Object.values(attendance).forEach(v => {
      const s = typeof v === 'string' ? v : v?.status;
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  };

  const handleSubmit = (entry) => {
    router.put(
      route('project-management.labor-costs.submit', [project.id, entry.id]),
      {},
      {
        preserveScroll: true,
        onSuccess: () => toast.success('Payroll entry submitted and locked.'),
        onError:   () => toast.error('Failed to submit payroll entry.'),
      }
    );
  };

  const handleReject = () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      toast.error('Please provide a rejection reason (at least 5 characters).');
      return;
    }
    setRejecting(true);
    router.put(
      route('project-management.labor-costs.reject', [project.id, rejectTarget.id]),
      { rejection_reason: rejectReason.trim() },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success('Payroll entry rejected and returned to draft.');
          setShowRejectModal(false);
          setRejectTarget(null);
          setRejectReason('');
        },
        onError: () => toast.error('Failed to reject payroll entry.'),
        onFinish: () => setRejecting(false),
      }
    );
  };

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="w-full">

      {/* ── Stats ── */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Total Final Pay', value: formatCurrency(totalGrossPay), icon: PhilippinePeso, from: 'from-green-50',  to: 'to-green-100',  border: 'border-green-200',  text: 'text-green-700',  num: 'text-green-900',  iconBg: 'bg-green-200',  iconColor: 'text-green-700'  },
            { label: 'Total Days',      value: totalDays.toFixed(1) + ' days', icon: Calendar,      from: 'from-blue-50',   to: 'to-blue-100',   border: 'border-blue-200',   text: 'text-blue-700',   num: 'text-blue-900',   iconBg: 'bg-blue-200',   iconColor: 'text-blue-700'   },
            { label: 'Draft Entries',   value: totalDraft,                     icon: Clock,         from: 'from-yellow-50', to: 'to-yellow-100', border: 'border-yellow-200', text: 'text-yellow-700', num: 'text-yellow-900', iconBg: 'bg-yellow-200', iconColor: 'text-yellow-700' },
            { label: 'Submitted',       value: totalSubmitted,                 icon: CheckCircle2,  from: 'from-indigo-50', to: 'to-indigo-100', border: 'border-indigo-200', text: 'text-indigo-700', num: 'text-indigo-900', iconBg: 'bg-indigo-200', iconColor: 'text-indigo-700' },
          ].map(({ label, value, icon: Icon, from, to, border, text, num, iconBg, iconColor }) => (
            <div key={label} className={`bg-gradient-to-br ${from} ${to} rounded-lg p-3 sm:p-4 border ${border}`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className={`text-xs font-medium ${text} uppercase tracking-wide truncate`}>{label}</p>
                  <p className={`text-xl sm:text-2xl font-bold ${num} mt-1`}>{value}</p>
                </div>
                <div className={`${iconBg} rounded-full p-2 sm:p-3 flex-shrink-0`}>
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search + Filter + Sort + Add ── */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, description, notes..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-10 h-11 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="flex gap-2">
            {/* Filter */}
            <DropdownMenu open={showFilterCard} onOpenChange={o => { setShowFilterCard(o); if (o) setShowSortCard(false); }}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"
                  className={`h-10 w-10 p-0 border-2 rounded-lg flex items-center justify-center relative ${activeFiltersCount() > 0 ? 'bg-zinc-100 border-zinc-400 text-zinc-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                  <Filter className="h-4 w-4" />
                  {activeFiltersCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-zinc-700 text-white text-xs font-semibold rounded-full h-4 w-4 flex items-center justify-center">{activeFiltersCount()}</span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col bg-white">
                <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-white" /><h3 className="text-base font-semibold text-white">Filter</h3></div>
                  <button onClick={() => setShowFilterCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Status</Label>
                    <Select value={localFilters.status || 'all'} onValueChange={v => setLocalFilters(p => ({ ...p, status: v }))}>
                      <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="returned">Returned (Rejected)</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Period Range</Label>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">From</Label>
                        <Input type="date" value={localFilters.date_from} onChange={e => setLocalFilters(p => ({ ...p, date_from: e.target.value }))} className="h-9" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">To</Label>
                        <Input type="date" value={localFilters.date_to} onChange={e => setLocalFilters(p => ({ ...p, date_to: e.target.value }))} className="h-9" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t flex gap-2">
                  <Button type="button" variant="outline" onClick={resetFilters} className="flex-1 h-9 text-sm" disabled={activeFiltersCount() === 0}>Clear</Button>
                  <Button type="button" onClick={applyFilters} className="flex-1 h-9 text-sm bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white">Apply</Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort */}
            <DropdownMenu open={showSortCard} onOpenChange={o => { setShowSortCard(o); if (o) setShowFilterCard(false); }}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 w-10 p-0 border-2 rounded-lg flex items-center justify-center bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col bg-white">
                <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2"><ArrowUpDown className="h-4 w-4 text-white" /><h3 className="text-base font-semibold text-white">Sort</h3></div>
                  <button onClick={() => setShowSortCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="period_start">Period Start</SelectItem>
                        <SelectItem value="period_end">Period End</SelectItem>
                        <SelectItem value="gross_pay">Gross Pay</SelectItem>
                        <SelectItem value="days_present">Days Present</SelectItem>
                        <SelectItem value="created_at">Date Created</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
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
                <div className="bg-gray-50 px-4 py-3 border-t">
                  <Button type="button" onClick={applySort} className="w-full h-9 text-sm bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white">Apply Sort</Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {has('labor-costs.create') && (
          <Button onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md px-5 h-11 whitespace-nowrap flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" />Add Payroll Entry
          </Button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <Table className="min-w-[1000px] w-full">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              {['', 'Worker', 'Period', 'Days Present', 'Base Pay', 'Final Pay', 'Status', 'Actions'].map((h, i) => (
                <TableHead key={i} className="font-bold px-4 py-4 text-xs text-gray-700 uppercase tracking-wider text-left">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {laborCosts.length > 0 ? laborCosts.map((entry, index) => {
              const isExpanded = expandedRows.has(entry.id);
              const isDraft = entry.status === 'draft';
              const isReturned = isDraft && !!entry.rejected_at;
              const isSubmitted = entry.status === 'submitted';
              const isApproved = entry.status === 'approved';
              const isPaid = entry.status === 'paid';
              const summary = getAttendanceSummary(entry.attendance);
              const attendance = entry.attendance || {};
              const dates = Object.keys(attendance).sort();

              return (
                <>
                  <TableRow key={entry.id}
                    className={`border-b border-gray-100 transition-colors cursor-pointer ${index % 2 === 0 ? 'bg-white hover:bg-blue-50/40' : 'bg-gray-50/30 hover:bg-blue-50/40'}`}
                    onClick={() => toggleRow(entry.id)}>

                    {/* Expand toggle */}
                    <TableCell className="px-4 py-4 w-8">
                      <div className="text-gray-400">
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                    </TableCell>

                    {/* Worker */}
                    <TableCell className="px-4 py-4 text-sm font-medium text-gray-900">
                      <div>
                        <p className="font-semibold">{entry.assignable_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{entry.assignable_type_label}</p>
                      </div>
                    </TableCell>

                    {/* Period */}
                    <TableCell className="px-4 py-4 text-sm text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" />
                        <span>{formatDate(entry.period_start)} – {formatDate(entry.period_end)}</span>
                      </div>
                    </TableCell>

                    {/* Days present */}
                    <TableCell className="px-4 py-4 text-sm text-gray-700">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-gray-900">{parseFloat(entry.days_present).toFixed(1)} days</p>
                        <p className="text-xs text-gray-400">P:{summary.P} HD:{summary.HD} A:{summary.A}</p>
                      </div>
                    </TableCell>

                    {/* Base pay */}
                    <TableCell className="px-4 py-4 text-sm text-gray-700">
                      {formatCurrency(entry.base_pay ?? entry.gross_pay ?? 0)}
                    </TableCell>

                    {/* Final pay */}
                    <TableCell className="px-4 py-4 text-sm font-bold text-gray-900">
                      {formatCurrency(entry.gross_pay)}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-4 py-4 text-sm" onClick={e => e.stopPropagation()}>
                      {isDraft && !isReturned && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">
                          <Clock size={11} />Draft
                        </span>
                      )}
                      {isReturned && (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium bg-red-100 text-red-700 border border-red-200">
                            <XCircle size={11} />Returned
                          </span>
                          <p className="text-xs text-red-600 max-w-[160px] truncate" title={entry.rejection_reason}>
                            {entry.rejection_reason}
                          </p>
                        </div>
                      )}
                      {isSubmitted && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-700 border border-green-200">
                          <Send size={11} />Submitted
                        </span>
                      )}
                      {isApproved && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium bg-blue-100 text-blue-700 border border-blue-200">
                          <CheckCircle2 size={11} />Approved
                        </span>
                      )}
                      {isPaid && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <PhilippinePeso size={11} />Paid
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-4 py-4 text-sm" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        {isDraft && has('labor-costs.update') && (
                          <button
                            onClick={() => handleSubmit(entry)}
                            className="p-2 rounded-lg hover:bg-green-100 text-green-600 hover:text-green-700 transition-all border border-green-200"
                            title="Submit">
                            <Send size={15} />
                          </button>
                        )}
                        {isSubmitted && has('labor-costs.update') && (
                          <>
                            <button
                              onClick={() => router.put(route('project-management.labor-costs.approve', [project.id, entry.id]), {}, {
                                preserveScroll: true,
                                onSuccess: () => toast.success('Payroll entry approved.'),
                                onError: () => toast.error('Failed to approve payroll entry.'),
                              })}
                              className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all border border-blue-200"
                              title="Approve">
                              <CheckCircle2 size={15} />
                            </button>
                            <button
                              onClick={() => { setRejectTarget(entry); setRejectReason(''); setShowRejectModal(true); }}
                              className="p-2 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition-all border border-red-200"
                              title="Reject — return to draft">
                              <XCircle size={15} />
                            </button>
                          </>
                        )}
                        {isApproved && has('labor-costs.update') && (
                          <button
                            onClick={() => router.put(route('project-management.labor-costs.mark-paid', [project.id, entry.id]), {}, {
                              preserveScroll: true,
                              onSuccess: () => toast.success('Payroll entry marked as paid.'),
                              onError: () => toast.error('Failed to mark payroll as paid.'),
                            })}
                            className="p-2 rounded-lg hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 transition-all border border-emerald-200"
                            title="Mark as Paid">
                            <PhilippinePeso size={15} />
                          </button>
                        )}
                        {isDraft && has('labor-costs.update') && (
                          <button
                            onClick={() => { setEditLaborCost(entry); setShowEditModal(true); }}
                            className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all border border-blue-200"
                            title="Edit">
                            <SquarePen size={15} />
                          </button>
                        )}
                        {isDraft && has('labor-costs.delete') && (
                          <button
                            onClick={() => { setDeleteLaborCost(entry); setShowDeleteModal(true); }}
                            className="p-2 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition-all border border-red-200"
                            title="Delete">
                            <Trash2 size={15} />
                          </button>
                        )}
                        {!isDraft && (
                          <button
                            onClick={() => { setViewLaborCost(entry); setShowViewModal(true); }}
                            className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all border border-indigo-200"
                            title="View Payroll Slip">
                            <Eye size={15} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* ── Attendance expansion row ── */}
                  {isExpanded && (
                    <TableRow key={`expand-${entry.id}`} className="bg-gray-50/60">
                      <TableCell colSpan={8} className="px-8 py-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                          Attendance — {formatDate(entry.period_start)} to {formatDate(entry.period_end)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {dates.map(date => {
                            const raw    = attendance[date];
                            const status = typeof raw === 'string' ? raw : (raw?.status ?? 'A');
                            const timeIn  = raw?.time_in  || null;
                            const timeOut = raw?.time_out || null;
                            const breakM  = raw?.break_minutes ?? null;
                            const colorMap = {
                              P:  'bg-green-100 text-green-700 border-green-200',
                              A:  'bg-red-100 text-red-700 border-red-200',
                              HD: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                            };
                            const labelMap = { P: 'Present', A: 'Absent', HD: 'Half Day' };
                            return (
                              <div key={date} className={`flex flex-col px-3 py-2 rounded-lg border text-xs font-medium min-w-[90px] ${colorMap[status] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                <span className="font-bold">{new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}</span>
                                <span className="mt-0.5 opacity-80">{labelMap[status] || status}</span>
                                {timeIn && timeOut && (
                                  <span className="mt-1 text-xs opacity-70">{timeIn} – {timeOut}</span>
                                )}
                                {breakM != null && breakM > 0 && (
                                  <span className="text-xs opacity-60">{breakM}m break</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {entry.description && (
                          <p className="text-xs text-gray-500 mt-3"><span className="font-semibold">Description:</span> {entry.description}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          <span className="font-semibold">Adjustments:</span>{' '}
                          +Overpay {formatCurrency(entry.overpay_amount || 0)} · +Double {formatCurrency(entry.double_pay_amount || 0)} ·
                          {' '}-Damages {formatCurrency(entry.damages_deduction || 0)} · -Other {formatCurrency(entry.other_deduction || 0)} ·
                          {' '}-Cash Advance {formatCurrency(entry.cash_advance || 0)}
                        </p>
                        {entry.notes && (
                          <p className="text-xs text-gray-500 mt-1"><span className="font-semibold">Notes:</span> {entry.notes}</p>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-gray-100 rounded-full p-4 mb-3"><Users className="h-8 w-8 text-gray-400" /></div>
                    <p className="text-gray-500 font-medium">No payroll entries found</p>
                    <p className="text-gray-400 text-sm mt-1">Create the first payroll period entry</p>
                    {has('labor-costs.create') && (
                      <Button onClick={() => setShowAddModal(true)} className="mt-4 bg-gradient-to-r from-zinc-700 to-zinc-800 text-white">
                        <Plus size={16} className="mr-2" />Add Payroll Entry
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {showPagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-gray-200 gap-3">
          <p className="text-sm text-gray-600 order-2 sm:order-1">
            Showing <span className="font-semibold text-gray-900">{laborCosts.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> entries
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
            <button disabled={!prevLink?.url} onClick={() => handlePageClick(prevLink?.url)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${!prevLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
              Previous
            </button>
            {pageLinks.map((link, idx) => (
              <button key={idx} disabled={!link?.url} onClick={() => handlePageClick(link?.url)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all min-w-[36px] ${link?.active ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'} ${!link?.url ? 'cursor-not-allowed text-gray-400' : ''}`}>
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

      {/* ── Modals ── */}
      {showViewModal && viewLaborCost && (
        <ViewLaborCost setShowViewModal={setShowViewModal} project={project} laborCost={viewLaborCost} />
      )}
      {showAddModal && (
        <AddLaborCost setShowAddModal={setShowAddModal} project={project} teamMembers={laborCostData?.teamMembers || []} />
      )}
      {showEditModal && editLaborCost && (
        <EditLaborCost setShowEditModal={setShowEditModal} project={project} laborCost={editLaborCost} teamMembers={laborCostData?.teamMembers || []} />
      )}
      {showDeleteModal && deleteLaborCost && (
        <DeleteLaborCost setShowDeleteModal={setShowDeleteModal} project={project} laborCost={deleteLaborCost} />
      )}

      {/* ── Reject modal ── */}
      {showRejectModal && rejectTarget && (
        <Dialog open onOpenChange={(open) => { if (!open) { setShowRejectModal(false); setRejectTarget(null); setRejectReason(''); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-700">
                <XCircle size={18} /> Reject Payroll Entry
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-gray-600">
                This will return the entry for <strong>{rejectTarget.assignable_name}</strong> to draft so it can be corrected and re-submitted.
              </p>
              <div>
                <Label className="text-sm font-medium">Reason for rejection <span className="text-red-500">*</span></Label>
                <Textarea
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain what needs to be corrected…"
                  rows={3}
                  className="mt-1"
                />
                {rejectReason.trim().length > 0 && rejectReason.trim().length < 5 && (
                  <p className="text-xs text-red-500 mt-1">Must be at least 5 characters.</p>
                )}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { setShowRejectModal(false); setRejectTarget(null); setRejectReason(''); }} disabled={rejecting}>
                Cancel
              </Button>
              <Button onClick={handleReject} disabled={rejecting || rejectReason.trim().length < 5} className="bg-red-600 hover:bg-red-700 text-white">
                {rejecting ? 'Rejecting…' : 'Reject & Return'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}