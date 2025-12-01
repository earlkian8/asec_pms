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
  User,
  Calendar,
  Eye,
  DollarSign,
  Clock,
  TrendingUp,
  X,
  ArrowUpDown
} from 'lucide-react';
import { usePermission } from '@/utils/permissions';
import AddLaborCost from './add';
import EditLaborCost from './edit';
import DeleteLaborCost from './delete';
import ViewLaborCost from './view';

export default function LaborCostTab({ project, laborCostData }) {
  const { has } = usePermission();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editLaborCost, setEditLaborCost] = useState(null);
  const [deleteLaborCost, setDeleteLaborCost] = useState(null);
  const [viewLaborCost, setViewLaborCost] = useState(null);
  
  const pagination = laborCostData?.laborCosts;
  const laborCosts = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const filters = laborCostData?.filters || {};
  const filterOptions = laborCostData?.filterOptions || {};
  const initialSearch = laborCostData?.search || '';
  const totalHours = parseFloat(laborCostData?.totalHours || 0);
  const totalCost = parseFloat(laborCostData?.totalCost || 0);

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
      date_from: filterProps?.date_from || filterProps?.dateFrom || '',
      date_to: filterProps?.date_to || filterProps?.dateTo || '',
    };
  };
  
  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const [sortBy, setSortBy] = useState(laborCostData?.sort_by || 'work_date');
  const [sortOrder, setSortOrder] = useState(laborCostData?.sort_order || 'desc');

  // Sync filters when props change
  useEffect(() => {
    const newFilters = initializeFilters(filters);
    setLocalFilters(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.date_from, filters.date_to, filters.dateFrom, filters.dateTo]);

  // Sync sort when props change
  useEffect(() => {
    if (laborCostData?.sort_by) setSortBy(laborCostData.sort_by);
    if (laborCostData?.sort_order) setSortOrder(laborCostData.sort_order);
  }, [laborCostData?.sort_by, laborCostData?.sort_order]);

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

  // Count active filters
  const activeFiltersCount = () => {
    let count = 0;
    if (localFilters.date_from) count++;
    if (localFilters.date_to) count++;
    return count;
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
        ...(localFilters.date_from && { date_from: localFilters.date_from }),
        ...(localFilters.date_to && { date_to: localFilters.date_to }),
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
      ...(localFilters.date_from && { date_from: localFilters.date_from }),
      ...(localFilters.date_to && { date_to: localFilters.date_to }),
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
      date_from: '',
      date_to: '',
    });
    setSortBy('work_date');
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
        { 
          search: searchInput,
          ...(localFilters.date_from && { date_from: localFilters.date_from }),
          ...(localFilters.date_to && { date_to: localFilters.date_to }),
          sort_by: sortBy,
          sort_order: sortOrder,
        },
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
          ...(localFilters.date_from && { date_from: localFilters.date_from }),
          ...(localFilters.date_to && { date_to: localFilters.date_to }),
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Calculate stats
  const totalEntries = laborCosts.length;
  const avgHoursPerEntry = totalEntries > 0 ? (totalHours / totalEntries).toFixed(2) : 0;
  const avgCostPerEntry = totalEntries > 0 ? (totalCost / totalEntries).toFixed(2) : 0;

  const columns = [
    { header: 'Employee', width: '20%' },
    { header: 'Work Date', width: '12%' },
    { header: 'Hours', width: '10%' },
    { header: 'Hourly Rate', width: '12%' },
    { header: 'Total Cost', width: '12%' },
    { header: 'Description', width: '20%' },
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
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Hours</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {isNaN(totalHours) ? '0.00' : totalHours.toFixed(2)}
                </p>
              </div>
              <div className="bg-blue-200 rounded-full p-3">
                <Clock className="h-5 w-5 text-blue-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Total Cost</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{formatCurrency(totalCost)}</p>
              </div>
              <div className="bg-green-200 rounded-full p-3">
                <DollarSign className="h-5 w-5 text-green-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Total Entries</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">{totalEntries}</p>
              </div>
              <div className="bg-purple-200 rounded-full p-3">
                <TrendingUp className="h-5 w-5 text-purple-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">Avg. Cost/Entry</p>
                <p className="text-2xl font-bold text-indigo-900 mt-1">{formatCurrency(avgCostPerEntry)}</p>
              </div>
              <div className="bg-indigo-200 rounded-full p-3">
                <User className="h-5 w-5 text-indigo-700" />
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
              placeholder="Search by employee name, description, or notes..."
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
                      <h3 className="text-base font-semibold text-white">Filter Labor Costs</h3>
                    </div>
                    <button
                      onClick={() => setShowFilterCard(false)}
                      className="text-white hover:bg-zinc-900 rounded-lg p-1 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-4 overflow-y-auto flex-1">
                    {/* Date Range Filters */}
                    <div className="mb-4">
                      <Label className="text-xs font-semibold text-gray-700 mb-2 block flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        Date Range
                      </Label>
                      <div className="space-y-2">
                        <div>
                          <Label htmlFor="date_from" className="text-xs text-gray-600 mb-1 block">From Date</Label>
                          <Input
                            id="date_from"
                            type="date"
                            value={localFilters.date_from}
                            onChange={(e) => setLocalFilters(prev => ({ ...prev, date_from: e.target.value }))}
                            className="w-full h-9 border-gray-300 rounded-lg"
                          />
                        </div>
                        <div>
                          <Label htmlFor="date_to" className="text-xs text-gray-600 mb-1 block">To Date</Label>
                          <Input
                            id="date_to"
                            type="date"
                            value={localFilters.date_to}
                            onChange={(e) => setLocalFilters(prev => ({ ...prev, date_to: e.target.value }))}
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
                      disabled={activeFiltersCount() === 0 && sortBy === 'work_date' && sortOrder === 'desc'}
                    >
                      Clear All
                    </Button>
                    <Button
                      type="button"
                      onClick={applyFilters}
                      className="flex-1 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md text-sm h-9 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={activeFiltersCount() === 0 && sortBy === 'work_date' && sortOrder === 'desc'}
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
                      <h3 className="text-base font-semibold text-white">Sort Labor Costs</h3>
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
                          <SelectItem value="work_date">Work Date</SelectItem>
                          <SelectItem value="hours_worked">Hours Worked</SelectItem>
                          <SelectItem value="hourly_rate">Hourly Rate</SelectItem>
                          <SelectItem value="created_at">Date Created</SelectItem>
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
        <div className="flex gap-2">
          {has('labor-costs.create') && (
            <Button
              className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6 h-11 whitespace-nowrap"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Labor Cost
            </Button>
          )}
        </div>
      </div>

      {/* Labor Costs Table */}
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
            {laborCosts.length > 0 ? (
              laborCosts.map((cost, index) => {
                const assignableName = cost.assignable_name || cost.user?.name || (cost.employee?.first_name + ' ' + cost.employee?.last_name) || 'Unknown';
                const assignableType = cost.assignable_type || (cost.user_id ? 'user' : 'employee');
                const totalCost = (cost.hours_worked || 0) * (cost.hourly_rate || 0);
                
                return (
                  <TableRow 
                    key={cost.id}
                    className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    <TableCell className="text-left px-4 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span>{assignableName}</span>
                        {assignableType === 'employee' && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                            Employee
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{formatDate(cost.work_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                      {cost.hours_worked} hrs
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                      {formatCurrency(cost.hourly_rate)}
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm font-semibold text-gray-900">
                      {formatCurrency(totalCost)}
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                      <div className="max-w-xs truncate" title={cost.description || ''}>
                        {cost.description || '---'}
                      </div>
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm">
                      <div className="flex gap-1.5">
                        {has('labor-costs.view') && (
                          <button
                            onClick={() => {
                              setViewLaborCost(cost);
                              setShowViewModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all duration-200 hover:scale-110 border border-indigo-200 hover:border-indigo-300"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                        )}
                        {has('labor-costs.update') && (
                          <button
                            onClick={() => {
                              setEditLaborCost(cost);
                              setShowEditModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:scale-110 border border-blue-200 hover:border-blue-300"
                            title="Edit"
                          >
                            <SquarePen size={16} />
                          </button>
                        )}
                        {has('labor-costs.delete') && (
                          <button
                            onClick={() => {
                              setDeleteLaborCost(cost);
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
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-gray-100 rounded-full p-4 mb-3">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium text-base">No labor cost entries found</p>
                    <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
                    {has('labor-costs.create') && (
                      <Button
                        className="mt-4 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200"
                        onClick={() => setShowAddModal(true)}
                      >
                        <Plus size={18} className="mr-2" />
                        Add First Labor Cost Entry
                      </Button>
                    )}
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
            Showing <span className="font-semibold text-gray-900">{laborCosts.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> entries
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
      {showAddModal && (
        <AddLaborCost
          setShowAddModal={setShowAddModal}
          project={project}
          teamMembers={laborCostData?.teamMembers || []}
        />
      )}

      {showEditModal && editLaborCost && (
        <EditLaborCost
          setShowEditModal={setShowEditModal}
          project={project}
          laborCost={editLaborCost}
          teamMembers={laborCostData?.teamMembers || []}
        />
      )}

      {showDeleteModal && deleteLaborCost && (
        <DeleteLaborCost
          setShowDeleteModal={setShowDeleteModal}
          project={project}
          laborCost={deleteLaborCost}
        />
      )}

      {showViewModal && viewLaborCost && (
        <ViewLaborCost
          setShowViewModal={setShowViewModal}
          project={project}
          laborCost={viewLaborCost}
        />
      )}
    </div>
  );
}
