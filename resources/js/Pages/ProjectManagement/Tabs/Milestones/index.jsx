import { useState, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
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
  File,
  FileText,
  Image as ImageIcon,
  User,
  Calendar,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  Filter,
  Search,
  Percent
} from 'lucide-react';
import AddMilestone from './add';
import EditMilestone from './edit';
import DeleteMilestone from './delete';
import AddTask from '../Tasks/add';
import EditTask from '../Tasks/edit';
import DeleteTask from '../Tasks/delete';
import AddProgressUpdate from '../ProgressUpdate/add';
import EditProgressUpdate from '../ProgressUpdate/edit';
import DeleteProgressUpdate from '../ProgressUpdate/delete';

export default function MilestonesTab({ project, milestoneData }) {
  const [expandedMilestones, setExpandedMilestones] = useState(new Set());
  const [expandedTasks, setExpandedTasks] = useState(new Set());
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
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Handle both paginated and non-paginated milestone data
  const milestones = Array.isArray(milestoneData.milestones) 
    ? milestoneData.milestones 
    : (milestoneData.milestones?.data || []);
  const users = milestoneData.users || [];

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

  // Filter milestones, tasks, and progress updates
  const filteredData = useMemo(() => {
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
          
          const filteredProgress = (task.progressUpdates || []).filter(update =>
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
    if (!status) return { label: '---', color: 'gray', icon: Clock, bgColor: 'bg-gray-100', textColor: 'text-gray-700', borderColor: 'border-gray-300', stripColor: 'bg-gray-400' };
    const statusMap = {
      'pending': { label: 'Pending', color: 'yellow', icon: Clock, bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-yellow-200', stripColor: 'bg-yellow-500' },
      'in_progress': { label: 'In Progress', color: 'blue', icon: TrendingUp, bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200', stripColor: 'bg-blue-500' },
      'completed': { label: 'Completed', color: 'green', icon: CheckCircle2, bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200', stripColor: 'bg-green-500' }
    };
    return statusMap[status] || { label: status, color: 'gray', icon: Clock, bgColor: 'bg-gray-100', textColor: 'text-gray-700', borderColor: 'border-gray-300', stripColor: 'bg-gray-400' };
  };

  const getStatusBadge = (status, size = 'md') => {
    const statusInfo = formatStatus(status);
    const Icon = statusInfo.icon;
    const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
    
    return (
      <span className={`inline-flex items-center gap-1.5 ${sizeClasses} rounded-full font-medium border ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor}`}>
        <Icon size={size === 'sm' ? 12 : 14} />
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
    if (update.file_type?.includes('pdf') || update.original_name?.toLowerCase().endsWith('.pdf')) {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    return <File className="w-4 h-4 text-gray-500" />;
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
    if (!taskObj?.milestone?.id || !taskObj?.id) return null;
    return route('project-management.progress-updates.download', [
      taskObj.milestone.id,
      taskObj.id,
      update.id
    ]);
  };

  const getFilePreview = (update, task = null) => {
    if (!update.file_path) return null;
    
    if (update.file_type?.startsWith('image/')) {
      const url = getDownloadUrl(update, task);
      if (!url) return null;
      return (
        <img
          src={url}
          alt={update.original_name}
          className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      );
    }
    
    return null;
  };

  // Calculate milestone statistics
  const getMilestoneStats = (milestone) => {
    const tasks = milestone.tasks || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
    const pendingTasks = tasks.filter(t => t.status === 'pending').length;
    const totalProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const totalProgressUpdates = tasks.reduce((sum, task) => sum + (task.progressUpdates?.length || 0), 0);
    
    return { totalTasks, completedTasks, inProgressTasks, pendingTasks, totalProgress, totalProgressUpdates };
  };

  // Calculate task progress (based on progress updates)
  const getTaskProgress = (task) => {
    const updates = task.progressUpdates || [];
    // Simple progress: if there are updates, consider it progressing
    // You can enhance this logic based on your business rules
    return updates.length > 0 ? Math.min(updates.length * 10, 100) : 0;
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Milestones</h2>
          <p className="text-sm text-gray-500 mt-1">Manage milestones, tasks, and progress updates</p>
        </div>
        <Button
          className="bg-zinc-700 hover:bg-zinc-900 text-white shadow-sm"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={18} className="mr-2" />
          Add Milestone
        </Button>
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

      {/* Milestones Grid */}
      {filteredData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredData.map(milestone => {
            const isExpanded = expandedMilestones.has(milestone.id);
            const stats = getMilestoneStats(milestone);
            const statusInfo = formatStatus(milestone.status);
            const tasks = milestone.tasks || [];
            
            return (
              <div
                key={milestone.id}
                className="bg-white rounded-xl border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden relative"
              >
                {/* Status Color Strip */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${statusInfo.stripColor}`} />

                {/* Milestone Header */}
                <div className={`p-6 ${statusInfo.bgColor} border-b-2 ${statusInfo.borderColor}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 pr-4">
                      {/* Typography Hierarchy */}
                      <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{milestone.name}</h3>
                      {milestone.description && (
                        <p className="text-sm text-gray-600 line-clamp-2">{milestone.description}</p>
                      )}
                    </div>
                    {/* Edit/Delete Icons - Grouped on Right */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditMilestone(milestone);
                          setShowEditModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-white/50 text-gray-600 hover:text-gray-900 transition"
                        title="Edit Milestone"
                      >
                        <SquarePen size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteMilestone(milestone);
                          setShowDeleteModal(true);
                        }}
                        className="p-2 rounded-lg hover:bg-white/50 text-red-600 hover:text-red-700 transition"
                        title="Delete Milestone"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Due Date with Label and Icon */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="text-gray-600" size={16} />
                      <span className="text-sm font-medium text-gray-700">Due Date:</span>
                      <span className="text-sm text-gray-600">{formatDate(milestone.due_date)}</span>
                    </div>
                    {getStatusBadge(milestone.status, 'sm')}
                  </div>
                </div>

                {/* Milestone Content */}
                <div className="p-6 space-y-5">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Progress</span>
                      <span className="text-sm font-bold text-gray-900">{stats.totalProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                      <div 
                        className={`${statusInfo.stripColor} h-3 rounded-full transition-all duration-500 shadow-sm`}
                        style={{ width: `${stats.totalProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Pill-Style Stats */}
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium border border-gray-200">
                      <Target size={14} />
                      {stats.totalTasks} Tasks
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-medium border border-green-200">
                      <CheckCircle2 size={14} />
                      {stats.completedTasks} Done
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium border border-purple-200">
                      <TrendingUp size={14} />
                      {stats.totalProgressUpdates} Updates
                    </span>
                  </div>

                  {/* Tasks Table Section */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-gray-900">Tasks</h4>
                      <button
                        onClick={() => {
                          setSelectedMilestoneForTask(milestone);
                          setShowAddTaskModal(true);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
                        title="Add Task"
                      >
                        <Plus size={14} />
                        Add Task
                      </button>
                    </div>

                    {tasks.length > 0 ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="w-[30px]"></TableHead>
                              <TableHead className="font-semibold">Task Name</TableHead>
                              <TableHead className="font-semibold">Status</TableHead>
                              <TableHead className="font-semibold">Assigned To</TableHead>
                              <TableHead className="font-semibold">Due Date</TableHead>
                              <TableHead className="font-semibold">Progress</TableHead>
                              <TableHead className="font-semibold text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tasks.map(task => {
                              const isTaskExpanded = expandedTasks.has(task.id);
                              const taskProgress = getTaskProgress(task);
                              const progressUpdates = task.progressUpdates || [];
                              
                              return (
                                <>
                                  <TableRow 
                                    key={task.id}
                                    className="hover:bg-gray-50 transition cursor-pointer"
                                    onClick={() => toggleTask(task.id)}
                                  >
                                    <TableCell>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleTask(task.id);
                                        }}
                                        className="p-1 hover:bg-gray-200 rounded transition"
                                        title={isTaskExpanded ? "Collapse" : "Expand"}
                                      >
                                        {isTaskExpanded ? (
                                          <ChevronDown size={16} className="text-gray-600" />
                                        ) : (
                                          <ChevronRight size={16} className="text-gray-600" />
                                        )}
                                      </button>
                                    </TableCell>
                                    <TableCell>
                                      <div>
                                        <div className="font-medium text-gray-900">{task.title}</div>
                                        {task.description && (
                                          <div className="text-xs text-gray-500 line-clamp-1 mt-0.5">{task.description}</div>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                      <Select
                                        value={task.status}
                                        onValueChange={(value) => handleTaskStatusChange(task, value)}
                                      >
                                        <SelectTrigger className="w-[140px] h-8 text-xs border-0 bg-transparent p-0">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="pending">Pending</SelectItem>
                                          <SelectItem value="in_progress">In Progress</SelectItem>
                                          <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                        {task.assignedUser ? (
                                          <>
                                            <User size={14} className="text-gray-400" />
                                            <span className="line-clamp-1">{task.assignedUser.name}</span>
                                          </>
                                        ) : (
                                          <span className="text-gray-400 text-xs">Unassigned</span>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm text-gray-600">{formatDate(task.due_date)}</div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[60px]">
                                          <div 
                                            className="bg-blue-500 h-2 rounded-full"
                                            style={{ width: `${taskProgress}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-gray-600 w-8">{taskProgress}%</span>
                                      </div>
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                      <div className="flex justify-end gap-1">
                                        <button
                                          onClick={() => {
                                            setEditTask(task);
                                            setShowEditTaskModal(true);
                                          }}
                                          className="p-1.5 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                                          title="Edit Task"
                                        >
                                          <SquarePen size={14} />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setDeleteTask(task);
                                            setShowDeleteTaskModal(true);
                                          }}
                                          className="p-1.5 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition"
                                          title="Delete Task"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </TableCell>
                                  </TableRow>

                                  {/* Progress Updates Section */}
                                  {isTaskExpanded && (
                                    <TableRow className="bg-gray-50/50">
                                      <TableCell colSpan={7} className="p-0">
                                        <div className="px-6 py-4 space-y-4">
                                          <div className="flex items-center justify-between">
                                            <h5 className="text-sm font-semibold text-gray-700">Progress Updates</h5>
                                            <button
                                              onClick={() => {
                                                setSelectedTaskForProgress(task);
                                                setShowAddProgressModal(true);
                                              }}
                                              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition"
                                              title="Add Progress Update"
                                            >
                                              <Plus size={14} />
                                              Add Update
                                            </button>
                                          </div>

                                          {progressUpdates.length > 0 ? (
                                            <div className="space-y-3">
                                              {progressUpdates.map(update => (
                                                <div
                                                  key={update.id}
                                                  className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm"
                                                >
                                                  {update.description && (
                                                    <p className="text-sm text-gray-700">{update.description}</p>
                                                  )}
                                                  
                                                  {getFilePreview(update, task) && (
                                                    <div className="rounded-lg overflow-hidden">
                                                      {getFilePreview(update, task)}
                                                    </div>
                                                  )}
                                                  
                                                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                                      {getFileIcon(update)}
                                                      {update.original_name && (
                                                        <span className="line-clamp-1">{update.original_name}</span>
                                                      )}
                                                      {update.file_size && (
                                                        <span>• {formatFileSize(update.file_size)}</span>
                                                      )}
                                                      <span>• By {update.createdBy?.name || 'Unknown'}</span>
                                                      <span>• {formatDate(update.created_at)}</span>
                                                    </div>
                                                    <div className="flex gap-1">
                                                      {update.file_path && getDownloadUrl(update, task) && (
                                                        <a href={getDownloadUrl(update, task)}>
                                                          <button
                                                            className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition"
                                                            title="Download File"
                                                          >
                                                            <Download size={14} />
                                                          </button>
                                                        </a>
                                                      )}
                                                      <button
                                                        onClick={() => {
                                                          setEditProgressUpdate({
                                                            ...update,
                                                            task: update.task || task
                                                          });
                                                          setShowEditProgressModal(true);
                                                        }}
                                                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-blue-600 transition"
                                                        title="Edit Update"
                                                      >
                                                        <SquarePen size={14} />
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          setDeleteProgressUpdate({
                                                            ...update,
                                                            task: update.task || task
                                                          });
                                                          setShowDeleteProgressModal(true);
                                                        }}
                                                        className="p-1.5 rounded hover:bg-gray-100 text-gray-600 hover:text-red-600 transition"
                                                        title="Delete Update"
                                                      >
                                                        <Trash2 size={14} />
                                                      </button>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                                              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                              <p className="text-sm font-medium text-gray-500 mb-2">No progress updates yet</p>
                                              <p className="text-xs text-gray-400 mb-4">Track your task progress with updates and file attachments</p>
                                              <button
                                                onClick={() => {
                                                  setSelectedTaskForProgress(task);
                                                  setShowAddProgressModal(true);
                                                }}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm"
                                              >
                                                <Plus size={16} />
                                                Add First Progress Update
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )}
                                </>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-medium text-gray-500 mb-2">No tasks in this milestone</p>
                        <button
                          onClick={() => {
                            setSelectedMilestoneForTask(milestone);
                            setShowAddTaskModal(true);
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition shadow-sm mt-2"
                        >
                          <Plus size={16} />
                          Add First Task
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl border-2 border-dashed border-gray-300 shadow-sm">
          <Target className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-500 mb-2">No milestones found</p>
          {search && <p className="text-sm text-gray-400 mb-4">Try adjusting your search or filters</p>}
          <Button
            className="bg-zinc-700 hover:bg-zinc-900 text-white shadow-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={18} className="mr-2" />
            Create First Milestone
          </Button>
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
          tasks={milestones.flatMap(m => (m.tasks || []).map(t => ({ ...t, milestone: m })))}
          preselectedTask={selectedTaskForProgress}
        />
      )}

      {showEditProgressModal && editProgressUpdate && (
        <EditProgressUpdate
          setShowEditModal={setShowEditProgressModal}
          progressUpdate={editProgressUpdate}
          project={project}
          tasks={milestones.flatMap(m => (m.tasks || []).map(t => ({ ...t, milestone: m })))}
        />
      )}

      {showDeleteProgressModal && deleteProgressUpdate && (
        <DeleteProgressUpdate
          setShowDeleteModal={setShowDeleteProgressModal}
          progressUpdate={deleteProgressUpdate}
          task={deleteProgressUpdate.task || milestones
            .flatMap(m => (m.tasks || []).map(t => ({ ...t, milestone: m })))
            .find(t => t.id === deleteProgressUpdate.project_task_id)}
        />
      )}
    </div>
  );
}
