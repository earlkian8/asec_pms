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
import { LayoutGrid, List, Trash2, SquarePen, Image as ImageIcon, File, Download, FileText } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Flatten all progress updates from all tasks safely
  const progressUpdates = Object.values(progressUpdateData.progressUpdates || {}).flatMap(p => p.data?.data || []);

  // Frontend filtering
  const filteredProgressUpdates = useMemo(() => {
    if (!search) return progressUpdates;
    const query = search.toLowerCase();
    return progressUpdates.filter(p => {
      const desc = (p.description || '').toLowerCase();
      const taskTitle = (p.task?.title || '').toLowerCase();
      const milestoneName = (p.task?.milestone?.name || '').toLowerCase();
      return desc.includes(query) || taskTitle.includes(query) || milestoneName.includes(query);
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

  const formatFileSize = (bytes) => {
    if (!bytes) return '---';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isImage = (mimeType) => {
    return mimeType && mimeType.startsWith('image/');
  };

  const getFilePreview = (update) => {
    const previewBox = "w-full h-48 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden";
    
    if (!update.file_path) {
      return (
        <div className={previewBox}>
          <div className="flex flex-col items-center justify-center h-full">
            <FileText className="w-16 h-16 text-gray-400 mb-2" />
            <span className="text-xs text-gray-500">No File</span>
          </div>
        </div>
      );
    }

    if (isImage(update.file_type)) {
      return (
        <div className={previewBox}>
          <img
            src={route('project-management.progress-updates.download', [
              update.task?.milestone?.id,
              update.task?.id,
              update.id
            ])}
            alt={update.original_name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = '<div class="flex flex-col items-center justify-center h-full"><svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="text-xs text-gray-500 mt-2">Image</span></div>';
            }}
          />
        </div>
      );
    }

    // PDF
    if (update.file_type?.includes('pdf') || update.original_name?.toLowerCase().endsWith('.pdf')) {
      return (
        <div className={previewBox}>
          <div className="flex flex-col items-center justify-center h-full">
            <FileText className="w-16 h-16 text-red-600 mb-2" />
            <span className="text-xs text-gray-600 font-medium">PDF Document</span>
          </div>
        </div>
      );
    }

    // Word documents
    if (update.file_type?.includes('word') || update.file_type?.includes('msword') || 
        update.original_name?.match(/\.(doc|docx)$/i)) {
      return (
        <div className={previewBox}>
          <div className="flex flex-col items-center justify-center h-full">
            <FileText className="w-16 h-16 text-blue-600 mb-2" />
            <span className="text-xs text-gray-600 font-medium">Word Document</span>
          </div>
        </div>
      );
    }

    // Default generic file
    return (
      <div className={previewBox}>
        <div className="flex flex-col items-center justify-center h-full">
          <File className="w-16 h-16 text-gray-500 mb-2" />
          <span className="text-xs text-gray-500 font-medium">
            {update.file_type || 'File'}
          </span>
        </div>
      </div>
    );
  };

  const getFileIcon = (update) => {
    if (!update.file_path) return <FileText className="w-4 h-4 text-gray-400" />;
    if (isImage(update.file_type)) return <ImageIcon className="w-4 h-4 text-blue-500" />;
    if (update.file_type?.includes('pdf') || update.original_name?.toLowerCase().endsWith('.pdf')) {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    if (update.file_type?.includes('word') || update.file_type?.includes('msword') || 
        update.original_name?.match(/\.(doc|docx)$/i)) {
      return <FileText className="w-4 h-4 text-blue-600" />;
    }
    return <File className="w-4 h-4 text-gray-500" />;
  };

  const getDownloadUrl = (update) => {
    if (!update.file_path || !update.task?.milestone?.id || !update.task?.id) return null;
    return route('project-management.progress-updates.download', [
      update.task.milestone.id,
      update.task.id,
      update.id
    ]);
  };

  return (
    <div className="w-full space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by task, milestone, or description..."
            value={search}
            onChange={handleSearch}
            className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 transition ${
                viewMode === 'grid' 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 transition ${
                viewMode === 'table' 
                  ? 'bg-gray-800 text-white' 
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <List size={18} />
            </button>
          </div>

          <Button
            className="bg-zinc-700 hover:bg-zinc-900 text-white"
            onClick={() => setShowAddModal(true)}
          >
            + Add Progress Update
          </Button>
        </div>
      </div>

      {/* Count */}
      {filteredProgressUpdates.length > 0 && (
        <div className="text-sm text-gray-600">
          Showing {filteredProgressUpdates.length} {filteredProgressUpdates.length === 1 ? 'progress update' : 'progress updates'}
          {search && <span className="font-medium"> matching "{search}"</span>}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedProgressUpdates.length > 0 ? paginatedProgressUpdates.map(update => (
            <div 
              key={update.id} 
              className="group relative border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg bg-white hover:border-gray-400"
            >
              {/* Preview */}
              <div className="aspect-video w-full">
                {getFilePreview(update)}
              </div>

              {/* Info */}
              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    {getFileIcon(update)}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                        {update.task?.title || 'No Task'}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {update.task?.milestone?.name || 'No Milestone'}
                      </p>
                    </div>
                  </div>
                  {update.description && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {update.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    {update.file_path && (
                      <span>{formatFileSize(update.file_size)}</span>
                    )}
                    <span>•</span>
                    <span>{formatDate(update.created_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  {update.file_path && getDownloadUrl(update) ? (
                    <a 
                      href={getDownloadUrl(update)}
                      className="flex-1"
                    >
                      <Button size="sm" className="w-full">
                        <Download size={14} className="mr-1" /> Download
                      </Button>
                    </a>
                  ) : (
                    <div className="flex-1" />
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setEditProgressUpdate(update); setShowEditModal(true); }}
                  >
                    <SquarePen size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setDeleteProgressUpdate(update); setShowDeleteModal(true); }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              <File className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No progress updates found</p>
              {search && <p className="text-sm mt-1">Try adjusting your search</p>}
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <Table className="min-w-[1000px] w-full">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Task</TableHead>
                <TableHead>Milestone</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProgressUpdates.length > 0 ? paginatedProgressUpdates.map(update => (
                <TableRow 
                  key={update.id} 
                  className="hover:bg-gray-50 transition"
                >
                  <TableCell className="font-medium">{update.task?.title || '---'}</TableCell>
                  <TableCell>{update.task?.milestone?.name || '---'}</TableCell>
                  <TableCell className="max-w-xs truncate">{update.description || '---'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getFileIcon(update)}
                      <span className="text-sm text-gray-600">
                        {update.original_name || 'No file'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {formatFileSize(update.file_size)}
                  </TableCell>
                  <TableCell>{update.created_by?.name || '---'}</TableCell>
                  <TableCell className="text-gray-600">
                    {formatDate(update.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {update.file_path && getDownloadUrl(update) && (
                        <a href={getDownloadUrl(update)}>
                          <Button size="sm" variant="outline">
                            <Download size={14} />
                          </Button>
                        </a>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditProgressUpdate(update); setShowEditModal(true); }}
                      >
                        <SquarePen size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setDeleteProgressUpdate(update); setShowDeleteModal(true); }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-gray-500">
                    <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No progress updates found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

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

      {/* Modals */}
      {showAddModal && (
        <AddProgressUpdate
          setShowAddModal={setShowAddModal}
          project={project}
          tasks={progressUpdateData.tasks || []}
        />
      )}

      {showEditModal && editProgressUpdate && (
        <EditProgressUpdate
          setShowEditModal={setShowEditModal}
          progressUpdate={editProgressUpdate}
          project={project}
          tasks={progressUpdateData.tasks || []}
        />
      )}

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
