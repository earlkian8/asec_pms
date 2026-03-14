import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/Components/ui/table';
import { Input } from '@/Components/ui/input';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/Components/ui/dropdown-menu';
import {
  Trash2, RotateCcw, AlertCircle, Search, ArrowUpDown,
  Clock, Filter, X, PackageOpen,
} from 'lucide-react';
import { usePermission } from '@/utils/permissions';
import DeleteTrashItem from './delete';

// ─── Type display helpers ─────────────────────────────────────────────────────

const TYPE_LABELS = {
  project:                     'Project',
  project_type:                'Project Type',
  client:                      'Client',
  client_type:                 'Client Type',
  employee:                    'Employee',
  user:                        'User',
  inventory_item:              'Inventory Item',
  billing:                     'Billing',
  project_task:                'Project Task',
  project_issue:               'Project Issue',
  project_labor_cost:          'Labor Cost',
  project_milestone:           'Milestone',
  project_material_allocation: 'Material Allocation',
  project_misc_expense:        'Misc Expense',
  project_file:                'Project File',
  progress_update:             'Progress Update',
  notification:                'Notification',
  client_notification:         'Client Notification',
  message:                     'Message',
  chat:                        'Chat',
  activity_log:                'Activity Log',
  inventory_transaction:       'Inventory Transaction',
};

const TYPE_COLORS = {
  project:                     'bg-blue-100 text-blue-800 border-blue-200',
  project_type:                'bg-blue-100 text-blue-800 border-blue-200',
  client:                      'bg-green-100 text-green-800 border-green-200',
  client_type:                 'bg-green-100 text-green-800 border-green-200',
  employee:                    'bg-purple-100 text-purple-800 border-purple-200',
  user:                        'bg-indigo-100 text-indigo-800 border-indigo-200',
  inventory_item:              'bg-amber-100 text-amber-800 border-amber-200',
  billing:                     'bg-emerald-100 text-emerald-800 border-emerald-200',
  project_task:                'bg-sky-100 text-sky-800 border-sky-200',
  project_issue:               'bg-red-100 text-red-800 border-red-200',
  project_labor_cost:          'bg-orange-100 text-orange-800 border-orange-200',
  project_milestone:           'bg-teal-100 text-teal-800 border-teal-200',
  project_material_allocation: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  project_misc_expense:        'bg-rose-100 text-rose-800 border-rose-200',
  project_file:                'bg-slate-100 text-slate-800 border-slate-200',
  progress_update:             'bg-lime-100 text-lime-800 border-lime-200',
  notification:                'bg-yellow-100 text-yellow-800 border-yellow-200',
  client_notification:         'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  message:                     'bg-pink-100 text-pink-800 border-pink-200',
  chat:                        'bg-violet-100 text-violet-800 border-violet-200',
  activity_log:                'bg-gray-100 text-gray-800 border-gray-200',
  inventory_transaction:       'bg-amber-100 text-amber-800 border-amber-200',
};

function TypeBadge({ type }) {
  const label = TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const color = TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-800 border-gray-200';
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
}

/**
 * Computes how many whole days remain before the item is auto-purged.
 * Returns null if deletedAt is missing, 0 if today is the last day, negative if overdue.
 */
function getDaysRemaining(deletedAt, purgeDays) {
  if (!deletedAt) return null;
  const purgeDate = new Date(deletedAt).getTime() + purgeDays * 24 * 60 * 60 * 1000;
  return Math.ceil((purgeDate - Date.now()) / (24 * 60 * 60 * 1000));
}

function PurgeBadge({ deletedAt, purgeDays }) {
  const days = getDaysRemaining(deletedAt, purgeDays);
  if (days === null) return <span className="text-gray-400 italic text-xs">—</span>;

  // Overdue — should have been purged already
  if (days <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300 whitespace-nowrap">
        <Clock className="h-3 w-3 shrink-0" />
        Overdue
      </span>
    );
  }

  // ≤ 3 days — critical, red
  if (days <= 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300 whitespace-nowrap">
        <Clock className="h-3 w-3 shrink-0" />
        {days}d left
      </span>
    );
  }

  // ≤ 7 days — warning, orange
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-300 whitespace-nowrap">
        <Clock className="h-3 w-3 shrink-0" />
        {days}d left
      </span>
    );
  }

  // ≤ 14 days — caution, amber
  if (days <= 14) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300 whitespace-nowrap">
        <Clock className="h-3 w-3 shrink-0" />
        {days}d left
      </span>
    );
  }

  // > 14 days — safe, green
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-300 whitespace-nowrap">
      <Clock className="h-3 w-3 shrink-0" />
      {days}d left
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TrashBinIndex() {
  const { has } = usePermission();

  const breadcrumbs = [
    { title: 'Home', href: route('dashboard') },
    { title: 'Trash Bin' },
  ];

  const columns = [
    { header: 'Deleted At',   width: '13%' },
    { header: 'Purge In',     width: '9%'  },
    { header: 'Type',         width: '13%' },
    { header: 'Name / Label', width: '21%' },
    { header: 'Details',      width: '28%' },
    { header: 'Action',       width: '16%' },
  ];

  const pageProps       = usePage().props;
  const pagination      = pageProps.items;
  const items           = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const availableTypes  = pageProps.availableTypes || [];
  const stats           = pageProps.stats || { total_items: 0, auto_purge_days: 30 };
  const filters         = pageProps.filters || {};

  const [searchInput,     setSearchInput]     = useState(filters.search || '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem,      setDeleteItem]      = useState(null);
  const [showFilterCard,  setShowFilterCard]  = useState(false);
  const [showSortCard,    setShowSortCard]    = useState(false);
  const [sortBy,          setSortBy]          = useState('deleted_at');
  const [sortOrder,       setSortOrder]       = useState('desc');

  const initializeFilters = (f) => ({ type: f?.type || '' });
  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));

  const debounceTimer = useRef(null);

  useEffect(() => {
    setLocalFilters(initializeFilters(filters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.type]);

  const activeFiltersCount = () => (localFilters.type ? 1 : 0);

  const handleFilterChange = (filterType, value) => {
    setLocalFilters(prev => ({ ...prev, [filterType]: value === 'all' ? '' : value }));
  };

  const buildParams = (overrides = {}) => ({
    ...(searchInput?.trim() && { search: searchInput }),
    ...(localFilters.type && { type: localFilters.type }),
    ...overrides,
  });

  const applyFilters = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    router.get(route('user-management.trash-bin.index'), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowFilterCard(false),
    });
  };

  const resetFilters = () => {
    setLocalFilters({ type: '' });
    router.get(route('user-management.trash-bin.index'), { search: searchInput }, {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => { setShowFilterCard(false); setShowSortCard(false); },
    });
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.get(route('user-management.trash-bin.index'), buildParams(), {
        preserveState: true, preserveScroll: true, replace: true,
      });
    }, 300);
    return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handlePageChange = ({ page }) => {
    router.get(route('user-management.trash-bin.index'), buildParams({ page }), {
      preserveState: true, preserveScroll: true, replace: true,
    });
  };

  const pageLinks = Array.isArray(paginationLinks)
    ? paginationLinks.filter(l => l?.label && !isNaN(Number(l.label)))
    : [];
  const prevLink = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('next'))     ?? null;
  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  const handlePageClick = (url) => {
    if (!url) return;
    try {
      const page = new URL(url, window.location.origin).searchParams.get('page');
      handlePageChange({ page });
    } catch (e) {
      console.error('Failed to parse pagination URL:', e);
    }
  };

  const handleRestore = (item) => {
    if (!has('trash-bin.restore')) return;
    router.post(
      route('user-management.trash-bin.restore'),
      { type: item.type, id: item.id },
      {
        preserveScroll: true,
        onSuccess: (page) => {
          const flash = page.props.flash;
          if (flash?.error) {
            toast.error(flash.error);
          } else {
            toast.success(`"${item.label}" restored successfully.`);
          }
        },
        onError: () => toast.error('Failed to restore item. Please try again.'),
      },
    );
  };

  if (!has('trash-bin.view')) {
    return (
      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Trash Bin" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">You don't have permission to view the Trash Bin.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <>
      {showDeleteModal && (
        <DeleteTrashItem setShowDeleteModal={setShowDeleteModal} item={deleteItem} />
      )}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Trash Bin" />

        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-lg rounded-lg p-4 sm:p-6 mt-2 border border-gray-100">

            {/* Stats */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 sm:p-4 border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Total Items in Trash</p>
                      <p className="text-xl sm:text-2xl font-bold text-red-900 mt-1">{stats.total_items}</p>
                    </div>
                    <div className="bg-red-200 rounded-full p-2 sm:p-3">
                      <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-red-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 sm:p-4 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Auto-Purge</p>
                      <p className="text-xl sm:text-2xl font-bold text-amber-900 mt-1">{stats.auto_purge_days} days</p>
                    </div>
                    <div className="bg-amber-200 rounded-full p-2 sm:p-3">
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700" />
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Items that stay in the trash for more than {stats.auto_purge_days} days will be permanently deleted automatically.
              </p>
            </div>

            {/* Search + Filter Bar */}
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by name, type or details..."
                      value={searchInput}
                      onChange={e => setSearchInput(e.target.value)}
                      className="pl-10 h-11 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                      {/* Filter */}
                      <DropdownMenu open={showFilterCard} onOpenChange={(open) => {
                        setShowFilterCard(open);
                        if (open) setShowSortCard(false);
                      }}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className={`h-10 w-10 p-0 border-2 rounded-lg flex items-center justify-center relative ${
                              activeFiltersCount() > 0
                                ? 'bg-zinc-100 border-zinc-400 text-zinc-700'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                            }`}
                            title="Filters"
                          >
                            <Filter className="h-4 w-4" />
                            {activeFiltersCount() > 0 && (
                              <span className="absolute -top-1 -right-1 bg-zinc-700 text-white text-xs font-semibold rounded-full h-4 w-4 flex items-center justify-center">
                                {activeFiltersCount()}
                              </span>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          sideOffset={6}
                          className="w-72 p-0 rounded-xl shadow-xl border-2 border-gray-200 overflow-hidden flex flex-col bg-white"
                          style={{ zIndex: 40 }}
                        >
                          <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Filter className="h-4 w-4 text-white" />
                              <h3 className="text-sm font-semibold text-white">Filter Items</h3>
                            </div>
                            <button onClick={() => setShowFilterCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="p-4">
                            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Type</Label>
                            <Select
                              value={localFilters.type || 'all'}
                              onValueChange={v => handleFilterChange('type', v)}
                            >
                              <SelectTrigger className="w-full h-9">
                                <SelectValue placeholder="All Types" />
                              </SelectTrigger>
                              <SelectContent style={{ zIndex: 50 }}>
                                <SelectItem value="all">All Types</SelectItem>
                                {availableTypes.map(type => (
                                  <SelectItem key={type} value={type}>
                                    {TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2">
                            <Button
                              type="button"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetFilters(); }}
                              variant="outline"
                              className="flex-1 border-gray-300 text-sm h-9"
                              disabled={activeFiltersCount() === 0}
                            >
                              Clear
                            </Button>
                            <Button
                              type="button"
                              onClick={applyFilters}
                              className="flex-1 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9"
                            >
                              Apply
                            </Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Sort */}
                      <DropdownMenu open={showSortCard} onOpenChange={(open) => {
                        setShowSortCard(open);
                        if (open) setShowFilterCard(false);
                      }}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            className="h-10 w-10 p-0 border-2 rounded-lg flex items-center justify-center bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            title="Sort"
                          >
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          sideOffset={6}
                          className="w-72 p-0 rounded-xl shadow-xl border-2 border-gray-200 overflow-hidden flex flex-col bg-white"
                          style={{ zIndex: 40 }}
                        >
                          <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className="h-4 w-4 text-white" />
                              <h3 className="text-sm font-semibold text-white">Sort Items</h3>
                            </div>
                            <button onClick={() => setShowSortCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="p-4 space-y-4">
                            <div>
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Sort By</Label>
                              <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                                <SelectContent style={{ zIndex: 50 }}>
                                  <SelectItem value="deleted_at">Deleted At</SelectItem>
                                  <SelectItem value="type">Type</SelectItem>
                                  <SelectItem value="label">Name</SelectItem>
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
                            <Button
                              type="button"
                              onClick={() => {
                                router.get(route('user-management.trash-bin.index'), buildParams(), {
                                  preserveState: true, preserveScroll: true, replace: true,
                                  onSuccess: () => setShowSortCard(false),
                                });
                              }}
                              className="w-full bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9"
                            >
                              Apply Sort
                            </Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <Table className="min-w-[900px] w-full">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    {columns.map((col, i) => (
                      <TableHead
                        key={i}
                        className="text-left font-bold px-3 sm:px-4 py-3 text-xs text-gray-700 uppercase tracking-wider"
                        style={col.width ? { width: col.width } : {}}
                      >
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length > 0 ? (
                    items.map((item, index) => (
                      <TableRow
                        key={`${item.type}-${item.id}`}
                        className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <TableCell className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                          {item.deleted_at
                            ? new Date(item.deleted_at).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                                hour: 'numeric', minute: '2-digit', hour12: true,
                              })
                            : '—'}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3">
                          <PurgeBadge deletedAt={item.deleted_at} purgeDays={stats.auto_purge_days} />
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-sm">
                          <TypeBadge type={item.type} />
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-sm font-semibold text-gray-900">
                          {item.label}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-sm text-gray-700">
                          {item.details || (
                            <span className="text-gray-400 italic text-xs">No additional details</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-sm">
                          <div className="flex gap-1">
                            {has('trash-bin.restore') && (
                              <button
                                type="button"
                                onClick={() => handleRestore(item)}
                                className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 transition-all border border-green-200 hover:border-green-300"
                                title="Restore"
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                            {has('trash-bin.force-delete') && (
                              <button
                                type="button"
                                onClick={() => { setDeleteItem(item); setShowDeleteModal(true); }}
                                className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-all border border-red-200 hover:border-red-300"
                                title="Delete Forever"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <div className="bg-gray-100 rounded-full p-4 mb-3">
                            <PackageOpen className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium">Trash Bin is empty</p>
                          <p className="text-gray-400 text-sm mt-1">
                            Deleted records will appear here for {stats.auto_purge_days} days before being permanently removed.
                          </p>
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
                  Showing <span className="font-semibold text-gray-900">{pagination?.from || 0}</span> to{' '}
                  <span className="font-semibold text-gray-900">{pagination?.to || 0}</span> of{' '}
                  <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> items
                </p>
                <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
                  <button
                    disabled={!prevLink?.url}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      !prevLink?.url
                        ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
                    }`}
                    onClick={() => handlePageClick(prevLink?.url)}
                  >
                    Previous
                  </button>
                  {pageLinks.map((link, idx) => (
                    <button
                      key={idx}
                      disabled={!link?.url}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all min-w-[36px] ${
                        link?.active
                          ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
                      } ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}
                      onClick={() => handlePageClick(link?.url)}
                    >
                      {link?.label || ''}
                    </button>
                  ))}
                  <button
                    disabled={!nextLink?.url}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      !nextLink?.url
                        ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
                    }`}
                    onClick={() => handlePageClick(nextLink?.url)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </AuthenticatedLayout>
    </>
  );
}