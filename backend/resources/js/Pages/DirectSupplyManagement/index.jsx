import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Label } from "@/Components/ui/label";
import { Trash2, SquarePen, Filter, X, Search, Truck, TrendingUp, AlertCircle, ArrowUpDown, PackagePlus, Archive } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { Switch } from "@/Components/ui/switch";
import { usePermission } from '@/utils/permissions';
import { toast } from 'sonner';

import AddDirectSupply from './add';
import EditDirectSupply from './edit';
import DeleteDirectSupply from './delete';
import AllocateDirectSupply from './allocate';

export default function DirectSupplyManagement() {
  const { has } = usePermission();

  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Direct Supply Management" },
  ];

  const columns = [
    { header: 'Supply Code', width: '12%' },
    { header: 'Supply Name', width: '18%' },
    { header: 'Category', width: '12%' },
    { header: 'Unit', width: '10%' },
    { header: 'Unit Price', width: '12%' },
    { header: 'Supplier', width: '16%' },
    { header: 'Status', width: '10%' },
    { header: 'Action', width: '10%' },
  ];

  const pageProps        = usePage().props;
  const pagination       = pageProps.supplies;
  const supplies         = pagination?.data || [];
  const paginationLinks  = pagination?.links || [];
  const filters          = pageProps.filters || {};
  const filterOptions    = pageProps.filterOptions || {};
  const initialSearch    = pageProps.search || '';
  const stats            = pageProps.stats || { total_supplies: 0, active_supplies: 0 };
  const projects         = pageProps.projects || [];

  // Transactions tab
  const transactionsPagination      = pageProps.transactions || {};
  const transactionList             = transactionsPagination?.data || [];
  const transactionsPaginationLinks = transactionsPagination?.links || [];
  const initialTransactionsSearch   = pageProps.transactionsSearch || '';

  // Receiving reports tab
  const receivingPagination      = pageProps.receivingReports || {};
  const receivingList            = receivingPagination?.data || [];
  const receivingPaginationLinks = receivingPagination?.links || [];
  const initialReceivingSearch   = pageProps.receivingReportsSearch || '';

  const [activeTab,          setActiveTab]          = useState('supplies');
  const [searchInput,        setSearchInput]        = useState(initialSearch);
  const [showAddModal,       setShowAddModal]       = useState(false);
  const [showEditModal,      setShowEditModal]      = useState(false);
  const [editSupply,         setEditSupply]         = useState(null);
  const [showDeleteModal,    setShowDeleteModal]    = useState(false);
  const [deleteSupply,       setDeleteSupply]       = useState(null);
  const [showAllocateModal,  setShowAllocateModal]  = useState(false);
  const [allocateSupply,     setAllocateSupply]     = useState(null);
  const [showFilterCard,     setShowFilterCard]     = useState(false);
  const [showSortCard,       setShowSortCard]       = useState(false);

  const initializeFilters = (fp) => ({
    category:  fp?.category  || '',
    is_active: fp?.is_active || '',
  });

  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const [sortBy,       setSortBy]       = useState(pageProps.sort_by    || 'created_at');
  const [sortOrder,    setSortOrder]    = useState(pageProps.sort_order || 'desc');
  const debounceTimer = useRef(null);

  // Transactions search
  const [transactionsSearch, setTransactionsSearch] = useState(initialTransactionsSearch);
  const transDebounce = useRef(null);

  // Receiving reports search
  const [receivingSearch, setReceivingSearch] = useState(initialReceivingSearch);
  const recDebounce = useRef(null);

  useEffect(() => {
    setLocalFilters(initializeFilters(filters));
  }, [filters.category, filters.is_active]);

  useEffect(() => {
    if (pageProps.sort_by)    setSortBy(pageProps.sort_by);
    if (pageProps.sort_order) setSortOrder(pageProps.sort_order);
  }, [pageProps.sort_by, pageProps.sort_order]);

  const capitalizeText = (text) => {
    if (!text) return '';
    return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '---';
    return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '---';

  const activeFiltersCount = () => {
    let count = 0;
    if (localFilters.category)        count++;
    if (localFilters.is_active !== '') count++;
    return count;
  };

  const handleFilterChange = (type, value) => {
    setLocalFilters(prev => ({ ...prev, [type]: value === 'all' ? '' : value }));
  };

  const buildParams = (overrides = {}) => ({
    ...(searchInput && { search: searchInput }),
    ...(localFilters.category && { category: localFilters.category }),
    ...(localFilters.is_active !== '' && { is_active: localFilters.is_active }),
    sort_by: sortBy,
    sort_order: sortOrder,
    ...overrides,
  });

  const navigate = (params) =>
    router.get(route('direct-supply-management.index'), params, {
      preserveState: true, preserveScroll: true, replace: true,
    });

  const applyFilters = (e) => {
    e?.preventDefault(); e?.stopPropagation();
    navigate(buildParams());
    setShowFilterCard(false);
  };

  const applySort = () => {
    navigate(buildParams());
    setShowSortCard(false);
  };

  const resetFilters = () => {
    setLocalFilters({ category: '', is_active: '' });
    setSortBy('created_at');
    setSortOrder('desc');
    navigate({ ...(searchInput?.trim() && { search: searchInput }) });
    setShowFilterCard(false);
    setShowSortCard(false);
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      navigate({ ...(searchInput?.trim() && { search: searchInput }) });
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  // Transactions search debounce
  useEffect(() => {
    if (transDebounce.current) clearTimeout(transDebounce.current);
    transDebounce.current = setTimeout(() => {
      navigate({ ...(transactionsSearch?.trim() && { transactions_search: transactionsSearch }) });
    }, 300);
    return () => clearTimeout(transDebounce.current);
  }, [transactionsSearch]);

  // Receiving reports search debounce
  useEffect(() => {
    if (recDebounce.current) clearTimeout(recDebounce.current);
    recDebounce.current = setTimeout(() => {
      navigate({ ...(receivingSearch?.trim() && { receiving_reports_search: receivingSearch }) });
    }, 300);
    return () => clearTimeout(recDebounce.current);
  }, [receivingSearch]);

  const handlePageClick = (url) => {
    if (!url) return;
    try {
      const page = new URL(url, window.location.origin).searchParams.get('page');
      navigate(buildParams({ ...(page && { page }) }));
    } catch (e) { console.error(e); }
  };

  const handleTransactionsPageClick = (url) => {
    if (!url) return;
    try {
      const page = new URL(url, window.location.origin).searchParams.get('page');
      navigate({ ...(transactionsSearch?.trim() && { transactions_search: transactionsSearch }), ...(page && { page }) });
    } catch (e) { console.error(e); }
  };

  const handleReceivingPageClick = (url) => {
    if (!url) return;
    try {
      const page = new URL(url, window.location.origin).searchParams.get('page');
      navigate({ ...(receivingSearch?.trim() && { receiving_reports_search: receivingSearch }), ...(page && { page }) });
    } catch (e) { console.error(e); }
  };

  const pageLinks  = Array.isArray(paginationLinks) ? paginationLinks.filter(l => l?.label && !isNaN(Number(l.label))) : [];
  const prevLink   = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink   = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('next'))     ?? null;
  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  const transPrevLink = transactionsPaginationLinks.find?.(l => l.label?.toLowerCase()?.includes('previous')) ?? null;
  const transNextLink = transactionsPaginationLinks.find?.(l => l.label?.toLowerCase()?.includes('next'))     ?? null;
  const transPageLinks = Array.isArray(transactionsPaginationLinks) ? transactionsPaginationLinks.filter(l => l?.label && !isNaN(Number(l.label))) : [];

  const recPrevLink  = receivingPaginationLinks.find?.(l => l.label?.toLowerCase()?.includes('previous')) ?? null;
  const recNextLink  = receivingPaginationLinks.find?.(l => l.label?.toLowerCase()?.includes('next'))     ?? null;
  const recPageLinks = Array.isArray(receivingPaginationLinks) ? receivingPaginationLinks.filter(l => l?.label && !isNaN(Number(l.label))) : [];

  const handleStatusChange = (supply, newStatus) => {
    router.put(route('direct-supply-management.update-status', supply.id), { is_active: newStatus }, {
      preserveScroll: true, preserveState: true, only: ['supplies'],
      onSuccess: () => toast.success('Supply status updated successfully!'),
      onError:   () => toast.error('Failed to update status.'),
    });
  };

  const handleDeleteClick = (supply) => {
    if (supply.allocations_count > 0) {
      toast.error(
        <div>
          <p className="font-semibold">Cannot delete "{supply.supply_name}"</p>
          <p className="text-sm mt-1">This supply has existing allocations. You can archive it instead.</p>
        </div>,
        { duration: 5000 }
      );
      return;
    }
    setDeleteSupply(supply);
    setShowDeleteModal(true);
  };

  const handleArchive = (supply) => {
    router.put(route('direct-supply-management.archive', supply.id), {}, {
      preserveScroll: true,
      onSuccess: (page) => {
        const flash = page.props.flash;
        if (flash?.error) toast.error(flash.error);
        else toast.success(`"${supply.supply_name}" has been archived successfully.`);
      },
      onError: () => toast.error('Failed to archive supply.'),
    });
  };

  const tabs = [
    { key: 'supplies',          label: 'Supplies'          },
    { key: 'transactions',      label: 'Transactions'      },
    { key: 'receiving-reports', label: 'Receiving Reports' },
  ];

  if (!has('direct-supply.view')) {
    return (
      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Direct Supply Management" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">You don't have permission to view direct supplies.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <>
      {showAddModal      && <AddDirectSupply      setShowAddModal={setShowAddModal} />}
      {showEditModal     && editSupply    && <EditDirectSupply    setShowEditModal={setShowEditModal}       supply={editSupply} />}
      {showDeleteModal   && deleteSupply  && <DeleteDirectSupply  setShowDeleteModal={setShowDeleteModal}   supply={deleteSupply} />}
      {showAllocateModal && allocateSupply && <AllocateDirectSupply setShowAllocateModal={setShowAllocateModal} supply={allocateSupply} projects={projects} />}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Direct Supply Management" />

        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow-lg sm:rounded-lg p-4 sm:p-6 mt-2 border border-gray-100">

            {/* TAB HEADERS */}
            <div className="border-b border-gray-200 mb-6 overflow-x-auto">
              <div className="flex gap-4 w-max">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition
                      ${activeTab === tab.key
                        ? 'border-zinc-700 text-zinc-700 font-semibold'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── SUPPLIES TAB ── */}
            {activeTab === 'supplies' && (
              <>
                {/* Quick Stats */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Supplies</p>
                          <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">{stats.total_supplies}</p>
                        </div>
                        <div className="bg-blue-200 rounded-full p-2 sm:p-3">
                          <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Active Supplies</p>
                          <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">{stats.active_supplies}</p>
                        </div>
                        <div className="bg-green-200 rounded-full p-2 sm:p-3">
                          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Search + Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6 relative">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-72">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search supplies by code, name, supplier..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="pl-10 h-11 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Filter */}
                      <DropdownMenu open={showFilterCard} onOpenChange={(open) => { setShowFilterCard(open); if (open) setShowSortCard(false); }}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline"
                            className={`h-11 w-11 p-0 border-2 rounded-lg transition-all duration-200 flex items-center justify-center relative ${activeFiltersCount() > 0 ? 'bg-zinc-100 border-zinc-400 text-zinc-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                            title="Filters">
                            <Filter className="h-4 w-4" />
                            {activeFiltersCount() > 0 && (
                              <span className="absolute -top-1 -right-1 bg-zinc-700 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                                {activeFiltersCount()}
                              </span>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" sideOffset={6}
                          className="w-80 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col max-h-[500px] bg-white"
                          style={{ zIndex: 40 }}>
                          <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <Filter className="h-4 w-4 text-white" />
                              <h3 className="text-sm font-semibold text-white">Filter Supplies</h3>
                            </div>
                            <button onClick={() => setShowFilterCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                          </div>
                          <div className="p-4 overflow-y-auto flex-1">
                            {filterOptions.categories?.length > 0 && (
                              <div className="mb-4">
                                <Label className="text-xs font-semibold text-gray-700 mb-2 block">Category</Label>
                                <Select value={localFilters.category || 'all'} onValueChange={(v) => handleFilterChange('category', v)}>
                                  <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Categories" /></SelectTrigger>
                                  <SelectContent style={{ zIndex: 50 }}>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {filterOptions.categories.map((c) => <SelectItem key={c} value={c}>{capitalizeText(c)}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            <div className="mb-4">
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Status</Label>
                              <Select value={localFilters.is_active !== '' ? localFilters.is_active : 'all'} onValueChange={(v) => handleFilterChange('is_active', v)}>
                                <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                                <SelectContent style={{ zIndex: 50 }}>
                                  <SelectItem value="all">All Statuses</SelectItem>
                                  <SelectItem value="true">Active</SelectItem>
                                  <SelectItem value="false">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2 flex-shrink-0">
                            <Button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetFilters(); }}
                              variant="outline" className="flex-1 border-gray-300 hover:bg-gray-100 text-sm h-9"
                              disabled={activeFiltersCount() === 0 && sortBy === 'created_at' && sortOrder === 'desc'}>
                              Clear All
                            </Button>
                            <Button type="button" onClick={applyFilters}
                              className="flex-1 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md text-sm h-9">
                              Apply Filters
                            </Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Sort */}
                      <DropdownMenu open={showSortCard} onOpenChange={(open) => { setShowSortCard(open); if (open) setShowFilterCard(false); }}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline"
                            className="h-11 w-11 p-0 border-2 rounded-lg transition-all duration-200 flex items-center justify-center bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                            title="Sort">
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" sideOffset={6}
                          className="w-72 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col max-h-[300px] bg-white"
                          style={{ zIndex: 40 }}>
                          <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className="h-4 w-4 text-white" />
                              <h3 className="text-sm font-semibold text-white">Sort Supplies</h3>
                            </div>
                            <button onClick={() => setShowSortCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                          </div>
                          <div className="p-4 overflow-y-auto flex-1 space-y-4">
                            <div>
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Sort By</Label>
                              <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                                <SelectContent style={{ zIndex: 50 }}>
                                  <SelectItem value="created_at">Date Created</SelectItem>
                                  <SelectItem value="supply_code">Supply Code</SelectItem>
                                  <SelectItem value="supply_name">Supply Name</SelectItem>
                                  <SelectItem value="category">Category</SelectItem>
                                  <SelectItem value="unit_price">Unit Price</SelectItem>
                                  <SelectItem value="supplier_name">Supplier Name</SelectItem>
                                  <SelectItem value="is_active">Status</SelectItem>
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
                          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex-shrink-0">
                            <Button type="button" onClick={applySort}
                              className="w-full bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md text-sm h-9">
                              Apply Sort
                            </Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {has('direct-supply.create') && (
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="w-full sm:w-auto bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200 h-11 px-5 whitespace-nowrap text-sm flex items-center justify-center gap-2"
                    >
                      <SquarePen className="h-4 w-4" />
                      <span>Add Supply</span>
                    </Button>
                  )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
                  <Table className="min-w-[1200px] w-full">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        {columns.map((col, i) => (
                          <TableHead key={i} className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider"
                            style={col.width ? { width: col.width } : {}}>
                            {col.header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {supplies.length > 0 ? (
                        supplies.map((supply, index) => (
                          <TableRow key={supply.id}
                            className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                            <TableCell className="text-left px-4 py-4 text-sm font-semibold text-gray-900">
                              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                {supply.supply_code || '---'}
                              </span>
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm font-medium text-gray-900">
                              {capitalizeText(supply.supply_name)}
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                              {supply.category ? capitalizeText(supply.category) : <span className="text-gray-400 italic">No category</span>}
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                              {supply.unit_of_measure}
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm">
                              <span className="font-bold text-gray-900">₱{formatNumber(supply.unit_price)}</span>
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm">
                              <div className="font-medium text-gray-900">{supply.supplier_name}</div>
                              {supply.supplier_contact && <div className="text-xs text-gray-500">{supply.supplier_contact}</div>}
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm">
                              <div className="flex items-center gap-2">
                                {has('direct-supply.update') ? (
                                  <>
                                    <Switch checked={supply.is_active}
                                      onCheckedChange={(checked) => handleStatusChange(supply, checked)}
                                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600" />
                                    <span className={`text-xs font-medium ${supply.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                      {supply.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </>
                                ) : (
                                  <span className={`px-3 py-1.5                                   rounded-full text-xs font-medium ${
                                    supply.is_active
                                      ? 'bg-green-100 text-green-800 border border-green-200'
                                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                                  }`}>
                                    {supply.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm">
                              <div className="flex gap-1.5">
                                {has('direct-supply.allocate') && (
                                  <button onClick={() => { setAllocateSupply(supply); setShowAllocateModal(true); }}
                                    className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:scale-110 border border-blue-200 hover:border-blue-300"
                                    title="Allocate to Project">
                                    <PackagePlus size={16} />
                                  </button>
                                )}
                                {has('direct-supply.update') && (
                                  <button onClick={() => { setEditSupply(supply); setShowEditModal(true); }}
                                    className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all duration-200 hover:scale-110 border border-indigo-200 hover:border-indigo-300"
                                    title="Edit">
                                    <SquarePen size={16} />
                                  </button>
                                )}
                                {has('direct-supply.delete') && (
                                  <>
                                    {supply.allocations_count > 0 && (
                                      <button onClick={() => handleArchive(supply)}
                                        className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 hover:text-amber-700 transition-all duration-200 hover:scale-110 border border-amber-200 hover:border-amber-300"
                                        title="Archive Supply">
                                        <Archive size={16} />
                                      </button>
                                    )}
                                    <button onClick={() => handleDeleteClick(supply)}
                                      className={`p-1.5 rounded-lg transition-all duration-200 border ${
                                        supply.allocations_count > 0
                                          ? 'text-gray-300 border-gray-200 cursor-not-allowed'
                                          : 'hover:bg-red-100 text-red-600 hover:text-red-700 hover:scale-110 border-red-200 hover:border-red-300'
                                      }`}
                                      title={supply.allocations_count > 0 ? 'Cannot delete — has allocations. Use Archive instead.' : 'Delete'}
                                      disabled={supply.allocations_count > 0}>
                                      <Trash2 size={16} />
                                    </button>
                                  </>
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
                                <Search className="h-8 w-8 text-gray-400" />
                              </div>
                              <p className="text-gray-500 font-medium text-base">No supplies found</p>
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
                      Showing <span className="font-semibold text-gray-900">{supplies.length}</span> of{' '}
                      <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> supplies
                    </p>
                    <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
                      <button disabled={!prevLink?.url} onClick={() => handlePageClick(prevLink?.url)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 ${!prevLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
                        Previous
                      </button>
                      {pageLinks.map((link, idx) => (
                        <button key={idx} disabled={!link?.url} onClick={() => handlePageClick(link?.url)}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 min-w-[36px] ${link?.active ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'} ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}>
                          {link?.label || ''}
                        </button>
                      ))}
                      <button disabled={!nextLink?.url} onClick={() => handlePageClick(nextLink?.url)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 ${!nextLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── TRANSACTIONS TAB ── */}
            {activeTab === 'transactions' && (
              <>
                <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by supply name, code, project, or notes..."
                      value={transactionsSearch}
                      onChange={(e) => setTransactionsSearch(e.target.value)}
                      className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-full h-11 border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
                  <Table className="min-w-[1100px] w-full">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        {['Date', 'Supply', 'Project', 'Qty Allocated', 'Qty Received', 'Unit Price', 'Status', 'Allocated By', 'Notes'].map((h, i) => (
                          <TableHead key={i} className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionList.length > 0 ? (
                        transactionList.map((trans, index) => {
                          const ds = trans.direct_supply || trans.directSupply || {};
                          const project = trans.project || {};
                          const allocatedBy = trans.allocated_by || trans.allocatedBy || {};
                          const statusMap = {
                            pending:  { label: 'Pending',  cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
                            partial:  { label: 'Partial',  cls: 'bg-blue-100 text-blue-800 border-blue-200'       },
                            received: { label: 'Received', cls: 'bg-green-100 text-green-800 border-green-200'    },
                          };
                          const s = statusMap[trans.status] || { label: trans.status, cls: 'bg-gray-100 text-gray-800 border-gray-200' };
                          return (
                            <TableRow key={trans.id}
                              className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                              <TableCell className="px-4 py-4 text-sm text-gray-700">{formatDate(trans.allocated_at)}</TableCell>
                              <TableCell className="px-4 py-4 text-sm">
                                <div className="font-medium text-gray-900">{ds.supply_name || '---'}</div>
                                <div className="text-xs text-gray-500">{ds.supply_code || ''}</div>
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm">
                                {project.project_code
                                  ? <div><div className="font-medium text-gray-900">{project.project_code}</div><div className="text-xs text-gray-500">{project.project_name}</div></div>
                                  : <span className="text-gray-400">---</span>}
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm font-medium text-gray-900">
                                {formatNumber(trans.quantity_allocated)} <span className="text-gray-500 text-xs">{ds.unit_of_measure || 'units'}</span>
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm text-gray-700">
                                {formatNumber(trans.quantity_received || 0)} <span className="text-gray-500 text-xs">{ds.unit_of_measure || 'units'}</span>
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm">
                                {trans.unit_price ? <span className="font-bold text-gray-900">₱{formatNumber(trans.unit_price)}</span> : <span className="text-gray-400">---</span>}
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${s.cls}`}>{s.label}</span>
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm text-gray-700">
                                {allocatedBy.name || [allocatedBy.first_name, allocatedBy.last_name].filter(Boolean).join(' ') || '---'}
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm text-gray-700 max-w-xs truncate">{trans.notes || '---'}</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <div className="bg-gray-100 rounded-full p-4 mb-3"><Search className="h-8 w-8 text-gray-400" /></div>
                              <p className="text-gray-500 font-medium text-base">No transactions found</p>
                              <p className="text-gray-400 text-sm mt-1">Try adjusting your search</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {(transPageLinks.length > 0 || transPrevLink?.url || transNextLink?.url) && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-gray-200 gap-3">
                    <p className="text-sm text-gray-600 order-2 sm:order-1">
                      Showing <span className="font-semibold text-gray-900">{transactionList.length}</span> of{' '}
                      <span className="font-semibold text-gray-900">{transactionsPagination?.total || 0}</span> transactions
                    </p>
                    <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
                      <button disabled={!transPrevLink?.url} onClick={() => handleTransactionsPageClick(transPrevLink?.url)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 ${!transPrevLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
                        Previous
                      </button>
                      {transPageLinks.map((link, idx) => (
                        <button key={idx} disabled={!link?.url} onClick={() => handleTransactionsPageClick(link?.url)}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 min-w-[36px] ${link?.active ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'} ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}>
                          {link?.label || ''}
                        </button>
                      ))}
                      <button disabled={!transNextLink?.url} onClick={() => handleTransactionsPageClick(transNextLink?.url)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 ${!transNextLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── RECEIVING REPORTS TAB ── */}
            {activeTab === 'receiving-reports' && (
              <>
                <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by supply name, code, project, or notes..."
                      value={receivingSearch}
                      onChange={(e) => setReceivingSearch(e.target.value)}
                      className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-full h-11 border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
                  <Table className="min-w-[1000px] w-full">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        {['Date', 'Supply', 'Project', 'Qty Received', 'Condition', 'Received By', 'Notes'].map((h, i) => (
                          <TableHead key={i} className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receivingList.length > 0 ? (
                        receivingList.map((report, index) => {
                          const allocation = report.material_allocation || report.materialAllocation || {};
                          const ds = allocation.direct_supply || allocation.directSupply || {};
                          const project = allocation.project || {};
                          const receivedBy = report.received_by || report.receivedBy || {};
                          const conditionMap = {
                            complete:   'bg-green-100 text-green-800 border-green-200',
                            damaged:    'bg-red-100 text-red-800 border-red-200',
                            incomplete: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                          };
                          return (
                            <TableRow key={report.id}
                              className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                              <TableCell className="px-4 py-4 text-sm text-gray-700">{formatDate(report.received_at)}</TableCell>
                              <TableCell className="px-4 py-4 text-sm">
                                <div className="font-medium text-gray-900">{ds.supply_name || '---'}</div>
                                <div className="text-xs text-gray-500">{ds.supply_code || ''}</div>
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm">
                                {project.project_code
                                  ? <div><div className="font-medium text-gray-900">{project.project_code}</div><div className="text-xs text-gray-500">{project.project_name}</div></div>
                                  : <span className="text-gray-400">---</span>}
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm font-medium text-gray-900">
                                {formatNumber(report.quantity_received)} <span className="text-gray-500 text-xs">{ds.unit_of_measure || 'units'}</span>
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm">
                                {report.condition
                                  ? <span className={`px-2 py-1 rounded-full text-xs font-medium border ${conditionMap[report.condition?.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
                                      {report.condition.charAt(0).toUpperCase() + report.condition.slice(1)}
                                    </span>
                                  : <span className="text-gray-400">---</span>}
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm">
                                {(() => {
                                  const rb = receivedBy;
                                  const name = rb.name || [rb.first_name, rb.last_name].filter(Boolean).join(' ');
                                  return name ? <span className="font-medium text-gray-900">{name}</span> : <span className="text-gray-400">---</span>;
                                })()}
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm text-gray-700 max-w-xs truncate">{report.notes || '---'}</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <div className="bg-gray-100 rounded-full p-4 mb-3"><Search className="h-8 w-8 text-gray-400" /></div>
                              <p className="text-gray-500 font-medium text-base">No receiving reports found</p>
                              <p className="text-gray-400 text-sm mt-1">Try adjusting your search</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {(recPageLinks.length > 0 || recPrevLink?.url || recNextLink?.url) && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-gray-200 gap-3">
                    <p className="text-sm text-gray-600 order-2 sm:order-1">
                      Showing <span className="font-semibold text-gray-900">{receivingList.length}</span> of{' '}
                      <span className="font-semibold text-gray-900">{receivingPagination?.total || 0}</span> receiving reports
                    </p>
                    <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
                      <button disabled={!recPrevLink?.url} onClick={() => handleReceivingPageClick(recPrevLink?.url)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 ${!recPrevLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
                        Previous
                      </button>
                      {recPageLinks.map((link, idx) => (
                        <button key={idx} disabled={!link?.url} onClick={() => handleReceivingPageClick(link?.url)}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 min-w-[36px] ${link?.active ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'} ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}>
                          {link?.label || ''}
                        </button>
                      ))}
                      <button disabled={!recNextLink?.url} onClick={() => handleReceivingPageClick(recNextLink?.url)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all duration-200 ${!recNextLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
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

