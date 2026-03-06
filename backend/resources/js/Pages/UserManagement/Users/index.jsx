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
import { Trash2, SquarePen, UnlockIcon, X, Search, ArrowUpDown, Users, UserPlus, Shield, TrendingUp, AlertCircle, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { usePermission } from '@/utils/permissions';
import AddUser from './add';
import EditUser from './edit';
import ResetPassword from './reset';
import DeleteUser from './delete';

export default function UsersIndex() {
  const { has } = usePermission();

  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "User Management" },
  ];

  const columns = [
    { header: 'Name', width: '25%' },
    { header: 'Email', width: '30%' },
    { header: 'Role', width: '20%' },
    { header: 'Created At', width: '15%' },
    { header: 'Action', width: '10%' },
  ];

  const pagination = usePage().props.users;
  const users = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const roles = usePage().props.roles || [];
  const initialSearch = usePage().props.search || '';
  const filters = usePage().props.filters || {};
  const filterOptions = usePage().props.filterOptions || {};
  const pageProps = usePage().props;
  const stats = pageProps.stats || { total_users: 0, active_roles: 0, new_this_month: 0 };
  const [sortBy, setSortBy] = useState(pageProps.sort_by || 'created_at');
  const [sortOrder, setSortOrder] = useState(pageProps.sort_order || 'desc');

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUser, setDeleteUser] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [showSortCard, setShowSortCard] = useState(false);

  const initializeFilters = (filterProps) => ({ role: filterProps?.role || '' });
  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const debounceTimer = useRef(null);

  useEffect(() => {
    setLocalFilters(initializeFilters(filters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.role]);

  useEffect(() => {
    if (pageProps.sort_by) setSortBy(pageProps.sort_by);
    if (pageProps.sort_order) setSortOrder(pageProps.sort_order);
  }, [pageProps.sort_by, pageProps.sort_order]);

  const capitalizeText = (text) => {
    if (!text) return '';
    return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const activeFiltersCount = () => (localFilters.role ? 1 : 0);

  const handleFilterChange = (filterType, value) => {
    setLocalFilters(prev => ({ ...prev, [filterType]: value === 'all' ? '' : value }));
  };

  const buildParams = (overrides = {}) => ({
    sort_by: sortBy,
    sort_order: sortOrder,
    ...(searchInput?.trim() && { search: searchInput }),
    ...(localFilters.role && { role: localFilters.role }),
    ...overrides,
  });

  const applyFilters = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    router.get(route('user-management.users.index'), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowFilterCard(false),
    });
  };

  const applySort = () => {
    router.get(route('user-management.users.index'), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowSortCard(false),
    });
  };

  const resetFilters = () => {
    setLocalFilters({ role: '' });
    setSortBy('created_at');
    setSortOrder('desc');
    router.get(route('user-management.users.index'), { search: searchInput }, {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => { setShowFilterCard(false); setShowSortCard(false); },
    });
  };

  const handleSearch = (e) => setSearchInput(e.target.value);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.get(route('user-management.users.index'), buildParams(), {
        preserveState: true, preserveScroll: true, replace: true,
      });
    }, 300);
    return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handlePageChange = ({ page }) => {
    router.get(route('user-management.users.index'), buildParams({ page }), {
      preserveState: true, preserveScroll: true, replace: true,
    });
  };

  const pageLinks = Array.isArray(paginationLinks)
    ? paginationLinks.filter(l => l?.label && !isNaN(Number(l.label)))
    : [];
  const prevLink = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('next')) ?? null;
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

  if (!has('users.view')) {
    return (
      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Users" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">You don't have permission to view users.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <>
      {showAddModal && <AddUser setShowAddModal={setShowAddModal} roles={roles} />}
      {showEditModal && <EditUser setShowEditModal={setShowEditModal} user={editUser} roles={roles} />}
      {showDeleteModal && <DeleteUser setShowDeleteModal={setShowDeleteModal} user={deleteUser} />}
      {showResetModal && <ResetPassword setShowResetModal={setShowResetModal} user={resetUser} />}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Users" />

        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-lg rounded-lg p-4 sm:p-6 mt-2 border border-gray-100">

            {/* Quick Stats */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Users</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">{stats.total_users}</p>
                    </div>
                    <div className="bg-blue-200 rounded-full p-2 sm:p-3">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Active Roles</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">
                        {stats.active_roles}
                      </p>
                    </div>
                    <div className="bg-green-200 rounded-full p-2 sm:p-3">
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 sm:p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">New This Month</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-900 mt-1">
                        {stats.new_this_month}
                      </p>
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
              {/* Mobile: each piece stacked full width
                  Tablet/Desktop: [ Search ] gap [ Filter Sort ] gap [ Add User ] */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
                {/* Left cluster: Search + Filter + Sort */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={searchInput}
                      onChange={handleSearch}
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
                          <h3 className="text-sm font-semibold text-white">Filter Users</h3>
                        </div>
                        <button onClick={() => setShowFilterCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="p-4">
                        {filterOptions.roles?.length > 0 && (
                          <div>
                            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Role</Label>
                            <Select value={localFilters.role || 'all'} onValueChange={(v) => handleFilterChange('role', v)}>
                              <SelectTrigger className="w-full h-9">
                                <SelectValue placeholder="All Roles" />
                              </SelectTrigger>
                              <SelectContent style={{ zIndex: 50 }}>
                                <SelectItem value="all">All Roles</SelectItem>
                                {filterOptions.roles.map(role => (
                                  <SelectItem key={role} value={role}>{capitalizeText(role)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
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
                          <h3 className="text-sm font-semibold text-white">Sort Users</h3>
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
                              <SelectItem value="email">Email</SelectItem>
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
                </div>

                {/* Right: Add User */}
                {has('users.create') && (
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md h-11 px-5 whitespace-nowrap text-sm flex items-center justify-center gap-2"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Add User</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Table — horizontally scrollable on mobile */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
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
                  {users.length > 0 ? (
                    users.map((user, index) => (
                      <TableRow
                        key={user.id}
                        className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <TableCell className="px-3 sm:px-4 py-3 text-sm font-semibold text-gray-900">
                          {capitalizeText(user.name)}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-sm text-gray-700 break-all">
                          {user.email}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-sm">
                          {user.roles?.length > 0 ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                              {user.roles.map(r => capitalizeText(r.name)).join(', ')}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic text-xs">No Role</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                          {new Date(user.created_at).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-sm">
                          <div className="flex gap-1">
                            {has('users.update') && (
                              <button
                                onClick={() => { setEditUser(user); setShowEditModal(true); }}
                                className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600 transition-all border border-indigo-200 hover:border-indigo-300"
                                title="Edit"
                              >
                                <SquarePen size={14} />
                              </button>
                            )}
                            {has('users.reset-password') && (
                              <button
                                onClick={() => { setResetUser(user); setShowResetModal(true); }}
                                className="p-1.5 rounded-lg hover:bg-yellow-100 text-yellow-600 transition-all border border-yellow-200 hover:border-yellow-300"
                                title="Reset Password"
                              >
                                <UnlockIcon size={14} />
                              </button>
                            )}
                            {has('users.delete') && (
                              <button
                                onClick={() => { setDeleteUser(user); setShowDeleteModal(true); }}
                                className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-all border border-red-200 hover:border-red-300"
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
                      <TableCell colSpan={columns.length} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <div className="bg-gray-100 rounded-full p-4 mb-3">
                            <Search className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium">No users found</p>
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
                  Showing <span className="font-semibold text-gray-900">{users.length}</span> of{' '}
                  <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> users
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