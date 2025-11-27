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
  const [activeTab, setActiveTab] = useState('progress-updates');
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

  // Reset active tab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('progress-updates');
    }
  }, [isOpen]);

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
        <DialogContent className="w-[95vw] max-w-[1200px] max-h-[90vh] overflow-y-auto p-0">
          {/* Header with gradient background */}
          <DialogHeader className="px-6 py-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-t-lg">
            <DialogTitle className="text-xl font-bold text-white">{currentTask.title}</DialogTitle>
            {currentTask.description && (
              <p className="text-sm text-blue-100 mt-2 leading-relaxed">{currentTask.description}</p>
            )}
          </DialogHeader>

          <div className="p-6 space-y-6">
            {/* Task Info - Enhanced Card Layout */}
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due Date</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatDate(currentTask.due_date)}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <User size={18} className="text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned To</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
                      {currentTask.assignedUser?.name || currentTask.assigned_user?.name || 'Unassigned'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-xs font-bold text-purple-600">M</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Milestone</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5 truncate">
                      {currentTask.milestone?.name || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
                    <div className="mt-0.5">
                      {getStatusBadge(currentTask.status)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab('progress-updates')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'progress-updates'
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Progress Updates
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'progress-updates'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {progressUpdates.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('issues')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'issues'
                      ? 'border-orange-600 text-orange-600 font-semibold'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Issues
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === 'issues'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {taskIssues.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="mt-4">
              {/* Progress Updates Tab */}
              {activeTab === 'progress-updates' && (
                <div className="space-y-4">
                  <div className="max-h-[600px] overflow-y-auto pr-2">
                    {progressUpdates.length > 0 ? (
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-200 via-indigo-200 to-blue-200"></div>
                        
                        <div className="space-y-6">
                          {progressUpdates.map((update, index) => (
                            <div 
                              key={update.id} 
                              className="relative pl-12 group"
                            >
                              {/* Timeline dot */}
                              <div className="absolute left-0 top-1.5 w-8 h-8 flex items-center justify-center">
                                <div className="w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white border-2 border-blue-600 shadow-sm"></div>
                              </div>
                              
                              {/* Update Card */}
                              <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group-hover:border-blue-300">
                                {/* Header with user info */}
                                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                                        {(update.createdBy?.name || 'U').charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                          {update.createdBy?.name || 'Unknown User'}
                                        </p>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                          <Calendar size={12} />
                                          {formatDate(update.created_at)}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    {/* Action buttons */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      {update.file_path && getDownloadUrl(update) && has('progress-updates.view') && (
                                        <a
                                          href={getDownloadUrl(update)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors"
                                          title="Download file"
                                        >
                                          <Download size={16} />
                                        </a>
                                      )}
                                      {has('progress-updates.update') && (
                                        <button
                                          onClick={() => {
                                            setEditProgressUpdate({
                                              ...update,
                                              task: currentTask
                                            });
                                            setShowEditProgressModal(true);
                                          }}
                                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors"
                                          title="Edit update"
                                        >
                                          <SquarePen size={16} />
                                        </button>
                                      )}
                                      {has('progress-updates.delete') && (
                                        <button
                                          onClick={() => {
                                            setDeleteProgressUpdate({
                                              ...update,
                                              task: currentTask
                                            });
                                            setShowDeleteProgressModal(true);
                                          }}
                                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
                                          title="Delete update"
                                        >
                                          <Trash2 size={16} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Content */}
                                <div className="p-4 space-y-3">
                                  {/* Description */}
                                  {update.description && (
                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                      {update.description}
                                    </p>
                                  )}
                                  
                                  {/* File Preview */}
                                  {update.file_path && getDownloadUrl(update) && (
                                    <div className="space-y-2">
                                      <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                                        {getFilePreview(update)}
                                      </div>
                                      
                                      {/* File download link */}
                                      <a
                                        href={getDownloadUrl(update)}
                                        className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors text-sm font-medium group/link"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        {getFileIcon(update)}
                                        <span className="truncate max-w-[200px]">{update.original_name || 'Download File'}</span>
                                        {update.file_size && (
                                          <span className="text-blue-500 text-xs ml-1">({formatFileSize(update.file_size)})</span>
                                        )}
                                        <Download size={14} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                            <FileText className="w-8 h-8 text-gray-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">No progress updates yet</p>
                            <p className="text-xs text-gray-500 mt-1">Progress updates will appear here</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Issues Tab */}
              {activeTab === 'issues' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full"></div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Issues
                      </h3>
                    </div>
                    {has('project-issues.create') && (
                      <Button
                        onClick={() => setShowAddIssueModal(true)}
                        size="sm"
                        className="h-8 px-3 text-xs bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                      >
                        <Plus size={14} className="mr-1.5" />
                        Add Issue
                      </Button>
                    )}
                  </div>

                  <div className="max-h-[600px] overflow-y-auto pr-2">
                    {taskIssues.length > 0 ? (
                      <div className="space-y-3">
                        {taskIssues.map((issue) => (
                          <div 
                            key={issue.id} 
                            className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group hover:border-orange-300"
                          >
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-base font-semibold text-gray-900 mb-1.5">{issue.title}</h4>
                                  {issue.description && (
                                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                                      {issue.description}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Action buttons */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  {has('project-issues.update') && (
                                    <button
                                      onClick={() => {
                                        setEditIssue(issue);
                                        setShowEditIssueModal(true);
                                      }}
                                      className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition-colors"
                                      title="Edit issue"
                                    >
                                      <SquarePen size={16} />
                                    </button>
                                  )}
                                  {has('project-issues.delete') && (
                                    <button
                                      onClick={() => {
                                        setDeleteIssue(issue);
                                        setShowDeleteIssueModal(true);
                                      }}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-600 hover:text-red-600 transition-colors"
                                      title="Delete issue"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Badges and Metadata */}
                              <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-gray-100">
                                <div className="flex items-center flex-wrap gap-2">
                                  {getIssueStatusBadge(issue.status)}
                                  {getPriorityBadge(issue.priority)}
                                </div>
                                
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  {issue.assignedTo && (
                                    <div className="flex items-center gap-1.5">
                                      <User size={14} />
                                      <span className="truncate max-w-[120px]">{issue.assignedTo?.name || 'Unassigned'}</span>
                                    </div>
                                  )}
                                  {issue.due_date && (
                                    <div className="flex items-center gap-1.5">
                                      <Calendar size={14} />
                                      <span>{formatDate(issue.due_date)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                            <FileText className="w-8 h-8 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">No issues reported</p>
                            <p className="text-xs text-gray-500 mt-1">Issues will appear here when reported</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
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

