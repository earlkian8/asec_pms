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
  Download,
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

export default function MilestonesTab({ project, milestoneData }) {
  const { has } = usePermission();
  const { props } = usePage();
  
  const [expandedMilestones, setExpandedMilestones] = useState(new Set());
  const [expandedTasks, setExpandedTasks] = useState(new Set());
  const [expandedProgressUpdates, setExpandedProgressUpdates] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editMilestone, setEditMilestone] = useState(null);
  const [deleteMilestone, setDeleteMilestone] = useState(null);
  
  // Task modals
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);
  const [selectedMilestoneForTask, setSelectedMilestoneForTask] = useState(null);
  
  // Progress update modals
  const [showAddProgressModal, setShowAddProgressModal] = useState(false);
  const [showEditProgressModal, setShowEditProgressModal] = useState(false);
  const [showDeleteProgressModal, setShowDeleteProgressModal] = useState(false);
  const [editProgressUpdate, setEditProgressUpdate] = useState(null);
  const [deleteProgressUpdate, setDeleteProgressUpdate] = useState(null);
  const [selectedTaskForProgress, setSelectedTaskForProgress] = useState(null);

  // Issue modals
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [showEditIssueModal, setShowEditIssueModal] = useState(false);
  const [showDeleteIssueModal, setShowDeleteIssueModal] = useState(false);
  const [editIssue, setEditIssue] = useState(null);
  const [deleteIssue, setDeleteIssue] = useState(null);
  
  // Task detail modal
  const [showTaskDetailModal, setShowTaskDetailModal] = useState(false);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);
  
  // Filter and sort states
  const [searchInput, setSearchInput] = useState(milestoneData?.search || '');
  const [showFilterCard, setShowFilterCard] = useState(false);
  const [showSortCard, setShowSortCard] = useState(false);
  const debounceTimer = useRef(null);
  
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(null);

  // Handle both paginated and non-paginated milestone data
  const milestones = Array.isArray(milestoneData.milestones) 
    ? milestoneData.milestones 
    : (milestoneData.milestones?.data || []);
  const paginationLinks = milestoneData.milestones?.links || [];
  const users = milestoneData.users || [];
  const issues = milestoneData.issues || [];
  const filters = milestoneData?.filters || {};
  const filterOptions = milestoneData?.filterOptions || {};
  
  // Initialize filters from props
  const initializeFilters = (filterProps) => {
    return {
      status: filterProps?.status || 'all',
      start_date: filterProps?.start_date || '',
      end_date: filterProps?.end_date || '',
    };
  };
  
  const [localFilters, setLocalFilters] = useState(() => initializeFilters(filters));
  const [sortBy, setSortBy] = useState(milestoneData?.sort_by || 'due_date');
  const [sortOrder, setSortOrder] = useState(milestoneData?.sort_order || 'asc');

  // Get all tasks from all milestones
  const allTasks = useMemo(() => {
    return milestones.flatMap(m => (m.tasks || []).map(t => ({ ...t, milestone: m })));
  }, [milestones]);

  // Debug: Log data structure
  useEffect(() => {
    if (milestones.length > 0) {
      console.log('=== MILESTONES DEBUG ===');
      milestones.forEach(m => {
        console.log(`Milestone ${m.id} (${m.name}):`, {
          tasksCount: m.tasks?.length || 0,
          issuesCount: m.issues?.length || 0,
          issues: m.issues
        });
        if (m.tasks && m.tasks.length > 0) {
          m.tasks.forEach(t => {
            console.log(`Task ${t.id} (${t.title}):`, {
              assignedUser: t.assignedUser,
              assigned_user: t.assigned_user,
              assigned_to: t.assigned_to,
              hasProgressUpdates: !!(t.progressUpdates || t.progress_updates),
              progressUpdates: t.progressUpdates,
              progress_updates: t.progress_updates,
              progressUpdatesType: typeof t.progressUpdates,
              progress_updatesType: typeof t.progress_updates,
              progressUpdatesIsArray: Array.isArray(t.progressUpdates || t.progress_updates),
              progressUpdatesLength: Array.isArray(t.progressUpdates || t.progress_updates) 
                ? (t.progressUpdates || t.progress_updates).length 
                : 0,
              hasIssues: !!(t.issues || t.task_issues),
              issues: t.issues,
              task_issues: t.task_issues,
              issuesCount: Array.isArray(t.issues || t.task_issues) 
                ? (t.issues || t.task_issues).length 
                : 0,
              allTaskKeys: Object.keys(t) // Show all available keys
            });
          });
        }
      });
      console.log('=== END DEBUG ===');
    }
  }, [milestones]);

  // Toggle milestone expansion
  const toggleMilestone = (milestoneId) => {
    const newExpanded = new Set(expandedMilestones);
    if (newExpanded.has(milestoneId)) {
      newExpanded.delete(milestoneId);
      const tasks = milestones.find(m => m.id === milestoneId)?.tasks || [];
      const newExpandedTasks = new Set(expandedTasks);
      tasks.forEach(task => {
        newExpandedTasks.delete(task.id);
      });
      setExpandedTasks(newExpandedTasks);
      setSelectedMilestoneId(null);
    } else {
      newExpanded.add(milestoneId);
      setSelectedMilestoneId(milestoneId);
    }
    setExpandedMilestones(newExpanded);
  };

  // Toggle task expansion
  const toggleTask = (taskId) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  // Toggle progress update expansion
  const toggleProgressUpdate = (updateId) => {
    const newExpanded = new Set(expandedProgressUpdates);
    if (newExpanded.has(updateId)) {
      newExpanded.delete(updateId);
    } else {
      newExpanded.add(updateId);
    }
    setExpandedProgressUpdates(newExpanded);
  };

  // Sync filters when props change
  useEffect(() => {
    const newFilters = initializeFilters(filters);
    setLocalFilters(newFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.start_date, filters.end_date]);

  // Sync sort when props change
  useEffect(() => {
    if (milestoneData?.sort_by) setSortBy(milestoneData.sort_by);
    if (milestoneData?.sort_order) setSortOrder(milestoneData.sort_order);
  }, [milestoneData?.sort_by, milestoneData?.sort_order]);


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
    setSortBy('due_date');
    setSortOrder('asc');
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

  // Filter milestones, tasks, and progress updates (client-side filtering for display)
  const filteredMilestones = useMemo(() => {
    let filtered = milestones;
    
    if (localFilters.status && localFilters.status !== 'all') {
      filtered = filtered.filter(m => m.status === localFilters.status);
    }
    
    if (searchInput) {
      const query = searchInput.toLowerCase();
      filtered = filtered.map(milestone => {
        const milestoneMatches = 
          (milestone.name || '').toLowerCase().includes(query) ||
          (milestone.description || '').toLowerCase().includes(query) ||
          (milestone.status || '').toLowerCase().includes(query);
        
        if (milestoneMatches) return milestone;
        
        const filteredTasks = (milestone.tasks || []).map(task => {
          const taskMatches =
            (task.title || '').toLowerCase().includes(query) ||
            (task.description || '').toLowerCase().includes(query) ||
            (task.status || '').toLowerCase().includes(query);
          
          if (taskMatches) return task;
          
          // Handle progress updates array properly
          const taskProgressUpdates = Array.isArray(task.progressUpdates) 
            ? task.progressUpdates 
            : (task.progressUpdates?.data || []);
          const filteredProgress = taskProgressUpdates.filter(update =>
            (update.description || '').toLowerCase().includes(query) ||
            (update.original_name || '').toLowerCase().includes(query)
          );
          
          if (filteredProgress.length > 0) {
            return { ...task, progressUpdates: filteredProgress };
          }
          
          return null;
        }).filter(Boolean);
        
        if (filteredTasks.length > 0) {
          return { ...milestone, tasks: filteredTasks };
        }
        
        return null;
      }).filter(Boolean);
    }
    
    return filtered;
  }, [searchInput, localFilters, milestones]);

  // Calculate stats
  const totalMilestones = milestones.length;
  const pendingMilestones = milestones.filter(m => m.status === 'pending').length;
  const inProgressMilestones = milestones.filter(m => m.status === 'in_progress').length;
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;


  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }) : '---';

  const formatStatus = (status) => {
    if (!status) return { label: '---', color: 'gray', icon: Clock };
    const statusMap = {
      'pending': { label: 'Pending', color: 'yellow', icon: Clock },
      'in_progress': { label: 'In Progress', color: 'blue', icon: Clock },
      'completed': { label: 'Completed', color: 'green', icon: CheckCircle2 },
    };
    return statusMap[status] || { label: status, color: 'gray', icon: Clock };
  };

  const getStatusSelectClassName = (status) => {
    const statusInfo = formatStatus(status);
    const baseClass = 'w-[140px] h-8 text-xs border-0 rounded font-medium';
    
    if (statusInfo.color === 'yellow') {
      return `${baseClass} bg-amber-100 text-amber-700 hover:bg-amber-200`;
    } else if (statusInfo.color === 'blue') {
      return `${baseClass} bg-blue-100 text-blue-700 hover:bg-blue-200`;
    } else if (statusInfo.color === 'green') {
      return `${baseClass} bg-green-100 text-green-700 hover:bg-green-200`;
    } else if (statusInfo.color === 'red') {
      return `${baseClass} bg-red-100 text-red-700 hover:bg-red-200`;
    } else {
      return `${baseClass} bg-gray-100 text-gray-700 hover:bg-gray-200`;
    }
  };

  // Helper function to check if all tasks in a milestone are completed
  const areAllTasksCompleted = (milestone) => {
    const tasks = milestone.tasks || [];
    if (tasks.length === 0) return true; // No tasks means it can be completed
    
    const allCompleted = tasks.every(task => task.status === 'completed');
    return allCompleted;
  };

  const handleMilestoneStatusChange = (milestone, newStatus) => {
    // Validate: Cannot mark as completed unless all tasks are completed
    if (newStatus === 'completed') {
      if (!areAllTasksCompleted(milestone)) {
        const tasks = milestone.tasks || [];
        const incompleteTasks = tasks.filter(task => task.status !== 'completed').length;
        toast.error(`Cannot mark milestone as completed. ${incompleteTasks} task(s) still need to be completed.`);
        return;
      }
    }

    router.put(
      route('project-management.project-milestones.update', [project.id, milestone.id]),
      {
        name: milestone.name,
        description: milestone.description || '',
        start_date: milestone.start_date || '',
        due_date: milestone.due_date || '',
        billing_percentage: milestone.billing_percentage || '',
        status: newStatus,
      },
      {
        preserveScroll: true,
        onSuccess: () => toast.success('Milestone status updated successfully'),
        onError: (errors) => {
          if (errors?.status) {
            toast.error(errors.status);
          } else {
            toast.error('Failed to update milestone status');
          }
        }
      }
    );
  };

  // Helper function to get progress updates count from a task
  const getProgressUpdatesCount = (task) => {
    const rawProgressUpdates = task.progressUpdates || task.progress_updates;
    if (!rawProgressUpdates) return 0;
    
    if (Array.isArray(rawProgressUpdates)) {
      return rawProgressUpdates.length;
    }
    if (rawProgressUpdates.data && Array.isArray(rawProgressUpdates.data)) {
      return rawProgressUpdates.data.length;
    }
    if (rawProgressUpdates.data && Array.isArray(rawProgressUpdates.data.data)) {
      return rawProgressUpdates.data.data.length;
    }
    return 0;
  };

  const handleTaskStatusChange = (task, newStatus) => {
    const milestoneId = task.project_milestone_id || task.milestone?.id;
    if (!milestoneId) {
      toast.error('Unable to find milestone for this task');
      return;
    }

    // Validate: Cannot mark as completed without at least 1 progress update
    if (newStatus === 'completed') {
      const progressUpdatesCount = getProgressUpdatesCount(task);
      if (progressUpdatesCount === 0) {
        toast.error('Cannot mark task as completed. Please add at least one progress update first.');
        return;
      }
    }

    router.put(
      route('project-management.project-tasks.update-status', [milestoneId, task.id]),
      { status: newStatus },
      {
        preserveScroll: true,
        onSuccess: () => toast.success('Task status updated successfully'),
        onError: (errors) => {
          if (errors?.status) {
            toast.error(errors.status);
          } else {
            toast.error('Failed to update task status');
          }
        }
      }
    );
  };

  const getFileIcon = (update) => {
    if (!update.file_path) return <FileText className="w-4 h-4 text-gray-400" />;
    if (update.file_type?.startsWith('image/')) return <ImageIcon className="w-4 h-4 text-blue-500" />;
    return <FileText className="w-4 h-4 text-gray-500" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '---';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getDownloadUrl = (update, task = null) => {
    if (!update.file_path) return null;
    const taskObj = update.task || task;
    // Get milestone ID from task's milestone relationship or from the parent milestone
    const milestoneId = taskObj?.milestone?.id || taskObj?.project_milestone_id || (task?.milestone?.id);
    const taskId = taskObj?.id || task?.id;
    if (!milestoneId || !taskId) return null;
    return route('project-management.progress-updates.download', [
      milestoneId,
      taskId,
      update.id
    ]);
  };

  // Calculate milestone progress
  const getMilestoneProgress = (milestone) => {
    const tasks = milestone.tasks || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };

  return (
    <div className="w-full">
      {/* Quick Stats */}
      <div className="mb-6 pb-6 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Milestones</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{totalMilestones}</p>
              </div>
              <div className="bg-blue-200 rounded-full p-3">
                <Target className="h-5 w-5 text-blue-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-yellow-700 uppercase tracking-wide">Pending</p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">{pendingMilestones}</p>
              </div>
              <div className="bg-yellow-200 rounded-full p-3">
                <Clock className="h-5 w-5 text-yellow-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">In Progress</p>
                <p className="text-2xl font-bold text-indigo-900 mt-1">{inProgressMilestones}</p>
              </div>
              <div className="bg-indigo-200 rounded-full p-3">
                <Circle className="h-5 w-5 text-indigo-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Completed</p>
                <p className="text-2xl font-bold text-green-900 mt-1">{completedMilestones}</p>
              </div>
              <div className="bg-green-200 rounded-full p-3">
                <CheckCircle className="h-5 w-5 text-green-700" />
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
              placeholder="Search milestones, tasks, or progress updates..."
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
                      <h3 className="text-base font-semibold text-white">Filter Milestones</h3>
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
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
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
                      disabled={activeFiltersCount() === 0 && sortBy === 'due_date' && sortOrder === 'asc'}
                    >
                      Clear All
                    </Button>
                    <Button
                      type="button"
                      onClick={applyFilters}
                      className="flex-1 bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md text-sm h-9 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={activeFiltersCount() === 0 && sortBy === 'due_date' && sortOrder === 'asc'}
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
                      <h3 className="text-base font-semibold text-white">Sort Milestones</h3>
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
        <div className="flex gap-2">
          {has('project-milestones.create') && (
            <Button
              className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md hover:shadow-lg transition-all duration-200 px-6 h-11 whitespace-nowrap"
              onClick={() => setShowAddModal(true)}
            >
              <SquarePen className="mr-2 h-4 w-4" />
              Add Milestone
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
                <TableHead className="font-semibold text-gray-700 text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">Milestone</TableHead>
                <TableHead className="font-semibold text-gray-700 text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">Status</TableHead>
                <TableHead className="font-semibold text-gray-700 text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">Due Date</TableHead>
                <TableHead className="font-semibold text-gray-700 text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">Progress</TableHead>
                <TableHead className="font-semibold text-gray-700 text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">Tasks</TableHead>
                <TableHead className="font-semibold text-gray-700 text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMilestones.length > 0 ? (
                filteredMilestones.map((milestone, index) => {
                  const isExpanded = expandedMilestones.has(milestone.id);
                  const tasks = milestone.tasks || [];
                  const progress = getMilestoneProgress(milestone);
                  const isSelected = selectedMilestoneId === milestone.id;
                  
                  return (
                    <>
                      <TableRow 
                        key={milestone.id}
                        className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 cursor-pointer ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                        onClick={() => toggleMilestone(milestone.id)}
                      >
                        <TableCell className="text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleMilestone(milestone.id);
                              }}
                              className="p-1 hover:bg-gray-200 rounded transition"
                            >
                              {isExpanded ? (
                                <ChevronDown size={16} className="text-gray-700" />
                              ) : (
                                <ChevronRight size={16} className="text-gray-700" />
                              )}
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
                        <TableCell className="text-xs sm:text-sm" onClick={(e) => e.stopPropagation()}>
                          {has('project-milestones.update') ? (
                            <Select
                              value={milestone.status}
                              onValueChange={(value) => handleMilestoneStatusChange(milestone, value)}
                            >
                              <SelectTrigger className={getStatusSelectClassName(milestone.status)}>
                                <SelectValue>
                                  {formatStatus(milestone.status).label}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending" className="focus:bg-yellow-50">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                    Pending
                                  </span>
                                </SelectItem>
                                <SelectItem value="in_progress" className="focus:bg-blue-50">
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    In Progress
                                  </span>
                                </SelectItem>
                                <SelectItem 
                                  value="completed" 
                                  className="focus:bg-green-50"
                                  disabled={!areAllTasksCompleted(milestone)}
                                >
                                  <span className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Completed
                                    {!areAllTasksCompleted(milestone) && (
                                      <span className="text-xs text-gray-400 ml-1">(All tasks must be completed)</span>
                                    )}
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <div>{getStatusBadge(milestone.status)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-gray-600">{formatDate(milestone.due_date)}</TableCell>
                        <TableCell className="text-xs sm:text-sm">
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
                        <TableCell className="text-xs sm:text-sm text-gray-600">{tasks.length}</TableCell>
                        <TableCell className="text-xs sm:text-sm" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1 items-center">
                            {has('project-tasks.create') && (
                              <button
                                onClick={() => {
                                  setSelectedMilestoneForTask(milestone);
                                  setShowAddTaskModal(true);
                                }}
                                className="p-1.5 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                                title="Add Task"
                              >
                                <Plus size={18} />
                              </button>
                            )}
                            {has('project-milestones.update') && (
                              <button
                                onClick={() => {
                                  setEditMilestone(milestone);
                                  setShowEditModal(true);
                                }}
                                className="p-1.5 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                                title="Edit Milestone"
                              >
                                <SquarePen size={18} />
                              </button>
                            )}
                            {has('project-milestones.delete') && (
                              <button
                                onClick={() => {
                                  setDeleteMilestone(milestone);
                                  setShowDeleteModal(true);
                                }}
                                className="p-1.5 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition"
                                title="Delete Milestone"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Get milestone-level issues (not tied to a specific task) */}
                      {(() => {
                        const milestoneIssues = Array.isArray(milestone.issues) 
                          ? milestone.issues.filter(issue => !issue.project_task_id) 
                          : [];
                        
                        return (
                          <>
                            {/* Visual separator between milestone and tasks */}
                            {isExpanded && tasks.length > 0 && (
                              <TableRow className="bg-gray-50 hover:bg-gray-50 border-0">
                                <TableCell colSpan={7} className="p-0 h-2 bg-gray-50">
                                  <div className="h-full border-l-2 border-dashed border-gray-300 ml-6"></div>
                                </TableCell>
                              </TableRow>
                            )}
                            {/* Tasks under milestone */}
                            {isExpanded && tasks.map((task, taskIndex) => {
                              const isTaskExpanded = expandedTasks.has(task.id);
                              // Ensure task has milestone relationship for download URLs
                              // Laravel serializes relationships - check both camelCase and snake_case
                              const assignedUser = task.assignedUser || task.assigned_user || null;
                              const taskWithMilestone = {
                                ...task,
                                milestone: task.milestone || milestone,
                                assignedUser: assignedUser,
                                assigned_user: assignedUser // Ensure both are set
                              };
                              
                              // Ensure progressUpdates is an array - Laravel may serialize as progress_updates
                              // Check both camelCase and snake_case
                              const rawProgressUpdates = task.progressUpdates || task.progress_updates;
                              let progressUpdates = [];
                              if (rawProgressUpdates !== undefined && rawProgressUpdates !== null) {
                                if (Array.isArray(rawProgressUpdates)) {
                                  progressUpdates = rawProgressUpdates;
                                } else if (rawProgressUpdates.data && Array.isArray(rawProgressUpdates.data)) {
                                  // Handle paginated data structure
                                  progressUpdates = rawProgressUpdates.data;
                                } else if (rawProgressUpdates.data && Array.isArray(rawProgressUpdates.data.data)) {
                                  // Handle nested paginated data
                                  progressUpdates = rawProgressUpdates.data.data;
                                } else if (typeof rawProgressUpdates === 'object' && rawProgressUpdates.length !== undefined) {
                                  // Handle array-like object
                                  progressUpdates = Array.from(rawProgressUpdates);
                                }
                              }
                              
                              // Get issues for this task - check both naming conventions
                              const rawTaskIssues = task.issues || task.task_issues || [];
                              const taskIssues = Array.isArray(rawTaskIssues) ? rawTaskIssues : [];
                        
                        // Debug log for this specific task when expanded
                        if (isTaskExpanded) {
                          console.log(`[DEBUG] Task ${task.id} (${task.title}) expanded:`, {
                            rawProgressUpdates: task.progressUpdates,
                            rawProgressUpdatesSnake: task.progress_updates,
                            rawProgressUpdatesType: typeof (task.progressUpdates || task.progress_updates),
                            rawProgressUpdatesIsArray: Array.isArray(task.progressUpdates || task.progress_updates),
                            processedProgressUpdates: progressUpdates,
                            count: progressUpdates.length,
                            assignedUser: task.assignedUser,
                            assigned_user: task.assigned_user,
                            fullTaskObject: JSON.parse(JSON.stringify(task)),
                            milestone: milestone
                          });
                        }
                        
                        return (
                          <>
                            <TableRow 
                              key={`task-${task.id}`}
                              className="bg-white hover:bg-blue-50/30 cursor-pointer transition-colors border-l-4 border-l-blue-200"
                              onClick={() => {
                                setSelectedTaskForDetail(taskWithMilestone);
                                setShowTaskDetailModal(true);
                              }}
                            >
                              <TableCell className="text-xs sm:text-sm">
                                <div className="flex items-center gap-2 pl-8">
                                  <div className="flex items-center gap-1">
                                    <div className="w-4 h-4 flex items-center justify-center">
                                      <Minus size={18} className="text-gray-400" />
                                    </div>
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
                                  {task.description && (
                                    <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{task.description}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm" onClick={(e) => e.stopPropagation()}>
                                {has('project-tasks.update-status') ? (
                                  <Select
                                    value={taskWithMilestone.status}
                                    onValueChange={(value) => handleTaskStatusChange(taskWithMilestone, value)}
                                  >
                                    <SelectTrigger className={getStatusSelectClassName(taskWithMilestone.status)}>
                                      <SelectValue>
                                        {formatStatus(taskWithMilestone.status).label}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending" className="focus:bg-yellow-50">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                          Pending
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="in_progress" className="focus:bg-blue-50">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                          In Progress
                                        </span>
                                      </SelectItem>
                                      <SelectItem 
                                        value="completed" 
                                        className="focus:bg-green-50"
                                        disabled={progressUpdates.length === 0}
                                      >
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                          Completed
                                          {progressUpdates.length === 0 && (
                                            <span className="text-xs text-gray-400 ml-1">(Requires progress update)</span>
                                          )}
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div>{getStatusBadge(taskWithMilestone.status)}</div>
                                )}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm text-gray-600">{formatDate(taskWithMilestone.due_date)}</TableCell>
                              <TableCell className="text-xs sm:text-sm">
                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                  {taskWithMilestone.assignedUser?.name || taskWithMilestone.assigned_user?.name ? (
                                    <>
                                      <User size={18} className="text-gray-400" />
                                      <span className="line-clamp-1">
                                        {taskWithMilestone.assignedUser?.name || taskWithMilestone.assigned_user?.name}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-gray-400 text-xs">Unassigned</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm text-gray-600">
                                <span className="font-medium">
                                  {progressUpdates.length} {progressUpdates.length === 1 ? 'update' : 'updates'}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm" onClick={(e) => e.stopPropagation()}>
                                <div className="flex gap-1">
                                  {has('project-tasks.update') && (
                                    <button
                                      onClick={() => {
                                        setEditTask(taskWithMilestone);
                                        setShowEditTaskModal(true);
                                      }}
                                      className="p-1.5 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                                      title="Edit Task"
                                    >
                                      <SquarePen size={18} />
                                    </button>
                                  )}
                                  {has('project-tasks.delete') && (
                                    <button
                                      onClick={() => {
                                        setDeleteTask(taskWithMilestone);
                                        setShowDeleteTaskModal(true);
                                      }}
                                      className="p-1.5 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition"
                                      title="Delete Task"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          </>
                        );
                      })}
                      
                      {/* Visual separator between tasks and milestone-level issues */}
                      {isExpanded && milestoneIssues.length > 0 && (
                        <>
                          <TableRow className="bg-gray-50 hover:bg-gray-50 border-0">
                            <TableCell colSpan={7} className="p-0 h-2 bg-gray-50">
                              <div className="h-full border-l-2 border-dashed border-gray-300 ml-6"></div>
                            </TableCell>
                          </TableRow>
                          {milestoneIssues.map(issue => {
                            return (
                            <TableRow 
                              key={`milestone-issue-${issue.id}`}
                              className="bg-white hover:bg-orange-50/30 transition-colors border-l-4 border-l-orange-200"
                            >
                              <TableCell className="text-xs sm:text-sm">
                                <div className="flex items-center gap-2 pl-8">
                                  <div className="flex items-center gap-1">
                                    <div className="w-4 h-4 flex items-center justify-center">
                                      <Minus size={12} className="text-gray-400" />
                                    </div>
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
                                      {issue.description && (
                                        <p className="text-xs text-gray-600 mb-2">{issue.description}</p>
                                      )}
                                      <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span>Priority: {issue.priority || 'Medium'}</span>
                                        <span>• Status: {issue.status || 'Open'}</span>
                                        {issue.reportedBy && (
                                          <span>• Reported by: {issue.reportedBy.name}</span>
                                        )}
                                        {issue.assignedTo && (
                                          <span>• Assigned to: {issue.assignedTo.name}</span>
                                        )}
                                        <span>• {formatDate(issue.created_at)}</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      {has('project-issues.update') && (
                                        <button
                                          onClick={() => {
                                            setEditIssue(issue);
                                            setShowEditIssueModal(true);
                                          }}
                                          className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition"
                                          title="Edit Issue"
                                        >
                                          <SquarePen size={18} />
                                        </button>
                                      )}
                                      {has('project-issues.delete') && (
                                        <button
                                          onClick={() => {
                                            setDeleteIssue(issue);
                                            setShowDeleteIssueModal(true);
                                          }}
                                          className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-red-600 transition"
                                          title="Delete Issue"
                                        >
                                          <Trash2 size={18} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </>
                      )}
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
                      <div className="bg-gray-100 rounded-full p-4 mb-3">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
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
        <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-gray-200 gap-4">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{milestones.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{milestoneData?.milestones?.total || 0}</span> milestones
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
        <AddMilestone
          setShowAddModal={setShowAddModal}
          project={project}
        />
      )}

      {showEditModal && editMilestone && (
        <EditMilestone
          setShowEditModal={setShowEditModal}
          milestone={editMilestone}
          project={project}
        />
      )}

      {showDeleteModal && deleteMilestone && (
        <DeleteMilestone
          setShowDeleteModal={setShowDeleteModal}
          milestone={deleteMilestone}
          project={project}
        />
      )}

      {showAddTaskModal && (
        <AddTask
          setShowAddModal={setShowAddTaskModal}
          project={project}
          milestones={milestones}
          users={users}
          preselectedMilestone={selectedMilestoneForTask}
        />
      )}

      {showEditTaskModal && editTask && (
        <EditTask
          setShowEditModal={setShowEditTaskModal}
          task={editTask}
          project={project}
          milestones={milestones}
          users={users}
        />
      )}

      {showDeleteTaskModal && deleteTask && (
        <DeleteTask
          setShowDeleteModal={setShowDeleteTaskModal}
          task={deleteTask}
          milestone={deleteTask.milestone || milestones.find(m => m.tasks?.some(t => t.id === deleteTask.id))}
        />
      )}

      {showAddProgressModal && (
        <AddProgressUpdate
          setShowAddModal={setShowAddProgressModal}
          project={project}
          tasks={allTasks}
          preselectedTask={selectedTaskForProgress}
        />
      )}

      {showEditProgressModal && editProgressUpdate && (
        <EditProgressUpdate
          setShowEditModal={setShowEditProgressModal}
          progressUpdate={editProgressUpdate}
          project={project}
          tasks={allTasks}
        />
      )}

      {showDeleteProgressModal && deleteProgressUpdate && (
        <DeleteProgressUpdate
          setShowDeleteModal={setShowDeleteProgressModal}
          progressUpdate={deleteProgressUpdate}
          task={deleteProgressUpdate.task || allTasks.find(t => t.id === deleteProgressUpdate.project_task_id)}
        />
      )}

      {showAddIssueModal && (
        <AddIssue
          setShowAddModal={setShowAddIssueModal}
          project={project}
          milestones={milestones}
          tasks={allTasks}
          users={users}
        />
      )}

      {showEditIssueModal && editIssue && (
        <EditIssue
          setShowEditModal={setShowEditIssueModal}
          issue={editIssue}
          project={project}
          milestones={milestones}
          tasks={allTasks}
          users={users}
        />
      )}

      {showDeleteIssueModal && deleteIssue && (
        <DeleteIssue
          setShowDeleteModal={setShowDeleteIssueModal}
          issue={deleteIssue}
          project={project}
        />
      )}

      {/* Task Detail Modal */}
      {showTaskDetailModal && selectedTaskForDetail && (
        <TaskDetailModal
          task={selectedTaskForDetail}
          isOpen={showTaskDetailModal}
          onClose={() => {
            setShowTaskDetailModal(false);
            setSelectedTaskForDetail(null);
          }}
          project={project}
          milestones={milestones}
          users={users}
          allTasks={allTasks}
          onRefresh={() => {
            router.reload({ 
              only: ['milestoneData'],
              onSuccess: () => {
                // Update the selected task with fresh data after reload
                const taskId = selectedTaskForDetail.id;
                const updatedTask = allTasks.find(t => t.id === taskId) || 
                                  milestones
                                    .flatMap(m => m.tasks || [])
                                    .find(t => t.id === taskId);
                if (updatedTask) {
                  setSelectedTaskForDetail(updatedTask);
                }
              }
            });
          }}
        />
      )}
    </div>
  );
}

