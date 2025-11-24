import { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Download, SquarePen, Trash2, FileText, Image as ImageIcon, Calendar, User } from 'lucide-react';
import { usePermission } from '@/utils/permissions';
import AddProgressUpdate from '../ProgressUpdate/add';
import EditProgressUpdate from '../ProgressUpdate/edit';
import DeleteProgressUpdate from '../ProgressUpdate/delete';
import AddIssue from '../Issues/add';
import EditIssue from '../Issues/edit';
import DeleteIssue from '../Issues/delete';

const TaskDetailModal = ({ task, isOpen, onClose, project, milestones, users, allTasks, onRefresh }) => {
  const { has } = usePermission();
  const { props } = usePage();
  const [showAddProgressModal, setShowAddProgressModal] = useState(false);
  const [showEditProgressModal, setShowEditProgressModal] = useState(false);
  const [showDeleteProgressModal, setShowDeleteProgressModal] = useState(false);
  const [editProgressUpdate, setEditProgressUpdate] = useState(null);
  const [deleteProgressUpdate, setDeleteProgressUpdate] = useState(null);
  
  const [showAddIssueModal, setShowAddIssueModal] = useState(false);
  const [showEditIssueModal, setShowEditIssueModal] = useState(false);
  const [showDeleteIssueModal, setShowDeleteIssueModal] = useState(false);
  const [editIssue, setEditIssue] = useState(null);
  const [deleteIssue, setDeleteIssue] = useState(null);

  // Get fresh task data from milestoneData after reload
  const getFreshTask = () => {
    if (!task?.id) return task;
    const milestoneData = props.milestoneData;
    if (!milestoneData) return task;
    
    // Handle both paginated and non-paginated milestone data
    const milestones = Array.isArray(milestoneData.milestones) 
      ? milestoneData.milestones 
      : (milestoneData.milestones?.data || []);
    
    if (!Array.isArray(milestones) || milestones.length === 0) return task;
    
    // Find the task in the fresh milestone data
    for (const milestone of milestones) {
      if (milestone.tasks && Array.isArray(milestone.tasks)) {
        const freshTask = milestone.tasks.find(t => t.id === task.id);
        if (freshTask) {
          // Ensure the task has the milestone relationship
          return { ...freshTask, milestone: milestone };
        }
      }
    }
    return task;
  };

  const currentTask = getFreshTask();

  if (!currentTask) return null;

  // Get progress updates and issues for this task
  const rawProgressUpdates = currentTask.progressUpdates || currentTask.progress_updates || [];
  const progressUpdates = Array.isArray(rawProgressUpdates) 
    ? rawProgressUpdates 
    : (rawProgressUpdates.data || []);

  const rawTaskIssues = currentTask.issues || currentTask.task_issues || [];
  const taskIssues = Array.isArray(rawTaskIssues) ? rawTaskIssues : [];

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (update) => {
    if (!update.file_path) return null;
    const ext = update.file_path.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return <ImageIcon size={16} className="text-blue-600" />;
    }
    return <FileText size={16} className="text-gray-600" />;
  };

  const getDownloadUrl = (update) => {
    if (!update.file_path || !currentTask.milestone) return null;
    const milestoneId = currentTask.milestone.id || currentTask.milestone_id;
    if (!milestoneId || !currentTask.id || !update.id) return null;
    return route('project-management.progress-updates.download', [
      milestoneId,
      currentTask.id,
      update.id
    ]);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Progress' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getIssueStatusBadge = (status) => {
    const statusConfig = {
      open: { bg: 'bg-red-100', text: 'text-red-800', label: 'Open' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Progress' },
      resolved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Resolved' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Closed' },
    };
    const config = statusConfig[status] || statusConfig.open;
    return (
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Low' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Medium' },
      high: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'High' },
      critical: { bg: 'bg-red-100', text: 'text-red-800', label: 'Critical' },
    };
    const config = priorityConfig[priority] || priorityConfig.medium;
    return (
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[1200px] max-h-[90vh] overflow-y-auto p-5">
          <DialogHeader className="pb-3 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold">{currentTask.title}</DialogTitle>
            {currentTask.description && (
              <p className="text-sm text-gray-600 mt-1.5">{currentTask.description}</p>
            )}
          </DialogHeader>

          <div className="space-y-4 mt-3">
            {/* Task Info - Compact Horizontal Layout */}
            <div className="flex items-center gap-4 px-3 py-2 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-gray-500">Status:</span>
                {getStatusBadge(currentTask.status)}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-sm text-gray-700">{formatDate(currentTask.due_date)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User size={14} className="text-gray-400" />
                <span className="text-sm text-gray-700">
                  {currentTask.assignedUser?.name || currentTask.assigned_user?.name || 'Unassigned'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-xs font-medium text-gray-500">Milestone:</span>
                <span className="text-sm text-gray-700 truncate">
                  {currentTask.milestone?.name || 'N/A'}
                </span>
              </div>
            </div>

            {/* Progress Updates Section - Full Width Vertical */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">
                  Progress Updates
                  <span className="text-gray-500 font-normal ml-1.5">({progressUpdates.length})</span>
                </h3>
                {has('progress-updates.create') && (
                  <Button
                    onClick={() => setShowAddProgressModal(true)}
                    size="sm"
                    className="h-8 px-3 text-xs"
                  >
                    <Plus size={14} className="mr-1.5" />
                    Add Update
                  </Button>
                )}
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {progressUpdates.length > 0 ? (
                  progressUpdates.map((update, idx) => (
                    <div key={update.id} className="border border-gray-200 rounded-md p-3 bg-white hover:bg-gray-50 transition-colors group">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 mb-2 leading-relaxed">{update.description || 'No description'}</p>
                          <div className="flex items-center flex-wrap gap-2 text-xs text-gray-500">
                            {update.file_path && getDownloadUrl(update) ? (
                              <>
                                {getFileIcon(update)}
                                <a
                                  href={getDownloadUrl(update)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {update.original_name || 'Download File'}
                                </a>
                                {update.file_size && (
                                  <span className="text-gray-400">• {formatFileSize(update.file_size)}</span>
                                )}
                              </>
                            ) : null}
                            <span className="text-gray-400">{update.createdBy?.name || 'Unknown'}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-400">{formatDate(update.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {update.file_path && getDownloadUrl(update) && has('progress-updates.view') && (
                            <a
                              href={getDownloadUrl(update)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <Download size={14} />
                              </Button>
                            </a>
                          )}
                          {has('progress-updates.update') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditProgressUpdate({
                                  ...update,
                                  task: currentTask
                                });
                                setShowEditProgressModal(true);
                              }}
                            >
                              <SquarePen size={14} />
                            </Button>
                          )}
                          {has('progress-updates.delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              onClick={() => {
                                setDeleteProgressUpdate({
                                  ...update,
                                  task: currentTask
                                });
                                setShowDeleteProgressModal(true);
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-md border border-gray-200">
                    No progress updates yet
                  </div>
                )}
              </div>
            </div>

            {/* Issues Section - Full Width Vertical */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900">
                  Issues
                  <span className="text-gray-500 font-normal ml-1.5">({taskIssues.length})</span>
                </h3>
                {has('project-issues.create') && (
                  <Button
                    onClick={() => setShowAddIssueModal(true)}
                    size="sm"
                    className="h-8 px-3 text-xs"
                  >
                    <Plus size={14} className="mr-1.5" />
                    Add Issue
                  </Button>
                )}
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                {taskIssues.length > 0 ? (
                  taskIssues.map((issue) => (
                    <div key={issue.id} className="border border-gray-200 rounded-md p-3 bg-white hover:bg-gray-50 transition-colors group">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-sm font-medium text-gray-900 flex-1">{issue.title}</h4>
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {has('project-issues.update') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setEditIssue(issue);
                                setShowEditIssueModal(true);
                              }}
                            >
                              <SquarePen size={14} />
                            </Button>
                          )}
                          {has('project-issues.delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                              onClick={() => {
                                setDeleteIssue(issue);
                                setShowDeleteIssueModal(true);
                              }}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                      {issue.description && (
                        <p className="text-sm text-gray-600 mb-2 leading-relaxed">{issue.description}</p>
                      )}
                      <div className="flex items-center flex-wrap gap-2 mb-2">
                        {getIssueStatusBadge(issue.status)}
                        {getPriorityBadge(issue.priority)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {issue.assignedTo && (
                          <div className="flex items-center gap-1.5">
                            <User size={13} />
                            <span>{issue.assignedTo?.name || 'Unassigned'}</span>
                          </div>
                        )}
                        {issue.due_date && (
                          <div className="flex items-center gap-1.5">
                            <Calendar size={13} />
                            <span>{formatDate(issue.due_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-md border border-gray-200">
                    No issues yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Update Modals */}
      {showAddProgressModal && (
        <AddProgressUpdate
          setShowAddModal={(value) => {
            setShowAddProgressModal(value);
            if (!value && onRefresh) {
              // Refresh task data after closing modal
              setTimeout(() => {
                onRefresh();
              }, 100);
            }
          }}
          project={project}
          tasks={allTasks}
          preselectedTask={currentTask}
        />
      )}

      {showEditProgressModal && editProgressUpdate && (
        <EditProgressUpdate
          setShowEditModal={(value) => {
            setShowEditProgressModal(value);
            if (!value && onRefresh) {
              // Refresh task data after closing modal
              setTimeout(() => {
                onRefresh();
              }, 100);
            }
          }}
          progressUpdate={editProgressUpdate}
          project={project}
          tasks={allTasks}
        />
      )}

      {showDeleteProgressModal && deleteProgressUpdate && (
        <DeleteProgressUpdate
          setShowDeleteModal={(value) => {
            setShowDeleteProgressModal(value);
            if (!value && onRefresh) {
              // Refresh task data after closing modal
              setTimeout(() => {
                onRefresh();
              }, 100);
            }
          }}
          progressUpdate={deleteProgressUpdate}
          task={deleteProgressUpdate.task || currentTask}
        />
      )}

      {/* Issue Modals */}
      {showAddIssueModal && (
        <AddIssue
          setShowAddModal={(value) => {
            setShowAddIssueModal(value);
            if (!value && onRefresh) {
              // Refresh task data after closing modal
              setTimeout(() => {
                onRefresh();
              }, 100);
            }
          }}
          project={project}
          milestones={milestones}
          tasks={allTasks}
          users={users}
          preselectedTask={currentTask}
        />
      )}

      {showEditIssueModal && editIssue && (
        <EditIssue
          setShowEditModal={(value) => {
            setShowEditIssueModal(value);
            if (!value && onRefresh) {
              // Refresh task data after closing modal
              setTimeout(() => {
                onRefresh();
              }, 100);
            }
          }}
          issue={editIssue}
          project={project}
          milestones={milestones}
          tasks={allTasks}
          users={users}
        />
      )}

      {showDeleteIssueModal && deleteIssue && (
        <DeleteIssue
          setShowDeleteModal={(value) => {
            setShowDeleteIssueModal(value);
            if (!value && onRefresh) {
              // Refresh task data after closing modal
              setTimeout(() => {
                onRefresh();
              }, 100);
            }
          }}
          issue={deleteIssue}
        />
      )}
    </>
  );
};

export default TaskDetailModal;

