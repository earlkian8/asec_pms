import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useRef, useState, useMemo } from 'react';
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
import { Trash2, SquarePen, Filter, X, Search, Package, TrendingUp, AlertCircle, ArrowUpDown, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Switch } from "@/Components/ui/switch";
import { usePermission } from '@/utils/permissions';
import { toast } from 'sonner';

import AddInventoryItem from './add';
import EditInventoryItem from './edit';
import DeleteInventoryItem from './delete';
import StockIn from './stock-in';
import StockOut from './stock-out';

export default function InventoryManagement() {
  const { has } = usePermission();
  
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Inventory Management", href: route('inventory-management.index') },
    { title: "Items" },
  ];

  const columns = [
    { header: 'Item Code', width: '10%' },
    { header: 'Item Name', width: '18%' },
    { header: 'Category', width: '12%' },
    { header: 'Unit', width: '8%' },
    { header: 'Current Stock', width: '12%' },
    { header: 'Min Stock Level', width: '12%' },
    { header: 'Unit Price', width: '10%' },
    { header: 'Status', width: '8%' },
    { header: 'Action', width: '10%' },
  ];

  // Data from backend
  const pagination = usePage().props.items;
  const items = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const projects = usePage().props.projects || [];
  const transactions = usePage().props.transactions || [];
  const initialTransactionsSearch = usePage().props.transactionsSearch || '';
  const receivingReports = usePage().props.receivingReports || [];
  const initialReceivingReportsSearch = usePage().props.receivingReportsSearch || '';
  const filters = usePage().props.filters || {};
  const filterOptions = usePage().props.filterOptions || {};
  const initialSearch = usePage().props.search || '';

  // States
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [stockInItem, setStockInItem] = useState(null);
  const [stockOutItem, setStockOutItem] = useState(null);
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [showSortCard, setShowSortCard] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  const filterCardRef = useRef(null);
  const sortCardRef = useRef(null);
  const filterButtonRef = useRef(null);
  const sortButtonRef = useRef(null);
  const [filterPosition, setFilterPosition] = useState({ top: 0, right: 0 });
  const [sortPosition, setSortPosition] = useState({ top: 0, right: 0 });
  
  // Initialize filters from props
  const initializeFilters = (filterProps) => {
    return {
      category: filterProps?.category || '',
      is_active: filterProps?.is_active || '',
      is_low_stock: filterProps?.is_low_stock || '',
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
  }, [filters.category, filters.is_active, filters.is_low_stock]);

  // Sync sort when props change
  useEffect(() => {
    if (pageProps.sort_by) setSortBy(pageProps.sort_by);
    if (pageProps.sort_order) setSortOrder(pageProps.sort_order);
  }, [pageProps.sort_by, pageProps.sort_order]);

  // Close filter/sort cards when clicking outside
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

  // Format number
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '---';
    return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Count active filters
  const activeFiltersCount = () => {
    let count = 0;
    if (localFilters.category) count++;
    if (localFilters.is_active !== '') count++;
    if (localFilters.is_low_stock === 'true') count++;
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
        ...(localFilters.category && { category: localFilters.category }),
        ...(localFilters.is_active !== '' && { is_active: localFilters.is_active }),
        ...(localFilters.is_low_stock === 'true' && { is_low_stock: localFilters.is_low_stock }),
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      
      router.get(route('inventory-management.index'), params, {
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
      ...(localFilters.category && { category: localFilters.category }),
      ...(localFilters.is_active !== '' && { is_active: localFilters.is_active }),
      ...(localFilters.is_low_stock === 'true' && { is_low_stock: localFilters.is_low_stock }),
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    
    router.get(route('inventory-management.index'), params, {
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
      category: '',
      is_active: '',
      is_low_stock: '',
    });
    setSortBy('created_at');
    setSortOrder('desc');
    const params = {};
    if (searchInput && searchInput.trim()) {
      params.search = searchInput;
    }
    router.get(route('inventory-management.index'), params, {
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
      const params = {};
      if (searchInput && searchInput.trim()) {
        params.search = searchInput;
      }
      router.get(
        route('inventory-management.index'),
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
      ...(localFilters.category && { category: localFilters.category }),
      ...(localFilters.is_active !== '' && { is_active: localFilters.is_active }),
      ...(localFilters.is_low_stock === 'true' && { is_low_stock: localFilters.is_low_stock }),
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    if (searchInput && searchInput.trim()) {
      params.search = searchInput;
    }
    
    router.get(
      route('inventory-management.index'),
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
  const handleStatusChange = (item, newStatus) => {
    router.put(route('inventory-management.update-status', item.id), {
      is_active: newStatus,
    }, {
      preserveScroll: true,
      preserveState: true,
      only: ['items'],
      onSuccess: () => toast.success('Item status updated successfully!'),
      onError: () => toast.error('Failed to update status.'),
    });
  };

  // Frontend filtering for transactions
  const [transactionsSearch, setTransactionsSearch] = useState(initialTransactionsSearch);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const transactionsPerPage = 20;
  const transactionList = transactions?.data || [];
  const transactionPaginationLinks = transactions?.links || [];

  const filteredTransactions = useMemo(() => {
    if (!transactionsSearch) return transactionList;
    const query = transactionsSearch.toLowerCase();
    return transactionList.filter(trans => {
      const itemName = (trans.inventory_item?.item_name || '').toLowerCase();
      const itemCode = (trans.inventory_item?.item_code || '').toLowerCase();
      const notes = (trans.notes || '').toLowerCase();
      return itemName.includes(query) || itemCode.includes(query) || notes.includes(query);
    });
  }, [transactionsSearch, transactionList]);

  const totalTransactionsPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const transactionsStartIdx = (transactionsPage - 1) * transactionsPerPage;
  const transactionsEndIdx = transactionsStartIdx + transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(transactionsStartIdx, transactionsEndIdx);

  const handleTransactionsSearch = (e) => {
    setTransactionsSearch(e.target.value);
    setTransactionsPage(1);
  };

  const goToTransactionsPage = (page) => {
    const pageNum = Math.max(1, Math.min(page, totalTransactionsPages));
    setTransactionsPage(pageNum);
  };

  // Frontend filtering for receiving reports
  const [receivingReportsSearch, setReceivingReportsSearch] = useState(initialReceivingReportsSearch);
  const [receivingReportsPage, setReceivingReportsPage] = useState(1);
  const receivingReportsPerPage = 20;
  const receivingReportsList = receivingReports?.data || [];
  const receivingReportsPaginationLinks = receivingReports?.links || [];

  const filteredReceivingReports = useMemo(() => {
    if (!receivingReportsSearch) return receivingReportsList;
    const query = receivingReportsSearch.toLowerCase();
    return receivingReportsList.filter(report => {
      const itemName = (report.material_allocation?.inventory_item?.item_name || '').toLowerCase();
      const itemCode = (report.material_allocation?.inventory_item?.item_code || '').toLowerCase();
      const projectName = (report.material_allocation?.project?.project_name || '').toLowerCase();
      const projectCode = (report.material_allocation?.project?.project_code || '').toLowerCase();
      const notes = (report.notes || '').toLowerCase();
      return itemName.includes(query) || itemCode.includes(query) || projectName.includes(query) || projectCode.includes(query) || notes.includes(query);
    });
  }, [receivingReportsSearch, receivingReportsList]);

  const totalReceivingReportsPages = Math.ceil(filteredReceivingReports.length / receivingReportsPerPage);
  const receivingReportsStartIdx = (receivingReportsPage - 1) * receivingReportsPerPage;
  const receivingReportsEndIdx = receivingReportsStartIdx + receivingReportsPerPage;
  const paginatedReceivingReports = filteredReceivingReports.slice(receivingReportsStartIdx, receivingReportsEndIdx);

  const handleReceivingReportsSearch = (e) => {
    setReceivingReportsSearch(e.target.value);
    setReceivingReportsPage(1);
  };

  const goToReceivingReportsPage = (page) => {
    const pageNum = Math.max(1, Math.min(page, totalReceivingReportsPages));
    setReceivingReportsPage(pageNum);
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH') : '---';
  const formatStockOutType = (type) => {
    const types = {
      'project_use': 'Project Use',
      'damage': 'Damage',
      'other': 'Other'
    };
    return types[type] || type;
  };

  const tabs = [
    { key: 'items', label: 'Items' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'receiving-reports', label: 'Receiving Reports' },
  ];

  // Check if user has permission to view inventory
  if (!has('inventory.view')) {
    return (
      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Inventory Management" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">You don't have permission to view inventory.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <>
      {showAddModal && (
        <AddInventoryItem 
          setShowAddModal={setShowAddModal} 
        />
      )}
      {showEditModal && editItem && (
        <EditInventoryItem 
          setShowEditModal={setShowEditModal} 
          item={editItem} 
        />
      )}
      {showDeleteModal && deleteItem && (
        <DeleteInventoryItem 
          setShowDeleteModal={setShowDeleteModal} 
          item={deleteItem} 
        />
      )}
      {showStockInModal && stockInItem && (
        <StockIn 
          setShowStockInModal={setShowStockInModal} 
          item={stockInItem} 
        />
      )}
      {showStockOutModal && stockOutItem && (
        <StockOut 
          setShowStockOutModal={setShowStockOutModal} 
          item={stockOutItem}
          projects={projects || []}
        />
      )}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Inventory Management" />

        <div className="w-full sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow-lg sm:rounded-lg p-6 mt-2 border border-gray-100">
            
            {/* TAB HEADERS */}
            <div className="border-b border-gray-200 mb-6 overflow-x-auto no-scrollbar">
              <div className="flex gap-4 w-max">
                {tabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition
                      ${activeTab === tab.key
                        ? "border-zinc-700 text-zinc-700 font-semibold"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === 'items' ? (
              <>
                {/* Quick Stats */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Items</p>
                          <p className="text-2xl font-bold text-blue-900 mt-1">{items.length}</p>
                        </div>
                        <div className="bg-blue-200 rounded-full p-3">
                          <Package className="h-5 w-5 text-blue-700" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Active Items</p>
                          <p className="text-2xl font-bold text-green-900 mt-1">
                            {items.filter(i => i.is_active).length}
                          </p>
                        </div>
                        <div className="bg-green-200 rounded-full p-3">
                          <TrendingUp className="h-5 w-5 text-green-700" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Low Stock</p>
                          <p className="text-2xl font-bold text-red-900 mt-1">
                            {items.filter(i => i.is_low_stock).length}
                          </p>
                        </div>
                        <div className="bg-red-200 rounded-full p-3">
                          <AlertCircle className="h-5 w-5 text-red-700" />
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Total Value</p>
                          <p className="text-lg font-bold text-amber-900 mt-1">
                            ₱{items.reduce((sum, i) => sum + (parseFloat(i.current_stock || 0) * parseFloat(i.unit_price || 0)), 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div className="bg-amber-200 rounded-full p-3">
                          <TrendingUp className="h-5 w-5 text-amber-700" />
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
                        placeholder="Search items by code, name, category..."
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
                                <h3 className="text-base font-semibold text-white">Filter Items</h3>
                              </div>
                              <button
                                onClick={() => setShowFilterCard(false)}
                                className="text-white hover:bg-zinc-900 rounded-lg p-1 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="p-4 overflow-y-auto flex-1">
                              {/* Category Filter */}
                              {filterOptions.categories && filterOptions.categories.length > 0 && (
                                <div className="mb-4">
                                  <Label className="text-xs font-semibold text-gray-700 mb-2 block">Category</Label>
                                  <Select
                                    value={localFilters.category || 'all'}
                                    onValueChange={(value) => handleFilterChange('category', value)}
                                  >
                                    <SelectTrigger className="w-full h-9">
                                      <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Categories</SelectItem>
                                      {filterOptions.categories.map((category) => (
                                        <SelectItem key={category} value={category}>
                                          {capitalizeText(category)}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              {/* Status Filter */}
                              <div className="mb-4">
                                <Label className="text-xs font-semibold text-gray-700 mb-2 block">Status</Label>
                                <Select
                                  value={localFilters.is_active !== '' ? localFilters.is_active : 'all'}
                                  onValueChange={(value) => handleFilterChange('is_active', value)}
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

                              {/* Low Stock Filter */}
                              <div className="mb-4">
                                <Label className="text-xs font-semibold text-gray-700 mb-2 block">Stock Level</Label>
                                <Select
                                  value={localFilters.is_low_stock || 'all'}
                                  onValueChange={(value) => handleFilterChange('is_low_stock', value)}
                                >
                                  <SelectTrigger className="w-full h-9">
                                    <SelectValue placeholder="All Items" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Items</SelectItem>
                                    <SelectItem value="true">Low Stock Only</SelectItem>
                                  </SelectContent>
                                </Select>
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
                                <h3 className="text-base font-semibold text-white">Sort Items</h3>
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
                                    <SelectItem value="item_code">Item Code</SelectItem>
                                    <SelectItem value="item_name">Item Name</SelectItem>
                                    <SelectItem value="category">Category</SelectItem>
                                    <SelectItem value="current_stock">Current Stock</SelectItem>
                                    <SelectItem value="min_stock_level">Min Stock Level</SelectItem>
                                    <SelectItem value="unit_price">Unit Price</SelectItem>
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
                  {has('inventory.create') && (
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6 h-11 whitespace-nowrap"
                    >
                      <SquarePen className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
                  <Table className="min-w-[1200px] w-full">
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
                      {items.length > 0 ? (
                        items.map((item, index) => {
                          return (
                            <TableRow 
                              key={item.id}
                              className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                              } ${item.is_low_stock ? 'bg-red-50/50' : ''}`}
                            >
                              <TableCell className="text-left px-4 py-4 text-sm font-semibold text-gray-900">
                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                  {item.item_code || '---'}
                                </span>
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm font-medium text-gray-900">
                                {capitalizeText(item.item_name)}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                                {item.category ? capitalizeText(item.category) : (
                                  <span className="text-gray-400 italic">No category</span>
                                )}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                                {item.unit_of_measure}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm">
                                <span className={`font-medium ${
                                  item.is_low_stock ? 'text-red-600' : 'text-gray-900'
                                }`}>
                                  {formatNumber(item.current_stock)} {item.unit_of_measure}
                                </span>
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                                {item.min_stock_level ? formatNumber(item.min_stock_level) : '---'}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm">
                                {item.unit_price ? (
                                  <span className="font-bold text-gray-900">
                                    ₱{formatNumber(item.unit_price)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">---</span>
                                )}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm">
                                <div className="flex items-center gap-2">
                                  {has('inventory.update') ? (
                                    <>
                                      <Switch
                                        checked={item.is_active}
                                        onCheckedChange={(checked) => handleStatusChange(item, checked)}
                                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                                      />
                                      <span className={`text-xs font-medium ${item.is_active ? 'text-green-600' : 'text-red-600'}`}>
                                        {item.is_active ? 'Active' : 'Inactive'}
                                      </span>
                                    </>
                                  ) : (
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                                      item.is_active 
                                        ? 'bg-green-100 text-green-800 border border-green-200' 
                                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                                    }`}>
                                      {item.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm">
                                <div className="flex gap-1.5">
                                  {has('inventory.stock-in') && (
                                    <button
                                      onClick={() => { setStockInItem(item); setShowStockInModal(true); }}
                                      className="p-2 rounded-lg hover:bg-green-100 text-green-600 hover:text-green-700 transition-all duration-200 hover:scale-110 border border-green-200 hover:border-green-300"
                                      title="Stock In"
                                    >
                                      <ArrowDownToLine size={16} />
                                    </button>
                                  )}
                                  {has('inventory.stock-out') && (
                                    <button
                                      onClick={() => {
                                        if (item.current_stock <= 0) {
                                          toast.error(`Cannot pull out stock. Item "${item.item_name}" has no available stock.`);
                                          return;
                                        }
                                        setStockOutItem(item);
                                        setShowStockOutModal(true);
                                      }}
                                      className="p-2 rounded-lg hover:bg-orange-100 text-orange-600 hover:text-orange-700 transition-all duration-200 hover:scale-110 border border-orange-200 hover:border-orange-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                      title={item.current_stock <= 0 ? "No stock available" : "Stock Out"}
                                      disabled={item.current_stock <= 0}
                                    >
                                      <ArrowUpFromLine size={16} />
                                    </button>
                                  )}
                                  {has('inventory.update') && (
                                    <button
                                      onClick={() => { setEditItem(item); setShowEditModal(true); }}
                                      className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all duration-200 hover:scale-110 border border-indigo-200 hover:border-indigo-300"
                                      title="Edit"
                                    >
                                      <SquarePen size={16} />
                                    </button>
                                  )}
                                  {has('inventory.delete') && (
                                    <button
                                      onClick={() => { setDeleteItem(item); setShowDeleteModal(true); }}
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
                              <p className="text-gray-500 font-medium text-base">No items found</p>
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
                      Showing <span className="font-semibold text-gray-900">{items.length}</span> of{' '}
                      <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> items
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
            ) : activeTab === 'transactions' ? (
              <>
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search transactions by item name, code, or notes..."
                      value={transactionsSearch}
                      onChange={handleTransactionsSearch}
                      className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-full h-11 border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
                  <Table className="min-w-[1200px] w-full">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Date</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Item</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Type</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Stock Out Type</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Quantity</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Unit Price</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Project</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Created By</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTransactions.length > 0 ? (
                        paginatedTransactions.map((trans, index) => (
                          <TableRow 
                            key={trans.id} 
                            className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                              index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                            }`}
                          >
                            <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                              {formatDate(trans.transaction_date)}
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm">
                              <div>
                                <div className="font-medium text-gray-900">{trans.inventory_item?.item_name || '---'}</div>
                                <div className="text-xs text-gray-500">{trans.inventory_item?.item_code || ''}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm">
                              <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                                trans.transaction_type === 'stock_in'
                                  ? 'bg-green-100 text-green-800 border border-green-200'
                                  : 'bg-red-100 text-red-800 border border-red-200'
                              }`}>
                                {trans.transaction_type === 'stock_in' ? 'Stock In' : 'Stock Out'}
                              </span>
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm">
                              {trans.stock_out_type ? (
                                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                  {formatStockOutType(trans.stock_out_type)}
                                </span>
                              ) : (
                                <span className="text-gray-400">---</span>
                              )}
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm font-medium text-gray-900">
                              {formatNumber(trans.quantity)} {trans.inventory_item?.unit_of_measure || ''}
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm">
                              {trans.unit_price ? (
                                <span className="font-bold text-gray-900">
                                  ₱{formatNumber(trans.unit_price)}
                                </span>
                              ) : (
                                <span className="text-gray-400">---</span>
                              )}
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm">
                              {trans.project ? (
                                <div>
                                  <div className="font-medium text-gray-900">{trans.project.project_code}</div>
                                  <div className="text-xs text-gray-500">{trans.project.project_name}</div>
                                </div>
                              ) : (
                                <span className="text-gray-400">---</span>
                              )}
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                              {trans.created_by?.name || '---'}
                            </TableCell>
                            <TableCell className="text-left px-4 py-4 text-sm text-gray-700 max-w-xs truncate">
                              {trans.notes || '---'}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-12">
                            <div className="flex flex-col items-center justify-center">
                              <div className="bg-gray-100 rounded-full p-4 mb-3">
                                <Search className="h-8 w-8 text-gray-400" />
                              </div>
                              <p className="text-gray-500 font-medium text-base">No transactions found</p>
                              <p className="text-gray-400 text-sm mt-1">Try adjusting your search</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Transactions Pagination */}
                {filteredTransactions.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-gray-200 gap-4">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-semibold text-gray-900">{transactionsStartIdx + 1}</span> to{' '}
                      <span className="font-semibold text-gray-900">{Math.min(transactionsEndIdx, filteredTransactions.length)}</span> of{' '}
                      <span className="font-semibold text-gray-900">{filteredTransactions.length}</span> transactions
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        disabled={transactionsPage === 1}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                          transactionsPage === 1
                            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow'
                        }`}
                        onClick={() => goToTransactionsPage(transactionsPage - 1)}
                      >
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalTransactionsPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => goToTransactionsPage(page)}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 min-w-[40px] ${
                              transactionsPage === page
                                ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white hover:from-zinc-800 hover:to-zinc-900 shadow-md'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        disabled={transactionsPage === totalTransactionsPages}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                          transactionsPage === totalTransactionsPages
                            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow'
                        }`}
                        onClick={() => goToTransactionsPage(transactionsPage + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Search Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search receiving reports by item name, code, project, or notes..."
                      value={receivingReportsSearch}
                      onChange={handleReceivingReportsSearch}
                      className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-full h-11 border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Receiving Reports Table */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
                  <Table className="min-w-[1200px] w-full">
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Date</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Item</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Project</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Quantity</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Condition</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Received By</TableHead>
                        <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedReceivingReports.length > 0 ? (
                        paginatedReceivingReports.map((report, index) => {
                          const allocation = report.material_allocation || report.materialAllocation || {};
                          const item = allocation?.inventory_item || allocation?.inventoryItem || {};
                          const project = allocation?.project || {};
                          const receivedBy = report.received_by || report.receivedBy || {};
                          
                          return (
                            <TableRow 
                              key={report.id} 
                              className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                              }`}
                            >
                              <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                                {formatDate(report.received_at)}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm">
                                {item && (item.item_name || item.item_code) ? (
                                  <div>
                                    <div className="font-medium text-gray-900">{item.item_name || '---'}</div>
                                    <div className="text-xs text-gray-500">{item.item_code || ''}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">---</span>
                                )}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm">
                                {project && project.project_code ? (
                                  <div>
                                    <div className="font-medium text-gray-900">{project.project_code}</div>
                                    <div className="text-xs text-gray-500">{project.project_name || ''}</div>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">---</span>
                                )}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm font-medium text-gray-900">
                                {formatNumber(report.quantity_received)} {item.unit_of_measure || 'units'}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm">
                                {report.condition ? (
                                  <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                                    report.condition.toLowerCase() === 'good' 
                                      ? 'bg-green-100 text-green-800 border border-green-200'
                                      : report.condition.toLowerCase() === 'damaged'
                                      ? 'bg-red-100 text-red-800 border border-red-200'
                                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                                  }`}>
                                    {report.condition}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">---</span>
                                )}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm">
                                {receivedBy.name ? (
                                  <div>
                                    <div className="font-medium text-gray-900">{receivedBy.name}</div>
                                    {receivedBy.roles && receivedBy.roles.length > 0 && (
                                      <div className="text-xs text-gray-500">
                                        {receivedBy.roles.map(role => role.name).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">---</span>
                                )}
                              </TableCell>
                              <TableCell className="text-left px-4 py-4 text-sm text-gray-700 max-w-xs truncate">
                                {report.notes || '---'}
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
                              <p className="text-gray-500 font-medium text-base">No receiving reports found</p>
                              <p className="text-gray-400 text-sm mt-1">Try adjusting your search</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Receiving Reports Pagination */}
                {filteredReceivingReports.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-gray-200 gap-4">
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-semibold text-gray-900">{receivingReportsStartIdx + 1}</span> to{' '}
                      <span className="font-semibold text-gray-900">{Math.min(receivingReportsEndIdx, filteredReceivingReports.length)}</span> of{' '}
                      <span className="font-semibold text-gray-900">{filteredReceivingReports.length}</span> receiving reports
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        disabled={receivingReportsPage === 1}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                          receivingReportsPage === 1
                            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow'
                        }`}
                        onClick={() => goToReceivingReportsPage(receivingReportsPage - 1)}
                      >
                        Previous
                      </button>

                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalReceivingReportsPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => goToReceivingReportsPage(page)}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 min-w-[40px] ${
                              receivingReportsPage === page
                                ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white hover:from-zinc-800 hover:to-zinc-900 shadow-md'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                      </div>

                      <button
                        disabled={receivingReportsPage === totalReceivingReportsPages}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                          receivingReportsPage === totalReceivingReportsPages
                            ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow'
                        }`}
                        onClick={() => goToReceivingReportsPage(receivingReportsPage + 1)}
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
