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
  ChevronDown, 
  ChevronRight, 
  Trash2, 
  SquarePen, 
  Plus,
  FileText,
  Image as ImageIcon,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  AlertCircle,
  Flag,
  Minus,
  X,
  ArrowUpDown,
  Target,
  CheckCircle,
  Circle,
  MessageSquare,
  AlertTriangle,
  Bell,
  Activity,
} from 'lucide-react';
import { usePermission } from '@/utils/permissions';
import AddMilestone from './add';
import EditMilestone from './edit';
import DeleteMilestone from './delete';
import AddTask from '../Tasks/add';
import EditTask from '../Tasks/edit';
import DeleteTask from '../Tasks/delete';
import AddProgressUpdate from '../ProgressUpdate/add';
import EditProgressUpdate from '../ProgressUpdate/edit';
import DeleteProgressUpdate from '../ProgressUpdate/delete';
import AddIssue from '../Issues/add';
import EditIssue from '../Issues/edit';
import DeleteIssue from '../Issues/delete';
import TaskDetailModal from '../Tasks/TaskDetailModal';

// ─── Urgency chip ─────────────────────────────────────────────────────────────
const UrgencyChip = ({ icon: Icon, count, color, title, pulse = false }) => {
  const colorMap = {
    red:    'bg-red-50 text-red-600 border-red-200',
    amber:  'bg-amber-50 text-amber-600 border-amber-200',
    violet: 'bg-violet-50 text-violet-600 border-violet-200',
    blue:   'bg-blue-50 text-blue-600 border-blue-200',
    gray:   'bg-gray-50 text-gray-400 border-gray-200',
  };
  return (
    <span
      title={title}
      className={`relative inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium select-none ${colorMap[color] || colorMap.gray}`}
    >
      {pulse && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-violet-400" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500" />
        </span>
      )}
      <Icon size={10} className="flex-shrink-0" />
      {count !== undefined && <span>{count}</span>}
    </span>
  );
};

// ─── Task urgency cluster ─────────────────────────────────────────────────────
const TaskUrgencyCluster = ({ task, today }) => {
  const chips = [];

  const unread = task.unread_client_requests_count ?? 0;
  if (unread > 0) {
    chips.push(
      <UrgencyChip key="client" icon={Bell} count={unread} color="violet"
        title={`${unread} unread client request${unread > 1 ? 's' : ''}`} pulse />
    );
  }

  const rawIssues  = task.issues || [];
  const taskIssues = Array.isArray(rawIssues) ? rawIssues : (rawIssues.data || []);
  const openIssues = taskIssues.filter(i => i.status === 'open' || i.status === 'in_progress').length;
  if (openIssues > 0) {
    chips.push(
      <UrgencyChip key="issues" icon={AlertCircle} count={openIssues} color="red"
        title={`${openIssues} open issue${openIssues > 1 ? 's' : ''}`} />
    );
  }

  const isOverdue = task.due_date && task.status !== 'completed' && new Date(task.due_date) < today;
  if (isOverdue) {
    chips.push(<UrgencyChip key="overdue" icon={AlertTriangle} color="amber" title="Overdue" />);
  }

  const rawPU   = task.progressUpdates || task.progress_updates;
  const puCount = Array.isArray(rawPU) ? rawPU.length : (rawPU?.data ? rawPU.data.length : 0);
  const isStalled = task.status !== 'completed' && puCount === 0;
  if (isStalled) {
    chips.push(<UrgencyChip key="stalled" icon={Activity} color="blue" title="No progress updates yet" />);
  }

  if (chips.length === 0) return null;
  return <div className="flex items-center gap-1 flex-wrap">{chips}</div>;
};

// ─── Milestone urgency roll-up badge ─────────────────────────────────────────
const MilestoneUrgencyRollup = ({ milestone, today }) => {
  const tasks = milestone.tasks || [];
  let unreadTotal = 0, openIssues = 0, overdueCount = 0, stalledCount = 0;

  tasks.forEach(task => {
    unreadTotal += task.unread_client_requests_count ?? 0;
    const rawIssues = Array.isArray(task.issues) ? task.issues : (task.issues?.data || []);
    openIssues += rawIssues.filter(i => i.status === 'open' || i.status === 'in_progress').length;
    if (task.due_date && task.status !== 'completed' && new Date(task.due_date) < today) overdueCount++;
    const rawPU = task.progressUpdates || task.progress_updates;
    const puCount = Array.isArray(rawPU) ? rawPU.length : (rawPU?.data ? rawPU.data.length : 0);
    if (task.status !== 'completed' && puCount === 0) stalledCount++;
  });

  const hasAny = unreadTotal > 0 || openIssues > 0 || overdueCount > 0 || stalledCount > 0;
  if (!hasAny) return null;

  return (
    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
      {unreadTotal > 0 && <UrgencyChip icon={Bell} count={unreadTotal} color="violet" title={`${unreadTotal} unread client request${unreadTotal > 1 ? 's' : ''}`} pulse />}
      {openIssues > 0 && <UrgencyChip icon={AlertCircle} count={openIssues} color="red" title={`${openIssues} open issue${openIssues > 1 ? 's' : ''}`} />}
      {overdueCount > 0 && <UrgencyChip icon={AlertTriangle} count={overdueCount} color="amber" title={`${overdueCount} overdue task${overdueCount > 1 ? 's' : ''}`} />}
      {stalledCount > 0 && <UrgencyChip icon={Activity} count={stalledCount} color="blue" title={`${stalledCount} task${stalledCount > 1 ? 's' : ''} with no progress updates`} />}
    </div>
  );
};

export default function MilestonesTab({ project, milestoneData }) {
  const { has } = usePermission();
  const { props } = usePage();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  
  const [expandedMilestones, setExpandedMilestones] = useState(new Set());
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [expandedProgressUpdates, setExpandedProgressUpdates] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editMilestone, setEditMilestone] = useState(null);
  const [deleteMilestone, setDeleteMilestone] = useState(null);
  
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);
  const [selectedMilestoneForTask, setSelectedMilestoneForTask] = useState(null);
  
  const [showAddProgressModal, setShowAddProgressModal] = useState(false);
  const [showEditProgressModal, setShowEditProgressModal] = useState(false);
  const [showDeleteProgressModal, setShowDeleteProgressModal] = useState(false);
  const [editProgressUpdate, setEditProgressUpdate] = useState(null);
  const [deleteProgressUpdate, setDeleteProgressUpdate] = useState(null);
  const [selectedTaskForProgress, setSelectedTaskForProgress] = useState(null);

  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [showEditIssueModal, setShowEditIssueModal] = useState(false);
  const [showDeleteIssueModal, setShowDeleteIssueModal] = useState(false);
  const [editIssue, setEditIssue] = useState(null);
  const [deleteIssue, setDeleteIssue] = useState(null);
  
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);
  
  const [isExporting, setIsExporting] = useState(false);
  
  const [searchInput, setSearchInput] = useState(milestoneData?.search || '');
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [showSortCard, setShowSortCard] = useState(false);
  const debounceTimer = useRef(null);
  
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);

  const milestones = Array.isArray(milestoneData.milestones) 
    ? milestoneData.milestones 
    : (milestoneData.milestones?.data || []);
  const paginationLinks = milestoneData.milestones?.links || [];
  const users = milestoneData.users || [];
  const issues = milestoneData.issues || [];
  const filters = milestoneData?.filters || {};
  const filterOptions = milestoneData?.filterOptions || {};

  const initializeFilters = (fp) => ({
    status:     fp?.status     || 'all',
    start_date: fp?.start_date || '',
    end_date:   fp?.end_date   || '',
  });
  
  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const [sortBy,       setSortBy]       = useState(milestoneData?.sort_by    || 'due_date');
  const [sortOrder,    setSortOrder]    = useState(milestoneData?.sort_order || 'asc');

  const allTasks = useMemo(() => {
    return milestones.flatMap(m => (m.tasks || []).map(t => ({ ...t, milestone: m })));
  }, [milestones]);

  useEffect(() => {
    setLocalFilters(initializeFilters(filters));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.start_date, filters.end_date]);

  useEffect(() => {
    if (milestoneData?.sort_by)    setSortBy(milestoneData.sort_by);
    if (milestoneData?.sort_order) setSortOrder(milestoneData.sort_order);
  }, [milestoneData?.sort_by, milestoneData?.sort_order]);

  useEffect(() => {
    setSearchInput(milestoneData?.search || '');
  }, [milestoneData?.search]);

  const buildParams = (overrides = {}) => ({
    sort_by:    sortBy,
    sort_order: sortOrder,
    ...(searchInput?.trim() && { search: searchInput }),
    ...(localFilters.status && localFilters.status !== 'all' && { status_filter: localFilters.status }),
    ...(localFilters.start_date && { start_date: localFilters.start_date }),
    ...(localFilters.end_date   && { end_date:   localFilters.end_date }),
    ...overrides,
  });

  const navigate = (params) =>
    router.get(route('project-management.view', project.id), params, {
      preserveState: true,
      preserveScroll: true,
      replace: true,
    });

  const activeFiltersCount = () => {
    let count = 0;
    if (localFilters.status && localFilters.status !== 'all') count++;
    if (localFilters.start_date) count++;
    if (localFilters.end_date)   count++;
    return count;
  };

  const handleFilterChange = (type, value) => {
    setLocalFilters(prev => ({ ...prev, [type]: value === 'all' ? 'all' : value }));
  };

  const applyFilters = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    navigate(buildParams());
    setShowFilterCard(false);
  };

  const applySort = () => {
    navigate(buildParams());
    setShowSortCard(false);
  };

  const resetFilters = () => {
    const reset = { status: 'all', start_date: '', end_date: '' };
    setLocalFilters(reset);
    setSortBy('due_date');
    setSortOrder('asc');
    navigate({
      sort_by: 'due_date',
      sort_order: 'asc',
      ...(searchInput?.trim() && { search: searchInput }),
    });
    setShowFilterCard(false);
    setShowSortCard(false);
  };

  const handleSearch = (e) => setSearchInput(e.target.value);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      navigate(buildParams());
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleExportPdf = () => {
    if (isExporting) return;
    setIsExporting(true);
    window.open(route('project-management.project-milestones.export-pdf', project.id), '_blank');
    setTimeout(() => {
      setIsExporting(false);
      toast.success('Milestone PDF export initiated', {
        description: 'Your PDF download should start shortly.',
      });
    }, 1000);
  };

  const handlePageClick = (url) => {
    if (!url) return;
    try {
      const page = new URL(url, window.location.origin).searchParams.get('page');
      navigate(buildParams({ page }));
    } catch (e) {
      console.error('Failed to parse pagination URL:', e);
    }
  };

  const pageLinks  = Array.isArray(paginationLinks) ? paginationLinks.filter(l => l?.label && !isNaN(Number(l.label))) : [];
  const prevLink   = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink   = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('next'))     ?? null;
  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  const toggleMilestone = (milestoneId) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId);
      const tasks = milestones.find(m => m.id === milestoneId)?.tasks || [];
      const newExpandedTasks = new Set(expandedTasks);
      tasks.forEach(task => newExpandedTasks.delete(task.id));
      setExpandedTasks(newExpandedTasks);
      setSelectedMilestoneId(null);
    } else {
      newExpanded.add(milestoneId);
      setSelectedMilestoneId(milestoneId);
    }
    setExpandedMilestones(newExpanded);
  };

  const toggleTask = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) newExpanded.delete(taskId);
    else newExpanded.add(taskId);
    setExpandedTasks(newExpanded);
  };

  const toggleProgressUpdate = (updateId) => {
    const newExpanded = new Set(expandedProgressUpdates);
    if (newExpanded.has(updateId)) newExpanded.delete(updateId);
    else newExpanded.add(updateId);
    setExpandedProgressUpdates(newExpanded);
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH', { 
    year: 'numeric', month: 'short', day: 'numeric' 
  }) : '---';

  const formatStatus = (status) => {
    const statusMap = {
      'pending':     { label: 'Pending',     color: 'yellow', icon: Clock },
      'in_progress': { label: 'In Progress', color: 'blue',   icon: Clock },
      'completed':   { label: 'Completed',   color: 'green',  icon: CheckCircle2 },
    };
    return statusMap[status] || { label: status || '---', color: 'gray', icon: Clock };
  };

  const getStatusBadgeClassName = (status) => {
    const info = formatStatus(status);
    const map = {
      yellow: 'bg-amber-100 text-amber-700 border-amber-200',
      blue:   'bg-blue-100 text-blue-700 border-blue-200',
      green:  'bg-green-100 text-green-700 border-green-200',
      gray:   'bg-gray-100 text-gray-600 border-gray-200',
    };
    return `inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border rounded-full ${map[info.color] || map.gray}`;
  };

const areAllTasksCompleted = (milestone) => {
    const tasks = milestone.tasks || [];
    return tasks.length === 0 || tasks.every(t => t.status === 'completed');
  };

  const getProgressUpdatesCount = (task) => {
    const raw = task.progressUpdates || task.progress_updates;
    if (!raw) return 0;
    if (Array.isArray(raw)) return raw.length;
    if (raw.data && Array.isArray(raw.data)) return raw.data.length;
    return 0;
  };

  const getMilestoneProgress = (milestone) => {
    const tasks = milestone.tasks || [];
    if (!tasks.length) return 0;
    return Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100);
  };

  const handleTaskStatusChange = (task, newStatus) => {
    const milestoneId = task.project_milestone_id || task.milestone?.id;
    if (!milestoneId) { toast.error('Unable to find milestone for this task'); return; }
    if (newStatus === 'completed' && getProgressUpdatesCount(task) === 0) {
      toast.error('Cannot mark task as completed. Please add at least one progress update first.');
      return;
    }
    router.put(
      route('project-management.project-tasks.update-status', [milestoneId, task.id]),
      { status: newStatus },
      { preserveScroll: true, onSuccess: () => toast.success('Task status updated successfully'), onError: (errors) => toast.error(errors?.status || 'Failed to update task status') }
    );
  };

  const getFileIcon = (update) => {
    if (!update.file_path) return <FileText className="w-4 h-4 text-gray-400" />;
    if (update.file_type?.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const getDownloadUrl = (update, task = null) => {
    if (!update.file_path) return null;
    const taskObj = update.task || task;
    const milestoneId = taskObj?.milestone?.id || taskObj?.project_milestone_id;
    const taskId = taskObj?.id || task?.id;
    if (!milestoneId || !taskId) return null;
    return route('project-management.progress-updates.download', [milestoneId, taskId, update.id]);
  };

  const totalMilestones      = milestones.length;
  const pendingMilestones    = milestones.filter(m => m.status === 'pending').length;
  const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length;
  const completedMilestones  = milestones.filter(m => m.status === 'completed').length;

  return (
    <div className="w-full">
      {/* Quick Stats */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide truncate">Total Milestones</p>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">{totalMilestones}</p>
              </div>
              <div className="bg-blue-200 rounded-full p-2 sm:p-3 flex-shrink-0"><Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" /></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 sm:p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide truncate">Pending</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-900 mt-1">{pendingMilestones}</p>
              </div>
              <div className="bg-yellow-200 rounded-full p-2 sm:p-3 flex-shrink-0"><Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-700" /></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 sm:p-4 border border-indigo-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide truncate">In Progress</p>
                <p className="text-xl sm:text-2xl font-bold text-indigo-900 mt-1">{inProgressMilestones}</p>
              </div>
              <div className="bg-indigo-200 rounded-full p-2 sm:p-3 flex-shrink-0"><Circle className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-700" /></div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide truncate">Completed</p>
                <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">{completedMilestones}</p>
              </div>
              <div className="bg-green-200 rounded-full p-2 sm:p-3 flex-shrink-0"><CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" /></div>
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
              placeholder="Search milestones or tasks..."
              value={searchInput}
              onChange={handleSearch}
              className="pl-10 h-11 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu open={showFilterCard} onOpenChange={(open) => { setShowFilterCard(open); if (open) setShowSortCard(false); }}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={`h-10 w-10 p-0 border-2 rounded-lg flex items-center justify-center relative ${activeFiltersCount() > 0 ? 'bg-zinc-100 border-zinc-400 text-zinc-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                  title="Filters"
                >
                  <Filter className="h-4 w-4" />
                  {activeFiltersCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-zinc-700 text-white text-xs font-semibold rounded-full h-4 w-4 flex items-center justify-center">
                      {activeFiltersCount()}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-96 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col max-h-[500px] bg-white">
                <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-white" />
                    <h3 className="text-base font-semibold text-white">Filter Milestones</h3>
                  </div>
                  <button onClick={() => setShowFilterCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  <div className="mb-4">
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Status</Label>
                    <Select value={localFilters.status || 'all'} onValueChange={(v) => handleFilterChange('status', v)}>
                      <SelectTrigger className="w-full h-9"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mb-4">
                    <Label className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-2 block">
                      <Calendar className="h-3 w-3" /> Date Range
                    </Label>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="ms_start_date" className="text-xs text-gray-600 mb-1 block">Start Date</Label>
                        <Input id="ms_start_date" type="date" value={localFilters.start_date}
                          onChange={e => setLocalFilters(p => ({ ...p, start_date: e.target.value }))}
                          className="w-full h-9 border-gray-300 rounded-lg" />
                      </div>
                      <div>
                        <Label htmlFor="ms_end_date" className="text-xs text-gray-600 mb-1 block">End Date</Label>
                        <Input id="ms_end_date" type="date" value={localFilters.end_date}
                          onChange={e => setLocalFilters(p => ({ ...p, end_date: e.target.value }))}
                          className="w-full h-9 border-gray-300 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex gap-2 flex-shrink-0">
                  <Button type="button" onClick={resetFilters} variant="outline"
                    className="flex-1 border-gray-300 hover:bg-gray-100 text-sm h-9"
                    disabled={activeFiltersCount() === 0}>
                    Clear
                  </Button>
                  <Button type="button" onClick={applyFilters}
                    className="flex-1 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9">
                    Apply Filters
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu open={showSortCard} onOpenChange={(open) => { setShowSortCard(open); if (open) setShowFilterCard(false); }}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"
                  className="h-10 w-10 p-0 border-2 rounded-lg flex items-center justify-center bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  title="Sort">
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 p-0 rounded-xl shadow-2xl border-2 border-gray-200 overflow-hidden flex flex-col max-h-[300px] bg-white">
                <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-white" />
                    <h3 className="text-base font-semibold text-white">Sort Milestones</h3>
                  </div>
                  <button onClick={() => setShowSortCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1"><X className="h-4 w-4" /></button>
                </div>
                <div className="p-4 overflow-y-auto flex-1">
                  <div className="mb-4">
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="due_date">Due Date</SelectItem>
                        <SelectItem value="start_date">Start Date</SelectItem>
                        <SelectItem value="created_at">Date Created</SelectItem>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="status">Status</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mb-4">
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Order</Label>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="asc">Ascending</SelectItem>
                        <SelectItem value="desc">Descending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex-shrink-0">
                  <Button type="button" onClick={applySort}
                    className="w-full bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9">
                    Apply Sort
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {has('project-milestones.view') && (
            <Button
              className="flex-1 sm:flex-none bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md px-4 h-11 whitespace-nowrap flex items-center justify-center gap-2"
              onClick={handleExportPdf}
              disabled={isExporting}
            >
              {isExporting ? (
                <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Exporting...</>
              ) : (
                <><FileText className="h-4 w-4" />Export PDF</>
              )}
            </Button>
          )}
          {has('project-milestones.create') && (
            <Button
              className="flex-1 sm:flex-none bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md px-4 h-11 whitespace-nowrap flex items-center justify-center gap-2"
              onClick={() => setShowAddModal(true)}
            >
              <SquarePen className="h-4 w-4" />Add Milestone
            </Button>
          )}
        </div>
      </div>

      {/* Milestones Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
        <Table className="min-w-[1000px] w-full">
          <TableHeader>
            <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
              <TableHead className="w-[30px] font-semibold text-gray-700 text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm"></TableHead>
              <TableHead className="font-semibold text-gray-700 text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">Milestone / Task</TableHead>
              <TableHead className="font-semibold text-gray-700 text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">Status</TableHead>
              <TableHead className="font-semibold text-gray-700 text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">Due Date</TableHead>
              <TableHead className="font-semibold text-gray-700 text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">Progress</TableHead>
              <TableHead className="font-semibold text-gray-700 text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">Alerts</TableHead>
              <TableHead className="font-semibold text-gray-700 text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {milestones.length > 0 ? (
              milestones.map((milestone, index) => {
                const isExpanded = expandedMilestones.has(milestone.id);
                const tasks      = milestone.tasks || [];
                const progress   = getMilestoneProgress(milestone);

                return (
                  <>
                    {/* ── Milestone row ─────────────────────────────────── */}
                    <TableRow
                      key={milestone.id}
                      className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      onClick={() => toggleMilestone(milestone.id)}
                    >
                      <TableCell className="text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <button onClick={e => { e.stopPropagation(); toggleMilestone(milestone.id); }} className="p-1 hover:bg-gray-200 rounded transition">
                            {isExpanded ? <ChevronDown size={16} className="text-gray-700" /> : <ChevronRight size={16} className="text-gray-700" />}
                          </button>
                          <Flag size={16} className="text-blue-600 flex-shrink-0" />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <div>
                          <div className="font-semibold text-gray-900 flex items-center gap-2">
                            {milestone.name}
                            <span className="text-xs font-normal text-gray-500">(Milestone)</span>
                          </div>
                          {milestone.description && (
                            <div className="text-xs text-gray-600 line-clamp-1 mt-0.5">{milestone.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm" onClick={e => e.stopPropagation()}>
                        <span className={getStatusBadgeClassName(milestone.status)}>
                          {(() => { const s = formatStatus(milestone.status); const Icon = s.icon; return <><Icon size={11} />{s.label}</>; })()}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-600">{formatDate(milestone.due_date)}</TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2.5 max-w-[100px] shadow-inner">
                            <div className={`h-2.5 rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : progress > 0 ? 'bg-yellow-500' : 'bg-gray-300'}`} style={{ width: `${progress}%` }} />
                          </div>
                          <span className={`text-xs font-semibold w-8 ${progress === 100 ? 'text-green-600' : progress >= 50 ? 'text-blue-600' : progress > 0 ? 'text-yellow-600' : 'text-gray-500'}`}>{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm" onClick={e => e.stopPropagation()}>
                        <MilestoneUrgencyRollup milestone={milestone} today={today} />
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1 items-center">
                          {has('project-tasks.create') && (
                            <button onClick={() => { setSelectedMilestoneForTask(milestone); setShowAddTaskModal(true); }} className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition" title="Add Task"><Plus size={18} /></button>
                          )}
                          {has('project-milestones.update') && (
                            <button onClick={() => { setEditMilestone(milestone); setShowEditModal(true); }} className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition" title="Edit Milestone"><SquarePen size={18} /></button>
                          )}
                          {has('project-milestones.delete') && (
                            <button onClick={() => { setDeleteMilestone(milestone); setShowDeleteModal(true); }} className="p-1.5 rounded hover:bg-red-100 text-red-600 transition" title="Delete Milestone"><Trash2 size={18} /></button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {isExpanded && tasks.length > 0 && (
                      <TableRow className="bg-gray-50 hover:bg-gray-50 border-0">
                        <TableCell colSpan={7} className="p-0 h-2 bg-gray-50">
                          <div className="h-full border-l-2 border-dashed border-gray-300 ml-6"></div>
                        </TableCell>
                      </TableRow>
                    )}

                    {isExpanded && tasks.map((task) => {
                      const assignedUser      = task.assignedUser || task.assigned_user || null;
                      const taskWithMilestone = { ...task, milestone: task.milestone || milestone, assignedUser, assigned_user: assignedUser };
                      const rawPU             = task.progressUpdates || task.progress_updates;
                      let progressUpdates     = [];
                      if (Array.isArray(rawPU))                                    progressUpdates = rawPU;
                      else if (rawPU?.data && Array.isArray(rawPU.data))          progressUpdates = rawPU.data;
                      else if (rawPU?.data?.data && Array.isArray(rawPU.data.data)) progressUpdates = rawPU.data.data;

                      const rawIssues  = task.issues || task.task_issues || [];
                      const taskIssues = Array.isArray(rawIssues) ? rawIssues : [];

                      const hasUnread    = (task.unread_client_requests_count ?? 0) > 0;
                      const hasOpenIssue = taskIssues.some(i => i.status === 'open' || i.status === 'in_progress');
                      const isOverdue    = task.due_date && task.status !== 'completed' && new Date(task.due_date) < today;
                      const isCompleted  = taskWithMilestone.status === 'completed';

                      return (
                        <TableRow
                          key={`task-${task.id}`}
                          className={`cursor-pointer transition-colors border-l-4 ${
                            hasUnread
                              ? 'border-l-violet-400 bg-violet-50/30 hover:bg-violet-50/60'
                              : hasOpenIssue
                              ? 'border-l-red-300 bg-red-50/20 hover:bg-red-50/40'
                              : isOverdue
                              ? 'border-l-amber-300 bg-amber-50/20 hover:bg-amber-50/40'
                              : isCompleted
                              ? 'border-l-green-300 bg-green-50/10 hover:bg-green-50/20'
                              : 'border-l-blue-200 bg-white hover:bg-blue-50/30'
                          }`}
                          onClick={() => { setSelectedTaskForDetail(taskWithMilestone); setShowTaskDetailModal(true); }}
                        >
                          <TableCell className="text-xs sm:text-sm">
                            <div className="flex items-center gap-2 pl-8">
                              <div className="flex items-center gap-1">
                                <div className="w-4 h-4 flex items-center justify-center"><Minus size={18} className="text-gray-400" /></div>
                                <FileText size={18} className="text-blue-500 flex-shrink-0" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="pl-2">
                              <div className="font-medium text-gray-700 flex items-center gap-2">
                                {task.title}
                                <span className="text-xs font-normal text-gray-500">(Task)</span>
                              </div>
                              {task.description && <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{task.description}</div>}
                            </div>
                          </TableCell>

                          {/* ── Status cell: read-only badge (same as milestone) ── */}
                          <TableCell className="text-xs sm:text-sm">
                            <span className={getStatusBadgeClassName(taskWithMilestone.status)}>
                              {(() => { const s = formatStatus(taskWithMilestone.status); const Icon = s.icon; return <><Icon size={11} />{s.label}</>; })()}
                            </span>
                          </TableCell>

                          <TableCell className="text-xs sm:text-sm text-gray-600">{formatDate(taskWithMilestone.due_date)}</TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="flex items-center gap-1.5 text-sm text-gray-600">
                              {taskWithMilestone.assignedUser?.name || taskWithMilestone.assigned_user?.name ? (
                                <><User size={14} className="text-gray-400 flex-shrink-0" /><span className="line-clamp-1 text-xs">{taskWithMilestone.assignedUser?.name || taskWithMilestone.assigned_user?.name}</span></>
                              ) : (
                                <span className="text-gray-400 text-xs">Unassigned</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm" onClick={e => e.stopPropagation()}>
                            <TaskUrgencyCluster task={task} today={today} />
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1">
                              {has('project-tasks.update') && (
                                <button onClick={() => { setEditTask(taskWithMilestone); setShowEditTaskModal(true); }} className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition" title="Edit Task"><SquarePen size={18} /></button>
                              )}
                              {has('project-tasks.delete') && (
                                <button onClick={() => { setDeleteTask(taskWithMilestone); setShowDeleteTaskModal(true); }} className="p-1.5 rounded hover:bg-red-100 text-red-600 transition" title="Delete Task"><Trash2 size={18} /></button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Milestone-level issues */}
                    {isExpanded && (() => {
                      const milestoneIssues = Array.isArray(milestone.issues)
                        ? milestone.issues.filter(i => !i.project_task_id)
                        : [];
                      if (!milestoneIssues.length) return null;
                      return (
                        <>
                          <TableRow className="bg-gray-50 hover:bg-gray-50 border-0">
                            <TableCell colSpan={7} className="p-0 h-2 bg-gray-50">
                              <div className="h-full border-l-2 border-dashed border-gray-300 ml-6"></div>
                            </TableCell>
                          </TableRow>
                          {milestoneIssues.map(issue => (
                            <TableRow key={`milestone-issue-${issue.id}`} className="bg-white hover:bg-orange-50/30 transition-colors border-l-4 border-l-orange-200">
                              <TableCell className="text-xs sm:text-sm">
                                <div className="flex items-center gap-2 pl-8">
                                  <div className="flex items-center gap-1">
                                    <div className="w-4 h-4 flex items-center justify-center"><Minus size={12} className="text-gray-400" /></div>
                                    <AlertCircle size={14} className="text-orange-500 flex-shrink-0" />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm" colSpan={6}>
                                <div className="pl-2 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm text-gray-700 font-medium flex items-center gap-2">
                                          {issue.title || 'Untitled Issue'}
                                          <span className="text-xs font-normal text-gray-500">(Issue)</span>
                                        </p>
                                      </div>
                                      {issue.description && <p className="text-xs text-gray-600 mb-2">{issue.description}</p>}
                                      <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span>Priority: {issue.priority || 'Medium'}</span>
                                        <span>• Status: {issue.status || 'Open'}</span>
                                        {issue.reportedBy && <span>• Reported by: {issue.reportedBy.name}</span>}
                                        {issue.assignedTo && <span>• Assigned to: {issue.assignedTo.name}</span>}
                                        <span>• {formatDate(issue.created_at)}</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      {has('project-issues.update') && (
                                        <button onClick={() => { setEditIssue(issue); setShowEditIssueModal(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition" title="Edit Issue"><SquarePen size={18} /></button>
                                      )}
                                      {has('project-issues.delete') && (
                                        <button onClick={() => { setDeleteIssue(issue); setShowDeleteIssueModal(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-red-600 transition" title="Delete Issue"><Trash2 size={18} /></button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      );
                    })()}
                  </>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <div className="flex flex-col items-center justify-center">
                    <div className="bg-gray-100 rounded-full p-4 mb-3"><Search className="h-8 w-8 text-gray-400" /></div>
                    <p className="text-gray-500 font-medium text-base">No milestones found</p>
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
            Showing <span className="font-semibold text-gray-900">{milestones.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{milestoneData?.milestones?.total || 0}</span> milestones
          </p>
          <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
            <button disabled={!prevLink?.url}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${!prevLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}
              onClick={() => handlePageClick(prevLink?.url)}>Previous</button>
            {pageLinks.map((link, idx) => (
              <button key={idx} disabled={!link?.url}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all min-w-[36px] ${link?.active ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'} ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}
                onClick={() => handlePageClick(link?.url)}>{link?.label || ''}</button>
            ))}
            <button disabled={!nextLink?.url}
              className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${!nextLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}
              onClick={() => handlePageClick(nextLink?.url)}>Next</button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && <AddMilestone setShowAddModal={setShowAddModal} project={project} existingBillingTotal={milestones.reduce((sum, m) => sum + (parseFloat(m.billing_percentage) || 0), 0)}/>}
      {showEditModal && editMilestone && <EditMilestone setShowEditModal={setShowEditModal} milestone={editMilestone} project={project} />}
      {showDeleteModal && deleteMilestone && <DeleteMilestone setShowDeleteModal={setShowDeleteModal} milestone={deleteMilestone} project={project} />}
      {showAddTaskModal && <AddTask setShowAddModal={setShowAddTaskModal} project={project} milestones={milestones} users={users} preselectedMilestone={selectedMilestoneForTask} />}
      {showEditTaskModal && editTask && <EditTask setShowEditModal={setShowEditTaskModal} task={editTask} project={project} milestones={milestones} users={users} />}
      {showDeleteTaskModal && deleteTask && <DeleteTask setShowDeleteModal={setShowDeleteTaskModal} task={deleteTask} milestone={deleteTask.milestone || milestones.find(m => m.tasks?.some(t => t.id === deleteTask.id))} />}
      {showAddProgressModal && <AddProgressUpdate setShowAddModal={setShowAddProgressModal} project={project} tasks={allTasks} preselectedTask={selectedTaskForProgress} />}
      {showEditProgressModal && editProgressUpdate && <EditProgressUpdate setShowEditModal={setShowEditProgressModal} progressUpdate={editProgressUpdate} project={project} tasks={allTasks} />}
      {showDeleteProgressModal && deleteProgressUpdate && <DeleteProgressUpdate setShowDeleteModal={setShowDeleteProgressModal} progressUpdate={deleteProgressUpdate} task={deleteProgressUpdate.task || allTasks.find(t => t.id === deleteProgressUpdate.project_task_id)} />}
      {showAddIssueModal && <AddIssue setShowAddModal={setShowAddIssueModal} project={project} milestones={milestones} tasks={allTasks} users={users} />}
      {showEditIssueModal && editIssue && <EditIssue setShowEditModal={setShowEditIssueModal} issue={editIssue} project={project} milestones={milestones} tasks={allTasks} users={users} />}
      {showDeleteIssueModal && deleteIssue && <DeleteIssue setShowDeleteModal={setShowDeleteIssueModal} issue={deleteIssue} project={project} />}
      {showTaskDetailModal && selectedTaskForDetail && (
        <TaskDetailModal
          task={selectedTaskForDetail}
          isOpen={showTaskDetailModal}
          onClose={() => { setShowTaskDetailModal(false); setSelectedTaskForDetail(null); }}
          project={project}
          milestones={milestones}
          users={users}
          allTasks={allTasks}
          onRefresh={() => {
            router.reload({
              only: ['milestoneData'],
              onSuccess: () => {
                const updated = allTasks.find(t => t.id === selectedTaskForDetail.id);
                if (updated) setSelectedTaskForDetail(updated);
              }
            });
          }}
        />
      )}
    </div>
  );
}