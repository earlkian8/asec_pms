import { useState, useMemo } from 'react';
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
import { toast } from 'sonner';
import { Trash2, SquarePen, Image as ImageIcon, File } from 'lucide-react';
import AddProgressUpdate from './add';
import EditProgressUpdate from './edit';
import DeleteProgressUpdate from './delete';

export default function ProgressUpdateTab({ project, progressUpdateData }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editProgressUpdate, setEditProgressUpdate] = useState(null);
  const [deleteProgressUpdate, setDeleteProgressUpdate] = useState(null);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Flatten all progress updates from all tasks safely
  const progressUpdates = Object.values(progressUpdateData.progressUpdates || {}).flatMap(p => p.data?.data || []);

  // Frontend filtering
  const filteredProgressUpdates = useMemo(() => {
    if (!search) return progressUpdates;
    const query = search.toLowerCase();
    return progressUpdates.filter(p => {
      const desc = (p.description || '').toLowerCase();
      const taskTitle = (p.task?.title || '').toLowerCase();
      return desc.includes(query) || taskTitle.includes(query);
    });
  }, [search, progressUpdates]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProgressUpdates.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedProgressUpdates = filteredProgressUpdates.slice(startIdx, endIdx);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const goToPage = (page) => {
    const pageNum = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNum);
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH') : '---';

  const getFileUrl = (filePath) => {
    if (!filePath) return null;
    const disk = import.meta.env.VITE_FILESYSTEM_DISK || 'public';
    return `${import.meta.env.VITE_APP_URL || ''}/storage/${filePath}`;
  };

  const isImage = (mimeType) => {
    return mimeType && mimeType.startsWith('image/');
  };

  return (
    <div className="w-full">
      {/* Search + Add */}
      <div className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <Input
          placeholder="Search progress updates..."
          value={search}
          onChange={handleSearch}
          className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 w-full sm:max-w-md"
        />
        <Button
          className="bg-zinc-700 hover:bg-zinc-900 text-white"
          onClick={() => setShowAddModal(true)}
        >
          + Add Progress Update
        </Button>
      </div>

      {/* Progress Updates Table */}
      <div className="overflow-x-auto rounded-lg">
        <Table className="min-w-[800px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Milestone</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>File/Image</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProgressUpdates.length > 0 ? (
              paginatedProgressUpdates.map(update => (
                <TableRow key={update.id} className="hover:bg-gray-50 transition">
                  <TableCell>{update.task?.title || '---'}</TableCell>
                  <TableCell>{update.task?.milestone?.name || '---'}</TableCell>
                  <TableCell className="max-w-xs truncate">{update.description || '---'}</TableCell>
                  <TableCell>
                    {update.file_path ? (
                      <div className="flex items-center gap-2">
                        {isImage(update.file_type) ? (
                          <a
                            href={getFileUrl(update.file_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <ImageIcon size={16} />
                            <span className="text-xs">View Image</span>
                          </a>
                        ) : (
                          <a
                            href={getFileUrl(update.file_path)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                          >
                            <File size={16} />
                            <span className="text-xs">{update.original_name || 'File'}</span>
                          </a>
                        )}
                      </div>
                    ) : (
                      '---'
                    )}
                  </TableCell>
                  <TableCell>{update.created_by?.name || '---'}</TableCell>
                  <TableCell>{formatDate(update.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setEditProgressUpdate(update); setShowEditModal(true); }}
                        className="p-2 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                        title="Edit"
                      >
                        <SquarePen size={18} />
                      </button>
                      <button
                        onClick={() => { setDeleteProgressUpdate(update); setShowDeleteModal(true); }}
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
                  No progress updates found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {filteredProgressUpdates.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {startIdx + 1} to {Math.min(endIdx, filteredProgressUpdates.length)} of {filteredProgressUpdates.length} progress updates
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
        <AddProgressUpdate
          setShowAddModal={setShowAddModal}
          project={project}
          tasks={progressUpdateData.tasks || []}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editProgressUpdate && (
        <EditProgressUpdate
          setShowEditModal={setShowEditModal}
          progressUpdate={editProgressUpdate}
          project={project}
          tasks={progressUpdateData.tasks || []}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && deleteProgressUpdate && (
        <DeleteProgressUpdate
          setShowDeleteModal={setShowDeleteModal}
          progressUpdate={deleteProgressUpdate}
          task={deleteProgressUpdate.task || Object.values(progressUpdateData.progressUpdates || {}).find(p => p.data?.data?.some(d => d.id === deleteProgressUpdate.id))?.task}
        />
      )}
    </div>
  );
}

