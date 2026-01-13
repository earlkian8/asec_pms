import { useState, useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Plus, Download, SquarePen, Trash2, FileText, Image as ImageIcon, Calendar, User, AlertCircle, Flag, CheckCircle2, XCircle } from 'lucide-react';
import { usePermission } from '@/utils/permissions';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import AddProgressUpdate from '../ProgressUpdate/add';
import EditProgressUpdate from '../ProgressUpdate/edit';
import DeleteProgressUpdate from '../ProgressUpdate/delete';
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
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted">
        <FileText className="w-6 h-6 text-destructive mb-1" />
        <span className="text-[10px] text-muted-foreground">Preview unavailable</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-muted">
      {loading ? (
        <FileText className="w-6 h-6 text-muted-foreground animate-pulse" />
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
      <div className="w-full h-[120px] flex flex-col items-center justify-center bg-muted rounded">
        <FileText className="w-6 h-6 text-destructive mb-1" />
        <span className="text-[10px] text-muted-foreground">Preview unavailable</span>
      </div>
    );
  }

  return (
    <div className="w-full h-[120px] overflow-auto bg-card rounded border p-2">
      {loading && (
        <div className="flex items-center justify-center h-full">
          <FileText className="w-6 h-6 text-muted-foreground animate-pulse" />
        </div>
      )}
      <div 
        ref={containerRef} 
        className="docx-wrapper prose prose-sm max-w-none"
        style={{ 
          minHeight: loading ? '120px' : 'auto',
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
      <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded">
        <FileText className="w-6 h-6 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded">
        <div className="flex flex-col items-center">
          <FileText className="w-6 h-6 text-destructive mb-1" />
          <span className="text-[10px] text-muted-foreground">Preview unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[120px] overflow-auto bg-card border rounded p-2">
      <pre className="text-[10px] text-foreground font-mono whitespace-pre-wrap break-words">
        {content}
        {content.length >= 2000 && <span className="text-muted-foreground">...</span>}
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
      <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded">
        <FileText className="w-6 h-6 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  if (error || data.length === 0) {
    return (
      <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded">
        <div className="flex flex-col items-center">
          <FileText className="w-6 h-6 text-destructive mb-1" />
          <span className="text-[10px] text-muted-foreground">Preview unavailable</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[120px] overflow-auto bg-card rounded border">
      <table className="min-w-full text-[10px]">
        {data.length > 0 && (
          <>
            <thead className="bg-muted sticky top-0">
              <tr>
                {data[0].map((header, i) => (
                  <th key={i} className="px-1 py-0.5 text-left font-medium text-foreground border-r border-border last:border-r-0">
                    {header || `Col ${i + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(1).map((row, i) => (
                <tr key={i} className="border-t hover:bg-muted/50">
                  {row.map((cell, j) => (
                    <td key={j} className="px-1 py-0.5 border-r border-border last:border-r-0 text-foreground">
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

  // Get progress updates for this task
  const rawProgressUpdates = currentTask.progressUpdates || currentTask.progress_updates || [];
  const progressUpdates = Array.isArray(rawProgressUpdates) 
    ? rawProgressUpdates 
    : (rawProgressUpdates.data || []);

  // Get issues for this task
  const rawIssues = currentTask.issues || [];
  const issues = Array.isArray(rawIssues) 
    ? rawIssues 
    : (rawIssues.data || []);

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
    if (!update.file_path) {
      return (
        <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded">
          <div className="flex flex-col items-center">
            <FileText className="w-6 h-6 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">No File</span>
          </div>
        </div>
      );
    }

    // Use storage URL for previews (works for images, videos, etc.)
    const fileUrl = getFileUrl(update);
    if (!fileUrl) {
      return (
        <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded">
          <div className="flex flex-col items-center">
            <FileText className="w-6 h-6 text-muted-foreground mb-1" />
            <span className="text-[10px] text-muted-foreground">File unavailable</span>
          </div>
        </div>
      );
    }
    const fileType = update.file_type || '';
    const fileName = update.original_name || update.file_path || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';

    // Image preview
    if (isImage(fileType) || isImage(fileName)) {
      return (
        <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded overflow-hidden p-1">
          <img
            src={fileUrl}
            alt={update.original_name || 'Preview'}
            className="max-w-full max-h-full w-auto h-auto object-contain"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              const parent = e.target.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="flex flex-col items-center justify-center h-full"><svg class="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg><span class="text-[10px] text-muted-foreground mt-1">Preview unavailable</span></div>';
              }
            }}
          />
        </div>
      );
    }

    // PDF preview
    if (isPdf(fileType, fileName)) {
      return (
        <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded overflow-hidden">
          <PdfThumbnail url={fileUrl} />
        </div>
      );
    }

    // Video preview
    if (fileType?.startsWith('video/') || ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'mkv', 'm4v'].includes(fileExtension)) {
      return (
        <div className="w-full h-[120px] flex items-center justify-center bg-black rounded overflow-hidden">
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
        <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded p-2">
          <div className="w-full">
            <div className="flex flex-col items-center mb-2">
              <FileText className="w-6 h-6 text-muted-foreground mb-1" />
              <span className="text-[10px] text-foreground font-medium truncate w-full text-center">{fileName}</span>
            </div>
            <audio
              src={fileUrl}
              controls
              className="w-full h-8"
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
        <div className="w-full h-[120px] rounded overflow-hidden border bg-card">
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
        return <FileText className="w-6 h-6 text-primary" />;
      }
      if (fileType?.includes('excel') || fileType?.includes('spreadsheet')) {
        return <FileText className="w-6 h-6 text-primary" />;
      }
      if (fileType?.includes('presentation') || fileType?.includes('powerpoint')) {
        return <FileText className="w-6 h-6 text-primary" />;
      }
      if (fileType?.startsWith('video/')) {
        return <FileText className="w-6 h-6 text-primary" />;
      }
      if (fileType?.startsWith('audio/')) {
        return <FileText className="w-6 h-6 text-primary" />;
      }
      // Archive files
      if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(fileExtension)) {
        return <FileText className="w-6 h-6 text-primary" />;
      }
      return <FileText className="w-6 h-6 text-muted-foreground" />;
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
      <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded">
        <div className="flex flex-col items-center">
          {getFileIcon()}
          <span className="text-[10px] text-foreground font-medium mt-1">
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
      return <ImageIcon size={14} className="text-primary" />;
    }
    return <FileText size={14} className="text-muted-foreground" />;
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

  // Get direct storage URL for file previews (images, videos, etc.)
  const getFileUrl = (update) => {
    if (!update.file_path) return null;
    // Use file_url if available (from API), otherwise construct from file_path
    if (update.file_url) {
      return update.file_url;
    }
    // Construct storage URL directly
    const baseUrl = window.location.origin;
    const filePath = update.file_path.startsWith('/') ? update.file_path : `/${update.file_path}`;
    return `${baseUrl}/storage${filePath}`;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        bg: 'bg-amber-50 dark:bg-amber-950/30', 
        text: 'text-amber-700 dark:text-amber-400', 
        border: 'border-amber-200 dark:border-amber-800',
        label: 'Pending' 
      },
      in_progress: { 
        bg: 'bg-blue-50 dark:bg-blue-950/30', 
        text: 'text-blue-700 dark:text-blue-400', 
        border: 'border-blue-200 dark:border-blue-800',
        label: 'In Progress' 
      },
      completed: { 
        bg: 'bg-green-50 dark:bg-green-950/30', 
        text: 'text-green-700 dark:text-green-400', 
        border: 'border-green-200 dark:border-green-800',
        label: 'Completed' 
      },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </span>
    );
  };

  const getIssueStatusBadge = (status) => {
    const statusConfig = {
      open: { 
        bg: 'bg-red-50 dark:bg-red-950/30', 
        text: 'text-red-700 dark:text-red-400', 
        border: 'border-red-200 dark:border-red-800',
        label: 'Open' 
      },
      in_progress: { 
        bg: 'bg-blue-50 dark:bg-blue-950/30', 
        text: 'text-blue-700 dark:text-blue-400', 
        border: 'border-blue-200 dark:border-blue-800',
        label: 'In Progress' 
      },
      resolved: { 
        bg: 'bg-green-50 dark:bg-green-950/30', 
        text: 'text-green-700 dark:text-green-400', 
        border: 'border-green-200 dark:border-green-800',
        label: 'Resolved' 
      },
      closed: { 
        bg: 'bg-gray-50 dark:bg-gray-950/30', 
        text: 'text-gray-700 dark:text-gray-400', 
        border: 'border-gray-200 dark:border-gray-800',
        label: 'Closed' 
      },
    };
    const config = statusConfig[status] || statusConfig.open;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      low: { 
        bg: 'bg-gray-50 dark:bg-gray-950/30', 
        text: 'text-gray-700 dark:text-gray-400', 
        border: 'border-gray-200 dark:border-gray-800',
        label: 'Low' 
      },
      medium: { 
        bg: 'bg-amber-50 dark:bg-amber-950/30', 
        text: 'text-amber-700 dark:text-amber-400', 
        border: 'border-amber-200 dark:border-amber-800',
        label: 'Medium' 
      },
      high: { 
        bg: 'bg-orange-50 dark:bg-orange-950/30', 
        text: 'text-orange-700 dark:text-orange-400', 
        border: 'border-orange-200 dark:border-orange-800',
        label: 'High' 
      },
      critical: { 
        bg: 'bg-red-50 dark:bg-red-950/30', 
        text: 'text-red-700 dark:text-red-400', 
        border: 'border-red-200 dark:border-red-800',
        label: 'Critical' 
      },
    };
    const config = priorityConfig[priority] || priorityConfig.medium;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}>
        {config.label}
      </span>
    );
  };


  const handleResolveIssue = (issue) => {
    if (!issue || !issue.id || !project) return;
    
    router.put(route("project-management.project-issues.update", [project.id, issue.id]), {
      ...issue,
      status: issue.status === 'resolved' ? 'open' : 'resolved',
    }, {
      preserveScroll: true,
      onSuccess: () => {
        toast.success(issue.status === 'resolved' ? 'Issue reopened successfully' : 'Issue resolved successfully');
        if (onRefresh) {
          setTimeout(() => onRefresh(), 100);
        }
      },
      onError: () => {
        toast.error('Failed to update issue status');
      },
    });
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[1000px] max-h-[95vh] overflow-hidden p-0 bg-background">
          {/* Header */}
          <DialogHeader className="px-6 py-5 border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-2xl font-bold text-foreground leading-tight mb-2">
                      {currentTask.title}
                    </DialogTitle>
                    {currentTask.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {currentTask.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 pt-1">
                    {getStatusBadge(currentTask.status)}
                  </div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
            <div className="p-6 space-y-6">
              {/* Task Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                    <Calendar size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Due Date
                    </p>
                    <p className="text-base font-semibold text-foreground">
                      {formatDate(currentTask.due_date)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
                    <User size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Assigned To
                    </p>
                    <p className="text-base font-semibold text-foreground truncate">
                      {currentTask.assignedUser?.name || currentTask.assigned_user?.name || 'Unassigned'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                    <Flag size={20} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Milestone
                    </p>
                    <p className="text-base font-semibold text-foreground truncate">
                      {currentTask.milestone?.name || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-4 bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Status
                    </p>
                    <div className="mt-0.5">
                      {getStatusBadge(currentTask.status)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Updates Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-primary rounded-full"></div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Progress Updates</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {progressUpdates.length} {progressUpdates.length === 1 ? 'update' : 'updates'}
                      </p>
                    </div>
                  </div>
                  {has('progress-updates.create') && (
                    <Button
                      onClick={() => setShowAddProgressModal(true)}
                      size="sm"
                      className="h-9 text-sm px-4"
                    >
                      <Plus size={16} className="mr-2" />
                      Add Update
                    </Button>
                  )}
                </div>
                <div className="max-h-[500px] overflow-y-auto pr-1">
                  {progressUpdates.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {progressUpdates.map((update) => (
                        <div 
                          key={update.id} 
                          className="bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all group overflow-hidden"
                        >
                          {/* Header */}
                          <div className="px-4 py-3 border-b border-border bg-muted/30">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <User size={14} className="text-primary" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {currentTask.assigned_user?.name || 'Unknown'}
                                  </p>
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <Calendar size={12} />
                                    {formatDate(update.created_at)}
                                  </p>
                                </div>
                              </div>
                              
                              {/* Action buttons */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                {update.file_path && getDownloadUrl(update) && has('progress-updates.view') && (
                                  <a
                                    href={getDownloadUrl(update)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                    title="Download"
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
                                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                    title="Edit"
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
                                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Delete"
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
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                                {update.description}
                              </p>
                            )}
                            
                            {/* File Preview */}
                            {update.file_path && getDownloadUrl(update) && (
                              <div className="space-y-2">
                                <div className="rounded-lg overflow-hidden border border-border bg-muted/20">
                                  {getFilePreview(update)}
                                </div>
                                
                                {/* File download link */}
                                <a
                                  href={getDownloadUrl(update)}
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent/80 text-accent-foreground rounded-md text-xs font-medium group/link w-full transition-colors"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {getFileIcon(update)}
                                  <span className="truncate flex-1 text-left">{update.original_name || 'Download'}</span>
                                  {update.file_size && (
                                    <span className="text-muted-foreground text-xs flex-shrink-0">({formatFileSize(update.file_size)})</span>
                                  )}
                                  <Download size={14} className="opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <FileText className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">No progress updates</p>
                          <p className="text-xs text-muted-foreground mt-1">Get started by adding your first update</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Issues Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-destructive rounded-full"></div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">Issues</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {issues.length} {issues.length === 1 ? 'issue' : 'issues'} found
                      </p>
                    </div>
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto pr-1">
                  {issues.length > 0 ? (
                    <div className="space-y-3">
                      {issues.map((issue) => (
                        <div 
                          key={issue.id} 
                          className="bg-card border border-border rounded-lg hover:border-destructive/50 hover:shadow-md transition-all group overflow-hidden"
                        >
                          {/* Issue Header */}
                          <div className="px-4 py-3 border-b border-border bg-muted/30">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2 mb-2">
                                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <AlertCircle size={14} className="text-destructive" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-base font-semibold text-foreground mb-2 leading-tight">
                                      {issue.title}
                                    </h4>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {getIssueStatusBadge(issue.status)}
                                      {getPriorityBadge(issue.priority)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap ml-10">
                                  {issue.assignedTo?.name || issue.assigned_to_name ? (
                                    <div className="flex items-center gap-1.5">
                                      <User size={12} />
                                      <span className="text-foreground font-medium">
                                        {issue.assignedTo?.name || issue.assigned_to_name}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <User size={12} />
                                      <span className="text-foreground font-medium">
                                        {currentTask.assigned_user?.name || 'Unassigned'}
                                      </span>
                                    </div>
                                  )}
                                  {issue.due_date && (
                                    <div className="flex items-center gap-1.5">
                                      <Calendar size={12} />
                                      <span>Due {formatDate(issue.due_date)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                {issue.status !== 'resolved' && issue.status !== 'closed' && has('project-issues.update') && (
                                  <button
                                    onClick={() => handleResolveIssue(issue)}
                                    className="p-1.5 rounded-md hover:bg-green-50 dark:hover:bg-green-950/30 text-muted-foreground hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                    title="Resolve"
                                  >
                                    <CheckCircle2 size={16} />
                                  </button>
                                )}
                                {issue.status === 'resolved' && has('project-issues.update') && (
                                  <button
                                    onClick={() => handleResolveIssue(issue)}
                                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                    title="Reopen"
                                  >
                                    <XCircle size={16} />
                                  </button>
                                )}
                                {has('project-issues.update') && (
                                  <button
                                    onClick={() => {
                                      setEditIssue({ ...issue, task: currentTask });
                                      setShowEditIssueModal(true);
                                    }}
                                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                    title="Edit"
                                  >
                                    <SquarePen size={16} />
                                  </button>
                                )}
                                {has('project-issues.delete') && (
                                  <button
                                    onClick={() => {
                                      setDeleteIssue({ ...issue, task: currentTask });
                                      setShowDeleteIssueModal(true);
                                    }}
                                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Issue Content */}
                          <div className="px-4 py-3">
                            {issue.description ? (
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                                {issue.description}
                              </p>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No description provided</p>
                            )}
                            {issue.resolved_at && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <div className="flex items-center gap-2 px-2 py-1.5 bg-green-50 dark:bg-green-950/30 rounded-md">
                                  <CheckCircle2 size={14} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                                  <p className="text-xs font-medium text-green-700 dark:text-green-400">
                                    Resolved on {formatDate(issue.resolved_at)}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                          <AlertCircle className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">No issues found</p>
                          <p className="text-xs text-muted-foreground mt-1">Everything looks good!</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
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
      {showEditIssueModal && editIssue && (
        <EditIssue
          setShowEditModal={(value) => {
            setShowEditIssueModal(value);
            if (!value && onRefresh) {
              setTimeout(() => {
                onRefresh();
              }, 100);
            }
          }}
          issue={editIssue}
          project={project}
          milestones={milestones || []}
          tasks={allTasks || []}
          users={users || []}
        />
      )}

      {showDeleteIssueModal && deleteIssue && (
        <DeleteIssue
          setShowDeleteModal={(value) => {
            setShowDeleteIssueModal(value);
            if (!value && onRefresh) {
              setTimeout(() => {
                onRefresh();
              }, 100);
            }
          }}
          issue={deleteIssue}
          project={project}
        />
      )}

    </>
  );
};

export default TaskDetailModal;

