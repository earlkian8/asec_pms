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
import { Trash2, SquarePen, Filter, X, Search, UserCheck, Users, ArrowUpDown, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Switch } from "@/Components/ui/switch";
import { usePermission } from '@/utils/permissions';
import { toast } from 'sonner';

import AddEmployee from './add';
import EditEmployee from './edit';
import DeleteEmployee from './delete';

export default function EmployeesIndex() {
  const { has } = usePermission();
  
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Employee Management", href: route('employee-management.index') },
    { title: "Employees" },
  ];

  const columns = [
    { header: 'Name', width: '20%' },
    { header: 'Email', width: '20%' },
    { header: 'Phone', width: '15%' },
    { header: 'Position', width: '15%' },
    { header: 'Status', width: '15%' },
    { header: 'Actions', width: '15%' },
  ];

  // Data from backend
  const pagination = usePage().props.employees;
  const employees = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const filters = usePage().props.filters || {};
  const filterOptions = usePage().props.filterOptions || {};
  const initialSearch = usePage().props.search || '';

  // States
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmployee, setDeleteEmployee] = useState(null);
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [showSortCard, setShowSortCard] = useState(false);
  const filterCardRef = useRef(null);
  const sortCardRef = useRef(null);
  const filterButtonRef = useRef(null);
  const sortButtonRef = useRef(null);
  const [filterPosition, setFilterPosition] = useState({ top: 0, right: 0 });
  const [sortPosition, setSortPosition] = useState({ top: 0, right: 0 });
  
  // Initialize filters from props
  const initializeFilters = (filterProps) => {
    return {
      is_active: filterProps?.is_active !== undefined && filterProps?.is_active !== '' ? filterProps.is_active : '',
      position: filterProps?.position || '',
    };
  };
  
  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const pageProps = usePage().props;
  const [sortBy, setSortBy] = useState(pageProps.sort_by || 'created_at');
  const [sortOrder, setSortOrder] = useState(pageProps.sort_order || 'desc');
  const debounceTimer = useRef(null);

  // Sync filters when props change
  useEffect(() => {
    const newFilters = initializeFilters(filters);
    setLocalFilters(newFilters);
  }, [filters.is_active, filters.position]);

  // Sync sort when props change
  useEffect(() => {
    if (pageProps.sort_by) setSortBy(pageProps.sort_by);
    if (pageProps.sort_order) setSortOrder(pageProps.sort_order);
  }, [pageProps.sort_by, pageProps.sort_order]);

  // Close filter/sort cards when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      
      // Check if click is on a Radix Select component
      let isSelectClick = false;
      
      if (target.closest) {
        isSelectClick = 
          target.closest('[data-radix-select-content]') ||
          target.closest('[data-radix-select-viewport]') ||
          target.closest('[data-radix-select-item]') ||
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
        let current = target;
        while (current) {
          if (current.id && current.id.startsWith('radix-')) {
            isSelectClick = true;
            break;
          }
          current = current.parentElement;
        }
      }

      if (isSelectClick) {
        return;
      }

      if (filterCardRef.current && !filterCardRef.current.contains(event.target)) {
        setShowFilterCard(false);
      }
      if (sortCardRef.current && !sortCardRef.current.contains(event.target)) {
        setShowSortCard(false);
      }
    };

    if (showFilterCard || showSortCard) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterCard, showSortCard]);

  // Helper function to capitalize text properly
  const capitalizeText = (text) => {
    if (!text) return '';
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Count active filters
  const activeFiltersCount = () => {
    let count = 0;
    if (localFilters.is_active !== '' && localFilters.is_active !== undefined && localFilters.is_active !== null) count++;
    if (localFilters.position && localFilters.position !== 'all') count++;
    return count;
  };

  // Handle filter select changes
  const handleFilterChange = (filterType, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [filterType]: value === 'all' ? '' : value
    }));
  };

  // Apply filters
  const applyFilters = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      const params = {
        ...(searchInput && { search: searchInput }),
        ...(localFilters.is_active !== '' && localFilters.is_active !== undefined && localFilters.is_active !== null && { is_active: localFilters.is_active === true || localFilters.is_active === 'true' || localFilters.is_active === 1 || localFilters.is_active === '1' ? 1 : 0 }),
        ...(localFilters.position && { position: localFilters.position }),
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      
      router.get(route('employee-management.index'), params, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        onSuccess: () => {
          setShowFilterCard(false);
        },
        onError: (errors) => {
          console.error('Filter application error:', errors);
        }
      });
    } catch (error) {
      console.error('Error applying filters:', error);
    }
  };

  // Apply sort
  const applySort = () => {
    const params = {
      ...(searchInput && { search: searchInput }),
      ...(localFilters.is_active !== '' && localFilters.is_active !== undefined && { is_active: localFilters.is_active }),
      ...(localFilters.position && { position: localFilters.position }),
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    
    router.get(route('employee-management.index'), params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onSuccess: () => {
        setShowSortCard(false);
      }
    });
  };

  // Reset/Clear all filters
  const resetFilters = () => {
    setLocalFilters({
      is_active: '',
      position: '',
    });
    setSortBy('created_at');
    setSortOrder('desc');
    router.get(route('employee-management.index'), { search: searchInput }, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onSuccess: () => {
        setShowFilterCard(false);
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
      router.get(
        route('employee-management.index'),
        { search: searchInput },
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  // Pagination
  const handlePageChange = ({ page }) => {
    const params = {
      search: searchInput,
      page,
      ...(localFilters.is_active !== '' && localFilters.is_active !== undefined && localFilters.is_active !== null && { is_active: localFilters.is_active === true || localFilters.is_active === 'true' || localFilters.is_active === 1 || localFilters.is_active === '1' ? 1 : 0 }),
      ...(localFilters.position && { position: localFilters.position }),
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    
    router.get(
      route('employee-management.index'),
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

  // Handle Status Toggle
  const handleStatusChange = (employee, newStatus) => {
    router.put(route('employee-management.update-status', employee.id), {
      is_active: newStatus,
    }, {
      preserveScroll: true,
      preserveState: true,
      only: ['employees'],
      onSuccess: () => {
        toast.success('Employee status updated successfully!');
      },
      onError: () => {
        toast.error('Failed to update status.');
      },
    });
  };

  // Check if user has permission to view employees
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

  const activeCount = employees.filter(e => e.is_active).length;
  const inactiveCount = employees.filter(e => !e.is_active).length;

  return (
    <>
      {/* Modals */}
      {showAddModal && <AddEmployee setShowAddModal={setShowAddModal} />}
      {showEditModal && <EditEmployee setShowEditModal={setShowEditModal} employee={editEmployee} />}
      {showDeleteModal && <DeleteEmployee setShowDeleteModal={setShowDeleteModal} employee={deleteEmployee} />}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Employees" />

        <div className="w-full sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow-lg sm:rounded-lg p-6 mt-2 border border-gray-100">
            
            {/* Quick Stats */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Employees</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">{employees.length}</p>
                    </div>
                    <div className="bg-blue-200 rounded-full p-3">
                      <Users className="h-5 w-5 text-blue-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Active</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">{activeCount}</p>
                    </div>
                    <div className="bg-green-200 rounded-full p-3">
                      <UserCheck className="h-5 w-5 text-green-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Inactive</p>
                      <p className="text-2xl font-bold text-red-900 mt-1">{inactiveCount}</p>
                    </div>
                    <div className="bg-red-200 rounded-full p-3">
                      <AlertCircle className="h-5 w-5 text-red-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search + Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between relative z-50">
              <div className="flex flex-col sm:flex-row gap-3 items-center flex-1 relative z-50">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search employees by name, email, phone, or position..."
                    value={searchInput}
                    onChange={handleSearch}
                    className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-full h-11 border-gray-300 rounded-lg"
                  />
                </div>
                <div className="flex gap-2 relative z-50">
                  <div className="relative z-50">
                    <Button
                      ref={filterButtonRef}
                      onClick={() => {
                        if (filterButtonRef.current) {
                          const rect = filterButtonRef.current.getBoundingClientRect();
                          setFilterPosition({
                            top: rect.bottom + window.scrollY + 8,
                            right: window.innerWidth - rect.right,
                          });
                        }
                        setShowFilterCard(!showFilterCard);
                        setShowSortCard(false);
                      }}
                      variant="outline"
                      className={`h-11 w-11 p-0 border-2 rounded-lg transition-all duration-200 flex items-center justify-center relative z-50 ${
                        activeFiltersCount() > 0
                          ? 'bg-zinc-100 border-zinc-400 text-zinc-700 hover:bg-zinc-200'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                      title="Filters"
                    >
                      <Filter className="h-4 w-4" />
                      {activeFiltersCount() > 0 && (
                        <span className="absolute -top-1 -right-1 bg-zinc-700 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center z-50">
                          {activeFiltersCount()}
                        </span>
                      )}
                    </Button>

                    {/* Filter Card */}
                    {showFilterCard && (
                      <div 
                        ref={filterCardRef} 
                        className="fixed w-96 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-[9999] overflow-hidden flex flex-col max-h-[400px]"
                        style={{
                          top: `${filterPosition.top}px`,
                          right: `${filterPosition.right}px`,
                        }}
                      >
                        <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-white" />
                            <h3 className="text-base font-semibold text-white">Filter Employees</h3>
                          </div>
                          <button
                            onClick={() => setShowFilterCard(false)}
                            className="text-white hover:bg-zinc-900 rounded-lg p-1 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1">
                          {/* Status Filter */}
                          <div className="mb-4">
                            <Label className="text-xs font-semibold text-gray-700 mb-2 block">Status</Label>
                            <Select
                              value={localFilters.is_active === '' || localFilters.is_active === undefined || localFilters.is_active === null ? 'all' : (localFilters.is_active === true || localFilters.is_active === 'true' || localFilters.is_active === 1 || localFilters.is_active === '1' ? 'true' : 'false')}
                              onValueChange={(value) => {
                                if (value === 'all') {
                                  handleFilterChange('is_active', '');
                                } else {
                                  setLocalFilters(prev => ({
                                    ...prev,
                                    is_active: value === 'true'
                                  }));
                                }
                              }}
                            >
                              <SelectTrigger className="w-full h-9">
                                <SelectValue placeholder="All Statuses" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="true">Active</SelectItem>
                                <SelectItem value="false">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Position Filter */}
                          {filterOptions.positions && filterOptions.positions.length > 0 && (
                            <div className="mb-4">
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Position</Label>
                              <Select
                                value={localFilters.position || 'all'}
                                onValueChange={(value) => handleFilterChange('position', value)}
                              >
                                <SelectTrigger className="w-full h-9">
                                  <SelectValue placeholder="All Positions" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Positions</SelectItem>
                                  {filterOptions.positions.map((position) => (
                                    <SelectItem key={position} value={position}>
                                      {capitalizeText(position)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {/* Filter Actions */}
                        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2 flex-shrink-0">
                          <Button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              resetFilters();
                            }}
                            variant="outline"
                            className="flex-1 border-gray-300 hover:bg-gray-100 text-sm h-9"
                            disabled={activeFiltersCount() === 0 && sortBy === 'created_at' && sortOrder === 'desc'}
                          >
                            Clear All
                          </Button>
                          <Button
                            type="button"
                            onClick={applyFilters}
                            className="flex-1 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md text-sm h-9 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={activeFiltersCount() === 0 && sortBy === 'created_at' && sortOrder === 'desc'}
                          >
                            Apply Filters
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

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
                        setShowFilterCard(false);
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
                            <h3 className="text-base font-semibold text-white">Sort Employees</h3>
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
                                <SelectItem value="first_name">First Name</SelectItem>
                                <SelectItem value="last_name">Last Name</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="position">Position</SelectItem>
                                <SelectItem value="is_active">Status</SelectItem>
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
              {has('employees.create') && (
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6 h-11 whitespace-nowrap"
                >
                  <SquarePen className="mr-2 h-4 w-4" />
                  Add Employee
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
                  {employees.length > 0 ? (
                    employees.map((employee, index) => (
                      <TableRow 
                        key={employee.id}
                        className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <TableCell className="text-left px-4 py-4 text-sm font-medium text-gray-900">
                          {capitalizeText(`${employee.first_name} ${employee.last_name}`)}
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                          {employee.email || (
                            <span className="text-gray-400 italic">No email</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                          {employee.phone || (
                            <span className="text-gray-400 italic">No phone</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm">
                          {employee.position ? (
                            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                              {capitalizeText(employee.position)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">No position</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm">
                          <div className="flex items-center gap-2">
                            {has('employees.update-status') ? (
                              <>
                                <Switch
                                  checked={employee.is_active}
                                  onCheckedChange={(checked) => handleStatusChange(employee, checked)}
                                  className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                                />
                                <span
                                  className={`text-xs font-medium ${employee.is_active ? 'text-green-600' : 'text-red-600'}`}
                                >
                                  {employee.is_active ? 'Active' : 'Inactive'}
                                </span>
                              </>
                            ) : (
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded ${employee.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                              >
                                {employee.is_active ? 'Active' : 'Inactive'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm">
                          <div className="flex gap-1.5">
                            {has('employees.update') && (
                              <button
                                onClick={() => {
                                  setEditEmployee(employee);
                                  setShowEditModal(true);
                                }}
                                className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all duration-200 hover:scale-110 border border-indigo-200 hover:border-indigo-300"
                                title="Edit"
                              >
                                <SquarePen size={16} />
                              </button>
                            )}
                            {has('employees.delete') && (
                              <button
                                onClick={() => {
                                  setDeleteEmployee(employee);
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
                          <p className="text-gray-500 font-medium text-base">No employees found</p>
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
                  Showing <span className="font-semibold text-gray-900">{employees.length}</span> of{' '}
                  <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> employees
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
