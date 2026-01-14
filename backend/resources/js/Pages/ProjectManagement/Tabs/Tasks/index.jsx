import { useState, useMemo } from 'react';
import { router } from '@inertiajs/react';
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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/Components/ui/select";
import { toast } from 'sonner';
import { Trash2, SquarePen } from 'lucide-react';
import AddTask from './add';
import EditTask from './edit';
import DeleteTask from './delete';

export default function TasksTab({ project, taskData }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
console.log('taskData:', taskData);
  // Flatten all tasks from all milestones safely
  const tasks = Object.values(taskData.tasks || {}).flatMap(t => t.data?.data || []);

  // Frontend filtering
  const filteredTasks = useMemo(() => {
    if (!search) return tasks;
    const query = search.toLowerCase();
    return tasks.filter(t => {
      const title = (t.title || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const status = (t.status || '').toLowerCase();
      return title.includes(query) || desc.includes(query) || status.includes(query);
    });
  }, [search, tasks]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedTasks = filteredTasks.slice(startIdx, endIdx);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const goToPage = (page) => {
    const pageNum = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNum);
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH') : '---';

  const getStatusLabel = (status) => {
    if (!status) return '---';
    const statusMap = {
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'completed': 'Completed',
    };
    return statusMap[status] || status;
  };

  const getStatusSelectClassName = (status) => {
    if (!status) return 'w-[140px] h-8 text-sm border-0 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded';
    
    const baseClass = 'w-[140px] h-8 text-sm border-0 rounded font-medium';
    const statusMap = {
      'pending': `${baseClass} bg-amber-100 text-amber-700 hover:bg-amber-200`,
      'in_progress': `${baseClass} bg-blue-100 text-blue-700 hover:bg-blue-200`,
      'completed': `${baseClass} bg-green-100 text-green-700 hover:bg-green-200`,
    };
    
    return statusMap[status] || `${baseClass} bg-gray-100 text-gray-700 hover:bg-gray-200`;
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

  const handleStatusChange = (task, newStatus) => {
    // Find the milestone ID for this task
    const milestoneId = task.project_milestone_id || 
      task.milestone?.id ||
      Object.values(taskData.tasks || {}).find(t => 
        t.data?.data?.some(d => d.id === task.id)
      )?.milestone?.id;

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

  return (
    <div className="w-full">
      {/* Search + Add */}
      <div className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={handleSearch}
          className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 w-full sm:max-w-md"
        />
        <Button
          className="bg-zinc-700 hover:bg-zinc-900 text-white"
          onClick={() => setShowAddModal(true)}
        >
          + Add Task
        </Button>
      </div>

      {/* Tasks Table */}
      <div className="overflow-x-auto rounded-lg">
        <Table className="min-w-[700px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Milestone</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTasks.length > 0 ? (
              paginatedTasks.map(task => (
                <TableRow key={task.id} className="hover:bg-gray-50 transition">
                  <TableCell>{task.title}</TableCell>
                  <TableCell>{task.description || '---'}</TableCell>
                  <TableCell>{task.milestone_name || task.milestone?.name || '---'}</TableCell>
                  <TableCell>{task.assigned_user?.name || '---'}</TableCell>
                  <TableCell>{formatDate(task.due_date)}</TableCell>
                  <TableCell>
                    <Select
                      value={task.status}
                      onValueChange={(value) => handleStatusChange(task, value)}
                    >
                      <SelectTrigger className={getStatusSelectClassName(task.status)}>
                        <SelectValue>
                          {getStatusLabel(task.status)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem 
                          value="completed"
                          disabled={getProgressUpdatesCount(task) === 0}
                        >
                          Completed
                          {getProgressUpdatesCount(task) === 0 && ' (Requires progress update)'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditTask(task); setShowEditModal(true); }}
                        className="p-2 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                        title="Edit"
                      >
                        <SquarePen size={18} />
                      </button>
                      <button
                        onClick={() => { setDeleteTask(task); setShowDeleteModal(true); }}
                        className="p-2 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                  No tasks found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {filteredTasks.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {startIdx + 1} to {Math.min(endIdx, filteredTasks.length)} of {filteredTasks.length} tasks
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 h-auto"
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    currentPage === page
                      ? 'bg-zinc-700 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 h-auto"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddTask
          setShowAddModal={setShowAddModal}
          project={project}
          milestones={Object.values(taskData.tasks || {}).map(t => t.milestone)}
          users={taskData.users || []}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editTask && (
        <EditTask
          setShowEditModal={setShowEditModal}
          task={editTask}
          project={project}
          milestones={Object.values(taskData.tasks || {}).map(t => t.milestone)}
          users={taskData.users || []}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && deleteTask && (
        <DeleteTask
          setShowDeleteModal={setShowDeleteModal}
          task={deleteTask}
          milestone={deleteTask.milestone || Object.values(taskData.tasks || {}).find(t => t.data?.data?.some(d => d.id === deleteTask.id))?.milestone}
        />
      )}
    </div>
  );
}
