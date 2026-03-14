import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/Components/ui/table";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Label } from "@/Components/ui/label";
import {
  Trash2, SquarePen, Filter, X, Search, UserCheck, Users,
  ArrowUpDown, AlertCircle, User,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { Switch } from "@/Components/ui/switch";
import { usePermission } from '@/utils/permissions';
import { toast } from 'sonner';

import AddEmployee from './add';
import EditEmployee from './edit';
import DeleteEmployee from './delete';

export default function EmployeesIndex() {
  const { has } = usePermission();
  const { flash } = usePage().props;
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Employee Management" },
  ];

  const columns = [
    { header: 'Employee',  width: '22%' },
    { header: 'Contact',   width: '20%' },
    { header: 'Position',  width: '18%' },
    { header: 'Status',    width: '15%' },
    { header: 'Actions',   width: '10%' },
  ];

  const pagination      = usePage().props.employees;
  const employees       = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const filters         = usePage().props.filters || {};
  const filterOptions   = usePage().props.filterOptions || {};
  const initialSearch   = usePage().props.search || '';
  const pageProps       = usePage().props;
  const stats           = pageProps.stats || { total: 0, active: 0, inactive: 0 };

  useEffect(() => {
    if (flash?.success) toast.success(flash.success);
    if (flash?.error)   toast.error(flash.error);
    if (flash?.warning) toast.warning(flash.warning);
    if (flash?.info)    toast.info(flash.info);
  }, [flash]);

  const [searchInput, setSearchInput]         = useState(initialSearch);
  const [showAddModal, setShowAddModal]       = useState(false);
  const [showEditModal, setShowEditModal]     = useState(false);
  const [editEmployee, setEditEmployee]       = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmployee, setDeleteEmployee]   = useState(null);
  const [showFilterCard, setShowFilterCard]   = useState(false);
  const [showSortCard, setShowSortCard]       = useState(false);

  const initializeFilters = (f) => ({
    is_active: f?.is_active !== undefined && f?.is_active !== '' ? f.is_active : '',
    position:  f?.position || '',
  });

  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const [sortBy, setSortBy]       = useState(pageProps.sort_by || 'created_at');
  const [sortOrder, setSortOrder] = useState(pageProps.sort_order || 'desc');
  const debounceTimer = useRef(null);

  useEffect(() => { setLocalFilters(initializeFilters(filters)); }, [filters.is_active, filters.position]);
  useEffect(() => {
    if (pageProps.sort_by)    setSortBy(pageProps.sort_by);
    if (pageProps.sort_order) setSortOrder(pageProps.sort_order);
  }, [pageProps.sort_by, pageProps.sort_order]);

  const capitalizeText = (text) => {
    if (!text) return '';
    return text.replace(/(^|[\s\-'\/])(\S)/g, (match, sep, char) => sep + char.toUpperCase());
  };

  const activeFiltersCount = () => {
    let count = 0;
    if (localFilters.is_active !== '' && localFilters.is_active !== undefined && localFilters.is_active !== null) count++;
    if (localFilters.position && localFilters.position !== 'all') count++;
    return count;
  };

  const handleFilterChange = (filterType, value) => {
    setLocalFilters(prev => ({ ...prev, [filterType]: value === 'all' ? '' : value }));
  };

  const buildParams = (overrides = {}) => ({
    sort_by: sortBy, sort_order: sortOrder,
    ...(searchInput?.trim() && { search: searchInput }),
    ...(localFilters.is_active !== '' && localFilters.is_active !== undefined && localFilters.is_active !== null && {
      is_active: localFilters.is_active === true || localFilters.is_active === 'true' || localFilters.is_active === 1 || localFilters.is_active === '1' ? 1 : 0
    }),
    ...(localFilters.position && localFilters.position !== 'all' && { position: localFilters.position }),
    ...overrides,
  });

  const applyFilters = (e) => {
    e?.preventDefault(); e?.stopPropagation();
    router.get(route('employee-management.index'), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowFilterCard(false),
    });
  };

  const applySort = () => {
    router.get(route('employee-management.index'), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowSortCard(false),
    });
  };

  const resetFilters = () => {
    setLocalFilters({ is_active: '', position: '' });
    setSortBy('created_at'); setSortOrder('desc');
    router.get(route('employee-management.index'), { ...(searchInput?.trim() && { search: searchInput }) }, {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => { setShowFilterCard(false); setShowSortCard(false); },
    });
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.get(route('employee-management.index'), buildParams(), {
        preserveState: true, preserveScroll: true, replace: true,
      });
    }, 300);
    return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handlePageChange = ({ page }) => {
    router.get(route('employee-management.index'), buildParams({ page }), {
      preserveState: true, preserveScroll: true, replace: true,
    });
  };

  const pageLinks      = Array.isArray(paginationLinks) ? paginationLinks.filter(l => l?.label && !isNaN(Number(l.label))) : [];
  const prevLink       = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink       = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('next')) ?? null;
  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  const handlePageClick = (url) => {
    if (!url) return;
    try {
      const page = new URL(url, window.location.origin).searchParams.get('page');
      handlePageChange({ page });
    } catch (e) { console.error("Failed to parse pagination URL:", e); }
  };

  const handleStatusChange = (employee, newStatus) => {
    router.put(route('employee-management.update-status', employee.id), { is_active: newStatus }, {
      preserveScroll: true, preserveState: true, only: ['employees', 'flash'],
    });
  };

  const avatarColors = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-cyan-500'];
  const avatarColor  = (id) => avatarColors[id % avatarColors.length];
  const initials     = (first, last) => `${first?.[0] ?? ''}${last?.[0] ?? ''}`.toUpperCase();

  if (!has('employees.view')) {
    return (
      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Employees" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">You don't have permission to view employees.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <>
      {showAddModal    && <AddEmployee setShowAddModal={setShowAddModal} />}
      {showEditModal   && <EditEmployee setShowEditModal={setShowEditModal} employee={editEmployee} />}
      {showDeleteModal && <DeleteEmployee setShowDeleteModal={setShowDeleteModal} employee={deleteEmployee} />}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Employees" />

        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-lg rounded-lg p-4 sm:p-6 mt-2 border border-gray-100">

            {/* Stats */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Employees</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-blue-200 rounded-full p-2 sm:p-3"><Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" /></div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Active</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">{stats.active}</p>
                    </div>
                    <div className="bg-green-200 rounded-full p-2 sm:p-3"><UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" /></div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 sm:p-4 border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Inactive</p>
                      <p className="text-xl sm:text-2xl font-bold text-red-900 mt-1">{stats.inactive}</p>
                    </div>
                    <div className="bg-red-200 rounded-full p-2 sm:p-3"><AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-700" /></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search + Filter + Add Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full mb-6">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by name, email, ID, or position..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    className="pl-10 h-11 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                          <span className="absolute -top-1 -right-1 bg-zinc-700 text-white text-xs font-semibold rounded-full h-4 w-4 flex items-center justify-center">{activeFiltersCount()}</span>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" sideOffset={6} className="w-72 p-0 rounded-xl shadow-xl border-2 border-gray-200 overflow-hidden flex flex-col bg-white" style={{ zIndex: 40 }}>
                      <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-white" /><h3 className="text-sm font-semibold text-white">Filter Employees</h3></div>
                        <button onClick={() => setShowFilterCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="p-4 space-y-4">
                        <div>
                          <Label className="text-xs font-semibold text-gray-700 mb-2 block">Status</Label>
                          <Select
                            value={localFilters.is_active === '' || localFilters.is_active === undefined || localFilters.is_active === null ? 'all' : (localFilters.is_active === true || localFilters.is_active === 'true' || localFilters.is_active === 1 || localFilters.is_active === '1' ? 'true' : 'false')}
                            onValueChange={(value) => {
                              if (value === 'all') handleFilterChange('is_active', '');
                              else setLocalFilters(prev => ({ ...prev, is_active: value === 'true' }));
                            }}>
                            <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                            <SelectContent style={{ zIndex: 50 }}>
                              <SelectItem value="all">All Statuses</SelectItem>
                              <SelectItem value="true">Active</SelectItem>
                              <SelectItem value="false">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {filterOptions.positions?.length > 0 && (
                          <div>
                            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Position</Label>
                            <Select value={localFilters.position || 'all'} onValueChange={(v) => handleFilterChange('position', v)}>
                              <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Positions" /></SelectTrigger>
                              <SelectContent style={{ zIndex: 50 }}>
                                <SelectItem value="all">All Positions</SelectItem>
                                {filterOptions.positions.map(p => <SelectItem key={p} value={p}>{capitalizeText(p)}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2">
                        <Button type="button" onClick={(e) => { e.preventDefault(); resetFilters(); }} variant="outline" className="flex-1 border-gray-300 text-sm h-9" disabled={activeFiltersCount() === 0 && sortBy === 'created_at' && sortOrder === 'desc'}>Clear</Button>
                        <Button type="button" onClick={applyFilters} className="flex-1 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9">Apply</Button>
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
                        <div className="flex items-center gap-2"><ArrowUpDown className="h-4 w-4 text-white" /><h3 className="text-sm font-semibold text-white">Sort Employees</h3></div>
                        <button onClick={() => setShowSortCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="p-4 space-y-4">
                        <div>
                          <Label className="text-xs font-semibold text-gray-700 mb-2 block">Sort By</Label>
                          <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                            <SelectContent style={{ zIndex: 50 }}>
                              <SelectItem value="created_at">Date Created</SelectItem>
                              <SelectItem value="first_name">First Name</SelectItem>
                              <SelectItem value="last_name">Last Name</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="position">Position</SelectItem>
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
                      <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                        <Button type="button" onClick={applySort} className="w-full bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9">Apply Sort</Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {has('employees.create') && (
                <Button onClick={() => setShowAddModal(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md h-11 px-5 whitespace-nowrap text-sm flex items-center justify-center gap-2">
                  <SquarePen className="h-4 w-4" />
                  <span>Add Employee</span>
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <Table className="min-w-[700px] w-full">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    {columns.map((col, i) => (
                      <TableHead key={i} className="text-left font-bold px-3 sm:px-4 py-3 text-xs text-gray-700 uppercase tracking-wider" style={col.width ? { width: col.width } : {}}>
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.length > 0 ? (
                    employees.map((employee, index) => (
                      <TableRow key={employee.id} className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>

                        {/* Employee — avatar + name + employee_id */}
                        <TableCell className="px-3 sm:px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm overflow-hidden ${employee.profile_image_url ? '' : avatarColor(employee.id)}`}>
                              {employee.profile_image_url
                                ? <img src={employee.profile_image_url} alt={employee.full_name} className="h-full w-full object-cover" />
                                : initials(employee.first_name, employee.last_name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate">{capitalizeText(`${employee.first_name} ${employee.last_name}`)}</p>
                              {employee.employee_id && <p className="text-xs text-gray-400 font-mono">{employee.employee_id}</p>}
                            </div>
                          </div>
                        </TableCell>

                        {/* Contact — email + phone */}
                        <TableCell className="px-3 sm:px-4 py-3">
                          <p className="text-sm text-gray-700 truncate max-w-[180px]">{employee.email || <span className="text-gray-400 italic">No email</span>}</p>
                          {employee.phone && <p className="text-xs text-gray-400 mt-0.5">{employee.phone}</p>}
                        </TableCell>

                        {/* Position */}
                        <TableCell className="px-3 sm:px-4 py-3 text-sm">
                          {employee.position ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                              {capitalizeText(employee.position)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">No position</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell className="px-3 sm:px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            {has('employees.update-status') ? (
                              <>
                                <Switch checked={employee.is_active} onCheckedChange={(checked) => handleStatusChange(employee, checked)}
                                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600" />
                                <span className={`text-xs font-medium ${employee.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                  {employee.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </>
                            ) : (
                              <span className={`text-xs font-medium px-2 py-1 rounded ${employee.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {employee.is_active ? 'Active' : 'Inactive'}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="px-3 sm:px-4 py-3 text-sm">
                          <div className="flex gap-1">
                            {has('employees.update') && (
                              <button onClick={() => { setEditEmployee(employee); setShowEditModal(true); }}
                                className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600 transition-all border border-indigo-200 hover:border-indigo-300" title="Edit">
                                <SquarePen size={14} />
                              </button>
                            )}
                            {has('employees.delete') && (
                              <button onClick={() => { setDeleteEmployee(employee); setShowDeleteModal(true); }}
                                className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-all border border-red-200 hover:border-red-300" title="Delete">
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
                          <div className="bg-gray-100 rounded-full p-4 mb-3"><User className="h-8 w-8 text-gray-400" /></div>
                          <p className="text-gray-500 font-medium">No employees found</p>
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
                  Showing <span className="font-semibold text-gray-900">{employees.length}</span> of{' '}
                  <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> employees
                </p>
                <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
                  <button disabled={!prevLink?.url} onClick={() => handlePageClick(prevLink?.url)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${!prevLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
                    Previous
                  </button>
                  {pageLinks.map((link, idx) => (
                    <button key={idx} disabled={!link?.url} onClick={() => handlePageClick(link?.url)}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all min-w-[36px] ${link?.active ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'} ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}>
                      {link?.label || ''}
                    </button>
                  ))}
                  <button disabled={!nextLink?.url} onClick={() => handlePageClick(nextLink?.url)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${!nextLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
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