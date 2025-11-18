import { useState, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
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

export default function MilestonesTab({ project, milestoneData }) {
  const { has } = usePermission();
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
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Handle both paginated and non-paginated milestone data
  const milestones = Array.isArray(milestoneData.milestones) 
    ? milestoneData.milestones 
    : (milestoneData.milestones?.data || []);
  const users = milestoneData.users || [];
  const issues = milestoneData.issues || [];

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
    } else {
      newExpanded.add(milestoneId);
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

  // Filter milestones, tasks, and progress updates
  const filteredMilestones = useMemo(() => {
    let filtered = milestones;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(m => m.status === statusFilter);
    }
    
    if (search) {
      const query = search.toLowerCase();
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
  }, [search, statusFilter, milestones]);


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

  const getStatusBadge = (status) => {
    const statusInfo = formatStatus(status);
    const Icon = statusInfo.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-semibold shadow-sm ${
        statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' :
        statusInfo.color === 'blue' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
        statusInfo.color === 'green' ? 'bg-green-100 text-green-800 border border-green-300' :
        statusInfo.color === 'red' ? 'bg-red-100 text-red-800 border border-red-300' :
        'bg-gray-100 text-gray-800 border border-gray-300'
      }`}>
        <Icon size={12} className="opacity-80" />
        {statusInfo.label}
      </span>
    );
  };


  const handleTaskStatusChange = (task, newStatus) => {
    const milestoneId = task.project_milestone_id || task.milestone?.id;
    if (!milestoneId) {
      toast.error('Unable to find milestone for this task');
      return;
    }

    router.put(
      route('project-management.project-tasks.update-status', [milestoneId, task.id]),
      { status: newStatus },
      {
        preserveScroll: true,
        onSuccess: () => toast.success('Task status updated successfully'),
        onError: () => toast.error('Failed to update task status')
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

  // Get row color classes based on status and type (monday.com inspired)
  // Returns both the row classes and the colored background classes
  const getRowColorClasses = (type, status, progress = null) => {
    const baseClasses = "transition-all duration-200 cursor-pointer shadow-sm relative";
    let bgClasses = "";
    let borderColor = "";
    
    if (type === 'milestone') {
      if (status === 'completed') {
        bgClasses = "bg-gradient-to-r from-green-50 to-emerald-50/80 hover:from-green-100 hover:to-emerald-100";
        borderColor = "border-green-500";
      } else if (status === 'in_progress') {
        bgClasses = "bg-gradient-to-r from-blue-50 to-indigo-50/80 hover:from-blue-100 hover:to-indigo-100";
        borderColor = "border-blue-500";
      } else if (status === 'pending') {
        bgClasses = "bg-gradient-to-r from-amber-50 to-yellow-50/80 hover:from-amber-100 hover:to-yellow-100";
        borderColor = "border-amber-500";
      } else {
        bgClasses = "bg-gradient-to-r from-indigo-50 to-purple-50/80 hover:from-indigo-100 hover:to-purple-100";
        borderColor = "border-indigo-400";
      }
      return { rowClasses: `${baseClasses} bg-white hover:shadow-md`, bgClasses, borderColor, indent: 0 };
    }
    
    if (type === 'task') {
      if (status === 'completed') {
        bgClasses = "bg-gradient-to-r from-emerald-50/60 to-teal-50/50 hover:from-emerald-100/80 hover:to-teal-100/70";
        borderColor = "border-emerald-500";
      } else if (status === 'in_progress') {
        bgClasses = "bg-gradient-to-r from-sky-50/60 to-cyan-50/50 hover:from-sky-100/80 hover:to-cyan-100/70";
        borderColor = "border-sky-500";
      } else if (status === 'pending') {
        bgClasses = "bg-gradient-to-r from-yellow-50/60 to-orange-50/50 hover:from-yellow-100/80 hover:to-orange-100/70";
        borderColor = "border-yellow-500";
      } else {
        bgClasses = "bg-gradient-to-r from-blue-50/50 to-indigo-50/40 hover:from-blue-100/70 hover:to-indigo-100/60";
        borderColor = "border-blue-400";
      }
      return { rowClasses: `${baseClasses} bg-white hover:shadow-md`, bgClasses, borderColor, indent: 8 };
    }
    
    if (type === 'progress_update') {
      bgClasses = "bg-gradient-to-r from-teal-50/50 to-green-50/40 hover:from-teal-100/70 hover:to-green-100/60";
      borderColor = "border-teal-500";
      return { rowClasses: `${baseClasses} bg-white hover:shadow-md`, bgClasses, borderColor, indent: 16 };
    }
    
    if (type === 'issue') {
      const priority = status || 'medium';
      if (priority === 'high' || priority === 'critical') {
        bgClasses = "bg-gradient-to-r from-red-50/60 to-rose-50/50 hover:from-red-100/80 hover:to-rose-100/70";
        borderColor = "border-red-500";
      } else if (priority === 'medium') {
        bgClasses = "bg-gradient-to-r from-orange-50/60 to-amber-50/50 hover:from-orange-100/80 hover:to-amber-100/70";
        borderColor = "border-orange-500";
      } else {
        bgClasses = "bg-gradient-to-r from-orange-50/50 to-yellow-50/40 hover:from-orange-100/70 hover:to-yellow-100/60";
        borderColor = "border-orange-400";
      }
      // Issues can be at task level (16) or milestone level (8)
      const indent = 16; // Default to task level, will be overridden for milestone-level issues
      return { rowClasses: `${baseClasses} bg-white hover:shadow-md`, bgClasses, borderColor, indent };
    }
    
    return { rowClasses: baseClasses, bgClasses: "", borderColor: "", indent: 0 };
  };

  return (
    <div className="w-full space-y-4">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Milestones</h2>
          <p className="text-sm text-gray-500 mt-1">Manage milestones, tasks, and progress updates</p>
        </div>
        <div className="flex gap-2">
          {has('project-issues.create') && (
            <Button
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50 shadow-sm"
              onClick={() => setShowAddIssueModal(true)}
            >
              <AlertCircle size={18} className="mr-2" />
              Add Issue ({issues.length})
            </Button>
          )}
          {has('project-milestones.create') && (
            <Button
              className="bg-zinc-700 hover:bg-zinc-900 text-white shadow-sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={18} className="mr-2" />
              Add Milestone
            </Button>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search milestones, tasks, or progress updates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 focus:border-gray-800 focus:ring-2 focus:ring-gray-800 border-2 shadow-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] border-2 shadow-sm">
            <Filter size={16} className="mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-lg border border-gray-200 shadow-sm mb-4">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Status Colors:</div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 shadow-sm"></div>
          <span className="text-sm font-medium text-gray-700">Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-500 shadow-sm"></div>
          <span className="text-sm font-medium text-gray-700">In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-500 shadow-sm"></div>
          <span className="text-sm font-medium text-gray-700">Pending</span>
        </div>
        <div className="ml-2 pl-2 border-l border-gray-300">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gradient-to-r from-teal-50 to-green-50 border-2 border-teal-500 shadow-sm"></div>
            <span className="text-sm font-medium text-gray-700">Progress Update</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-500 shadow-sm"></div>
          <span className="text-sm font-medium text-gray-700">Issue</span>
        </div>
      </div>

      {/* Milestones Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-md bg-white">
          <Table className="min-w-[1200px] w-full">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-100 to-slate-100 border-b-2 border-gray-300 shadow-sm">
                <TableHead className="w-[30px] font-semibold text-gray-700"></TableHead>
                <TableHead className="font-semibold text-gray-700">Milestone</TableHead>
                <TableHead className="font-semibold text-gray-700">Status</TableHead>
                <TableHead className="font-semibold text-gray-700">Due Date</TableHead>
                <TableHead className="font-semibold text-gray-700">Progress</TableHead>
                <TableHead className="font-semibold text-gray-700">Tasks</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMilestones.length > 0 ? (
                filteredMilestones.map(milestone => {
                  const isExpanded = expandedMilestones.has(milestone.id);
                  const tasks = milestone.tasks || [];
                  const progress = getMilestoneProgress(milestone);
                  
                  const milestoneColors = getRowColorClasses('milestone', milestone.status, progress);
                  return (
                    <>
                      <TableRow 
                        key={milestone.id}
                        className={`${milestoneColors.rowClasses} group`}
                        onClick={() => toggleMilestone(milestone.id)}
                      >
                        {/* Colored background overlay starting from indent */}
                        <div 
                          className={`absolute inset-0 ${milestoneColors.bgClasses} border-l-4 ${milestoneColors.borderColor} pointer-events-none`}
                          style={{ left: `${milestoneColors.indent * 4}px` }}
                        ></div>
                        <TableCell className="relative z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMilestone(milestone.id);
                            }}
                            className="p-1 hover:bg-gray-200 rounded transition"
                          >
                            {isExpanded ? (
                              <ChevronDown size={16} className="text-gray-600" />
                            ) : (
                              <ChevronRight size={16} className="text-gray-600" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="relative z-10">
                          <div>
                            <div className="font-medium text-gray-900">{milestone.name}</div>
                            {milestone.description && (
                              <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{milestone.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="relative z-10">{getStatusBadge(milestone.status)}</TableCell>
                        <TableCell className="relative z-10 text-sm text-gray-600">{formatDate(milestone.due_date)}</TableCell>
                        <TableCell className="relative z-10">
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
                        <TableCell className="relative z-10 text-sm text-gray-600">{tasks.length}</TableCell>
                        <TableCell className="relative z-10" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            {has('project-tasks.create') && (
                              <button
                                onClick={() => {
                                  setSelectedMilestoneForTask(milestone);
                                  setShowAddTaskModal(true);
                                }}
                                className="p-1.5 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                                title="Add Task"
                              >
                                <Plus size={14} />
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
                                <SquarePen size={14} />
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
                                <Trash2 size={14} />
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
                            {/* Whitespace spacer between milestone and tasks */}
                            {isExpanded && tasks.length > 0 && (
                              <TableRow className="bg-white hover:bg-white border-0">
                                <TableCell colSpan={7} className="p-0 h-2 bg-white"></TableCell>
                              </TableRow>
                            )}
                            {/* Tasks under milestone */}
                            {isExpanded && tasks.map(task => {
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
                        
                        const taskColors = getRowColorClasses('task', taskWithMilestone.status);
                        return (
                          <>
                            <TableRow 
                              key={`task-${task.id}`}
                              className={`${taskColors.rowClasses} group`}
                              onClick={() => toggleTask(task.id)}
                            >
                              {/* Colored background overlay starting from indent */}
                              <div 
                                className={`absolute inset-0 ${taskColors.bgClasses} border-l-4 ${taskColors.borderColor} pointer-events-none`}
                                style={{ left: `${taskColors.indent * 4}px` }}
                              ></div>
                              <TableCell className="relative z-10 pl-8">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTask(task.id);
                                    }}
                                    className="p-1 hover:bg-gray-200 rounded transition"
                                  >
                                    {isTaskExpanded ? (
                                      <ChevronDown size={14} className="text-gray-600" />
                                    ) : (
                                      <ChevronRight size={14} className="text-gray-600" />
                                    )}
                                  </button>
                                </div>
                              </TableCell>
                              <TableCell className="relative z-10">
                                <div className="pl-2">
                                  <div className="font-medium text-gray-800">{task.title}</div>
                                  {task.description && (
                                    <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{task.description}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="relative z-10" onClick={(e) => e.stopPropagation()}>
                                {has('project-tasks.update-status') ? (
                                  <Select
                                    value={taskWithMilestone.status}
                                    onValueChange={(value) => handleTaskStatusChange(taskWithMilestone, value)}
                                  >
                                    <SelectTrigger className="w-[140px] h-8 text-xs border-0 bg-transparent p-0 hover:bg-gray-100 rounded">
                                      <SelectValue>
                                        {getStatusBadge(taskWithMilestone.status)}
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
                                      <SelectItem value="completed" className="focus:bg-green-50">
                                        <span className="flex items-center gap-2">
                                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                          Completed
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div>{getStatusBadge(taskWithMilestone.status)}</div>
                                )}
                              </TableCell>
                              <TableCell className="relative z-10 text-sm text-gray-600">{formatDate(taskWithMilestone.due_date)}</TableCell>
                              <TableCell className="relative z-10">
                                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                  {taskWithMilestone.assignedUser?.name || taskWithMilestone.assigned_user?.name ? (
                                    <>
                                      <User size={14} className="text-gray-400" />
                                      <span className="line-clamp-1">
                                        {taskWithMilestone.assignedUser?.name || taskWithMilestone.assigned_user?.name}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-gray-400 text-xs">Unassigned</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="relative z-10 text-sm text-gray-600">
                                <span className="font-medium">
                                  {progressUpdates.length} {progressUpdates.length === 1 ? 'update' : 'updates'}
                                </span>
                              </TableCell>
                              <TableCell className="relative z-10" onClick={(e) => e.stopPropagation()}>
                                <div className="flex justify-end gap-1">
                                  {has('progress-updates.create') && (
                                    <button
                                      onClick={() => {
                                        setSelectedTaskForProgress(taskWithMilestone);
                                        setShowAddProgressModal(true);
                                      }}
                                      className="p-1.5 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                                      title="Add Progress Update"
                                    >
                                      <Plus size={14} />
                                    </button>
                                  )}
                                  {has('project-tasks.update') && (
                                    <button
                                      onClick={() => {
                                        setEditTask(taskWithMilestone);
                                        setShowEditTaskModal(true);
                                      }}
                                      className="p-1.5 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                                      title="Edit Task"
                                    >
                                      <SquarePen size={14} />
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
                                      <Trash2 size={14} />
                                    </button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* Whitespace spacer between task and progress updates */}
                            {isTaskExpanded && (
                              <TableRow className="bg-white hover:bg-white border-0">
                                <TableCell colSpan={7} className="p-0 h-1.5 bg-white"></TableCell>
                              </TableRow>
                            )}
                            {/* Progress Updates under task */}
                            {isTaskExpanded && (
                              <>
                                {progressUpdates.length > 0 ? (
                                  progressUpdates.map(update => {
                                    const updateColors = getRowColorClasses('progress_update');
                                    return (
                              <TableRow 
                                key={`update-${update.id}`}
                                className={`${updateColors.rowClasses} group`}
                              >
                                {/* Colored background overlay starting from indent */}
                                <div 
                                  className={`absolute inset-0 ${updateColors.bgClasses} border-l-4 ${updateColors.borderColor} pointer-events-none`}
                                  style={{ left: `${updateColors.indent * 4}px` }}
                                ></div>
                                <TableCell className="relative z-10 pl-16">
                                  <div className="flex items-center gap-2">
                                  </div>
                                </TableCell>
                                <TableCell className="relative z-10" colSpan={6}>
                                  <div className="pl-2 space-y-2">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="text-sm text-gray-700 font-medium mb-2">{update.description || 'No description'}</p>
                                        <div className="flex items-center gap-3 text-xs text-gray-500">
                                          {update.file_path && getDownloadUrl(update, taskWithMilestone) ? (
                                            <>
                                              {getFileIcon(update)}
                                              <a
                                                href={getDownloadUrl(update, taskWithMilestone)}
                                                className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                              >
                                                {update.original_name || 'Download File'}
                                              </a>
                                              {update.file_size && (
                                                <span>• {formatFileSize(update.file_size)}</span>
                                              )}
                                            </>
                                          ) : (
                                            <span className="text-gray-400">No file attached</span>
                                          )}
                                          <span>• By {update.createdBy?.name || 'Unknown'}</span>
                                          <span>• {formatDate(update.created_at)}</span>
                                        </div>
                                      </div>
                                      <div className="flex gap-1">
                                        {update.file_path && getDownloadUrl(update, taskWithMilestone) && has('progress-updates.view') && (
                                          <a
                                            href={getDownloadUrl(update, taskWithMilestone)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            <button
                                              className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition"
                                              title="Download File"
                                            >
                                              <Download size={14} />
                                            </button>
                                          </a>
                                        )}
                                        {has('progress-updates.update') && (
                                          <button
                                            onClick={() => {
                                              setEditProgressUpdate({
                                                ...update,
                                                task: update.task || taskWithMilestone
                                              });
                                              setShowEditProgressModal(true);
                                            }}
                                            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition"
                                            title="Edit Update"
                                          >
                                            <SquarePen size={14} />
                                          </button>
                                        )}
                                        {has('progress-updates.delete') && (
                                          <button
                                            onClick={() => {
                                              setDeleteProgressUpdate({
                                                ...update,
                                                task: update.task || taskWithMilestone
                                              });
                                              setShowDeleteProgressModal(true);
                                            }}
                                            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-red-600 transition"
                                            title="Delete Update"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                                    );
                                  })
                                ) : (
                                  <TableRow className="bg-teal-50/20 hover:bg-teal-50/30 border-l-4 border-teal-200 transition">
                                    <TableCell className="pl-16">
                                      <div className="flex items-center gap-2">
                                      </div>
                                    </TableCell>
                                    <TableCell colSpan={6}>
                                      <div className="pl-2 py-4">
                                        <div className="flex items-center gap-3 text-sm text-gray-500">
                                          <FileText size={16} className="text-gray-400" />
                                          <span>No progress updates yet. Click the + button to add one.</span>
                                        </div>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            )}
                            
                            {/* Whitespace spacer between task and issues */}
                            {isTaskExpanded && taskIssues.length > 0 && (
                              <>
                                <TableRow className="bg-white hover:bg-white border-0">
                                  <TableCell colSpan={7} className="p-0 h-1.5 bg-white"></TableCell>
                                </TableRow>
                                {taskIssues.map(issue => {
                                  const issueColors = getRowColorClasses('issue', issue.priority);
                                  return (
                                  <TableRow 
                                    key={`task-issue-${issue.id}`}
                                    className={`${issueColors.rowClasses} group`}
                                  >
                                    {/* Colored background overlay starting from indent */}
                                    <div 
                                      className={`absolute inset-0 ${issueColors.bgClasses} border-l-4 ${issueColors.borderColor} pointer-events-none`}
                                      style={{ left: `${issueColors.indent * 4}px` }}
                                    ></div>
                                    <TableCell className="relative z-10 pl-16">
                                      <div className="flex items-center gap-2">
                                      </div>
                                    </TableCell>
                                    <TableCell className="relative z-10" colSpan={6}>
                                      <div className="pl-2 space-y-2">
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                              <AlertCircle size={14} className="text-orange-600" />
                                              <p className="text-sm text-gray-700 font-medium">{issue.title || 'Untitled Issue'}</p>
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
                                                <SquarePen size={14} />
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
                                                <Trash2 size={14} />
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
                      })}
                      
                      {/* Whitespace spacer between milestone and milestone-level issues */}
                      {isExpanded && milestoneIssues.length > 0 && (
                        <>
                          <TableRow className="bg-white hover:bg-white border-0">
                            <TableCell colSpan={7} className="p-0 h-2 bg-white"></TableCell>
                          </TableRow>
                          {milestoneIssues.map(issue => {
                            const issueColors = getRowColorClasses('issue', issue.priority, null);
                            // Override indent for milestone-level issues
                            issueColors.indent = 8;
                            return (
                            <TableRow 
                              key={`milestone-issue-${issue.id}`}
                              className={`${issueColors.rowClasses} group`}
                            >
                              {/* Colored background overlay starting from indent */}
                              <div 
                                className={`absolute inset-0 ${issueColors.bgClasses} border-l-4 ${issueColors.borderColor} pointer-events-none`}
                                style={{ left: `${issueColors.indent * 4}px` }}
                              ></div>
                              <TableCell className="relative z-10 pl-8">
                                <div className="flex items-center gap-2">
                                </div>
                              </TableCell>
                              <TableCell className="relative z-10" colSpan={6}>
                                <div className="pl-2 space-y-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <AlertCircle size={14} className="text-orange-600" />
                                        <p className="text-sm text-gray-700 font-medium">{issue.title || 'Untitled Issue'}</p>
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
                                          <SquarePen size={14} />
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
                                          <Trash2 size={14} />
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
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No milestones found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

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

    </div>
  );
}

