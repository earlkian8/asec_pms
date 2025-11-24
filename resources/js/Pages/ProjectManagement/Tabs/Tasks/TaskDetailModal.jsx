import { useState } from 'react';
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

  if (!task) return null;

  // Get progress updates and issues for this task
  const rawProgressUpdates = task.progressUpdates || task.progress_updates || [];
  const progressUpdates = Array.isArray(rawProgressUpdates) 
    ? rawProgressUpdates 
    : (rawProgressUpdates.data || []);

  const rawTaskIssues = task.issues || task.task_issues || [];
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
    if (!update.file_path || !task.milestone) return null;
    const milestoneId = task.milestone.id || task.milestone_id;
    return route('project-management.progress-updates.download', {
      milestone: milestoneId,
      task: task.id,
      update: update.id
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Progress' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
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
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
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
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[1200px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">{task.title}</DialogTitle>
            {task.description && (
              <p className="text-sm text-gray-600 mt-2">{task.description}</p>
            )}
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Task Info */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <div className="mt-1">{getStatusBadge(task.status)}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Due Date:</span>
                <div className="mt-1 text-sm text-gray-600">{formatDate(task.due_date)}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Assigned To:</span>
                <div className="mt-1 text-sm text-gray-600">
                  {task.assignedUser?.name || task.assigned_user?.name || 'Unassigned'}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Milestone:</span>
                <div className="mt-1 text-sm text-gray-600">
                  {task.milestone?.name || 'N/A'}
                </div>
              </div>
            </div>

            {/* Progress Updates Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Progress Updates ({progressUpdates.length})</h3>
                {has('progress-updates.create') && (
                  <Button
                    onClick={() => setShowAddProgressModal(true)}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Progress Update
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                {progressUpdates.length > 0 ? (
                  progressUpdates.map((update) => (
                    <div key={update.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 mb-2">{update.description || 'No description'}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {update.file_path && getDownloadUrl(update) ? (
                              <>
                                {getFileIcon(update)}
                                <a
                                  href={getDownloadUrl(update)}
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
                          {update.file_path && getDownloadUrl(update) && has('progress-updates.view') && (
                            <a
                              href={getDownloadUrl(update)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Download size={14} />
                              </Button>
                            </a>
                          )}
                          {has('progress-updates.update') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => {
                                setEditProgressUpdate({
                                  ...update,
                                  task: task
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
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              onClick={() => {
                                setDeleteProgressUpdate({
                                  ...update,
                                  task: task
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
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                    No progress updates yet
                  </div>
                )}
              </div>
            </div>

            {/* Issues Section - Grid View */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Issues ({taskIssues.length})</h3>
                {has('project-issues.create') && (
                  <Button
                    onClick={() => setShowAddIssueModal(true)}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Issue
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {taskIssues.length > 0 ? (
                  taskIssues.map((issue) => (
                    <div key={issue.id} className="border rounded-lg p-4 bg-white hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-gray-900 line-clamp-2">{issue.title}</h4>
                        <div className="flex gap-1">
                          {has('project-issues.update') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setEditIssue(issue);
                                setShowEditIssueModal(true);
                              }}
                            >
                              <SquarePen size={12} />
                            </Button>
                          )}
                          {has('project-issues.delete') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                              onClick={() => {
                                setDeleteIssue(issue);
                                setShowDeleteIssueModal(true);
                              }}
                            >
                              <Trash2 size={12} />
                            </Button>
                          )}
                        </div>
                      </div>
                      {issue.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{issue.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {getIssueStatusBadge(issue.status)}
                        {getPriorityBadge(issue.priority)}
                      </div>
                      <div className="text-xs text-gray-500 space-y-1">
                        {issue.assignedTo && (
                          <div className="flex items-center gap-1">
                            <User size={12} />
                            <span>{issue.assignedTo?.name || 'Unassigned'}</span>
                          </div>
                        )}
                        {issue.due_date && (
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>{formatDate(issue.due_date)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
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
          setShowAddModal={setShowAddProgressModal}
          project={project}
          tasks={allTasks}
          preselectedTask={task}
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
          task={deleteProgressUpdate.task || task}
        />
      )}

      {/* Issue Modals */}
      {showAddIssueModal && (
        <AddIssue
          setShowAddModal={setShowAddIssueModal}
          project={project}
          milestones={milestones}
          tasks={allTasks}
          users={users}
          preselectedTask={task}
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
        />
      )}
    </>
  );
};

export default TaskDetailModal;

