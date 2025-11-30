import { useState, useEffect, useMemo, useRef } from 'react';
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
import { toast } from 'sonner';
import { LayoutGrid, List, File, Upload, Download, Trash2, Check, FileText, ImageIcon } from 'lucide-react';
import AddFileModal from './add';
import DeleteFile from './delete';

// ---- PDF.js ----
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url"; 
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const PdfThumbnail = ({ url }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const renderPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: url,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        // Calculate scale to fit preview area
        const viewport = page.getViewport({ scale: 1 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const scale = Math.min(
          200 / viewport.width,
          192 / viewport.height
        );
        
        const scaledViewport = page.getViewport({ scale });
        const context = canvas.getContext("2d");
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;
        
        await page.render({ 
          canvasContext: context, 
          viewport: scaledViewport 
        }).promise;
        
        setLoading(false);
      } catch (error) {
        console.error("PDF render error:", error);
        setError(true);
        setLoading(false);
      }
    };
    renderPdf();
  }, [url]);

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center">
        <FileText className="w-12 h-12 text-red-400 mb-2" />
        <span className="text-xs text-gray-500">PDF Preview Unavailable</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      {loading ? (
        <FileText className="w-12 h-12 text-gray-400 animate-pulse" />
      ) : (
        <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
      )}
    </div>
  );
};

export default function FilesTab({ project, fileData }) {
  const files = fileData.files.data || [];
  const [search, setSearch] = useState(fileData.search || '');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteFile, setDeleteFile] = useState(null);

  // Frontend filtering
  const filteredFiles = useMemo(() => {
    if (!search) return files;
    return files.filter(file => {
      const query = search.toLowerCase();
      return (
        (file.file_name || '').toLowerCase().includes(query) ||
        (file.original_name || '').toLowerCase().includes(query) ||
        (file.category || '').toLowerCase().includes(query) ||
        (file.description || '').toLowerCase().includes(query)
      );
    });
  }, [search, files]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredFiles.length) setSelectedIds([]);
    else setSelectedIds(filteredFiles.map(f => f.id));
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    router.post(
      route('project-management.project-files.bulk-delete', project.id),
      { ids: selectedIds },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success("Selected files deleted successfully.");
          setSelectedIds([]);
        },
        onError: () => toast.error("Failed to delete files.")
      }
    );
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    router.get(route('project-management.project-files.manage', project.id),
      { search: e.target.value },
      { preserveState: true, replace: true }
    );
  };

  const getFilePreview = (file) => {
    const previewBox = "w-full h-48 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden";
    
    if (file.mime_type?.startsWith("image/")) {
      return (
        <div className={previewBox}>
          <img
            src={route('project-management.project-files.download', [file.project_id, file.id])}
            alt={file.original_name}
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
    
    if (file.mime_type?.includes("pdf") || file.file_type?.toLowerCase() === 'pdf' || file.original_name?.toLowerCase().endsWith('.pdf')) {
      return (
        <div className={previewBox}>
          <PdfThumbnail url={route('project-management.project-files.download', [file.project_id, file.id])} />
        </div>
      );
    }
    
    // Word documents
    if (file.mime_type?.includes("word") || file.mime_type?.includes("msword") || 
        file.original_name?.match(/\.(doc|docx)$/i)) {
      return (
        <div className={previewBox}>
          <div className="flex flex-col items-center justify-center h-full">
            <FileText className="w-16 h-16 text-blue-600 mb-2" />
            <span className="text-xs text-gray-600 font-medium">Word Document</span>
          </div>
        </div>
      );
    }
    
    // Excel documents
    if (file.mime_type?.includes("excel") || file.mime_type?.includes("spreadsheet") || 
        file.original_name?.match(/\.(xls|xlsx|csv)$/i)) {
      return (
        <div className={previewBox}>
          <div className="flex flex-col items-center justify-center h-full">
            <File className="w-16 h-16 text-green-600 mb-2" />
            <span className="text-xs text-gray-600 font-medium">Spreadsheet</span>
          </div>
        </div>
      );
    }
    
    // PowerPoint
    if (file.mime_type?.includes("presentation") || file.mime_type?.includes("powerpoint") || 
        file.original_name?.match(/\.(ppt|pptx)$/i)) {
      return (
        <div className={previewBox}>
          <div className="flex flex-col items-center justify-center h-full">
            <File className="w-16 h-16 text-orange-600 mb-2" />
            <span className="text-xs text-gray-600 font-medium">Presentation</span>
          </div>
        </div>
      );
    }
    
    // Video files
    if (file.mime_type?.startsWith("video/") || file.original_name?.match(/\.(mp4|avi|mov|wmv|flv|mkv)$/i)) {
      return (
        <div className={previewBox}>
          <div className="flex flex-col items-center justify-center h-full">
            <File className="w-16 h-16 text-purple-600 mb-2" />
            <span className="text-xs text-gray-600 font-medium">Video</span>
          </div>
        </div>
      );
    }
    
    // Audio files
    if (file.mime_type?.startsWith("audio/") || file.original_name?.match(/\.(mp3|wav|ogg|flac|aac)$/i)) {
      return (
        <div className={previewBox}>
          <div className="flex flex-col items-center justify-center h-full">
            <File className="w-16 h-16 text-pink-600 mb-2" />
            <span className="text-xs text-gray-600 font-medium">Audio</span>
          </div>
        </div>
      );
    }
    
    // Archive files
    if (file.original_name?.match(/\.(zip|rar|7z|tar|gz)$/i)) {
      return (
        <div className={previewBox}>
          <div className="flex flex-col items-center justify-center h-full">
            <File className="w-16 h-16 text-yellow-600 mb-2" />
            <span className="text-xs text-gray-600 font-medium">Archive</span>
          </div>
        </div>
      );
    }
    
    // Text files
    if (file.mime_type?.startsWith("text/") || file.original_name?.match(/\.(txt|md|json|xml|html|css|js)$/i)) {
      return (
        <div className={previewBox}>
          <div className="flex flex-col items-center justify-center h-full">
            <FileText className="w-16 h-16 text-gray-600 mb-2" />
            <span className="text-xs text-gray-600 font-medium">Text File</span>
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
            {file.file_type || 'File'}
          </span>
        </div>
      </div>
    );
  };

  const getFileIcon = (file) => {
    if (file.mime_type?.startsWith("image/")) {
      return <ImageIcon className="w-4 h-4 text-blue-500" />;
    }
    if (file.mime_type?.includes("pdf") || file.original_name?.toLowerCase().endsWith('.pdf')) {
      return <FileText className="w-4 h-4 text-red-500" />;
    }
    if (file.mime_type?.includes("word") || file.mime_type?.includes("msword") || 
        file.original_name?.match(/\.(doc|docx)$/i)) {
      return <FileText className="w-4 h-4 text-blue-600" />;
    }
    if (file.mime_type?.includes("excel") || file.mime_type?.includes("spreadsheet") || 
        file.original_name?.match(/\.(xls|xlsx|csv)$/i)) {
      return <File className="w-4 h-4 text-green-600" />;
    }
    if (file.mime_type?.includes("presentation") || file.mime_type?.includes("powerpoint") || 
        file.original_name?.match(/\.(ppt|pptx)$/i)) {
      return <File className="w-4 h-4 text-orange-600" />;
    }
    if (file.mime_type?.startsWith("video/") || file.original_name?.match(/\.(mp4|avi|mov|wmv)$/i)) {
      return <File className="w-4 h-4 text-purple-600" />;
    }
    if (file.mime_type?.startsWith("audio/") || file.original_name?.match(/\.(mp3|wav|ogg)$/i)) {
      return <File className="w-4 h-4 text-pink-600" />;
    }
    return <File className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="w-full space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Search by filename, category, or description..."
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

          {/* Action Buttons */}
          {selectedIds.length > 0 && (
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" /> 
              Delete ({selectedIds.length})
            </Button>
          )}
          
          <Button
            className="bg-zinc-700 hover:bg-zinc-900 text-white"
            onClick={() => setShowAddModal(true)}
          >
            <Upload size={16} className="mr-2" /> 
            Upload Files
          </Button>
        </div>
      </div>

      {/* File Count */}
      {filteredFiles.length > 0 && (
        <div className="text-sm text-gray-600">
          Showing {filteredFiles.length} {filteredFiles.length === 1 ? 'file' : 'files'}
          {search && <span className="font-medium"> matching "{search}"</span>}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.length > 0 ? filteredFiles.map(file => {
            const isSelected = selectedIds.includes(file.id);
            return (
              <div 
                key={file.id} 
                className={`group relative border rounded-lg overflow-hidden transition-all duration-200 hover:shadow-lg ${
                  isSelected ? 'ring-2 ring-gray-800 bg-gray-50' : 'bg-white hover:border-gray-400'
                }`}
              >
                {/* Selection Checkbox */}
                <div 
                  onClick={() => toggleSelect(file.id)}
                  className="absolute top-3 left-3 z-10 cursor-pointer"
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition shadow-sm ${
                    isSelected 
                      ? 'border-gray-800 bg-gray-800' 
                      : 'border-white bg-white/80 backdrop-blur-sm hover:bg-white'
                  }`}>
                    {isSelected && <Check className="h-4 w-4 text-white" />}
                  </div>
                </div>

                {/* Preview */}
                <div className="aspect-video w-full">
                  {getFilePreview(file)}
                </div>

                {/* File Info */}
                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      {getFileIcon(file)}
                      <h3 className="text-sm font-medium text-gray-900 line-clamp-2 flex-1">
                        {file.original_name}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="capitalize px-2 py-0.5 bg-gray-100 rounded">
                        {file.category}
                      </span>
                      {file.file_size && (
                        <span>{(file.file_size/1024).toFixed(1)} KB</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <a 
                      href={route('project-management.project-files.download', [file.project_id, file.id])}
                      className="flex-1"
                    >
                      <Button size="sm" className="w-full">
                        <Download size={14} className="mr-1" /> Download
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setDeleteFile(file); setShowDeleteModal(true); }}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              <File className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No files found</p>
              {search && <p className="text-sm mt-1">Try adjusting your search</p>}
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <Table className="min-w-[800px] w-full">
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[50px]">
                  <div
                    onClick={toggleSelectAll}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition ${
                      selectedIds.length === filteredFiles.length && filteredFiles.length > 0
                        ? 'border-gray-800 bg-gray-800'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {selectedIds.length === filteredFiles.length && filteredFiles.length > 0 && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                </TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.length > 0 ? filteredFiles.map(file => {
                const isSelected = selectedIds.includes(file.id);
                return (
                  <TableRow 
                    key={file.id} 
                    className={`transition ${
                      isSelected ? "bg-gray-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <TableCell>
                      <div
                        onClick={() => toggleSelect(file.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition ${
                          isSelected ? 'border-gray-800 bg-gray-800' : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getFileIcon(file)}
                        <span className="font-medium">{file.original_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="capitalize px-2 py-1 bg-gray-100 rounded text-xs">
                        {file.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">{file.file_type || '---'}</TableCell>
                    <TableCell className="text-gray-600">
                      {file.file_size ? `${(file.file_size/1024).toFixed(1)} KB` : '---'}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {new Date(file.uploaded_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <a href={route('project-management.project-files.download', [file.project_id, file.id])}>
                          <Button size="sm" variant="outline">
                            <Download size={14} />
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setDeleteFile(file); setShowDeleteModal(true); }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                    <File className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No files found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddFileModal
          open={showAddModal}
          setOpen={setShowAddModal}
          projectId={project.id}
          onSuccess={() => router.reload({ preserveScroll: true })}
        />
      )}
      {showDeleteModal && (
        <DeleteFile
          setShowDeleteModal={setShowDeleteModal}
          file={deleteFile}
        />
      )}
    </div>
  );
}