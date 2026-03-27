import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
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
import { Trash2, SquarePen, X, Search, ArrowUpDown, Users, Shield, TrendingUp, AlertCircle, ShieldPlus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { usePermission } from '@/utils/permissions';

import AddRole from './add';
import DeleteRole from './delete';

export default function RolesIndex() {
  const { has } = usePermission();

  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Roles & Permissions" },
  ];

  const columns = [
    { header: 'Role Name', width: '35%' },
    { header: 'Users Count', width: '20%' },
    { header: 'Created At', width: '25%' },
    { header: 'Action', width: '20%' },
  ];

  const pagination = usePage().props.roles;
  const roles = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const initialSearch = usePage().props.search || '';
  const pageProps = usePage().props;
  const [sortBy, setSortBy] = useState(pageProps.sort_by || 'created_at');
  const [sortOrder, setSortOrder] = useState(pageProps.sort_order || 'desc');

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRole, setDeleteRole] = useState(null);
  const [showSortCard, setShowSortCard] = useState(false);
  const debounceTimer = useRef(null);

  // Stats derived from current page data — ideally pass from backend
  const totalRoles = pagination?.total || roles.length;
  const totalUsers = roles.reduce((sum, r) => sum + (r.users_count || 0), 0);
  const avgUsers = roles.length > 0 ? Math.round(totalUsers / roles.length) : 0;

  useEffect(() => {
    if (pageProps.sort_by) setSortBy(pageProps.sort_by);
    if (pageProps.sort_order) setSortOrder(pageProps.sort_order);
  }, [pageProps.sort_by, pageProps.sort_order]);

  const capitalizeText = (text) => {
    if (!text) return '';
    return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const buildParams = (overrides = {}) => ({
    sort_by: sortBy,
    sort_order: sortOrder,
    ...(searchInput?.trim() && { search: searchInput }),
    ...overrides,
  });

  const applySort = () => {
    router.get(route('user-management.roles-and-permissions.index'), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowSortCard(false),
    });
  };

  const handleSearch = (e) => setSearchInput(e.target.value);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.get(route('user-management.roles-and-permissions.index'), buildParams(), {
        preserveState: true, preserveScroll: true, replace: true,
      });
    }, 300);
    return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handlePageChange = ({ page }) => {
    router.get(route('user-management.roles-and-permissions.index'), buildParams({ page }), {
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

  if (!has('roles.view')) {
    return (
      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Roles" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">You don't have permission to view roles.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <>
      {showAddModal && <AddRole setShowAddModal={setShowAddModal} />}
      {showDeleteModal && <DeleteRole setShowDeleteModal={setShowDeleteModal} role={deleteRole} />}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Roles" />

        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-lg rounded-lg p-4 sm:p-6 mt-2 border border-gray-100">

            {/* Quick Stats */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Roles</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">{totalRoles}</p>
                    </div>
                    <div className="bg-blue-200 rounded-full p-2 sm:p-3">
                      <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Total Users</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">{totalUsers}</p>
                    </div>
                    <div className="bg-green-200 rounded-full p-2 sm:p-3">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 sm:p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Average Users</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-900 mt-1">{avgUsers}</p>
                    </div>
                    <div className="bg-purple-200 rounded-full p-2 sm:p-3">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search + Sort + Add Bar */}
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
                {/* Left cluster: Search + Sort */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search roles by name..."
                      value={searchInput}
                      onChange={handleSearch}
                      className="pl-10 h-11 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  {/* Sort */}
                  <DropdownMenu open={showSortCard} onOpenChange={setShowSortCard}>
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
                          <h3 className="text-sm font-semibold text-white">Sort Roles</h3>
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
                              <SelectItem value="name">Role Name</SelectItem>
                              <SelectItem value="users_count">Users Count</SelectItem>
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

                {/* Right: Add Role */}
                {has('roles.create') && (
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md h-11 px-5 whitespace-nowrap text-sm flex items-center justify-center gap-2"
                  >
                    <ShieldPlus className="h-4 w-4" />
                    <span>Add Role</span>
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
                  {roles.length > 0 ? (
                    roles.map((role, index) => (
                      <TableRow
                        key={role.id}
                        className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <TableCell className="px-3 sm:px-4 py-3 text-sm font-semibold text-gray-900">
                          {capitalizeText(role.name)}
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <span className="font-medium text-gray-700">{role.users_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                          {new Date(role.created_at).toLocaleString('en-US', {
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
                            {has('roles.update') && (
                              <Link href={route('user-management.roles-and-permissions.edit', role.id)}>
                                <button
                                  className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600 transition-all border border-indigo-200 hover:border-indigo-300"
                                  title="Edit Permissions"
                                >
                                  <SquarePen size={14} />
                                </button>
                              </Link>
                            )}
                            {has('roles.delete') && (
                              <button
                                onClick={() => { setDeleteRole(role); setShowDeleteModal(true); }}
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
                          <p className="text-gray-500 font-medium">No roles found</p>
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
                  Showing <span className="font-semibold text-gray-900">{roles.length}</span> of{' '}
                  <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> roles
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