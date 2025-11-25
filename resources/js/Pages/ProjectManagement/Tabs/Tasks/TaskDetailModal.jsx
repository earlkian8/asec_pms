import { useState, useEffect, useRef } from 'react';
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

// PDF.js for PDF preview
import * as pdfjsLib from "pdfjs-dist";

// Use CDN for worker to avoid cross-origin issues in development and production
// This is the most reliable approach for Laravel + Vite setups
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;

// DOCX preview
import { renderAsync } from "docx-preview";

// PDF Thumbnail Component
const PdfThumbnail = ({ url }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const renderPdf = async () => {
      try {
        // Get CSRF token if available
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        const loadingTask = pdfjsLib.getDocument({
          url: url,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
          httpHeaders: csrfToken ? {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrfToken,
          } : undefined,
        });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 1 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const scale = Math.min(
          280 / viewport.width,
          200 / viewport.height
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
    if (url) {
      renderPdf();
    }
  }, [url]);

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
        <FileText className="w-12 h-12 text-red-400 mb-2" />
        <span className="text-xs text-gray-500">PDF Preview Unavailable</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      {loading ? (
        <FileText className="w-12 h-12 text-gray-400 animate-pulse" />
      ) : (
        <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
      )}
    </div>
  );
};

// DOCX Preview Component
const DocxPreview = ({ fileUrl }) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const renderDocx = async () => {
      try {
        if (!containerRef.current) return;
        
        // Clear previous content
        containerRef.current.innerHTML = '';
        
        // Get CSRF token if available for authenticated requests
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        
        const response = await fetch(fileUrl, {
          method: 'GET',
          credentials: 'same-origin',
          headers: csrfToken ? {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrfToken,
          } : {},
        });
        
        if (!response.ok) throw new Error('Failed to fetch DOCX file');
        
        const arrayBuffer = await response.arrayBuffer();
        
        await renderAsync(arrayBuffer, containerRef.current, undefined, {
          className: 'docx-wrapper',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          experimental: false,
          trimXmlDeclaration: true,
          useBase64URL: false,
          useMathMLPolyfill: true,
          showChanges: false,
          showComments: false,
          showInserted: true,
          showDeleted: false,
        });
        
        setLoading(false);
      } catch (error) {
        console.error("DOCX render error:", error);
        setError(true);
        setLoading(false);
      }
    };

    if (fileUrl) {
      renderDocx();
    }
  }, [fileUrl]);

  if (error) {
    return (
      <div className="w-full h-[200px] flex flex-col items-center justify-center bg-gray-50 rounded-lg">
        <FileText className="w-12 h-12 text-red-400 mb-2" />
        <span className="text-xs text-gray-500">DOCX Preview Unavailable</span>
      </div>
    );
  }

  return (
    <div className="w-full h-[200px] overflow-auto bg-white rounded-lg border border-gray-200 p-4">
      {loading && (
        <div className="flex items-center justify-center h-full">
          <FileText className="w-12 h-12 text-gray-400 animate-pulse" />
        </div>
      )}
      <div 
        ref={containerRef} 
        className="docx-wrapper prose prose-sm max-w-none"
        style={{ 
          minHeight: loading ? '200px' : 'auto',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      />
    </div>
  );
};

// Text File Preview Component
const TextFilePreview = ({ fileUrl, fileExtension }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(fileUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.text();
      })
      .then(text => {
        // Limit preview to first 2000 characters
        setContent(text.substring(0, 2000));
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center bg-gray-50 rounded-lg">
        <FileText className="w-12 h-12 text-gray-400 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="flex flex-col items-center">
          <FileText className="w-12 h-12 text-red-400 mb-2" />
          <span className="text-xs text-gray-500">Preview Unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[200px] overflow-auto bg-gray-900 rounded-lg p-3">
      <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap break-words">
        {content}
        {content.length >= 2000 && <span className="text-gray-500">...</span>}
      </pre>
    </div>
  );
};

// CSV Preview Component
const CsvPreview = ({ fileUrl }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(fileUrl)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.text();
      })
      .then(text => {
        // Simple CSV parsing - split by lines and commas
        const lines = text.split('\n').filter(line => line.trim()).slice(0, 6);
        const parsed = lines.map(line => {
          // Handle quoted values
          const result = [];
          let current = '';
          let inQuotes = false;
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        });
        
        setData(parsed);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [fileUrl]);

  if (loading) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center bg-gray-50 rounded-lg">
        <FileText className="w-12 h-12 text-gray-400 animate-pulse" />
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="w-full h-[200px] flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="flex flex-col items-center">
          <FileText className="w-12 h-12 text-red-400 mb-2" />
          <span className="text-xs text-gray-500">CSV Preview Unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[200px] overflow-auto bg-white rounded-lg border border-gray-200">
      <table className="min-w-full text-xs">
        {data.length > 0 && (
          <>
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                {data[0].map((header, i) => (
                  <th key={i} className="px-2 py-1 text-left font-medium text-gray-700 border-r border-gray-200 last:border-r-0">
                    {header || `Column ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(1).map((row, i) => (
                <tr key={i} className="border-t hover:bg-gray-50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-2 py-1 border-r border-gray-200 last:border-r-0 text-gray-600">
                      {cell || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </>
        )}
      </table>
    </div>
  );
};

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

  const isImage = (fileType) => {
    if (!fileType) return false;
    return fileType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].some(ext => 
      fileType.toLowerCase().includes(ext)
    );
  };

  const isPdf = (fileType, fileName) => {
    if (fileType?.includes('pdf')) return true;
    if (fileName?.toLowerCase().endsWith('.pdf')) return true;
    return false;
  };

  const getFilePreview = (update) => {
    if (!update.file_path || !getDownloadUrl(update)) {
      return (
        <div className="w-full h-[200px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
          <div className="flex flex-col items-center">
            <FileText className="w-12 h-12 text-gray-400 mb-2" />
            <span className="text-xs text-gray-500">No File</span>
          </div>
        </div>
      );
    }

    const fileUrl = getDownloadUrl(update);
    const fileType = update.file_type || '';
    const fileName = update.original_name || update.file_path || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

    // Image preview
    if (isImage(fileType) || isImage(fileName)) {
      return (
        <div className="w-full h-[200px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden">
          <img
            src={fileUrl}
            alt={update.original_name || 'Preview'}
            className="w-full h-full object-contain"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              const parent = e.target.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="flex flex-col items-center justify-center h-full"><svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="text-xs text-gray-500 mt-2">Image Preview Unavailable</span></div>';
              }
            }}
          />
        </div>
      );
    }

    // PDF preview
    if (isPdf(fileType, fileName)) {
      return (
        <div className="w-full h-[200px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden">
          <PdfThumbnail url={fileUrl} />
        </div>
      );
    }

    // Video preview
    if (fileType?.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'mkv', 'm4v'].includes(fileExtension)) {
      return (
        <div className="w-full h-[200px] flex items-center justify-center bg-black rounded-lg overflow-hidden">
          <video
            src={fileUrl}
            controls
            className="w-full h-full object-contain"
            preload="metadata"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      );
    }

    // Audio preview
    if (fileType?.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(fileExtension)) {
      return (
        <div className="w-full h-[200px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
          <div className="w-full max-w-md px-4">
            <div className="flex flex-col items-center mb-3">
              <FileText className="w-12 h-12 text-purple-600 mb-2" />
              <span className="text-xs text-gray-600 font-medium truncate w-full text-center">{fileName}</span>
            </div>
            <audio
              src={fileUrl}
              controls
              className="w-full"
            >
              Your browser does not support the audio tag.
            </audio>
          </div>
        </div>
      );
    }

    // DOCX files - Use docx-preview library
    if (fileExtension === 'docx' || fileExtension === 'doc') {
      return (
        <DocxPreview fileUrl={fileUrl} />
      );
    }

    // Excel and PowerPoint - Use Office Online Viewer (fallback for non-DOCX Office files)
    if (['xls', 'xlsx', 'ppt', 'pptx'].includes(fileExtension)) {
      // Note: Office Online Viewer requires publicly accessible URLs
      // If your files are behind authentication, you may need a proxy endpoint
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
      return (
        <div className="w-full h-[200px] rounded-lg overflow-hidden border border-gray-200 bg-white">
          <iframe
            src={officeViewerUrl}
            className="w-full h-full border-0"
            frameBorder="0"
            allowFullScreen
            title={`Preview of ${fileName}`}
            onError={() => {
              // Fallback if iframe fails
              console.error('Office viewer failed to load');
            }}
          />
        </div>
      );
    }

    // CSV files
    if (fileExtension === 'csv') {
      return (
        <CsvPreview fileUrl={fileUrl} />
      );
    }

    // Text files and code files
    if (fileType?.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs', 'sh', 'yaml', 'yml', 'sql', 'log'].includes(fileExtension)) {
      return (
        <TextFilePreview fileUrl={fileUrl} fileExtension={fileExtension} />
      );
    }

    // Default fallback with appropriate icons
    const getFileIcon = () => {
      if (fileType?.includes('word') || fileType?.includes('msword')) {
        return <FileText className="w-16 h-16 text-blue-600 mb-2" />;
      }
      if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) {
        return <FileText className="w-16 h-16 text-green-600 mb-2" />;
      }
      if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) {
        return <FileText className="w-16 h-16 text-orange-600 mb-2" />;
      }
      if (fileType?.startsWith('video/')) {
        return <FileText className="w-16 h-16 text-purple-600 mb-2" />;
      }
      if (fileType?.startsWith('audio/')) {
        return <FileText className="w-16 h-16 text-pink-600 mb-2" />;
      }
      // Archive files
      if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(fileExtension)) {
        return <FileText className="w-16 h-16 text-yellow-600 mb-2" />;
      }
      return <FileText className="w-16 h-16 text-gray-500 mb-2" />;
    };

    const getFileTypeLabel = () => {
      if (fileType?.includes('word') || fileType?.includes('msword')) return 'Word Document';
      if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) return 'Excel Spreadsheet';
      if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) return 'PowerPoint Presentation';
      if (fileType?.startsWith('video/')) return 'Video File';
      if (fileType?.startsWith('audio/')) return 'Audio File';
      if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExtension)) return 'Archive File';
      return fileType || 'File';
    };

    return (
      <div className="w-full h-[200px] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg">
        <div className="flex flex-col items-center">
          {getFileIcon()}
          <span className="text-xs text-gray-600 font-medium">
            {getFileTypeLabel()}
          </span>
        </div>
      </div>
    );
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

            {/* Progress Updates Section - Grid Layout */}
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

              <div className="max-h-[600px] overflow-y-auto pr-1">
                {progressUpdates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {progressUpdates.map((update) => (
                      <div 
                        key={update.id} 
                        className="border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors group overflow-hidden flex flex-col"
                      >
                        {/* File Preview */}
                        {getFilePreview(update)}
                        
                        {/* Content */}
                        <div className="p-3 flex-1 flex flex-col">
                          <p className="text-sm text-gray-800 mb-2 leading-relaxed line-clamp-3 flex-1">
                            {update.description || 'No description'}
                          </p>
                          
                          {/* File Info */}
                          {update.file_path && getDownloadUrl(update) && (
                            <div className="mb-2">
                              <a
                                href={getDownloadUrl(update)}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {getFileIcon(update)}
                                <span className="truncate">{update.original_name || 'Download File'}</span>
                                {update.file_size && (
                                  <span className="text-gray-400 ml-1">({formatFileSize(update.file_size)})</span>
                                )}
                              </a>
                            </div>
                          )}
                          
                          {/* Metadata */}
                          <div className="flex items-center flex-wrap gap-1.5 text-xs text-gray-500 mt-auto pt-2 border-t border-gray-100">
                            <span>{update.createdBy?.name || 'Unknown'}</span>
                            <span>•</span>
                            <span>{formatDate(update.created_at)}</span>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-1 p-2 bg-gray-50 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
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
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-gray-500 bg-gray-50 rounded-md border border-gray-200">
                    No progress updates yet
                  </div>
                )}
              </div>
            </div>

            {/* Issues Section - Grid Layout */}
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

              <div className="max-h-[600px] overflow-y-auto pr-1">
                {taskIssues.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {taskIssues.map((issue) => (
                      <div 
                        key={issue.id} 
                        className="border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors group overflow-hidden flex flex-col"
                      >
                        {/* Issue Header */}
                        <div className="p-3 flex-1 flex flex-col">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h4 className="text-sm font-medium text-gray-900 flex-1 line-clamp-2">{issue.title}</h4>
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
                            <p className="text-sm text-gray-600 mb-3 leading-relaxed line-clamp-3 flex-1">
                              {issue.description}
                            </p>
                          )}
                          
                          {/* Badges */}
                          <div className="flex items-center flex-wrap gap-2 mb-3">
                            {getIssueStatusBadge(issue.status)}
                            {getPriorityBadge(issue.priority)}
                          </div>
                          
                          {/* Metadata */}
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-auto pt-2 border-t border-gray-100">
                            {issue.assignedTo && (
                              <div className="flex items-center gap-1">
                                <User size={12} />
                                <span className="truncate">{issue.assignedTo?.name || 'Unassigned'}</span>
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
                      </div>
                    ))}
                  </div>
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

