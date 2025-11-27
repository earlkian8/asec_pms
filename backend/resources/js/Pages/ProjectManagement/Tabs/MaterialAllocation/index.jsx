import { useState, useMemo, useEffect, useRef } from 'react';
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
  User,
  Calendar,
  Eye,
  X,
  ArrowUpDown,
  PackageCheck,
  PackageX,
  PackageSearch
} from 'lucide-react';
import { usePermission } from '@/utils/permissions';
import AddReceivingReport from './add';
import EditReceivingReport from './edit';
import DeleteReceivingReport from './delete';
import DeleteMaterialAllocation from './delete-allocation';
import ViewMaterialAllocation from './view';

export default function MaterialAllocationTab({ project, materialAllocationData }) {
  const { has } = usePermission();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllocationModal, setShowDeleteAllocationModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editReceivingReport, setEditReceivingReport] = useState(null);
  const [deleteReceivingReport, setDeleteReceivingReport] = useState(null);
  const [deleteAllocation, setDeleteAllocation] = useState(null);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [viewAllocation, setViewAllocation] = useState(null);
  
  const pagination = materialAllocationData?.allocations;
  const allocations = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const filters = materialAllocationData?.filters || {};
  const filterOptions = materialAllocationData?.filterOptions || {};
  const initialSearch = materialAllocationData?.search || '';
  
  // States
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [showSortCard, setShowSortCard] = useState(false);
  const filterCardRef = useRef(null);
  const sortCardRef = useRef(null);
  const filterButtonRef = useRef(null);
  const sortButtonRef = useRef(null);
  const [filterPosition, setFilterPosition] = useState({ top: 0, right: 0 });
  const [sortPosition, setSortPosition] = useState({ top: 0, right: 0 });
  const debounceTimer = useRef(null);
  
  // Initialize filters from props
  const initializeFilters = (filterProps) => {
    return {
      status: filterProps?.status || 'all',
      start_date: filterProps?.start_date || '',
      end_date: filterProps?.end_date || '',
    };
  };
  
  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const [sortBy, setSortBy] = useState(materialAllocationData?.sort_by || 'created_at');
  const [sortOrder, setSortOrder] = useState(materialAllocationData?.sort_order || 'desc');

  // Sync filters when props change
  useEffect(() => {
    const newFilters = initializeFilters(filters);
    setLocalFilters(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.start_date, filters.end_date]);

  // Sync sort when props change
  useEffect(() => {
    if (materialAllocationData?.sort_by) setSortBy(materialAllocationData.sort_by);
    if (materialAllocationData?.sort_order) setSortOrder(materialAllocationData.sort_order);
  }, [materialAllocationData?.sort_by, materialAllocationData?.sort_order]);

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

      if (filterCardRef.current && !filterCardRef.current.contains(target)) {
        setShowFilterCard(false);
      }
      if (sortCardRef.current && !sortCardRef.current.contains(target)) {
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
    if (localFilters.status && localFilters.status !== 'all') count++;
    if (localFilters.start_date) count++;
    if (localFilters.end_date) count++;
    return count;
  };

  // Handle filter select changes
  const handleFilterChange = (filterType, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [filterType]: value === 'all' ? 'all' : value
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
        ...(localFilters.status && localFilters.status !== 'all' && { status_filter: localFilters.status }),
        ...(localFilters.start_date && { start_date: localFilters.start_date }),
        ...(localFilters.end_date && { end_date: localFilters.end_date }),
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      
      router.get(route('project-management.view', project.id), params, {
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
      ...(localFilters.status && localFilters.status !== 'all' && { status_filter: localFilters.status }),
      ...(localFilters.start_date && { start_date: localFilters.start_date }),
      ...(localFilters.end_date && { end_date: localFilters.end_date }),
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    
    router.get(route('project-management.view', project.id), params, {
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
      status: 'all',
      start_date: '',
      end_date: '',
    });
    setSortBy('created_at');
    setSortOrder('desc');
    router.get(route('project-management.view', project.id), { search: searchInput }, {
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
        route('project-management.view', project.id),
        { search: searchInput },
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput, project.id]);

  // Pagination
  const handlePageClick = (url) => {
    if (url) {
      try {
        const params = {
          search: searchInput,
          ...(localFilters.status && localFilters.status !== 'all' && { status_filter: localFilters.status }),
          ...(localFilters.start_date && { start_date: localFilters.start_date }),
          ...(localFilters.end_date && { end_date: localFilters.end_date }),
          sort_by: sortBy,
          sort_order: sortOrder,
        };
        
        const urlObj = new URL(url, window.location.origin);
        const page = urlObj.searchParams.get('page');
        if (page) {
          params.page = page;
        }
        
        router.get(route('project-management.view', project.id), params, {
          preserveState: true,
          preserveScroll: true,
          replace: true
        });
      } catch (e) {
        console.error("Failed to parse pagination URL:", e);
      }
    }
  };

  const pageLinks = Array.isArray(paginationLinks)
    ? paginationLinks.filter(link => link?.label && !isNaN(Number(link.label)))
    : [];

  const prevLink = paginationLinks.find?.(link => link.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink = paginationLinks.find?.(link => link.label?.toLowerCase()?.includes('next')) ?? null;

  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }) : '---';

  const formatStatus = (status) => {
    if (!status) return { label: '---', color: 'gray', icon: Clock, bgColor: 'bg-gray-100', textColor: 'text-gray-700', borderColor: 'border-gray-200' };
    const statusMap = {
      'pending': { label: 'Pending', color: 'yellow', icon: Clock, bgColor: 'bg-yellow-100', textColor: 'text-yellow-700', borderColor: 'border-yellow-200' },
      'partial': { label: 'Partial', color: 'blue', icon: AlertCircle, bgColor: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
      'received': { label: 'Received', color: 'green', icon: CheckCircle2, bgColor: 'bg-green-100', textColor: 'text-green-700', borderColor: 'border-green-200' }
    };
    return statusMap[status] || { label: status, color: 'gray', icon: Clock, bgColor: 'bg-gray-100', textColor: 'text-gray-700', borderColor: 'border-gray-200' };
  };

  const getStatusBadge = (status) => {
    const statusInfo = formatStatus(status);
    const Icon = statusInfo.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium border ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor}`}>
        <Icon size={12} />
        {statusInfo.label}
      </span>
    );
  };

  const calculateProgress = (allocation) => {
    if (!allocation.quantity_allocated || allocation.quantity_allocated === 0) return 0;
    const received = allocation.quantity_received || 0;
    return Math.min(Math.round((received / allocation.quantity_allocated) * 100), 100);
  };

  // Calculate stats
  const totalAllocations = allocations.length;
  const pendingAllocations = allocations.filter(a => a.status === 'pending').length;
  const partialAllocations = allocations.filter(a => a.status === 'partial').length;
  const receivedAllocations = allocations.filter(a => a.status === 'received').length;

  const columns = [
    { header: 'Item', width: '20%' },
    { header: 'Code', width: '10%' },
    { header: 'Allocated', width: '12%' },
    { header: 'Received', width: '12%' },
    { header: 'Remaining', width: '12%' },
    { header: 'Status', width: '10%' },
    { header: 'Progress', width: '10%' },
    { header: 'Actions', width: '14%' },
  ];

  return (
    <div className="w-full">
      {/* Quick Stats */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Allocations</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{totalAllocations}</p>
              </div>
              <div className="bg-blue-200 rounded-full p-3">
                <Package className="h-5 w-5 text-blue-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">{pendingAllocations}</p>
              </div>
              <div className="bg-yellow-200 rounded-full p-3">
                <Clock className="h-5 w-5 text-yellow-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Partial</p>
                <p className="text-2xl font-bold text-indigo-900 mt-1">{partialAllocations}</p>
              </div>
              <div className="bg-indigo-200 rounded-full p-3">
                <PackageSearch className="h-5 w-5 text-indigo-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Received</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{receivedAllocations}</p>
              </div>
              <div className="bg-green-200 rounded-full p-3">
                <PackageCheck className="h-5 w-5 text-green-700" />
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
              placeholder="Search allocations by item name, code, or notes..."
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
                  className="fixed w-96 bg-white rounded-xl shadow-2xl border-2 border-gray-200 z-[9999] overflow-hidden flex flex-col max-h-[500px]"
                  style={{
                    top: `${filterPosition.top}px`,
                    right: `${filterPosition.right}px`,
                  }}
                >
                  <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-white" />
                      <h3 className="text-base font-semibold text-white">Filter Allocations</h3>
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
                        value={localFilters.status || 'all'}
                        onValueChange={(value) => handleFilterChange('status', value)}
                      >
                        <SelectTrigger className="w-full h-9">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="partial">Partial</SelectItem>
                          <SelectItem value="received">Received</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Date Range Filters */}
                    <div className="mb-4">
                      <Label className="text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Date Range
                      </Label>
                      <div className="space-y-2">
                        <div>
                          <Label htmlFor="start_date" className="text-xs text-gray-600 mb-1 block">Start Date</Label>
                          <Input
                            id="start_date"
                            type="date"
                            value={localFilters.start_date}
                            onChange={(e) => setLocalFilters(prev => ({ ...prev, start_date: e.target.value }))}
                            className="w-full h-9 border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <Label htmlFor="end_date" className="text-xs text-gray-600 mb-1 block">End Date</Label>
                          <Input
                            id="end_date"
                            type="date"
                            value={localFilters.end_date}
                            onChange={(e) => setLocalFilters(prev => ({ ...prev, end_date: e.target.value }))}
                            className="w-full h-9 border-gray-300 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
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
                      <h3 className="text-base font-semibold text-white">Sort Allocations</h3>
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
                          <SelectItem value="status">Status</SelectItem>
                          <SelectItem value="quantity_allocated">Quantity Allocated</SelectItem>
                          <SelectItem value="quantity_received">Quantity Received</SelectItem>
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
      </div>

      {/* Allocations Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
        <Table className="min-w-[1000px] w-full">
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
            {allocations.length > 0 ? (
              allocations.map((allocation, index) => {
                const inventoryItem = allocation.inventory_item || allocation.inventoryItem || {};
                const remaining = (allocation.quantity_allocated || 0) - (allocation.quantity_received || 0);
                const progress = calculateProgress(allocation);
                
                return (
                  <TableRow 
                    key={allocation.id}
                    className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    <TableCell className="text-left px-4 py-4 text-sm font-medium text-gray-900">
                      {inventoryItem.item_name || 'Unknown'}
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                      {inventoryItem.item_code || '---'}
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm font-bold text-gray-900">
                      {allocation.quantity_allocated} {inventoryItem.unit_of_measure || 'units'}
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                      {allocation.quantity_received || 0} {inventoryItem.unit_of_measure || 'units'}
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                      {remaining} {inventoryItem.unit_of_measure || 'units'}
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm">
                      {getStatusBadge(allocation.status)}
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2.5 max-w-[100px] shadow-inner">
                          <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${
                              progress === 100 ? 'bg-green-500' :
                              progress >= 50 ? 'bg-blue-500' :
                              progress > 0 ? 'bg-yellow-500' :
                              'bg-gray-300'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold w-8 ${
                          progress === 100 ? 'text-green-600' :
                          progress >= 50 ? 'text-blue-600' :
                          progress > 0 ? 'text-yellow-600' :
                          'text-gray-500'
                        }`}>{progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm">
                      <div className="flex gap-1.5">
                        {remaining > 0 && has('material-allocations.receiving-report') && (
                          <button
                            onClick={() => {
                              setSelectedAllocation(allocation);
                              setShowAddModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:scale-110 border border-blue-200 hover:border-blue-300"
                            title="Add Receiving Report"
                          >
                            <Plus size={16} />
                          </button>
                        )}
                        {has('material-allocations.view') && (
                          <button
                            onClick={() => {
                              setViewAllocation(allocation);
                              setShowViewModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all duration-200 hover:scale-110 border border-indigo-200 hover:border-indigo-300"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        {has('material-allocations.delete') && (
                          <button
                            onClick={() => {
                              setDeleteAllocation(allocation);
                              setShowDeleteAllocationModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 hover:scale-110 border border-red-200 hover:border-red-300"
                            title="Delete Allocation"
                          >
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
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-gray-100 rounded-full p-4 mb-3">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium text-base">No material allocations found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Material allocations are created when you stock out items from inventory with "Project Use" type.
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
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-gray-200 gap-4">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{allocations.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> allocations
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

      {/* Modals */}
      {showAddModal && selectedAllocation && (
        <AddReceivingReport
          setShowAddModal={setShowAddModal}
          project={project}
          allocation={selectedAllocation}
        />
      )}

      {showEditModal && editReceivingReport && (
        <EditReceivingReport
          setShowEditModal={setShowEditModal}
          project={project}
          allocation={editReceivingReport.allocation}
          receivingReport={editReceivingReport}
        />
      )}

      {showDeleteModal && deleteReceivingReport && (
        <DeleteReceivingReport
          setShowDeleteModal={setShowDeleteModal}
          project={project}
          allocation={deleteReceivingReport.allocation}
          receivingReport={deleteReceivingReport}
        />
      )}

      {showDeleteAllocationModal && deleteAllocation && (
        <DeleteMaterialAllocation
          setShowDeleteModal={setShowDeleteAllocationModal}
          project={project}
          allocation={deleteAllocation}
        />
      )}

      {showViewModal && viewAllocation && (
        <ViewMaterialAllocation
          setShowViewModal={setShowViewModal}
          project={project}
          allocation={viewAllocation}
        />
      )}
    </div>
  );
}
