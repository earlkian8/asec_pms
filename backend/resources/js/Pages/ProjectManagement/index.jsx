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
import { Trash2, SquarePen, Eye, Filter, X, Search, Calendar, TrendingUp, Users, DollarSign, ArrowUpDown } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { usePermission } from '@/utils/permissions';

import AddProject from './add';
import EditProject from './edit';
import DeleteProject from './delete';

export default function ProjectsIndex() {
  const { has } = usePermission();
  
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Project Management", href: route('project-management.index') },
    { title: "Projects" },
  ];

  const columns = [
    { header: 'Code', width: '8%' },
    { header: 'Name', width: '18%' },
    { header: 'Client', width: '12%' },
    { header: 'Type', width: '10%' },
    { header: 'Contract Amount', width: '12%' },
    { header: 'Progress', width: '15%' },
    { header: 'Status', width: '8%' },
    { header: 'Priority', width: '8%' },
    { header: 'Action', width: '9%' },
  ];

  // Data from backend
  const pagination = usePage().props.projects;
  const projects = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const clients = usePage().props.clients || [];
  const users = usePage().props.users || [];
  const inventoryItems = usePage().props.inventoryItems || [];
  const projectTypes = usePage().props.projectTypes || [];
  const filters = usePage().props.filters || {};
  const filterOptions = usePage().props.filterOptions || {};
  const initialSearch = usePage().props.search || '';
  const clientTypes = usePage().props.clientTypes || [];
  // States
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProject, setDeleteProject] = useState(null);
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
      client_id: filterProps?.client_id || '',
      status: filterProps?.status || '',
      priority: filterProps?.priority || '',
      project_type_id: filterProps?.project_type_id || '',
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
  }, [filters.client_id, filters.status, filters.priority, filters.project_type_id, filters.start_date, filters.end_date]);

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
      // Radix Select portals render to body, so we need to check for select-related elements
      let isSelectClick = false;
      
      // Check for Radix Select attributes and roles
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
      
      // Also check if the element itself has select-related attributes
      if (!isSelectClick && target.getAttribute) {
        const role = target.getAttribute('role');
        const dataAttr = target.getAttribute('data-radix-select-content') || 
                        target.getAttribute('data-radix-select-viewport') ||
                        target.getAttribute('data-radix-select-item');
        isSelectClick = role === 'listbox' || role === 'option' || !!dataAttr;
      }
      
      // Check if target is within a Radix portal container (selects use portals)
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
      
      // Don't close if clicking on select dropdown
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

  // Tag color mappings
  const typeColors = {
    design: 'bg-purple-100 text-purple-800 border border-purple-200',
    construction: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    consultancy: 'bg-blue-100 text-blue-800 border border-blue-200',
    maintenance: 'bg-green-100 text-green-800 border border-green-200',
    structural: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    civil: 'bg-orange-100 text-orange-800 border border-orange-200',
    mechanical: 'bg-pink-100 text-pink-800 border border-pink-200',
    electrical: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
    environmental: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    geotechnical: 'bg-amber-100 text-amber-800 border border-amber-200',
    surveying: 'bg-teal-100 text-teal-800 border border-teal-200',
  };

  const statusColors = {
    active: 'bg-blue-100 text-blue-800 border border-blue-200',
    on_hold: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    completed: 'bg-green-100 text-green-800 border border-green-200',
    cancelled: 'bg-red-100 text-red-800 border border-red-200',
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800 border border-green-200',
    medium: 'bg-blue-100 text-blue-800 border border-blue-200',
    high: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
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
    if (localFilters.client_id) count++;
    if (localFilters.status) count++;
    if (localFilters.priority) count++;
    if (localFilters.project_type_id) count++;
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
        ...(localFilters.client_id && { client_id: localFilters.client_id }),
        ...(localFilters.status && { status: localFilters.status }),
        ...(localFilters.priority && { priority: localFilters.priority }),
        ...(localFilters.project_type_id && { project_type_id: localFilters.project_type_id }),
        ...(localFilters.start_date && { start_date: localFilters.start_date }),
        ...(localFilters.end_date && { end_date: localFilters.end_date }),
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      
      router.get(route('project-management.index'), params, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
        onSuccess: () => {
          // Don't close the card, just hide it visually but keep buttons visible
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
      ...(localFilters.client_id && { client_id: localFilters.client_id }),
      ...(localFilters.status && { status: localFilters.status }),
      ...(localFilters.priority && { priority: localFilters.priority }),
      ...(localFilters.project_type && { project_type: localFilters.project_type }),
      ...(localFilters.start_date && { start_date: localFilters.start_date }),
      ...(localFilters.end_date && { end_date: localFilters.end_date }),
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    
    router.get(route('project-management.index'), params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
      onSuccess: () => {
        // Don't close the card, just hide it visually but keep buttons visible
        setShowSortCard(false);
      }
    });
  };

  // Reset/Clear all filters
  const resetFilters = () => {
    setLocalFilters({
      client_id: '',
      status: '',
      priority: '',
      project_type_id: '',
      start_date: '',
      end_date: '',
    });
    setSortBy('created_at');
    setSortOrder('desc');
    const params = {};
    if (searchInput && searchInput.trim()) {
      params.search = searchInput;
    }
    router.get(route('project-management.index'), params, {
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
        route('project-management.index'),
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
      ...(localFilters.client_id && { client_id: localFilters.client_id }),
      ...(localFilters.status && { status: localFilters.status }),
      ...(localFilters.priority && { priority: localFilters.priority }),
      ...(localFilters.project_type && { project_type: localFilters.project_type }),
      ...(localFilters.start_date && { start_date: localFilters.start_date }),
      ...(localFilters.end_date && { end_date: localFilters.end_date }),
      sort_by: sortBy,
      sort_order: sortOrder,
    };
    if (searchInput && searchInput.trim()) {
      params.search = searchInput;
    }
    
    router.get(
      route('project-management.index'),
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

  return (
    <>
      {showAddModal && (
        <AddProject 
          setShowAddModal={setShowAddModal} 
          clients={clients}
          users={users}
          inventoryItems={inventoryItems}
          projectTypes={projectTypes}
          clientTypes={clientTypes}
        />
      )}
      {showEditModal && (
        <EditProject setShowEditModal={setShowEditModal} project={editProject} clients={clients} projectTypes={projectTypes} />
      )}
      {showDeleteModal && (
        <DeleteProject setShowDeleteModal={setShowDeleteModal} project={deleteProject} />
      )}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Projects" />

        <div className="w-full sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow-lg sm:rounded-lg p-6 mt-2 border border-gray-100">
            
            {/* Quick Stats */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Projects</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">{projects.length}</p>
                    </div>
                    <div className="bg-blue-200 rounded-full p-3">
                      <TrendingUp className="h-5 w-5 text-blue-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Active</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">
                        {projects.filter(p => p.status === 'active').length}
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
                      <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Completed</p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">
                        {projects.filter(p => p.status === 'completed').length}
                      </p>
                    </div>
                    <div className="bg-purple-200 rounded-full p-3">
                      <TrendingUp className="h-5 w-5 text-purple-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Total Value</p>
                      <p className="text-lg font-bold text-amber-900 mt-1">
                        ₱{projects.reduce((sum, p) => sum + parseFloat(p.contract_amount || 0), 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="bg-amber-200 rounded-full p-3">
                      <DollarSign className="h-5 w-5 text-amber-700" />
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
                    placeholder="Search projects by code, name, status, or priority..."
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
                        <h3 className="text-base font-semibold text-white">Filter Projects</h3>
                      </div>
                      <button
                        onClick={() => setShowFilterCard(false)}
                        className="text-white hover:bg-zinc-900 rounded-lg p-1 transition-colors"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="p-4 overflow-y-auto flex-1">
                      {/* Client Filter */}
                      <div className="mb-4">
                        <Label className="text-xs font-semibold text-gray-700 mb-2 block">Client</Label>
                        <Select
                          value={localFilters.client_id || 'all'}
                          onValueChange={(value) => handleFilterChange('client_id', value)}
                        >
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="All Clients" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Clients</SelectItem>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.client_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

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
                                  {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Priority Filter */}
                      {filterOptions.priorities && filterOptions.priorities.length > 0 && (
                        <div className="mb-4">
                          <Label className="text-xs font-semibold text-gray-700 mb-2 block">Priority</Label>
                          <Select
                            value={localFilters.priority || 'all'}
                            onValueChange={(value) => handleFilterChange('priority', value)}
                          >
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="All Priorities" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Priorities</SelectItem>
                              {filterOptions.priorities.map((priority) => (
                                <SelectItem key={priority} value={priority}>
                                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Project Type Filter */}
                      {filterOptions.projectTypes && filterOptions.projectTypes.length > 0 && (
                        <div className="mb-4">
                          <Label className="text-xs font-semibold text-gray-700 mb-2 block">Project Type</Label>
                          <Select
                            value={localFilters.project_type_id || 'all'}
                            onValueChange={(value) => handleFilterChange('project_type_id', value)}
                          >
                            <SelectTrigger className="w-full h-9">
                              <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Types</SelectItem>
                              {filterOptions.projectTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id.toString()}>
                                  {type.name}
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
                            <h3 className="text-base font-semibold text-white">Sort Projects</h3>
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
                                <SelectItem value="project_name">Project Name</SelectItem>
                                <SelectItem value="project_code">Project Code</SelectItem>
                                <SelectItem value="status">Status</SelectItem>
                                <SelectItem value="priority">Priority</SelectItem>
                                <SelectItem value="contract_amount">Contract Amount</SelectItem>
                                <SelectItem value="start_date">Start Date</SelectItem>
                                <SelectItem value="planned_end_date">End Date</SelectItem>
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
                {has('projects.create') && (
                  <Button
                    onClick={() => setShowAddModal(true)}
                  className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6 h-11 whitespace-nowrap"
                  >
                  <SquarePen className="mr-2 h-4 w-4" />
                    Add Project
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
                  {projects.length > 0 ? (
                    projects.map((project, index) => {
                      const progress = project.progress_percentage || 0;
                      return (
                      <TableRow 
                        key={project.id}
                        className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <TableCell className="text-left px-4 py-4 text-sm font-semibold text-gray-900">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                            {project.project_code || '---'}
                          </span>
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm font-medium text-gray-900">
                          {capitalizeText(project.project_name)}
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                          {project.client?.client_name ? capitalizeText(project.client.client_name) : (
                            <span className="text-gray-400 italic">No client</span>
                          )}
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${typeColors[project.project_type?.name] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                            {project.project_type?.name || '---'}
                          </span>
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm">
                          <span className="font-bold text-gray-900">
                            ₱{parseFloat(project.contract_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-3 max-w-[140px] shadow-inner border border-gray-300">
                              <div 
                                className={`h-3 rounded-full transition-all duration-700 shadow-sm ${
                                  progress === 100 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                  progress >= 50 ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                  progress > 0 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                                  'bg-gray-300'
                                }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold w-12 text-right ${
                              progress === 100 ? 'text-green-700' :
                              progress >= 50 ? 'text-blue-700' :
                              progress > 0 ? 'text-yellow-700' :
                              'text-gray-500'
                            }`}>{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusColors[project.status] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                            {capitalizeText(project.status?.replace('_', ' ') || '')}
                          </span>
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${priorityColors[project.priority] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                            {capitalizeText(project.priority || '')}
                          </span>
                        </TableCell>
                        <TableCell className="text-left px-4 py-4 text-sm">
                          <div className="flex gap-1.5">
                            {has('projects.view') && (
                              <Link href={route('project-management.view', project.id)}>
                                <button
                                    className="p-2 rounded-lg hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:scale-110 border border-blue-200 hover:border-blue-300"
                                    title="View Project"
                                    aria-label="View Project"
                                >
                                    <Eye size={16} />
                                </button>
                              </Link>
                            )}
                            {has('projects.update') && (
                              <button
                                onClick={() => {
                                  setEditProject(project);
                                  setShowEditModal(true);
                                }}
                                className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all duration-200 hover:scale-110 border border-indigo-200 hover:border-indigo-300"
                                title="Edit"
                              >
                                <SquarePen size={16} />
                              </button>
                            )}
                            {has('projects.delete') && (
                              <button
                                onClick={() => {
                                  setDeleteProject(project);
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
                      <TableCell colSpan={columns.length} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center">
                          <div className="bg-gray-100 rounded-full p-4 mb-3">
                            <Search className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium text-base">No projects found</p>
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
                  Showing <span className="font-semibold text-gray-900">{projects.length}</span> of{' '}
                  <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> projects
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
