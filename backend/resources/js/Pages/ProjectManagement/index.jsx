import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/Components/ui/table";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Label } from "@/Components/ui/label";
import {
  Trash2, SquarePen, Eye, Filter, X, Search, Calendar,
  TrendingUp, Users, DollarSign, ArrowUpDown, FolderOpen,
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { usePermission } from '@/utils/permissions';

import AddProject from './add';
import EditProject from './edit';
import DeleteProject from './delete';

export default function ProjectsIndex() {
  const { has } = usePermission();
  
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Project Management" },
  ];

  const columns = [
    { header: 'Code',            width: '8%'  },
    { header: 'Name',            width: '17%' },
    { header: 'Client',          width: '11%' },
    { header: 'Type',            width: '9%'  },
    { header: 'Contract Amount', width: '11%' },
    { header: 'Progress',        width: '13%' },
    { header: 'Status',          width: '8%'  },
    { header: 'Priority',        width: '7%'  },
    { header: 'Documents',       width: '7%'  },
    { header: 'Action',          width: '9%'  },
  ];

  const DOCUMENT_FIELDS = [
    { key: 'building_permit',          label: 'Building Permit'          },
    { key: 'business_permit',          label: 'Business Permit'          },
    { key: 'environmental_compliance', label: 'Environmental Compliance' },
    { key: 'contractor_license',       label: 'Contractor License'       },
    { key: 'surety_bond',              label: 'Surety Bond'              },
    { key: 'signed_contract',          label: 'Signed Contract'          },
    { key: 'notice_to_proceed',        label: 'Notice to Proceed'        },
  ];

  const pagination    = usePage().props.projects;
  const projects      = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const clients       = usePage().props.clients || [];
  const users         = usePage().props.users || [];
  const inventoryItems = usePage().props.inventoryItems || [];
  const projectTypes  = usePage().props.projectTypes || [];
  const filters       = usePage().props.filters || {};
  const filterOptions = usePage().props.filterOptions || {};
  const initialSearch = usePage().props.search || '';
  const clientTypes   = usePage().props.clientTypes || [];
  const pageProps     = usePage().props;
  const stats         = pageProps.stats || { total: 0, active: 0, completed: 0, total_value: 0 };

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProject, setDeleteProject] = useState(null);
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [showSortCard, setShowSortCard] = useState(false);

  const initializeFilters = (fp) => ({
    client_id:      fp?.client_id      || '',
    status:         fp?.status         || '',
    priority:       fp?.priority       || '',
    project_type_id:fp?.project_type_id|| '',
    start_date:     fp?.start_date     || '',
    end_date:       fp?.end_date       || '',
  });

  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const [sortBy, setSortBy]       = useState(pageProps.sort_by    || 'created_at');
  const [sortOrder, setSortOrder] = useState(pageProps.sort_order || 'desc');
  const debounceTimer = useRef(null);

  useEffect(() => {
    setLocalFilters(initializeFilters(filters));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.client_id, filters.status, filters.priority, filters.project_type_id, filters.start_date, filters.end_date]);

  useEffect(() => {
    if (pageProps.sort_by)    setSortBy(pageProps.sort_by);
    if (pageProps.sort_order) setSortOrder(pageProps.sort_order);
  }, [pageProps.sort_by, pageProps.sort_order]);

  const typeColors = {
    design: 'bg-purple-100 text-purple-800 border border-purple-200',
    construction: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    consultancy: 'bg-blue-100 text-blue-800 border border-blue-200',
    maintenance: 'bg-green-100 text-green-800 border border-green-200',
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

  const capitalizeText = (text) => {
    if (!text) return '';
    return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const activeFiltersCount = () => {
    let count = 0;
    if (localFilters.client_id)       count++;
    if (localFilters.status)          count++;
    if (localFilters.priority)        count++;
    if (localFilters.project_type_id) count++;
    if (localFilters.start_date)      count++;
    if (localFilters.end_date)        count++;
    return count;
  };

  const handleFilterChange = (type, value) => {
    setLocalFilters(prev => ({ ...prev, [type]: value === 'all' ? '' : value }));
  };

  const buildParams = (overrides = {}) => ({
    sort_by: sortBy,
    sort_order: sortOrder,
    ...(searchInput?.trim()           && { search:          searchInput          }),
    ...(localFilters.client_id        && { client_id:       localFilters.client_id }),
    ...(localFilters.status           && { status:          localFilters.status  }),
    ...(localFilters.priority         && { priority:        localFilters.priority }),
    ...(localFilters.project_type_id  && { project_type_id: localFilters.project_type_id }),
    ...(localFilters.start_date       && { start_date:      localFilters.start_date }),
    ...(localFilters.end_date         && { end_date:        localFilters.end_date }),
    ...overrides,
  });

  const applyFilters = (e) => {
    e?.preventDefault(); e?.stopPropagation();
    router.get(route('project-management.index'), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowFilterCard(false),
    });
  };

  const applySort = () => {
    router.get(route('project-management.index'), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowSortCard(false),
    });
  };

  const resetFilters = () => {
    setLocalFilters({ client_id:'', status:'', priority:'', project_type_id:'', start_date:'', end_date:'' });
    setSortBy('created_at'); setSortOrder('desc');
    router.get(route('project-management.index'), { ...(searchInput?.trim() && { search: searchInput }) }, {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => { setShowFilterCard(false); setShowSortCard(false); },
    });
  };

  const handleSearch = (e) => setSearchInput(e.target.value);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.get(route('project-management.index'), buildParams(), {
        preserveState: true, preserveScroll: true, replace: true,
      });
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handlePageChange = ({ page }) => {
    router.get(route('project-management.index'), buildParams({ page }), {
      preserveState: true, preserveScroll: true, replace: true,
    });
  };

  const pageLinks  = Array.isArray(paginationLinks) ? paginationLinks.filter(l => l?.label && !isNaN(Number(l.label))) : [];
  const prevLink   = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink   = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('next'))     ?? null;
  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  const handlePageClick = (url) => {
    if (!url) return;
    try {
      const page = new URL(url, window.location.origin).searchParams.get('page');
      handlePageChange({ page });
    } catch (e) { console.error('Failed to parse pagination URL:', e); }
  };

  const docCount = (project) => DOCUMENT_FIELDS.filter(d => project[d.key]).length;

  return (
    <>
      {showAddModal && (
        <AddProject setShowAddModal={setShowAddModal} clients={clients} users={users}
          inventoryItems={inventoryItems} projectTypes={projectTypes} clientTypes={clientTypes} />
      )}
      {showEditModal && editProject && (
        <EditProject setShowEditModal={setShowEditModal} project={editProject}
          clients={clients} projectTypes={projectTypes} />
      )}
      {showDeleteModal && deleteProject && (
        <DeleteProject setShowDeleteModal={setShowDeleteModal} project={deleteProject} />
      )}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Projects" />

        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow-lg sm:rounded-lg p-4 sm:p-6 mt-2 border border-gray-100">

            {/* Quick Stats */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Projects</p>
                      <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
                    </div>
                    <div className="bg-blue-200 rounded-full p-2 sm:p-3">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Active</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">{stats.active}</p>
                    </div>
                    <div className="bg-green-200 rounded-full p-2 sm:p-3">
                      <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 sm:p-4 border border-purple-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Completed</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-900 mt-1">{stats.completed}</p>
                    </div>
                    <div className="bg-purple-200 rounded-full p-2 sm:p-3">
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-700" />
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-3 sm:p-4 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Total Value</p>
                      <p className="text-base sm:text-lg font-bold text-amber-900 mt-1">
                        ₱{Number(stats.total_value || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="bg-amber-200 rounded-full p-2 sm:p-3">
                      <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-amber-700" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search + Filter Bar */}
            <div className="flex flex-col gap-3 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
                {/* Left: Search + Filter + Sort */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search projects..."
                      value={searchInput}
                      onChange={handleSearch}
                      className="pl-10 h-11 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2">
                      {/* Filter */}
                      <DropdownMenu open={showFilterCard} onOpenChange={(open) => { setShowFilterCard(open); if (open) setShowSortCard(false); }}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline"
                            className={`h-11 w-11 p-0 border-2 rounded-lg flex items-center justify-center relative ${
                              activeFiltersCount() > 0 ? 'bg-zinc-100 border-zinc-400 text-zinc-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
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
                        <DropdownMenuContent align="start" sideOffset={6}
                          className="w-80 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col bg-white"
                          style={{ zIndex: 40 }}
                        >
                          <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Filter className="h-4 w-4 text-white" />
                              <h3 className="text-sm font-semibold text-white">Filter Projects</h3>
                            </div>
                            <button onClick={() => setShowFilterCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                          </div>
                          <div className="p-4 space-y-3 overflow-y-auto max-h-[380px]">
                            {/* Client */}
                            <div>
                              <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Client</Label>
                              <Select value={localFilters.client_id || 'all'} onValueChange={(v) => handleFilterChange('client_id', v)}>
                                <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Clients" /></SelectTrigger>
                                <SelectContent style={{ zIndex: 50 }}>
                                  <SelectItem value="all">All Clients</SelectItem>
                                  {clients.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.client_name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            {/* Status */}
                            {filterOptions.statuses?.length > 0 && (
                              <div>
                                <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Status</Label>
                                <Select value={localFilters.status || 'all'} onValueChange={(v) => handleFilterChange('status', v)}>
                                  <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                                  <SelectContent style={{ zIndex: 50 }}>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {filterOptions.statuses.map(s => <SelectItem key={s} value={s}>{s.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {/* Priority */}
                            {filterOptions.priorities?.length > 0 && (
                              <div>
                                <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Priority</Label>
                                <Select value={localFilters.priority || 'all'} onValueChange={(v) => handleFilterChange('priority', v)}>
                                  <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Priorities" /></SelectTrigger>
                                  <SelectContent style={{ zIndex: 50 }}>
                                    <SelectItem value="all">All Priorities</SelectItem>
                                    {filterOptions.priorities.map(p => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {/* Project Type */}
                            {filterOptions.projectTypes?.length > 0 && (
                              <div>
                                <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Project Type</Label>
                                <Select value={localFilters.project_type_id || 'all'} onValueChange={(v) => handleFilterChange('project_type_id', v)}>
                                  <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Types" /></SelectTrigger>
                                  <SelectContent style={{ zIndex: 50 }}>
                                    <SelectItem value="all">All Types</SelectItem>
                                    {filterOptions.projectTypes.map(t => <SelectItem key={t.id} value={t.id.toString()}>{t.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                            {/* Date Range */}
                            <div>
                              <Label className="text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5 block">
                                <Calendar className="h-3 w-3" /> Date Range
                              </Label>
                              <div className="space-y-2">
                                <div>
                                  <Label htmlFor="start_date" className="text-xs text-gray-500 mb-1 block">Start Date</Label>
                                  <Input id="start_date" type="date" value={localFilters.start_date}
                                    onChange={e => setLocalFilters(p => ({ ...p, start_date: e.target.value }))}
                                    className="w-full h-9 border-gray-300 rounded-lg" />
                                </div>
                                <div>
                                  <Label htmlFor="end_date" className="text-xs text-gray-500 mb-1 block">End Date</Label>
                                  <Input id="end_date" type="date" value={localFilters.end_date}
                                    onChange={e => setLocalFilters(p => ({ ...p, end_date: e.target.value }))}
                                    className="w-full h-9 border-gray-300 rounded-lg" />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2">
                            <Button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); resetFilters(); }}
                              variant="outline" className="flex-1 border-gray-300 text-sm h-9" disabled={activeFiltersCount() === 0}>
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
                          <Button variant="outline" className="h-11 w-11 p-0 border-2 rounded-lg flex items-center justify-center bg-white border-gray-300 text-gray-700 hover:bg-gray-50" title="Sort">
                            <ArrowUpDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" sideOffset={6}
                          className="w-72 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col bg-white"
                          style={{ zIndex: 40 }}
                        >
                          <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ArrowUpDown className="h-4 w-4 text-white" />
                              <h3 className="text-sm font-semibold text-white">Sort Projects</h3>
                            </div>
                            <button onClick={() => setShowSortCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                          </div>
                          <div className="p-4 space-y-4">
                            <div>
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Sort By</Label>
                              <Select value={sortBy} onValueChange={setSortBy}>
                                <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                                <SelectContent style={{ zIndex: 50 }}>
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
                            <div>
                              <Label className="text-xs font-semibold text-gray-700 mb-2 block">Order</Label>
                              <Select value={sortOrder} onValueChange={setSortOrder}>
                                <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                                <SelectContent style={{ zIndex: 50 }}>
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
                </div>

                {/* Right: Add Button */}
                {has('projects.create') && (
                  <Button onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md h-11 px-5 whitespace-nowrap text-sm flex items-center justify-center gap-2">
                    <SquarePen className="h-4 w-4" />
                    <span>Add Project</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
              <Table className="min-w-[1100px] w-full">
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                    {columns.map((col, i) => (
                      <TableHead key={i}
                        className="text-left font-bold px-3 sm:px-4 py-3 text-xs text-gray-700 uppercase tracking-wider"
                        style={col.width ? { width: col.width } : {}}>
                        {col.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length > 0 ? (
                    projects.map((project, index) => {
                      const progress = project.progress_percentage || 0;
                      const uploadedDocs = docCount(project);
                      return (
                        <TableRow key={project.id}
                          className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <TableCell className="px-3 sm:px-4 py-3 text-sm font-semibold text-gray-900">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                              {project.project_code || '---'}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900">
                            {capitalizeText(project.project_name)}
                          </TableCell>
                          <TableCell className="px-3 sm:px-4 py-3 text-sm text-gray-700">
                            {project.client?.client_name ? capitalizeText(project.client.client_name) : <span className="text-gray-400 italic">No client</span>}
                          </TableCell>
                          <TableCell className="px-3 sm:px-4 py-3 text-sm text-gray-700">
                            {project.project_type?.name || '---'}
                          </TableCell>
                          <TableCell className="px-3 sm:px-4 py-3 text-sm">
                            <span className="font-bold text-gray-900">
                              ₱{parseFloat(project.contract_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 sm:px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2.5 max-w-[100px] shadow-inner border border-gray-300">
                                <div
                                  className={`h-2.5 rounded-full transition-all duration-700 ${
                                    progress === 100 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                                    progress >= 50  ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                                    progress > 0    ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gray-300'
                                  }`}
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                              <span className={`text-xs font-bold w-9 text-right ${
                                progress === 100 ? 'text-green-700' : progress >= 50 ? 'text-blue-700' : progress > 0 ? 'text-yellow-700' : 'text-gray-500'
                              }`}>{progress}%</span>
                            </div>
                          </TableCell>
                          <TableCell className="px-3 sm:px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                              {capitalizeText(project.status?.replace('_',' ') || '')}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 sm:px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[project.priority] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                              {capitalizeText(project.priority || '')}
                            </span>
                          </TableCell>
                          {/* Documents badge */}
                          <TableCell className="px-3 sm:px-4 py-3 text-sm">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${
                              uploadedDocs === DOCUMENT_FIELDS.length
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : uploadedDocs > 0
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                : 'bg-gray-100 text-gray-500 border-gray-200'
                            }`}>
                              <FolderOpen className="h-3 w-3" />
                              {uploadedDocs}/{DOCUMENT_FIELDS.length}
                            </span>
                          </TableCell>
                          <TableCell className="px-3 sm:px-4 py-3 text-sm">
                            <div className="flex gap-1">
                              {has('projects.view') && (
                                <Link href={route('project-management.view', project.id)}>
                                  <button className="p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-all border border-blue-200 hover:border-blue-300" title="View">
                                    <Eye size={14} />
                                  </button>
                                </Link>
                              )}
                              {has('projects.update') && (
                                <button onClick={() => { setEditProject(project); setShowEditModal(true); }}
                                  className="p-1.5 rounded-lg hover:bg-indigo-100 text-indigo-600 transition-all border border-indigo-200 hover:border-indigo-300" title="Edit">
                                  <SquarePen size={14} />
                                </button>
                              )}
                              {has('projects.delete') && (
                                <button onClick={() => { setDeleteProject(project); setShowDeleteModal(true); }}
                                  className="p-1.5 rounded-lg hover:bg-red-100 text-red-600 transition-all border border-red-200 hover:border-red-300" title="Delete">
                                  <Trash2 size={14} />
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
                          <p className="text-gray-500 font-medium">No projects found</p>
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
                  Showing <span className="font-semibold text-gray-900">{pagination?.from || 0}</span> to{' '}
                  <span className="font-semibold text-gray-900">{pagination?.to || 0}</span> of{' '}
                  <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> projects
                </p>
                <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
                  <button disabled={!prevLink?.url}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      !prevLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
                    }`}
                    onClick={() => handlePageClick(prevLink?.url)}>
                    Previous
                  </button>
                  {pageLinks.map((link, idx) => (
                    <button key={idx} disabled={!link?.url}
                      className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all min-w-[36px] ${
                        link?.active ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
                      } ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}
                      onClick={() => handlePageClick(link?.url)}>
                      {link?.label || ''}
                    </button>
                  ))}
                  <button disabled={!nextLink?.url}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                      !nextLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
                    }`}
                    onClick={() => handlePageClick(nextLink?.url)}>
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