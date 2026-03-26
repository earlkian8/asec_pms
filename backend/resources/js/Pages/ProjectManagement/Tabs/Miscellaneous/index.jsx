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
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { toast } from 'sonner';
import { 
  Trash2, 
  SquarePen, 
  Plus,
  Filter,
  Search,
  Calendar,
  Eye,
  DollarSign,
  TrendingUp,
  X,
  ArrowUpDown,
  Receipt,
  PhilippinePeso
} from 'lucide-react';
import { usePermission } from '@/utils/permissions';
import AddMiscellaneousExpense from './add';
import EditMiscellaneousExpense from './edit';
import DeleteMiscellaneousExpense from './delete';
import ViewMiscellaneousExpense from './view';

export default function MiscellaneousExpenseTab({ project, miscellaneousExpenseData }) {
  const { has } = usePermission();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [deleteExpense, setDeleteExpense] = useState(null);
  const [viewExpense, setViewExpense] = useState(null);
  
  const pagination = miscellaneousExpenseData?.expenses;
  const expenses = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const filters = miscellaneousExpenseData?.filters || {};
  const filterOptions = miscellaneousExpenseData?.filterOptions || {};
  const initialSearch = miscellaneousExpenseData?.search || '';
  const totalExpenses = parseFloat(miscellaneousExpenseData?.totalExpenses || 0);

  // States
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [showSortCard, setShowSortCard] = useState(false);
  const debounceTimer = useRef(null);
  
  // Initialize filters from props
  const initializeFilters = (filterProps) => {
    return {
      expense_type: filterProps?.expense_type || '',
      date_from: filterProps?.date_from || filterProps?.dateFrom || '',
      date_to: filterProps?.date_to || filterProps?.dateTo || '',
    };
  };
  
  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const [sortBy, setSortBy] = useState(miscellaneousExpenseData?.sort_by || 'expense_date');
  const [sortOrder, setSortOrder] = useState(miscellaneousExpenseData?.sort_order || 'desc');

  // Sync filters when props change
  useEffect(() => {
    const newFilters = initializeFilters(filters);
    setLocalFilters(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.expense_type, filters.date_from, filters.date_to, filters.dateFrom, filters.dateTo]);

  // Sync sort when props change
  useEffect(() => {
    if (miscellaneousExpenseData?.sort_by) setSortBy(miscellaneousExpenseData.sort_by);
    if (miscellaneousExpenseData?.sort_order) setSortOrder(miscellaneousExpenseData.sort_order);
  }, [miscellaneousExpenseData?.sort_by, miscellaneousExpenseData?.sort_order]);


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
    if (localFilters.expense_type) count++;
    if (localFilters.date_from) count++;
    if (localFilters.date_to) count++;
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
        ...(localFilters.expense_type && { expense_type: localFilters.expense_type }),
        ...(localFilters.date_from && { date_from: localFilters.date_from }),
        ...(localFilters.date_to && { date_to: localFilters.date_to }),
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      
      // Build query string with all current params plus new filter params
      const currentParams = new URLSearchParams(window.location.search);
      const newParams = new URLSearchParams();
      
      // Preserve search
      if (searchInput) newParams.set('search', searchInput);
      
      // Add filter params
      if (localFilters.expense_type) newParams.set('expense_type', localFilters.expense_type);
      if (localFilters.date_from) newParams.set('date_from', localFilters.date_from);
      if (localFilters.date_to) newParams.set('date_to', localFilters.date_to);
      
      // Add sort params
      newParams.set('sort_by', sortBy);
      newParams.set('sort_order', sortOrder);
      
      router.get(route('project-management.view', project.id) + '?' + newParams.toString(), {}, {
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
    const newParams = new URLSearchParams();
      
      // Preserve search
      if (searchInput) newParams.set('search', searchInput);
      
      // Add filter params
      if (localFilters.expense_type) newParams.set('expense_type', localFilters.expense_type);
      if (localFilters.date_from) newParams.set('date_from', localFilters.date_from);
      if (localFilters.date_to) newParams.set('date_to', localFilters.date_to);
      
      // Add sort params
      newParams.set('sort_by', sortBy);
      newParams.set('sort_order', sortOrder);
    
    router.get(route('project-management.view', project.id) + '?' + newParams.toString(), {}, {
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
      expense_type: '',
      date_from: '',
      date_to: '',
    });
    setSortBy('expense_date');
    setSortOrder('desc');
    const newParams = new URLSearchParams();
    if (searchInput) newParams.set('search', searchInput);
    router.get(route('project-management.view', project.id) + (newParams.toString() ? '?' + newParams.toString() : ''), {}, {
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
      const newParams = new URLSearchParams();
      if (searchInput) newParams.set('search', searchInput);
      // Preserve current filters and sort
      if (localFilters.expense_type) newParams.set('expense_type', localFilters.expense_type);
      if (localFilters.date_from) newParams.set('date_from', localFilters.date_from);
      if (localFilters.date_to) newParams.set('date_to', localFilters.date_to);
      newParams.set('sort_by', sortBy);
      newParams.set('sort_order', sortOrder);
      
      router.get(
        route('project-management.view', project.id) + (newParams.toString() ? '?' + newParams.toString() : ''),
        {},
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput, project.id, localFilters.expense_type, localFilters.date_from, localFilters.date_to, sortBy, sortOrder]);

  // Pagination
  const handlePageClick = (url) => {
    if (url) {
      try {
        const urlObj = new URL(url, window.location.origin);
        const page = urlObj.searchParams.get('page');
        
        const newParams = new URLSearchParams();
        if (searchInput) newParams.set('search', searchInput);
        if (localFilters.expense_type) newParams.set('expense_type', localFilters.expense_type);
        if (localFilters.date_from) newParams.set('date_from', localFilters.date_from);
        if (localFilters.date_to) newParams.set('date_to', localFilters.date_to);
        newParams.set('sort_by', sortBy);
        newParams.set('sort_order', sortOrder);
        if (page) {
          newParams.set('page', page);
        }
        
        router.get(route('project-management.view', project.id) + '?' + newParams.toString(), {}, {
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

  const formatCurrency = (amount) => amount ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount) : '---';
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH') : '---';

  // Calculate stats
  const totalEntries = expenses.length;
  const averageExpense = totalEntries > 0 ? totalExpenses / totalEntries : 0;

  const columns = [
    { header: 'Expense Name', width: '20%' },
    { header: 'Type', width: '15%' },
    { header: 'Date', width: '12%' },
    { header: 'Amount', width: '15%' },
    { header: 'Description', width: '24%' },
    { header: 'Actions', width: '14%' },
  ];

  return (
    <div className="w-full">
      {/* Quick Stats */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Expenses</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className="bg-blue-200 rounded-full p-3">
                <PhilippinePeso className="h-5 w-5 text-blue-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Total Entries</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{totalEntries}</p>
              </div>
              <div className="bg-green-200 rounded-full p-3">
                <Receipt className="h-5 w-5 text-green-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Average Expense</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">{formatCurrency(averageExpense)}</p>
              </div>
              <div className="bg-purple-200 rounded-full p-3">
                <TrendingUp className="h-5 w-5 text-purple-700" />
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
              placeholder="Search expenses by name, type, description, or notes..."
              value={searchInput}
              onChange={handleSearch}
              className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-full h-11 border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-2 relative z-50">
            {/* Filter Button and Card */}
            <DropdownMenu open={showFilterCard} onOpenChange={(open) => {
              setShowFilterCard(open);
              if (open) setShowSortCard(false);
            }}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={`h-11 w-11 p-0 border-2 rounded-lg transition-all duration-200 flex items-center justify-center relative ${
                    activeFiltersCount() > 0
                      ? 'bg-zinc-100 border-zinc-400 text-zinc-700 hover:bg-zinc-200'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  title="Filters"
                >
                  <Filter className="h-4 w-4" />
                  {activeFiltersCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-zinc-700 text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                      {activeFiltersCount()}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-96 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col max-h-[500px] bg-white"
              >
                  <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-white" />
                      <h3 className="text-base font-semibold text-white">Filter Expenses</h3>
                    </div>
                    <button
                      onClick={() => setShowFilterCard(false)}
                      className="text-white hover:bg-zinc-900 rounded-lg p-1 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-4 overflow-y-auto flex-1">
                    {/* Expense Type Filter */}
                    {filterOptions.expenseTypes && filterOptions.expenseTypes.length > 0 && (
                      <div className="mb-4">
                        <Label className="text-xs font-semibold text-gray-700 mb-2 block">Expense Type</Label>
                        <Select
                          value={localFilters.expense_type || 'all'}
                          onValueChange={(value) => handleFilterChange('expense_type', value)}
                        >
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            {filterOptions.expenseTypes.map((type) => (
                              <SelectItem key={type} value={type}>
                                {capitalizeText(type)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

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
                      disabled={activeFiltersCount() === 0 && sortBy === 'expense_date' && sortOrder === 'desc'}
                    >
                      Clear All
                    </Button>
                    <Button
                      type="button"
                      onClick={applyFilters}
                      className="flex-1 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md text-sm h-9 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={activeFiltersCount() === 0 && sortBy === 'expense_date' && sortOrder === 'desc'}
                    >
                      Apply Filters
                    </Button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

            {/* Sort Button */}
            <DropdownMenu open={showSortCard} onOpenChange={(open) => {
              setShowSortCard(open);
              if (open) setShowFilterCard(false);
            }}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-11 w-11 p-0 border-2 rounded-lg transition-all duration-200 flex items-center justify-center bg-white border-gray-300 text-gray-700 hover:bg-gray-50 relative"
                  title="Sort"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="w-80 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col max-h-[300px] bg-white"
              >
                  <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="h-4 w-4 text-white" />
                      <h3 className="text-base font-semibold text-white">Sort Expenses</h3>
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
                          <SelectItem value="expense_date">Expense Date</SelectItem>
                          <SelectItem value="expense_type">Expense Type</SelectItem>
                          <SelectItem value="expense_name">Expense Name</SelectItem>
                          <SelectItem value="amount">Amount</SelectItem>
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
                </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </div>
        {has('miscellaneous-expenses.create') && (
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6 h-11 whitespace-nowrap"
          >
            <SquarePen className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        )}
      </div>

      {/* Expenses Table */}
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
            {expenses.length > 0 ? (
              expenses.map((expense, index) => (
                <TableRow
                  key={expense.id}
                  className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  <TableCell className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {expense.expense_name}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                      {capitalizeText(expense.expense_type)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-700">
                    {formatDate(expense.expense_date)}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <span className="font-bold text-gray-900">
                      {formatCurrency(expense.amount)}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-gray-600">
                    <div className="max-w-[200px] truncate" title={expense.description || '---'}>
                      {expense.description || '---'}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {has('miscellaneous-expenses.view') && (
                        <button
                          onClick={() => {
                            setViewExpense(expense);
                            setShowViewModal(true);
                          }}
                          className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:scale-110 border border-blue-200 hover:border-blue-300"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      {has('miscellaneous-expenses.update') && (
                        <button
                          onClick={() => {
                            setEditExpense(expense);
                            setShowEditModal(true);
                          }}
                          className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all duration-200 hover:scale-110 border border-indigo-200 hover:border-indigo-300"
                          title="Edit"
                        >
                          <SquarePen size={16} />
                        </button>
                      )}
                      {has('miscellaneous-expenses.delete') && (
                        <button
                          onClick={() => {
                            setDeleteExpense(expense);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 hover:scale-110 border border-red-200 hover:border-red-300"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
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
                    <p className="text-gray-500 font-medium text-base">No expenses found</p>
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
            Showing <span className="font-semibold text-gray-900">{expenses.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> expenses
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
        <AddMiscellaneousExpense
          setShowAddModal={setShowAddModal}
          project={project}
        />
      )}
      {showEditModal && editExpense && (
        <EditMiscellaneousExpense
          setShowEditModal={setShowEditModal}
          project={project}
          expense={editExpense}
        />
      )}
      {showDeleteModal && deleteExpense && (
        <DeleteMiscellaneousExpense
          setShowDeleteModal={setShowDeleteModal}
          project={project}
          expense={deleteExpense}
        />
      )}
      {showViewModal && viewExpense && (
        <ViewMiscellaneousExpense
          setShowViewModal={setShowViewModal}
          project={project}
          expense={viewExpense}
        />
      )}
    </div>
  );
}

