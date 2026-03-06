import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
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
import { Trash2, SquarePen, Filter, X, Search, ArrowUpDown, AlertCircle, FolderOpen, TrendingUp, CheckCircle2, XCircle, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { Switch } from "@/Components/ui/switch";
import { usePermission } from '@/utils/permissions';
import { toast } from 'sonner';

import AddClientType from './add';
import EditClientType from './edit';
import DeleteClientType from './delete';

export default function ClientTypesIndex() {
  const { has } = usePermission();
  
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Client Type Management" },
  ];

  const columns = [
    { header: 'Name', width: '22%' },
    { header: 'Description', width: '33%' },
    { header: 'Client Count', width: '12%' },
    { header: 'Status', width: '13%' },
    { header: 'Actions', width: '10%' },
  ];

  const pageProps = usePage().props;
  const pagination = pageProps.clientTypes;
  const clientTypes = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const filters = pageProps.filters || {};
  const initialSearch = pageProps.search || '';
  const stats = pageProps.stats || { total: 0, active: 0, inactive: 0, total_clients: 0 };

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editClientType, setEditClientType] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteClientType, setDeleteClientType] = useState(null);
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [showSortCard, setShowSortCard] = useState(false);
  
  const initializeFilters = (filterProps) => ({
    is_active: filterProps?.is_active !== undefined && filterProps?.is_active !== '' ? filterProps.is_active : '',
  });
  
  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const [sortBy, setSortBy] = useState(pageProps.sort_by || 'created_at');
  const [sortOrder, setSortOrder] = useState(pageProps.sort_order || 'desc');
  const debounceTimer = useRef(null);

  useEffect(() => {
    setLocalFilters(initializeFilters(filters));
  }, [filters.is_active]);

  useEffect(() => {
    if (pageProps.sort_by) setSortBy(pageProps.sort_by);
    if (pageProps.sort_order) setSortOrder(pageProps.sort_order);
  }, [pageProps.sort_by, pageProps.sort_order]);

  const activeFiltersCount = () => {
    let count = 0;
    if (localFilters.is_active !== '' && localFilters.is_active !== null && localFilters.is_active !== undefined) count++;
    return count;
  };

  const handleFilterChange = (filterType, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [filterType]: value === 'all' ? '' : value
    }));
  };

  const buildParams = (overrides = {}) => ({
    sort_by: sortBy,
    sort_order: sortOrder,
    ...(searchInput?.trim() && { search: searchInput }),
    ...(localFilters.is_active !== '' && localFilters.is_active !== null && localFilters.is_active !== undefined && { is_active: localFilters.is_active }),
    ...overrides,
  });

  const applyFilters = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    router.get(route('client-type-management.index'), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowFilterCard(false),
      onError: (errors) => console.error('Filter application error:', errors),
    });
  };

  const applySort = () => {
    router.get(route('client-type-management.index'), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowSortCard(false),
    });
  };

  const resetFilters = () => {
    setLocalFilters({ is_active: '' });
    setSortBy('created_at');
    setSortOrder('desc');
    router.get(route('client-type-management.index'), { ...(searchInput?.trim() && { search: searchInput }) }, {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => { setShowFilterCard(false); setShowSortCard(false); },
    });
  };

  const handleSearch = (e) => setSearchInput(e.target.value);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.get(route('client-type-management.index'), buildParams(), {
        preserveState: true, preserveScroll: true, replace: true,
      });
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  const handlePageChange = ({ page }) => {
    router.get(route('client-type-management.index'), buildParams({ page }), {
      preserveState: true, preserveScroll: true, replace: true,
    });
  };

  const pageLinks = Array.isArray(paginationLinks)
    ? paginationLinks.filter(link => link?.label && !isNaN(Number(link.label)))
    : [];
  const prevLink = paginationLinks.find?.(link => link.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink = paginationLinks.find?.(link => link.label?.toLowerCase()?.includes('next')) ?? null;
  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  const handlePageClick = (url) => {
    if (!url) return;
    try {
      const page = new URL(url, window.location.origin).searchParams.get('page');
      handlePageChange({ page });
    } catch (e) {
      console.error("Failed to parse pagination URL:", e);
    }
  };

  const handleStatusChange = (clientType, newStatus) => {
    router.put(route('client-type-management.update-status', clientType.id), {
      is_active: newStatus,
    }, {
      preserveScroll: true,
      preserveState: true,
      only: ['clientTypes', 'stats'],
      onSuccess: () => toast.success('Client type status updated successfully!'),
      onError: (errors) => {
        const errorMessage = errors.message || 'Failed to update status.';
        toast.error(errorMessage);
      },
    });
  };

  if (!has('clients.view')) {
    return (
      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Client Types" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">You don't have permission to view client types.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <>
      {showAddModal && <AddClientType setShowAddModal={setShowAddModal} />}
      {showEditModal && editClientType && <EditClientType setShowEditModal={setShowEditModal} clientType={editClientType} />}
      {showDeleteModal && deleteClientType && <DeleteClientType setShowDeleteModal={setShowDeleteModal} clientType={deleteClientType} />}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Client Types" />

        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow-lg sm:rounded-lg p-4 sm:p-6 mt-2 border border-gray-100">
            
            {/* Quick Stats — server-driven totals */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Types</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-blue-200 rounded-full p-2 sm:p-3">
                      <FolderOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Active</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">{stats.active}</p>
                    </div>
                    <div className="bg-green-200 rounded-full p-2 sm:p-3">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 sm:p-4 border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Inactive</p>
                      <p className="text-xl sm:text-2xl font-bold text-red-900 mt-1">{stats.inactive}</p>
                    </div>
                    <div className="bg-red-200 rounded-full p-2 sm:p-3">
                      <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 sm:p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Total Clients</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-900 mt-1">{stats.total_clients}</p>
                    </div>
                    <div className="bg-purple-200 rounded-full p-2 sm:p-3">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search + Filter + Add Bar */}
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">

                {/* Left cluster: Search + Filter + Sort */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search client types..."
                      value={searchInput}
                      onChange={handleSearch}
                      className="pl-10 h-11 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Filter */}
                    <DropdownMenu open={showFilterCard} onOpenChange={(open) => {
                      setShowFilterCard(open);
                      if (open) setShowSortCard(false);
                    }}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className={`h-11 w-11 p-0 border-2 rounded-lg flex items-center justify-center relative ${
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
                            <h3 className="text-sm font-semibold text-white">Filter Client Types</h3>
                          </div>
                          <button onClick={() => setShowFilterCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-4">
                          <Label className="text-xs font-semibold text-gray-700 mb-2 block">Status</Label>
                          <Select
                            value={localFilters.is_active !== '' && localFilters.is_active !== null && localFilters.is_active !== undefined ? String(localFilters.is_active) : 'all'}
                            onValueChange={(value) => handleFilterChange('is_active', value)}
                          >
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent style={{ zIndex: 50 }}>
                              <SelectItem value="all">All Status</SelectItem>
                              <SelectItem value="true">Active</SelectItem>
                              <SelectItem value="false">Inactive</SelectItem>
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
                          className="h-11 w-11 p-0 border-2 rounded-lg flex items-center justify-center bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
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
                            <h3 className="text-sm font-semibold text-white">Sort Client Types</h3>
                          </div>
                          <button onClick={() => setShowSortCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="p-4 space-y-4">
                          <div>
                            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Sort By</Label>
                            <Select value={sortBy} onValueChange={setSortBy}>
                              <SelectTrigger className="w-full h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent style={{ zIndex: 50 }}>
                                <SelectItem value="created_at">Date Created</SelectItem>
                                <SelectItem value="name">Name</SelectItem>
                                <SelectItem value="is_active">Status</SelectItem>
                                <SelectItem value="clients_count">Client Count</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Order</Label>
                            <Select value={sortOrder} onValueChange={setSortOrder}>
                              <SelectTrigger className="w-full h-9">
                                <SelectValue />
                              </SelectTrigger>
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
                            onClick={applySort}
                            className="w-full bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9"
                          >
                            Apply Sort
                          </Button>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Right: Add Client Type */}
                {has('clients.create') && (
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md h-11 px-5 whitespace-nowrap text-sm flex items-center justify-center gap-2"
                  >
                    <SquarePen className="h-4 w-4" />
                    <span>Add Client Type</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
              <Table className="min-w-[640px] w-full">
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
                  {clientTypes.length > 0 ? (
                    clientTypes.map((clientType, index) => (
                      <TableRow 
                        key={clientType.id}
                        className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <TableCell className="px-3 sm:px-4 py-3 text-sm font-semibold text-gray-900">
                          {clientType.name}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-sm text-gray-700">
                          {clientType.description || <span className="text-gray-400 italic">No description</span>}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-sm">
                          {(clientType.clients_count || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
                              <Users className="h-3 w-3" />
                              {clientType.clients_count}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500 border border-gray-200">
                              <Users className="h-3 w-3" />
                              0
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={clientType.is_active}
                              onCheckedChange={(checked) => handleStatusChange(clientType, checked)}
                              disabled={!has('clients.update')}
                              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                            />
                            <span className={`text-xs font-medium ${
                              clientType.is_active ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {clientType.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-sm">
                          <div className="flex gap-1">
                            {has('clients.update') && (
                              <button
                                onClick={() => {
                                  setEditClientType(clientType);
                                  setShowEditModal(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all border border-indigo-200 hover:border-indigo-300"
                                title="Edit"
                              >
                                <SquarePen size={14} />
                              </button>
                            )}
                            {has('clients.delete') && (
                              <button
                                onClick={() => {
                                  setDeleteClientType(clientType);
                                  setShowDeleteModal(true);
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition-all border border-red-200 hover:border-red-300"
                                title="Delete"
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
                      <TableCell colSpan={columns.length} className="text-center py-12 text-gray-500">
                        <div className="flex flex-col items-center justify-center">
                          <div className="bg-gray-100 rounded-full p-4 mb-3">
                            <FolderOpen className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium">No client types found</p>
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
                  Showing <span className="font-semibold text-gray-900">{pagination?.from || 0}</span> to{' '}
                  <span className="font-semibold text-gray-900">{pagination?.to || 0}</span> of{' '}
                  <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> results
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