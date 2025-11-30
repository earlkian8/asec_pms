import { useState, useRef, useEffect } from 'react';
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
import { toast } from 'sonner';
import { Check, Trash2, SquarePen, Filter, X, Search, Calendar, ArrowUpDown, Users, UserCheck, UserX } from 'lucide-react';
import { Switch } from "@/Components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { usePermission } from '@/utils/permissions';
import AddProjectTeam from './add';
import EditProjectTeam from './edit';
import UnassignTeamMember from './delete';

export default function TeamTab({ project, teamData }) {
  const { has } = usePermission();
  
  const projectTeams = teamData?.projectTeams?.data || [];
  const paginationLinks = teamData?.projectTeams?.links || [];
  const employees = teamData?.employees || [];
  const filters = teamData?.filters || {};
  const filterOptions = teamData?.filterOptions || {};
  const initialSearch = teamData?.search || '';
  
  // States
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUnassignModal, setShowUnassignModal] = useState(false);
  const [editProjectTeam, setEditProjectTeam] = useState(null);
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
      role: filterProps?.role || '',
      status: filterProps?.status || '',
      start_date: filterProps?.start_date || '',
      end_date: filterProps?.end_date || '',
    };
  };
  
  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const [sortBy, setSortBy] = useState(teamData?.sort_by || 'created_at');
  const [sortOrder, setSortOrder] = useState(teamData?.sort_order || 'desc');

  // Sync filters when props change
  useEffect(() => {
    const newFilters = initializeFilters(filters);
    setLocalFilters(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.role, filters.status, filters.start_date, filters.end_date]);

  // Sync sort when props change
  useEffect(() => {
    if (teamData?.sort_by) setSortBy(teamData.sort_by);
    if (teamData?.sort_order) setSortOrder(teamData.sort_order);
  }, [teamData?.sort_by, teamData?.sort_order]);

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
    if (localFilters.role) count++;
    if (localFilters.status !== null && localFilters.status !== '') count++;
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
        ...(localFilters.role && { role: localFilters.role }),
        ...(localFilters.status !== null && localFilters.status !== '' && { status: localFilters.status }),
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
      ...(localFilters.role && { role: localFilters.role }),
      ...(localFilters.status !== null && localFilters.status !== '' && { status: localFilters.status }),
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
      role: '',
      status: '',
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
          ...(localFilters.role && { role: localFilters.role }),
          ...(localFilters.status !== null && localFilters.status !== '' && { status: localFilters.status }),
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

  // Selection
  const toggleSelectAll = () => {
    if (selectedIds.length === projectTeams.length) setSelectedIds([]);
    else setSelectedIds(projectTeams.map(member => member.id));
  };
  
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Backend actions
  const handleBulkUnassign = () => {
    if (selectedIds.length === 0) return;
    setShowUnassignModal(true);
  };

  const handleUnassignSuccess = () => {
    setSelectedIds([]);
    setShowUnassignModal(false);
  };
  
  const handleToggleStatus = (team) => {
    router.put(
      route("project-management.project-teams.update-status", [project.id, team.id]),
      { is_active: !team.is_active },
      {
        preserveScroll: true,
        onSuccess: () => toast.success(`${team.user?.name} status updated.`),
        onError: () => toast.error("Failed to update status.")
      }
    );
  };

  const formatCurrency = (amount) => amount ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount) : '---';
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH') : '---';

  // Calculate stats
  const totalMembers = projectTeams.length;
  const activeMembers = projectTeams.filter(t => t.is_active).length;
  const inactiveMembers = projectTeams.filter(t => !t.is_active).length;

  const columns = [
    { header: '', width: '3%' },
    { header: 'User', width: '20%' },
    { header: 'Email', width: '20%' },
    { header: 'Role', width: '12%' },
    { header: 'Hourly Rate', width: '12%' },
    { header: 'Start Date', width: '12%' },
    { header: 'End Date', width: '12%' },
    { header: 'Status', width: '9%' },
    { header: 'Action', width: '9%' },
  ];

  return (
    <div className="w-full">
      {/* Quick Stats */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Members</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{totalMembers}</p>
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
                <p className="text-2xl font-bold text-green-900 mt-1">{activeMembers}</p>
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
                <p className="text-2xl font-bold text-red-900 mt-1">{inactiveMembers}</p>
              </div>
              <div className="bg-red-200 rounded-full p-3">
                <UserX className="h-5 w-5 text-red-700" />
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
              placeholder="Search team members by name, email, or role..."
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
                      <h3 className="text-base font-semibold text-white">Filter Team Members</h3>
                    </div>
                    <button
                      onClick={() => setShowFilterCard(false)}
                      className="text-white hover:bg-zinc-900 rounded-lg p-1 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-4 overflow-y-auto flex-1">
                    {/* Role Filter */}
                    {filterOptions.roles && filterOptions.roles.length > 0 && (
                      <div className="mb-4">
                        <Label className="text-xs font-semibold text-gray-700 mb-2 block">Role</Label>
                        <Select
                          value={localFilters.role || 'all'}
                          onValueChange={(value) => handleFilterChange('role', value)}
                        >
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="All Roles" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Roles</SelectItem>
                            {filterOptions.roles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {capitalizeText(role)}
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
                        value={localFilters.status !== null && localFilters.status !== '' ? localFilters.status : 'all'}
                        onValueChange={(value) => handleFilterChange('status', value)}
                      >
                        <SelectTrigger className="w-full h-9">
                          <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
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
                      <h3 className="text-base font-semibold text-white">Sort Team Members</h3>
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
                          <SelectItem value="role">Role</SelectItem>
                          <SelectItem value="hourly_rate">Hourly Rate</SelectItem>
                          <SelectItem value="start_date">Start Date</SelectItem>
                          <SelectItem value="end_date">End Date</SelectItem>
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
        <div className="flex gap-2">
          {has('project-teams.delete') && selectedIds.length > 0 && (
            <Button
              className="bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6 h-11 whitespace-nowrap"
              onClick={handleBulkUnassign}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Unassign Selected ({selectedIds.length})
            </Button>
          )}
          {has('project-teams.create') && (
            <Button
              className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6 h-11 whitespace-nowrap"
              onClick={() => setShowAddModal(true)}
            >
              <SquarePen className="mr-2 h-4 w-4" />
              Add Team Member
            </Button>
          )}
        </div>
      </div>

      {/* Team Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
        <Table className="min-w-[1000px] w-full">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              {has('project-teams.delete') && (
                <TableHead className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider" style={{ width: '3%' }}>
                  <div
                    onClick={toggleSelectAll}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition ${
                      selectedIds.length === projectTeams.length && projectTeams.length > 0
                        ? 'border-zinc-800 bg-zinc-800'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {selectedIds.length === projectTeams.length && projectTeams.length > 0 && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                </TableHead>
              )}
              {columns.slice(1).map((col, i) => (
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
            {projectTeams.length > 0 ? projectTeams.map((team, index) => {
              const isSelected = selectedIds.includes(team.id);
              return (
                <TableRow 
                  key={team.id}
                  className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  {has('project-teams.delete') && (
                    <TableCell className="text-left px-4 py-4">
                      <div
                        onClick={() => toggleSelect(team.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition ${
                          isSelected ? 'border-zinc-800 bg-zinc-800' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </TableCell>
                  )}
                  <TableCell className="text-left px-4 py-4 text-sm font-medium text-gray-900">
                    {team.user?.name || '---'}
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                    {team.user?.email || '---'}
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm">
                    <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                      {capitalizeText(team.role)}
                    </span>
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm font-bold text-gray-900">
                    {formatCurrency(team.hourly_rate)}
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                    {formatDate(team.start_date)}
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                    {formatDate(team.end_date)}
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm">
                    {has('project-teams.update') ? (
                      <Switch
                        checked={team.is_active}
                        onCheckedChange={() => handleToggleStatus(team)}
                        className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                      />
                    ) : (
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                        team.is_active 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-red-100 text-red-800 border border-red-200'
                      }`}>
                        {team.is_active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm">
                    <div className="flex gap-1.5">
                      {has('project-teams.update') && (
                        <button
                          onClick={() => { setEditProjectTeam(team); setShowEditModal(true); }}
                          className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all duration-200 hover:scale-110 border border-indigo-200 hover:border-indigo-300"
                          title="Edit"
                        >
                          <SquarePen size={16} />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={has('project-teams.delete') ? 9 : 8} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-gray-100 rounded-full p-4 mb-3">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium text-base">No team members found</p>
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
            Showing <span className="font-semibold text-gray-900">{projectTeams.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{teamData?.projectTeams?.total || 0}</span> team members
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
        <AddProjectTeam
          setShowAddModal={setShowAddModal}
          users={employees}
          project={project}
        />
      )}
      {showEditModal && (
        <EditProjectTeam 
          setShowEditModal={setShowEditModal} 
          projectTeam={editProjectTeam} 
          project={project} 
        />
      )}
      {showUnassignModal && selectedIds.length > 0 && (
        <UnassignTeamMember
          setShowUnassignModal={setShowUnassignModal}
          project={project}
          teamMembers={projectTeams}
          selectedIds={selectedIds}
          onSuccess={handleUnassignSuccess}
        />
      )}
    </div>
  );
}
