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
import { Trash2, SquarePen, DollarSign, CreditCard, Filter, X, Search, Calendar, TrendingUp, ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { usePermission } from '@/utils/permissions';

import AddBilling from './add';
import EditBilling from './edit';
import DeleteBilling from './delete';
import AddPayment from './add-payment';
import Transactions from './Transactions';

export default function BillingManagement() {
  const { has } = usePermission();
  
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Billing Management", href: route('billing-management.index') },
    { title: "Billings" },
  ];

  const columns = [
    { header: 'Billing Code', width: '10%' },
    { header: 'Project', width: '15%' },
    { header: 'Billing Type', width: '10%' },
    { header: 'Milestone', width: '12%' },
    { header: 'Billing Amount', width: '10%' },
    { header: 'Billing Date', width: '9%' },
    { header: 'Due Date', width: '9%' },
    { header: 'Total Paid', width: '9%' },
    { header: 'Remaining', width: '9%' },
    { header: 'Status', width: '7%' },
    { header: 'Action', width: '10%' },
  ];

  // Data from backend
  const pagination = usePage().props.billings;
  const billings = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const projects = usePage().props.projects || [];
  const filters = usePage().props.filters || {};
  const filterOptions = usePage().props.filterOptions || {};
  const initialSearch = usePage().props.search || '';
  const initialTab = usePage().props.tab || 'billings';
  const transactionsData = usePage().props.transactions;

  // States
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editBilling, setEditBilling] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteBilling, setDeleteBilling] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentBilling, setPaymentBilling] = useState(null);
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [showSortCard, setShowSortCard] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);
  
  // Initialize filters from props
  const initializeFilters = (filterProps) => {
    return {
      status: filterProps?.status || '',
      project_id: filterProps?.project_id || '',
      billing_type: filterProps?.billing_type || '',
      start_date: filterProps?.start_date || '',
      end_date: filterProps?.end_date || '',
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.project_id, filters.billing_type, filters.start_date, filters.end_date]);

  // Sync sort when props change
  useEffect(() => {
    if (pageProps.sort_by) setSortBy(pageProps.sort_by);
    if (pageProps.sort_order) setSortOrder(pageProps.sort_order);
  }, [pageProps.sort_by, pageProps.sort_order]);


  // Status color mappings
  const statusColors = {
    unpaid: 'bg-red-100 text-red-800 border border-red-200',
    partial: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    paid: 'bg-green-100 text-green-800 border border-green-200',
  };

  const billingTypeColors = {
    fixed_price: 'bg-blue-100 text-blue-800 border border-blue-200',
    milestone: 'bg-purple-100 text-purple-800 border border-purple-200',
  };

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
    if (localFilters.status) count++;
    if (localFilters.project_id) count++;
    if (localFilters.billing_type) count++;
    if (localFilters.start_date) count++;
    if (localFilters.end_date) count++;
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
        ...(localFilters.status && { status: localFilters.status }),
        ...(localFilters.project_id && { project_id: localFilters.project_id }),
        ...(localFilters.billing_type && { billing_type: localFilters.billing_type }),
        ...(localFilters.start_date && { start_date: localFilters.start_date }),
        ...(localFilters.end_date && { end_date: localFilters.end_date }),
        sort_by: sortBy,
        sort_order: sortOrder,
        tab: activeTab,
      };
      
      router.get(route('billing-management.index'), params, {
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
      ...(localFilters.status && { status: localFilters.status }),
      ...(localFilters.project_id && { project_id: localFilters.project_id }),
      ...(localFilters.billing_type && { billing_type: localFilters.billing_type }),
      ...(localFilters.start_date && { start_date: localFilters.start_date }),
      ...(localFilters.end_date && { end_date: localFilters.end_date }),
      sort_by: sortBy,
      sort_order: sortOrder,
      tab: activeTab,
    };
    
    router.get(route('billing-management.index'), params, {
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
      status: '',
      project_id: '',
      billing_type: '',
      start_date: '',
      end_date: '',
    });
    setSortBy('created_at');
    setSortOrder('desc');
    const params = { tab: activeTab };
    if (searchInput && searchInput.trim()) {
      params.search = searchInput;
    }
    router.get(route('billing-management.index'), params, {
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
      const params = { tab: activeTab };
      if (searchInput && searchInput.trim()) {
        params.search = searchInput;
      }
      router.get(
        route('billing-management.index'),
        params,
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput, activeTab]);

  // Pagination
  const handlePageChange = ({ page }) => {
    const params = {
      page,
      ...(localFilters.status && { status: localFilters.status }),
      ...(localFilters.project_id && { project_id: localFilters.project_id }),
      ...(localFilters.billing_type && { billing_type: localFilters.billing_type }),
      ...(localFilters.start_date && { start_date: localFilters.start_date }),
      ...(localFilters.end_date && { end_date: localFilters.end_date }),
      sort_by: sortBy,
      sort_order: sortOrder,
      tab: activeTab,
    };
    if (searchInput && searchInput.trim()) {
      params.search = searchInput;
    }
    
    router.get(
      route('billing-management.index'),
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

  // Format helpers
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0.00';
    return parseFloat(num).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH') : '---';

  // Calculate stats
  const totalBillings = billings.length;
  const totalAmount = billings.reduce((sum, b) => sum + parseFloat(b.billing_amount || 0), 0);
  const totalPaid = billings.reduce((sum, b) => sum + parseFloat(b.total_paid || 0), 0);
  const unpaidCount = billings.filter(b => b.status === 'unpaid').length;

  return (
    <>
      {showAddModal && (
        <AddBilling 
          setShowAddModal={setShowAddModal} 
          projects={projects}
        />
      )}
      {showEditModal && (
        <EditBilling setShowEditModal={setShowEditModal} billing={editBilling} />
      )}
      {showDeleteModal && (
        <DeleteBilling setShowDeleteModal={setShowDeleteModal} billing={deleteBilling} />
      )}
      {showPaymentModal && (
        <AddPayment setShowPaymentModal={setShowPaymentModal} billing={paymentBilling} />
      )}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Billing Management" />

        <div className="w-full sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow-lg sm:rounded-lg p-6 mt-2 border border-gray-100">
            
            {/* TAB HEADERS */}
            <div className="border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
              <div className="flex gap-4 w-max">
                <button
                  onClick={() => {
                    setActiveTab('billings');
                    router.get(route('billing-management.index'), 
                      { tab: 'billings' },
                      { preserveState: true, replace: true }
                    );
                  }}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition
                    ${activeTab === 'billings' || !activeTab
                      ? "border-zinc-700 text-zinc-700 font-semibold"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  Billings
                </button>
                <button
                  onClick={() => {
                    setActiveTab('transactions');
                    router.get(route('billing-management.index'), 
                      { tab: 'transactions' },
                      { preserveState: true, replace: true }
                    );
                  }}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition
                    ${activeTab === 'transactions'
                      ? "border-zinc-700 text-zinc-700 font-semibold"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  Transactions
                </button>
              </div>
            </div>

            {/* TAB CONTENT */}
            {activeTab === 'transactions' ? (
              <Transactions 
                transactions={transactionsData}
                search={initialSearch}
              />
            ) : (
              <>
                {/* Quick Stats */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Billings</p>
                          <p className="text-2xl font-bold text-blue-900 mt-1">{totalBillings}</p>
                        </div>
                        <div className="bg-blue-200 rounded-full p-3">
                          <DollarSign className="h-5 w-5 text-blue-700" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Total Amount</p>
                          <p className="text-lg font-bold text-green-900 mt-1">
                            ₱{formatNumber(totalAmount)}
                          </p>
                        </div>
                        <div className="bg-green-200 rounded-full p-3">
                          <TrendingUp className="h-5 w-5 text-green-700" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Total Paid</p>
                          <p className="text-lg font-bold text-purple-900 mt-1">
                            ₱{formatNumber(totalPaid)}
                          </p>
                        </div>
                        <div className="bg-purple-200 rounded-full p-3">
                          <DollarSign className="h-5 w-5 text-purple-700" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Unpaid</p>
                          <p className="text-2xl font-bold text-red-900 mt-1">{unpaidCount}</p>
                        </div>
                        <div className="bg-red-200 rounded-full p-3">
                          <CreditCard className="h-5 w-5 text-red-700" />
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
                        placeholder="Search billings by code, project name..."
                        value={searchInput}
                        onChange={handleSearch}
                        className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-full h-11 border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="flex gap-2 relative z-50">
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
                                <h3 className="text-base font-semibold text-white">Filter Billings</h3>
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
                              {filterOptions.statuses && filterOptions.statuses.length > 0 && (
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
                                      {filterOptions.statuses.map((status) => (
                                        <SelectItem key={status} value={status}>
                                          {capitalizeText(status)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {/* Project Filter */}
                              <div className="mb-4">
                                <Label className="text-xs font-semibold text-gray-700 mb-2 block">Project</Label>
                                <Select
                                  value={localFilters.project_id || 'all'}
                                  onValueChange={(value) => handleFilterChange('project_id', value)}
                                >
                                  <SelectTrigger className="w-full h-9">
                                    <SelectValue placeholder="All Projects" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {projects.map((project) => (
                                      <SelectItem key={project.id} value={project.id.toString()}>
                                        {project.project_code} - {project.project_name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Billing Type Filter */}
                              {filterOptions.billingTypes && filterOptions.billingTypes.length > 0 && (
                                <div className="mb-4">
                                  <Label className="text-xs font-semibold text-gray-700 mb-2 block">Billing Type</Label>
                                  <Select
                                    value={localFilters.billing_type || 'all'}
                                    onValueChange={(value) => handleFilterChange('billing_type', value)}
                                  >
                                    <SelectTrigger className="w-full h-9">
                                      <SelectValue placeholder="All Types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Types</SelectItem>
                                      {filterOptions.billingTypes.map((type) => (
                                        <SelectItem key={type} value={type}>
                                          {type === 'fixed_price' ? 'Fixed Price' : 'Milestone'}
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
                                <h3 className="text-base font-semibold text-white">Sort Billings</h3>
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
                                    <SelectItem value="billing_code">Billing Code</SelectItem>
                                    <SelectItem value="billing_date">Billing Date</SelectItem>
                                    <SelectItem value="due_date">Due Date</SelectItem>
                                    <SelectItem value="billing_amount">Billing Amount</SelectItem>
                                    <SelectItem value="status">Status</SelectItem>
                                    <SelectItem value="billing_type">Billing Type</SelectItem>
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
                  {has('billing.create') && (
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6 h-11 whitespace-nowrap"
                    >
                      <SquarePen className="mr-2 h-4 w-4" />
                      Add Billing
                    </Button>
                  )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
                  <Table className="min-w-[1400px] w-full">
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
                      {billings.length > 0 ? (
                        billings.map((billing, index) => {
                          const totalPaid = parseFloat(billing.total_paid || 0);
                          const billingAmount = parseFloat(billing.billing_amount || 0);
                          const remaining = billingAmount - totalPaid;
                          const percentage = billingAmount > 0 ? (totalPaid / billingAmount) * 100 : 0;
                          
                          return (
                            <TableRow 
                              key={billing.id}
                              className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                              }`}
                            >
                              <TableCell className="text-left px-4 py-4 text-sm font-semibold text-gray-900">
                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                  {billing.billing_code || '---'}
                                </span>
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm">
                                <div>
                                  <div className="font-medium text-gray-900">{billing.project?.project_code}</div>
                                  <div className="text-xs text-gray-500">{billing.project?.project_name}</div>
                                  {billing.project?.client && (
                                    <div className="text-xs text-gray-400">{billing.project.client.client_name}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm">
                                <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${billingTypeColors[billing.billing_type] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                                  {billing.billing_type === 'fixed_price' ? 'Fixed Price' : 'Milestone'}
                                </span>
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                                {billing.milestone ? (
                                  <span>{billing.milestone.name}</span>
                                ) : (
                                  <span className="text-gray-400 italic">---</span>
                                )}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm">
                                <span className="font-bold text-gray-900">
                                  ₱{formatNumber(billingAmount)}
                                </span>
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                                {formatDate(billing.billing_date)}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                                {formatDate(billing.due_date)}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm font-medium text-green-600">
                                ₱{formatNumber(totalPaid)}
                              </TableCell>
                              <TableCell className={`text-left px-4 py-4 text-sm font-medium ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ₱{formatNumber(remaining)}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm">
                                <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusColors[billing.status] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                                  {capitalizeText(billing.status || '')}
                                </span>
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm">
                                <div className="flex gap-1.5">
                                  {billing.status !== 'paid' && has('billing.add-payment') && (
                                    <button
                                      onClick={() => { setPaymentBilling(billing); setShowPaymentModal(true); }}
                                      className="p-2 rounded-lg hover:bg-green-100 text-green-600 hover:text-green-700 transition-all duration-200 hover:scale-110 border border-green-200 hover:border-green-300"
                                      title="Add Payment"
                                    >
                                      <CreditCard size={16} />
                                    </button>
                                  )}
                                  {billing.status !== 'paid' && has('billing.update') && (
                                    <button
                                      onClick={() => { setEditBilling(billing); setShowEditModal(true); }}
                                      className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all duration-200 hover:scale-110 border border-indigo-200 hover:border-indigo-300"
                                      title="Edit"
                                    >
                                      <SquarePen size={16} />
                                    </button>
                                  )}
                                  {has('billing.delete') && (
                                    <button
                                      onClick={() => { setDeleteBilling(billing); setShowDeleteModal(true); }}
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
                          <TableCell colSpan={columns.length} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <div className="bg-gray-100 rounded-full p-4 mb-3">
                                <Search className="h-8 w-8 text-gray-400" />
                              </div>
                              <p className="text-gray-500 font-medium text-base">No billings found</p>
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
                      Showing <span className="font-semibold text-gray-900">{billings.length}</span> of{' '}
                      <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> billings
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
              </>
            )}
          </div>
        </div>
      </AuthenticatedLayout>
    </>
  );
}
