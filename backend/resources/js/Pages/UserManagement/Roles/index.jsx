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
import { Trash2, SquarePen, X, Search, ArrowUpDown, Users, Shield, TrendingUp, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { usePermission } from '@/utils/permissions';

import AddRole from './add';
import DeleteRole from './delete';

export default function RolesIndex() {
  const { has } = usePermission();
  
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "User Management", href: route('user-management.roles-and-permissions.index') },
    { title: "Roles" },
  ];

  const columns = [
    { header: 'Role Name', width: '35%' },
    { header: 'Users Count', width: '20%' },
    { header: 'Created At', width: '25%' },
    { header: 'Action', width: '20%' },
  ];

  // Data from backend
  const pagination = usePage().props.roles;
  const roles = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const initialSearch = usePage().props.search || '';
  const pageProps = usePage().props;
  const [sortBy, setSortBy] = useState(pageProps.sort_by || 'created_at');
  const [sortOrder, setSortOrder] = useState(pageProps.sort_order || 'desc');

  // States
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRole, setDeleteRole] = useState(null);
  const [showSortCard, setShowSortCard] = useState(false);
  const sortCardRef = useRef(null);
  const sortButtonRef = useRef(null);
  const [sortPosition, setSortPosition] = useState({ top: 0, right: 0 });
  const debounceTimer = useRef(null);

  // Sync sort when props change
  useEffect(() => {
    if (pageProps.sort_by) setSortBy(pageProps.sort_by);
    if (pageProps.sort_order) setSortOrder(pageProps.sort_order);
  }, [pageProps.sort_by, pageProps.sort_order]);

  // Close sort card when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      
      // Check if click is on a Radix Select component (portal renders outside card)
      let isSelectClick = false;
      
      if (target.closest) {
        isSelectClick = 
          target.closest('[data-radix-select-content]') ||
          target.closest('[data-radix-select-viewport]') ||
          target.closest('[data-radix-select-item]') ||
          target.closest('[data-radix-select-scroll-up-button]') ||
          target.closest('[data-radix-select-scroll-down-button]') ||
          target.closest('[role="listbox"]') ||
          target.closest('[role="option"]');
      }
      
      if (!isSelectClick && target.getAttribute) {
        const role = target.getAttribute('role');
        const dataAttr = target.getAttribute('data-radix-select-content') || 
                        target.getAttribute('data-radix-select-viewport') ||
                        target.getAttribute('data-radix-select-item');
        isSelectClick = role === 'listbox' || role === 'option' || !!dataAttr;
      }
      
      if (!isSelectClick) {
        let element = target;
        while (element && element !== document.body) {
          if (element.getAttribute && element.getAttribute('data-radix-portal')) {
            isSelectClick = true;
            break;
          }
          element = element.parentElement;
        }
      }
      
      if (isSelectClick) {
        return;
      }

      if (sortCardRef.current && !sortCardRef.current.contains(target)) {
        setShowSortCard(false);
      }
    };

    if (showSortCard) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSortCard]);

  // Helper function to capitalize text properly
  const capitalizeText = (text) => {
    if (!text) return '';
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Apply sort
  const applySort = () => {
    const params = {
      ...(searchInput && { search: searchInput }),
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    
    router.get(route('user-management.roles-and-permissions.index'), params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onSuccess: () => {
        setShowSortCard(false);
      }
    });
  };

  // Handle search input
  const handleSearch = (e) => {
    setSearchInput(e.target.value);
  };

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const params = {
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (searchInput && searchInput.trim()) {
        params.search = searchInput;
      }
      router.get(
        route('user-management.roles-and-permissions.index'),
        params,
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  // Pagination
  const handlePageChange = ({ page }) => {
    const params = {
      page,
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    if (searchInput && searchInput.trim()) {
      params.search = searchInput;
    }
    
    router.get(
      route('user-management.roles-and-permissions.index'),
      params,
      { preserveState: true, preserveScroll: true, replace: true }
    );
  };

  const pageLinks = Array.isArray(paginationLinks)
    ? paginationLinks.filter(link => link?.label && !isNaN(Number(link.label)))
    : [];

  const prevLink = paginationLinks.find?.(link => link.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink = paginationLinks.find?.(link => link.label?.toLowerCase()?.includes('next')) ?? null;

  const handlePageClick = (url) => {
    if (url) {
      try {
        const urlObj = new URL(url, window.location.origin);
        const page = urlObj.searchParams.get('page');
        handlePageChange({ page });
      } catch (e) {
        console.error("Failed to parse pagination URL:", e);
      }
    }
  };

  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  // Check if user has permission to view roles
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
      {showAddModal && (
        <AddRole setShowAddModal={setShowAddModal} />
      )}
      {showDeleteModal && (
        <DeleteRole setShowDeleteModal={setShowDeleteModal} role={deleteRole} />
      )}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Roles" />

        <div className="w-full sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow-lg sm:rounded-lg p-6 mt-2 border border-gray-100">
            
            {/* Quick Stats */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Roles</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">{roles.length}</p>
                    </div>
                    <div className="bg-blue-200 rounded-full p-3">
                      <Shield className="h-5 w-5 text-blue-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Total Users</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">
                        {roles.reduce((sum, r) => sum + (r.users_count || 0), 0)}
                      </p>
                    </div>
                    <div className="bg-green-200 rounded-full p-3">
                      <Users className="h-5 w-5 text-green-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Average Users</p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">
                        {roles.length > 0 
                          ? Math.round(roles.reduce((sum, r) => sum + (r.users_count || 0), 0) / roles.length)
                          : 0
                        }
                      </p>
                    </div>
                    <div className="bg-purple-200 rounded-full p-3">
                      <TrendingUp className="h-5 w-5 text-purple-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search + Sort Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between relative z-50">
              <div className="flex flex-col sm:flex-row gap-3 items-center flex-1 relative z-50">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search roles by name..."
                    value={searchInput}
                    onChange={handleSearch}
                    className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-full h-11 border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex gap-2 relative z-50">
                  {/* Sort Button */}
                  <div className="relative z-50">
                    <Button
                      ref={sortButtonRef}
                      onClick={() => {
                        if (sortButtonRef.current) {
                          const rect = sortButtonRef.current.getBoundingClientRect();
                          setSortPosition({
                            top: rect.bottom + window.scrollY + 8,
                            right: window.innerWidth - rect.right,
                          });
                        }
                        setShowSortCard(!showSortCard);
                      }}
                      variant="outline"
                      className="h-11 w-11 p-0 border-2 rounded-lg transition-all duration-200 flex items-center justify-center bg-white border-gray-300 text-gray-700 hover:bg-gray-50 relative z-50"
                      title="Sort"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>

                    {/* Sort Card */}
                    {showSortCard && (
                      <div 
                        ref={sortCardRef} 
                        className="fixed w-80 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-[9999] overflow-hidden flex flex-col max-h-[300px]"
                        style={{
                          top: `${sortPosition.top}px`,
                          right: `${sortPosition.right}px`,
                        }}
                      >
                        <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <ArrowUpDown className="h-4 w-4 text-white" />
                            <h3 className="text-base font-semibold text-white">Sort Roles</h3>
                          </div>
                          <button
                            onClick={() => setShowSortCard(false)}
                            className="text-white hover:bg-zinc-900 rounded-lg p-1 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                          <div className="mb-4">
                            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Sort By</Label>
                            <Select
                              value={sortBy}
                              onValueChange={(value) => setSortBy(value)}
                            >
                              <SelectTrigger className="w-full h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="created_at">Date Created</SelectItem>
                                <SelectItem value="name">Role Name</SelectItem>
                                <SelectItem value="users_count">Users Count</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="mb-4">
                            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Order</Label>
                            <Select
                              value={sortOrder}
                              onValueChange={(value) => setSortOrder(value)}
                            >
                              <SelectTrigger className="w-full h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="asc">Ascending</SelectItem>
                                <SelectItem value="desc">Descending</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Sort Actions */}
                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2 flex-shrink-0">
                          <Button
                            type="button"
                            onClick={applySort}
                            className="flex-1 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md text-sm h-9"
                          >
                            Apply Sort
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {has('roles.create') && (
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6 h-11 whitespace-nowrap"
                >
                  <SquarePen className="mr-2 h-4 w-4" />
                  Add Role
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
              <Table className="min-w-[800px] w-full">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    {columns.map((col, i) => (
                      <TableHead
                        key={i}
                        className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider"
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
                        <TableCell className="text-left px-4 py-4 text-sm font-semibold text-gray-900">
                          <span className="font-medium">
                            {capitalizeText(role.name)}
                          </span>
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="font-medium text-gray-700">{role.users_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                          {new Date(role.created_at).toLocaleString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm">
                          <div className="flex gap-1.5">
                            {has('roles.update') && (
                              <Link href={route('user-management.roles-and-permissions.edit', role.id)}>
                                <button
                                  className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all duration-200 hover:scale-110 border border-indigo-200 hover:border-indigo-300"
                                  title="Edit Permissions"
                                  aria-label="Edit Permissions"
                                >
                                  <SquarePen size={16} />
                                </button>
                              </Link>
                            )}
                            {has('roles.delete') && (
                              <button
                                onClick={() => {
                                  setDeleteRole(role);
                                  setShowDeleteModal(true);
                                }}
                                className="p-2 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 hover:scale-110 border border-red-200 hover:border-red-300"
                                title="Delete"
                              >
                                <Trash2 size={16} />
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
                          <p className="text-gray-500 font-medium text-base">No roles found</p>
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
              <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-gray-200 gap-4">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{roles.length}</span> of{' '}
                  <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> roles
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={!prevLink?.url}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                      !prevLink?.url
                        ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow'
                    }`}
                    onClick={() => handlePageClick(prevLink?.url)}
                  >
                    Previous
                  </button>

                  {pageLinks.map((link, idx) => (
                    <button
                      key={idx}
                      disabled={!link?.url}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 min-w-[40px] ${
                        link?.active
                          ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white hover:from-zinc-800 hover:to-zinc-900 shadow-md'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow'
                      } ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}
                      onClick={() => handlePageClick(link?.url)}
                    >
                      {link?.label || ''}
                    </button>
                  ))}

                  <button
                    disabled={!nextLink?.url}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                      !nextLink?.url
                        ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow'
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
