import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/Components/ui/table";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Label } from "@/Components/ui/label";
import { toast } from 'sonner';
import {
  Check, Trash2, SquarePen, Filter, X, Search, Calendar,
  ArrowUpDown, Users, UserCheck, UserX, LogOut, Eye,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/Components/ui/dialog";
import { usePermission } from '@/utils/permissions';
import AddProjectTeam from './add';
import EditProjectTeam from './edit';
import UnassignTeamMember from './delete';
import RemoveTeamMember from './remove';
import ViewAssignmentHistory from './ViewAssignmentHistory';

export default function TeamTab({ project, teamData }) {
  const { has } = usePermission();

  const projectTeams     = teamData?.projectTeams?.data || [];
  const paginationLinks  = teamData?.projectTeams?.links || [];
  const filters          = teamData?.filters || {};
  const filterOptions    = teamData?.filterOptions || {};
  const initialSearch    = teamData?.search || '';

  const [selectedIds,           setSelectedIds]           = useState([]);
  const [showAddModal,          setShowAddModal]          = useState(false);
  const [showEditModal,         setShowEditModal]         = useState(false);
  const [showUnassignModal,     setShowUnassignModal]     = useState(false);
  const [showBulkReactivate,    setShowBulkReactivate]    = useState(false);
  const [showBulkRemoveModal,   setShowBulkRemoveModal]   = useState(false);
  const [editProjectTeam,       setEditProjectTeam]       = useState(null);
  const [showRemoveModal,       setShowRemoveModal]       = useState(false);
  const [removeTeamMember,      setRemoveTeamMember]      = useState(null);
  const [showHistoryModal,      setShowHistoryModal]      = useState(false);
  const [historyTeamMember,     setHistoryTeamMember]     = useState(null);
  const [searchInput,         setSearchInput]         = useState(initialSearch);
  const [showFilterCard,      setShowFilterCard]      = useState(false);
  const [showSortCard,        setShowSortCard]        = useState(false);
  const debounceTimer = useRef(null);

  const initializeFilters = (fp) => ({
    role:       fp?.role       || '',
    status:     fp?.status     || '',
    start_date: fp?.start_date || '',
    end_date:   fp?.end_date   || '',
  });

  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const [sortBy,       setSortBy]       = useState(teamData?.sort_by    || 'created_at');
  const [sortOrder,    setSortOrder]    = useState(teamData?.sort_order || 'desc');

  useEffect(() => {
    setLocalFilters(initializeFilters(filters));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.role, filters.status, filters.start_date, filters.end_date]);

  useEffect(() => {
    if (teamData?.sort_by)    setSortBy(teamData.sort_by);
    if (teamData?.sort_order) setSortOrder(teamData.sort_order);
  }, [teamData?.sort_by, teamData?.sort_order]);

  const capitalizeText = (text) => {
    if (!text) return '';
    return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const activeFiltersCount = () => {
    let count = 0;
    if (localFilters.role) count++;
    if (localFilters.status !== null && localFilters.status !== '') count++;
    if (localFilters.start_date) count++;
    if (localFilters.end_date) count++;
    return count;
  };

  const handleFilterChange = (filterType, value) => {
    setLocalFilters(prev => ({ ...prev, [filterType]: value === 'all' ? '' : value }));
  };

  const buildParams = (extra = {}) => ({
    ...(searchInput                          && { search:     searchInput            }),
    ...(localFilters.role                    && { role:       localFilters.role      }),
    ...(localFilters.status                  && { status:     localFilters.status    }),
    ...(localFilters.start_date              && { start_date: localFilters.start_date }),
    ...(localFilters.end_date                && { end_date:   localFilters.end_date  }),
    sort_by:    sortBy,
    sort_order: sortOrder,
    ...extra,
  });

  const applyFilters = (e) => {
    e?.preventDefault(); e?.stopPropagation();
    router.get(route('project-management.view', project.id), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowFilterCard(false),
    });
  };

  const applySort = () => {
    router.get(route('project-management.view', project.id), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowSortCard(false),
    });
  };

  const resetFilters = () => {
    setLocalFilters({ role: '', status: '', start_date: '', end_date: '' });
    setSortBy('created_at'); setSortOrder('desc');
    router.get(route('project-management.view', project.id), { search: searchInput }, {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => { setShowFilterCard(false); setShowSortCard(false); },
    });
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.get(route('project-management.view', project.id), { search: searchInput }, {
        preserveState: true, preserveScroll: true, replace: true,
      });
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchInput, project.id]);

  const handlePageClick = (url) => {
    if (!url) return;
    try {
      const page = new URL(url, window.location.origin).searchParams.get('page');
      router.get(route('project-management.view', project.id), buildParams({ page }), {
        preserveState: true, preserveScroll: true, replace: true,
      });
    } catch (e) { console.error(e); }
  };

  const pageLinks = Array.isArray(paginationLinks)
    ? paginationLinks.filter(l => l?.label && !isNaN(Number(l.label)))
    : [];
  const prevLink = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('next'))     ?? null;
  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === projectTeams.length ? [] : projectTeams.map(m => m.id));
  };
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleChangeStatus = (team, newStatus) => {
    router.put(
      route("project-management.project-teams.update-status", [project.id, team.id]),
      { assignment_status: newStatus },
      {
        preserveScroll: true,
        onSuccess: (page) => {
          const flash = page.props.flash;
          if (flash?.error) toast.error(flash.error);
          else {
            const name  = team.assignable_name || 'Team member';
            const label = newStatus === 'active' ? 'Re-activated' : newStatus === 'released' ? 'Released' : 'Updated';
            toast.success(`${name} ${label.toLowerCase()} successfully.`);
          }
        },
        onError: (errors) => {
          const msg = errors?.assignment_status || errors?.conflict || errors?.error || "Failed to update status.";
          toast.error(msg);
        }
      }
    );
  };

  const formatCurrency = (amount) =>
    amount ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount) : '---';
  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('en-PH') : '---';

  const handleForceRemove = (team) => { setRemoveTeamMember(team); setShowRemoveModal(true); };
  const handleViewHistory = (team) => { setHistoryTeamMember(team); setShowHistoryModal(true); };

  const handleBulkStatus = (newStatus) => {
    router.put(
      route('project-management.project-teams.bulk-status', project.id),
      { ids: selectedIds, assignment_status: newStatus },
      {
        preserveScroll: true,
        onSuccess: (page) => {
          const flash = page.props.flash;
          if (flash?.error) toast.error(flash.error);
          else {
            const label = newStatus === 'active' ? 'reactivated' : 'released';
            toast.success(`${selectedIds.length} member(s) ${label} successfully.`);
            setSelectedIds([]);
          }
          setShowUnassignModal(false);
          setShowBulkReactivate(false);
        },
        onError: () => toast.error('Failed to update status.'),
      }
    );
  };

  const handleBulkForceRemove = () => {
    router.delete(
      route('project-management.project-teams.force-remove', project.id),
      {
        data: { ids: selectedIds },
        preserveScroll: true,
        onSuccess: (page) => {
          const flash = page.props.flash;
          if (flash?.error) toast.error(flash.error);
          else {
            toast.success(`${selectedIds.length} member(s) permanently removed.`);
            setSelectedIds([]);
          }
          setShowBulkRemoveModal(false);
        },
        onError: () => toast.error('Failed to remove members.'),
      }
    );
  };

  // Derived selection info for bulk action labels
  const selectedMembers       = projectTeams.filter(t => selectedIds.includes(t.id));
  const selectedActiveCount   = selectedMembers.filter(t => t.assignment_status === 'active').length;
  const selectedReleasedCount = selectedMembers.filter(t => t.assignment_status === 'released').length;

  const STATUS_CONFIG = {
    active:    { label: 'Active',    bg: 'bg-green-100',  text: 'text-green-800',  border: 'border-green-200' },
    completed: { label: 'Completed', bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-200'  },
    released:  { label: 'Released',  bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-300'  },
  };
  const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.released;

  const totalMembers    = projectTeams.length;
  const activeMembers   = projectTeams.filter(t => t.assignment_status === 'active').length;
  const releasedMembers = projectTeams.filter(t => t.assignment_status === 'released').length;

  const columns = [
    { header: '',            width: '3%'  },
    { header: 'Member',      width: '22%' },
    { header: 'Email',       width: '18%' },
    { header: 'Role',        width: '12%' },
    { header: 'Rate',        width: '10%' },
    { header: 'Start',       width: '10%' },
    { header: 'End',         width: '10%' },
    { header: 'Status',      width: '8%'  },
    { header: 'Actions',     width: '7%'  },
  ];

  return (
    <div className="w-full">

      {/* Quick Stats */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Members</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">{totalMembers}</p>
              </div>
              <div className="bg-blue-200 rounded-full p-2 sm:p-3"><Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" /></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Active</p>
                <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">{activeMembers}</p>
              </div>
              <div className="bg-green-200 rounded-full p-2 sm:p-3"><UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" /></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 sm:p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Released</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-800 mt-1">{releasedMembers}</p>
              </div>
              <div className="bg-gray-200 rounded-full p-2 sm:p-3"><UserX className="h-4 w-4 sm:h-5 sm:w-5 text-gray-600" /></div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search team members..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="pl-10 h-11 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="flex gap-2 relative">
            {/* Filter */}
            <DropdownMenu open={showFilterCard} onOpenChange={(open) => { setShowFilterCard(open); if (open) setShowSortCard(false); }}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" title="Filters"
                  className={`h-10 w-10 p-0 border-2 rounded-lg flex items-center justify-center relative ${
                    activeFiltersCount() > 0 ? 'bg-zinc-100 border-zinc-400 text-zinc-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}>
                  <Filter className="h-4 w-4" />
                  {activeFiltersCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-zinc-700 text-white text-xs font-semibold rounded-full h-4 w-4 flex items-center justify-center">
                      {activeFiltersCount()}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col bg-white">
                <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-white" />
                    <h3 className="text-sm font-semibold text-white">Filter Team Members</h3>
                  </div>
                  <button onClick={() => setShowFilterCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-4 space-y-3 overflow-y-auto">
                  {filterOptions.roles?.length > 0 && (
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Role</Label>
                      <Select value={localFilters.role || 'all'} onValueChange={v => handleFilterChange('role', v)}>
                        <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Roles" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          {filterOptions.roles.map(r => <SelectItem key={r} value={r}>{capitalizeText(r)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Status</Label>
                    <Select value={localFilters.status || 'all'} onValueChange={v => handleFilterChange('status', v)}>
                      <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="released">Released</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1 block"><Calendar className="h-3 w-3" /> Date Range</Label>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Start Date</Label>
                        <Input type="date" value={localFilters.start_date}
                          onChange={e => setLocalFilters(p => ({ ...p, start_date: e.target.value }))}
                          className="w-full h-9 border-gray-300 rounded-lg" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">End Date</Label>
                        <Input type="date" value={localFilters.end_date}
                          onChange={e => setLocalFilters(p => ({ ...p, end_date: e.target.value }))}
                          className="w-full h-9 border-gray-300 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2">
                  <Button type="button" variant="outline" onClick={resetFilters}
                    className="flex-1 border-gray-300 text-sm h-9" disabled={activeFiltersCount() === 0}>
                    Clear
                  </Button>
                  <Button type="button" onClick={applyFilters}
                    className="flex-1 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9">
                    Apply
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort */}
            <DropdownMenu open={showSortCard} onOpenChange={(open) => { setShowSortCard(open); if (open) setShowFilterCard(false); }}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" title="Sort"
                  className="h-10 w-10 p-0 border-2 rounded-lg flex items-center justify-center bg-white border-gray-300 text-gray-700 hover:bg-gray-50">
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col bg-white">
                <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-white" />
                    <h3 className="text-sm font-semibold text-white">Sort</h3>
                  </div>
                  <button onClick={() => setShowSortCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Date Added</SelectItem>
                        <SelectItem value="role">Role</SelectItem>
                        <SelectItem value="hourly_rate">Hourly Rate</SelectItem>
                        <SelectItem value="start_date">Start Date</SelectItem>
                        <SelectItem value="end_date">End Date</SelectItem>
                        <SelectItem value="assignment_status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Order</Label>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                  <Button type="button" onClick={applySort}
                    className="w-full bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9">
                    Apply Sort
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap w-full sm:w-auto justify-end">
          {has('project-teams.delete') && selectedIds.length > 0 && selectedActiveCount > 0 && (
            <Button onClick={() => setShowUnassignModal(true)}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white shadow-md px-4 h-11 whitespace-nowrap flex items-center justify-center gap-2">
              <LogOut className="h-4 w-4" />
              Release ({selectedActiveCount})
            </Button>
          )}
          {has('project-teams.update') && selectedIds.length > 0 && selectedReleasedCount > 0 && (
            <Button onClick={() => setShowBulkReactivate(true)}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white shadow-md px-4 h-11 whitespace-nowrap flex items-center justify-center gap-2">
              <UserCheck className="h-4 w-4" />
              Reactivate ({selectedReleasedCount})
            </Button>
          )}
          {has('project-teams.delete') && selectedIds.length > 0 && (
            <Button onClick={() => setShowBulkRemoveModal(true)}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white shadow-md px-4 h-11 whitespace-nowrap flex items-center justify-center gap-2">
              <Trash2 className="h-4 w-4" />
              Remove ({selectedIds.length})
            </Button>
          )}
          {has('project-teams.create') && (
            <Button onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md px-5 h-11 whitespace-nowrap flex items-center justify-center gap-2">
              <SquarePen className="h-4 w-4" />
              Add Member
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
        <Table className="min-w-[1000px] w-full">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              {has('project-teams.delete') && (
                <TableHead className="px-4 py-4" style={{ width: '3%' }}>
                  <div onClick={toggleSelectAll}
                    className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center cursor-pointer transition ${
                      selectedIds.length === projectTeams.length && projectTeams.length > 0
                        ? 'border-zinc-800 bg-zinc-800' : 'border-gray-300 hover:border-gray-400'
                    }`}>
                    {selectedIds.length === projectTeams.length && projectTeams.length > 0 && <Check className="h-3 w-3 text-white" />}
                  </div>
                </TableHead>
              )}
              {columns.slice(1).map((col, i) => (
                <TableHead key={i} className="text-left font-bold px-4 py-4 text-xs text-gray-700 uppercase tracking-wider"
                  style={col.width ? { width: col.width } : {}}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectTeams.length > 0 ? projectTeams.map((team, index) => {
              const isSelected  = selectedIds.includes(team.id);

              return (
                <TableRow key={team.id}
                  className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>

                  {has('project-teams.delete') && (
                    <TableCell className="px-4 py-4">
                      <div onClick={() => toggleSelect(team.id)}
                        className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center cursor-pointer transition ${
                          isSelected ? 'border-zinc-800 bg-zinc-800' : 'border-gray-300 hover:border-gray-400'
                        }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </TableCell>
                  )}

                  {/* Member name */}
                  <TableCell className="px-4 py-4 text-sm font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {/* Avatar */}
                      {(() => {
                        const imgUrl = team.assignable_type === 'employee'
                          ? team.employee?.profile_image_url
                          : team.user?.profile_image_url;
                        const name = team.assignable_name || '?';
                        const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
                        const isEmployee = team.assignable_type === 'employee';
                        return imgUrl ? (
                          <img src={imgUrl} alt={name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-gray-200" />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                            isEmployee ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {initials}
                          </div>
                        );
                      })()}
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{team.assignable_name || '---'}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${
                          team.assignable_type === 'employee'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {team.assignable_type === 'employee' ? 'Employee' : 'User'}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-4 text-sm text-gray-700">
                    {team.user?.email || team.employee?.email || '---'}
                  </TableCell>

                  <TableCell className="px-4 py-4 text-sm">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                      {capitalizeText(
                        team.assignable_type === 'employee'
                          ? (team.employee?.position || team.role || '---')
                          : (team.user?.roles?.[0]?.name || team.role || '---')
                      )}
                    </span>
                  </TableCell>

                  <TableCell className="px-4 py-4 text-sm font-bold text-gray-900">
                    {formatCurrency(team.hourly_rate)}
                  </TableCell>

                  <TableCell className="px-4 py-4 text-sm text-gray-700">
                    {formatDate(team.start_date)}
                  </TableCell>

                  <TableCell className="px-4 py-4 text-sm text-gray-700">
                    {formatDate(team.end_date)}
                  </TableCell>

                  <TableCell className="px-4 py-4 text-sm">
                    {(() => {
                      const cfg = getStatusConfig(team.assignment_status);
                      return (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="px-4 py-4 text-sm">
                    <div className="flex gap-1.5 flex-wrap">

                      {/* Eye — assignment history */}
                      {/* <button
                        onClick={() => handleViewHistory(team)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all border border-slate-200 hover:border-slate-300"
                        title="View assignment history"
                      >
                        <Eye size={15} />
                      </button> */}

                      {/* Edit */}
                      {has('project-teams.update') && (
                        <button
                          onClick={() => { setEditProjectTeam(team); setShowEditModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600 hover:text-indigo-700 transition-all border border-indigo-200 hover:border-indigo-300"
                          title="Edit"
                        >
                          <SquarePen size={15} />
                        </button>
                      )}

                      {/* Release (employees only) */}
                      {has('project-teams.delete') && team.assignable_type === 'employee' && team.assignment_status === 'active' && (
                        <button
                          onClick={() => handleChangeStatus(team, 'released')}
                          className="p-1.5 rounded-lg hover:bg-amber-100 text-amber-600 hover:text-amber-700 transition-all border border-amber-200 hover:border-amber-300"
                          title="Release — frees this employee for other projects"
                        >
                          <LogOut size={15} />
                        </button>
                      )}

                      {/* Re-activate (employees only) */}
                      {has('project-teams.delete') && team.assignable_type === 'employee' && team.assignment_status === 'released' && (
                        <button
                          onClick={() => handleChangeStatus(team, 'active')}
                          className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 hover:text-green-700 transition-all border border-green-200 hover:border-green-300"
                          title="Re-activate on this project"
                        >
                          <UserCheck size={15} />
                        </button>
                      )}

                      {/* Remove (hard delete) */}
                      {has('project-teams.delete') && (
                        <button
                          onClick={() => handleForceRemove(team)}
                          className="p-1.5 rounded-lg hover:bg-red-100 text-red-500 hover:text-red-700 transition-all border border-red-200 hover:border-red-300"
                          title="Permanently remove from project"
                        >
                          <Trash2 size={15} />
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
                    <p className="text-gray-500 font-medium">No team members found</p>
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
            Showing <span className="font-semibold text-gray-900">{projectTeams.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{teamData?.projectTeams?.total || 0}</span> members
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
            <button disabled={!prevLink?.url} onClick={() => handlePageClick(prevLink?.url)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                !prevLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
              }`}>Previous</button>
            {pageLinks.map((link, idx) => (
              <button key={idx} disabled={!link?.url} onClick={() => handlePageClick(link?.url)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all min-w-[36px] ${
                  link?.active ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
                } ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}>
                {link?.label}
              </button>
            ))}
            <button disabled={!nextLink?.url} onClick={() => handlePageClick(nextLink?.url)}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                !nextLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
              }`}>Next</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddProjectTeam setShowAddModal={setShowAddModal} assignables={teamData?.allAssignables || []} project={project} />
      )}
      {showEditModal && editProjectTeam && (
        <EditProjectTeam setShowEditModal={setShowEditModal} projectTeam={editProjectTeam} project={project} />
      )}
      {showUnassignModal && selectedIds.length > 0 && (
        <UnassignTeamMember
          setShowUnassignModal={setShowUnassignModal}
          project={project}
          teamMembers={projectTeams}
          selectedIds={selectedIds.filter(id => projectTeams.find(t => t.id === id)?.assignment_status === 'active')}
          onSuccess={() => { setSelectedIds([]); setShowUnassignModal(false); }}
        />
      )}

      {/* Bulk Reactivate Confirm */}
      {showBulkReactivate && (
        <Dialog open onOpenChange={setShowBulkReactivate}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-green-100 rounded-full p-2"><UserCheck className="h-6 w-6 text-green-600" /></div>
                <DialogTitle className="text-green-900">Reactivate {selectedReleasedCount} Member(s)</DialogTitle>
              </div>
              <DialogDescription className="text-gray-600 pt-2">
                Are you sure you want to reactivate <span className="font-semibold text-gray-900">{selectedReleasedCount} released member(s)</span> on this project?
                <br /><br />
                Their assignment status will be set back to <span className="font-semibold">Active</span>.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setShowBulkReactivate(false)} className="border-gray-300">Cancel</Button>
              <Button onClick={() => handleBulkStatus('active')}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2">
                <UserCheck size={16} /> Reactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Force Remove Confirm */}
      {showBulkRemoveModal && (
        <Dialog open onOpenChange={setShowBulkRemoveModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-red-100 rounded-full p-2"><Trash2 className="h-6 w-6 text-red-600" /></div>
                <DialogTitle className="text-red-900">Permanently Remove {selectedIds.length} Member(s)</DialogTitle>
              </div>
              <DialogDescription className="text-gray-600 pt-2">
                Are you sure you want to permanently remove <span className="font-semibold text-gray-900">{selectedIds.length} member(s)</span> from this project?
                <br /><br />
                <span className="text-red-600 font-medium">This action cannot be undone.</span> All records will be deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setShowBulkRemoveModal(false)} className="border-gray-300">Cancel</Button>
              <Button onClick={handleBulkForceRemove}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
                <Trash2 size={16} /> Remove Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {showRemoveModal && removeTeamMember && (
        <RemoveTeamMember
          setShowRemoveModal={setShowRemoveModal}
          project={project}
          teamMember={removeTeamMember}
          onSuccess={() => { setRemoveTeamMember(null); setShowRemoveModal(false); }}
        />
      )}
      {showHistoryModal && historyTeamMember && (
        <ViewAssignmentHistory
          teamMember={historyTeamMember}
          onClose={() => { setHistoryTeamMember(null); setShowHistoryModal(false); }}
        />
      )}
    </div>
  );
}