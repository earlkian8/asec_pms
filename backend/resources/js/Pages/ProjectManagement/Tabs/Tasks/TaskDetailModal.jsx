import { useState, useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import {
  Plus, Download, SquarePen, Trash2, FileText,
  Image as ImageIcon, Calendar, User, AlertCircle,
  Flag, CheckCircle2, XCircle, MessageSquare, Mail,
} from 'lucide-react';
import { usePermission } from '@/utils/permissions';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import AddProgressUpdate from '../ProgressUpdate/add';
import EditProgressUpdate from '../ProgressUpdate/edit';
import DeleteProgressUpdate from '../ProgressUpdate/delete';
import AddIssue from '../Issues/add';
import EditIssue from '../Issues/edit';
import DeleteIssue from '../Issues/delete';

import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.mjs`;
import { renderAsync } from "docx-preview";

// ─── PDF Thumbnail ────────────────────────────────────────────────────────────
const PdfThumbnail = ({ url }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    const render = async () => {
      try {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const pdf  = await pdfjsLib.getDocument({ url, cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/', cMapPacked: true, httpHeaders: csrfToken ? { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrfToken } : undefined }).promise;
        const page = await pdf.getPage(1);
        const vp   = page.getViewport({ scale: 1 });
        const scale = Math.min(280 / vp.width, 200 / vp.height);
        const svp   = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.height = svp.height;
        canvas.width  = svp.width;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: svp }).promise;
        setLoading(false);
      } catch {
        setError(true);
        setLoading(false);
      }
    };
    if (url) render();
  }, [url]);

  if (error) return <div className="w-full h-full flex flex-col items-center justify-center bg-muted"><FileText className="w-6 h-6 text-destructive mb-1" /><span className="text-[10px] text-muted-foreground">Preview unavailable</span></div>;
  return <div className="w-full h-full flex items-center justify-center bg-muted">{loading ? <FileText className="w-6 h-6 text-muted-foreground animate-pulse" /> : <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />}</div>;
};

// ─── DOCX Preview ─────────────────────────────────────────────────────────────
const DocxPreview = ({ fileUrl }) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    const render = async () => {
      try {
        if (!containerRef.current) return;
        containerRef.current.innerHTML = '';
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        const res = await fetch(fileUrl, { credentials: 'same-origin', headers: csrfToken ? { 'X-Requested-With': 'XMLHttpRequest', 'X-CSRF-TOKEN': csrfToken } : {} });
        if (!res.ok) throw new Error();
        await renderAsync(await res.arrayBuffer(), containerRef.current, undefined, { className: 'docx-wrapper', inWrapper: true, breakPages: true, trimXmlDeclaration: true });
        setLoading(false);
      } catch { setError(true); setLoading(false); }
    };
    if (fileUrl) render();
  }, [fileUrl]);

  if (error) return <div className="w-full h-[120px] flex flex-col items-center justify-center bg-muted rounded"><FileText className="w-6 h-6 text-destructive mb-1" /><span className="text-[10px] text-muted-foreground">Preview unavailable</span></div>;
  return <div className="w-full h-[120px] overflow-auto bg-card rounded border p-2">{loading && <div className="flex items-center justify-center h-full"><FileText className="w-6 h-6 text-muted-foreground animate-pulse" /></div>}<div ref={containerRef} className="docx-wrapper prose prose-sm max-w-none" style={{ minHeight: loading ? '120px' : 'auto' }} /></div>;
};

// ─── Text File Preview ────────────────────────────────────────────────────────
const TextFilePreview = ({ fileUrl }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    fetch(fileUrl).then(r => { if (!r.ok) throw new Error(); return r.text(); }).then(t => { setContent(t.substring(0, 2000)); setLoading(false); }).catch(() => { setError(true); setLoading(false); });
  }, [fileUrl]);

  if (loading) return <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded"><FileText className="w-6 h-6 text-muted-foreground animate-pulse" /></div>;
  if (error)   return <div className="w-full h-[120px] flex flex-col items-center justify-center bg-muted rounded"><FileText className="w-6 h-6 text-destructive mb-1" /><span className="text-[10px] text-muted-foreground">Preview unavailable</span></div>;
  return <div className="w-full h-[120px] overflow-auto bg-card border rounded p-2"><pre className="text-[10px] text-foreground font-mono whitespace-pre-wrap break-words">{content}{content.length >= 2000 && <span className="text-muted-foreground">...</span>}</pre></div>;
};

// ─── CSV Preview ──────────────────────────────────────────────────────────────
const CsvPreview = ({ fileUrl }) => {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    fetch(fileUrl).then(r => { if (!r.ok) throw new Error(); return r.text(); }).then(text => {
      const lines = text.split('\n').filter(l => l.trim()).slice(0, 6);
      setData(lines.map(line => { const r = []; let cur = '', inQ = false; for (const c of line) { if (c === '"') inQ = !inQ; else if (c === ',' && !inQ) { r.push(cur.trim()); cur = ''; } else cur += c; } r.push(cur.trim()); return r; }));
      setLoading(false);
    }).catch(() => { setError(true); setLoading(false); });
  }, [fileUrl]);

  if (loading) return <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded"><FileText className="w-6 h-6 text-muted-foreground animate-pulse" /></div>;
  if (error || !data.length) return <div className="w-full h-[120px] flex flex-col items-center justify-center bg-muted rounded"><FileText className="w-6 h-6 text-destructive mb-1" /><span className="text-[10px] text-muted-foreground">Preview unavailable</span></div>;
  return <div className="w-full h-[120px] overflow-auto bg-card rounded border"><table className="min-w-full text-[10px]"><thead className="bg-muted sticky top-0"><tr>{data[0].map((h, i) => <th key={i} className="px-1 py-0.5 text-left font-medium text-foreground border-r last:border-r-0">{h || `Col ${i+1}`}</th>)}</tr></thead><tbody>{data.slice(1).map((row, i) => <tr key={i} className="border-t hover:bg-muted/50">{row.map((c, j) => <td key={j} className="px-1 py-0.5 border-r last:border-r-0 text-foreground">{c || '-'}</td>)}</tr>)}</tbody></table></div>;
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
const TaskDetailModal = ({ task, isOpen, onClose, project, milestones, users, allTasks, onRefresh }) => {
  const { has }   = usePermission();
  const { props } = usePage();

  // Progress update modals
  const [showAddProgressModal,    setShowAddProgressModal]    = useState(false);
  const [showEditProgressModal,   setShowEditProgressModal]   = useState(false);
  const [showDeleteProgressModal, setShowDeleteProgressModal] = useState(false);
  const [editProgressUpdate,      setEditProgressUpdate]      = useState(null);
  const [deleteProgressUpdate,    setDeleteProgressUpdate]    = useState(null);

  // Issue modals
  const [showAddIssueModal,    setShowAddIssueModal]    = useState(false);
  const [showEditIssueModal,   setShowEditIssueModal]   = useState(false);
  const [showDeleteIssueModal, setShowDeleteIssueModal] = useState(false);
  const [editIssue,            setEditIssue]            = useState(null);
  const [deleteIssue,          setDeleteIssue]          = useState(null);

  // Helper: get freshest task from Inertia props after reloads
  const getFreshTask = () => {
    if (!task?.id) return task;
    const md = props.milestoneData;
    if (!md) return task;
    const ms = Array.isArray(md.milestones) ? md.milestones : (md.milestones?.data || []);
    for (const m of ms) {
      const found = (m.tasks || []).find(t => t.id === task.id);
      if (found) return { ...found, milestone: m };
    }
    return task;
  };

  const currentTask = getFreshTask();
  if (!currentTask) return null;

  const rawPU = currentTask.progressUpdates || currentTask.progress_updates || [];
  const progressUpdates = Array.isArray(rawPU) ? rawPU : (rawPU.data || []);

  const rawIssues = currentTask.issues || [];
  const issues    = Array.isArray(rawIssues) ? rawIssues : (rawIssues.data || []);

  // ── NEW: client update requests tied to this task ──
  const rawUpdateRequests = currentTask.clientUpdateRequests || currentTask.client_update_requests || [];
  const clientUpdateRequests = Array.isArray(rawUpdateRequests) ? rawUpdateRequests : (rawUpdateRequests.data || []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const formatDate      = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
  const formatDateTime  = (d) => d ? new Date(d).toLocaleString('en-US',  { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const formatFileSize  = (b) => { if (!b) return ''; if (b < 1024) return b + ' B'; if (b < 1048576) return (b/1024).toFixed(1) + ' KB'; return (b/1048576).toFixed(1) + ' MB'; };

  const isImage = (t) => t && (t.startsWith('image/') || ['jpg','jpeg','png','gif','webp','svg'].some(e => t.toLowerCase().includes(e)));
  const isPdf   = (t, n) => t?.includes('pdf') || n?.toLowerCase().endsWith('.pdf');

  const getFileUrl = (update) => {
    if (!update.file_path) return null;
    if (update.file_url)   return update.file_url;
    const p = update.file_path.startsWith('/') ? update.file_path : `/${update.file_path}`;
    return `${window.location.origin}/storage${p}`;
  };

  const getDownloadUrl = (update) => {
    if (!update.file_path || !currentTask.milestone) return null;
    const mId = currentTask.milestone.id || currentTask.milestone_id;
    if (!mId || !currentTask.id || !update.id) return null;
    return route('project-management.progress-updates.download', [mId, currentTask.id, update.id]);
  };

  const getSmallFileIcon = (update) => {
    if (!update.file_path) return null;
    const ext = update.file_path.split('.').pop()?.toLowerCase();
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) return <ImageIcon size={13} className="text-blue-500" />;
    return <FileText size={13} className="text-gray-400" />;
  };

  // ── File preview ──────────────────────────────────────────────────────────────
  const getFilePreview = (update) => {
    const fallback = (msg = 'No File') => (
      <div className="w-full h-[120px] flex flex-col items-center justify-center bg-muted rounded">
        <FileText className="w-6 h-6 text-muted-foreground mb-1" />
        <span className="text-[10px] text-muted-foreground">{msg}</span>
      </div>
    );
    if (!update.file_path) return fallback();
    const fileUrl = getFileUrl(update);
    if (!fileUrl)          return fallback('File unavailable');

    const fileType = update.file_type || '';
    const fileName = update.original_name || update.file_path || '';
    const ext      = fileName.split('.').pop()?.toLowerCase() || '';

    if (isImage(fileType) || isImage(fileName)) return (
      <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded overflow-hidden p-1">
        <img src={fileUrl} alt={update.original_name || 'Preview'} className="max-w-full max-h-full object-contain" loading="lazy"
          onError={e => { e.target.style.display='none'; const p=e.target.parentElement; if(p) p.innerHTML='<div class="flex flex-col items-center justify-center h-full"><span class="text-[10px] text-muted-foreground mt-1">Preview unavailable</span></div>'; }} />
      </div>
    );
    if (isPdf(fileType, fileName)) return <div className="w-full h-[120px] flex items-center justify-center bg-muted rounded overflow-hidden"><PdfThumbnail url={fileUrl} /></div>;
    if (fileType?.startsWith('video/') || ['mp4','webm','ogg','mov','avi','mkv','m4v'].includes(ext)) return <div className="w-full h-[120px] flex items-center justify-center bg-black rounded overflow-hidden"><video src={fileUrl} controls className="w-full h-full object-contain" preload="metadata" /></div>;
    if (fileType?.startsWith('audio/') || ['mp3','wav','ogg','flac','aac','m4a'].includes(ext)) return <div className="w-full h-[120px] flex flex-col items-center justify-center bg-muted rounded p-2 gap-2"><FileText className="w-5 h-5 text-muted-foreground" /><audio src={fileUrl} controls className="w-full h-8" /></div>;
    if (['docx','doc'].includes(ext)) return <DocxPreview fileUrl={fileUrl} />;
    if (['xls','xlsx','ppt','pptx'].includes(ext)) return <div className="w-full h-[120px] rounded overflow-hidden border bg-card"><iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`} className="w-full h-full border-0" allowFullScreen /></div>;
    if (ext === 'csv') return <CsvPreview fileUrl={fileUrl} />;
    if (fileType?.startsWith('text/') || ['txt','md','json','xml','html','css','js','jsx','ts','tsx','py','php','sql','log'].includes(ext)) return <TextFilePreview fileUrl={fileUrl} />;
    return fallback(fileType || 'File');
  };

  // ── Badges ────────────────────────────────────────────────────────────────────
  const statusBadge = (status) => {
    const map   = { pending: 'bg-amber-50 text-amber-700 border-amber-200', in_progress: 'bg-blue-50 text-blue-700 border-blue-200', completed: 'bg-green-50 text-green-700 border-green-200' };
    const label = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border ${map[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>{label[status] || status}</span>;
  };

  const issueStatusBadge = (status) => {
    const map   = { open: 'bg-red-50 text-red-700 border-red-200', in_progress: 'bg-blue-50 text-blue-700 border-blue-200', resolved: 'bg-green-50 text-green-700 border-green-200', closed: 'bg-gray-50 text-gray-700 border-gray-200' };
    const label = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${map[status] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>{label[status] || status}</span>;
  };

  const priorityBadge = (priority) => {
    const map   = { low: 'bg-gray-50 text-gray-600 border-gray-200', medium: 'bg-amber-50 text-amber-700 border-amber-200', high: 'bg-orange-50 text-orange-700 border-orange-200', critical: 'bg-red-50 text-red-700 border-red-200' };
    const label = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
    return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${map[priority] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{label[priority] || priority}</span>;
  };

  // ── Issue resolve toggle ──────────────────────────────────────────────────────
  const handleResolveIssue = (issue) => {
    if (!issue?.id || !project) return;
    const newStatus = issue.status === 'resolved' ? 'open' : 'resolved';
    router.put(
      route('project-management.project-issues.update', [project.id, issue.id]),
      {
        title:                issue.title,
        description:          issue.description          ?? '',
        priority:             issue.priority             ?? 'medium',
        status:               newStatus,
        assigned_to:          issue.assigned_to          ?? null,
        project_milestone_id: issue.project_milestone_id ?? null,
        project_task_id:      issue.project_task_id      ?? null,
        due_date:             issue.due_date             ?? null,
      },
      {
        preserveScroll: true,
        onSuccess: () => { toast.success(issue.status === 'resolved' ? 'Issue reopened' : 'Issue resolved'); onRefresh?.(); },
        onError:   () => toast.error('Failed to update issue status'),
      }
    );
  };

  // ── Shared modal close + refresh helper ───────────────────────────────────────
  const withRefresh = (setter) => (value) => {
    setter(value);
    if (!value) setTimeout(() => onRefresh?.(), 100);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[1000px] max-h-[95vh] overflow-hidden p-0 bg-background">

          {/* ── Header ─────────────────────────────────────────────────────────── */}
          <DialogHeader className="px-6 py-5 border-b border-border bg-card/50">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-2xl font-bold text-foreground leading-tight mb-1">
                      {currentTask.title}
                    </DialogTitle>
                    {currentTask.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {currentTask.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 pt-1">{statusBadge(currentTask.status)}</div>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
            <div className="p-6 space-y-6">

              {/* ── Task Meta Cards ───────────────────────────────────────────── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: <Calendar size={18} className="text-blue-600" />,      bg: 'bg-blue-50',   label: 'Due Date',    value: formatDate(currentTask.due_date) },
                  { icon: <User size={18} className="text-purple-600" />,        bg: 'bg-purple-50', label: 'Assigned To', value: currentTask.assignedUser?.name || currentTask.assigned_user?.name || 'Unassigned' },
                  { icon: <Flag size={18} className="text-amber-600" />,         bg: 'bg-amber-50',  label: 'Milestone',   value: currentTask.milestone?.name || 'N/A' },
                  { icon: <CheckCircle2 size={18} className="text-green-600" />, bg: 'bg-green-50',  label: 'Status',      value: null, badge: statusBadge(currentTask.status) },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border shadow-sm">
                    <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center`}>
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                      {item.badge
                        ? <div className="mt-0.5">{item.badge}</div>
                        : <p className="text-sm font-semibold text-foreground truncate">{item.value}</p>
                      }
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Progress Updates ──────────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-primary rounded-full" />
                    <div>
                      <h3 className="text-base font-bold text-foreground">Progress Updates</h3>
                      <p className="text-xs text-muted-foreground">{progressUpdates.length} {progressUpdates.length === 1 ? 'update' : 'updates'}</p>
                    </div>
                  </div>
                  {has('progress-updates.create') && (
                    <Button onClick={() => setShowAddProgressModal(true)} size="sm" className="h-8 text-xs px-3 gap-1.5">
                      <Plus size={14} /> Add Update
                    </Button>
                  )}
                </div>

                <div className="max-h-[480px] overflow-y-auto pr-1">
                  {progressUpdates.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {progressUpdates.map((update) => (
                        <div key={update.id} className="bg-card border border-border rounded-lg hover:border-primary/40 hover:shadow-md transition-all group overflow-hidden">
                          <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Calendar size={12} />
                              <span>{formatDate(update.created_at)}</span>
                              {update.created_by_name && (
                                <span className="text-foreground font-medium">· {update.created_by_name}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {update.file_path && getDownloadUrl(update) && has('progress-updates.view') && (
                                <a href={getDownloadUrl(update)} target="_blank" rel="noopener noreferrer"
                                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Download">
                                  <Download size={14} />
                                </a>
                              )}
                              {has('progress-updates.update') && (
                                <button onClick={() => { setEditProgressUpdate({ ...update, task: currentTask }); setShowEditProgressModal(true); }}
                                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                                  <SquarePen size={14} />
                                </button>
                              )}
                              {has('progress-updates.delete') && (
                                <button onClick={() => { setDeleteProgressUpdate({ ...update, task: currentTask }); setShowDeleteProgressModal(true); }}
                                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="p-4 space-y-3">
                            {update.description && (
                              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                                {update.description}
                              </p>
                            )}
                            {update.file_path && getDownloadUrl(update) && (
                              <div className="space-y-2">
                                <div className="rounded-lg overflow-hidden border border-border bg-muted/20">
                                  {getFilePreview(update)}
                                </div>
                                <a href={getDownloadUrl(update)} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-accent hover:bg-accent/80 text-accent-foreground rounded-md text-xs font-medium w-full transition-colors group/link">
                                  {getSmallFileIcon(update)}
                                  <span className="truncate flex-1 text-left">{update.original_name || 'Download'}</span>
                                  {update.file_size && <span className="text-muted-foreground flex-shrink-0">({formatFileSize(update.file_size)})</span>}
                                  <Download size={13} className="opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-muted/30 rounded-lg border border-dashed border-border">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <FileText className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No progress updates yet</p>
                        <p className="text-xs text-muted-foreground">Add the first update to track progress</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Client Update Requests ────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-1 h-6 bg-violet-500 rounded-full" />
                  <div>
                    <h3 className="text-base font-bold text-foreground">Client Update Requests</h3>
                    <p className="text-xs text-muted-foreground">
                      {clientUpdateRequests.length} {clientUpdateRequests.length === 1 ? 'request' : 'requests'} from clients
                    </p>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto pr-1">
                  {clientUpdateRequests.length > 0 ? (
                    <div className="space-y-3">
                      {clientUpdateRequests.map((request) => (
                        <div key={request.id}
                          className="bg-card border border-border rounded-lg hover:border-violet-300 hover:shadow-md transition-all overflow-hidden">

                          {/* Request header */}
                          <div className="px-4 py-3 bg-violet-50/60 border-b border-border flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                                <User size={13} className="text-violet-600" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-violet-800 truncate">
                                  {request.client?.client_name || 'Unknown Client'}
                                </p>
                                <p className="text-[10px] text-violet-500 flex items-center gap-1">
                                  <Calendar size={9} />
                                  {formatDateTime(request.created_at)}
                                </p>
                              </div>
                            </div>
                            <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-semibold border border-violet-200">
                              <Mail size={9} />
                              Request
                            </span>
                          </div>

                          {/* Request body */}
                          <div className="px-4 py-3 space-y-2">
                            <p className="text-sm font-semibold text-foreground leading-snug">
                              {request.subject}
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {request.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-muted/30 rounded-lg border border-dashed border-border">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <MessageSquare className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No client requests for this task</p>
                        <p className="text-xs text-muted-foreground">Client update requests linked to this task will appear here</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Issues ───────────────────────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-destructive rounded-full" />
                    <div>
                      <h3 className="text-base font-bold text-foreground">Issues</h3>
                      <p className="text-xs text-muted-foreground">{issues.length} {issues.length === 1 ? 'issue' : 'issues'}</p>
                    </div>
                  </div>
                  {has('project-issues.create') && (
                    <Button onClick={() => setShowAddIssueModal(true)} size="sm"
                      className="h-8 text-xs px-3 gap-1.5 bg-red-600 hover:bg-red-700 text-white">
                      <Plus size={14} /> Add Issue
                    </Button>
                  )}
                </div>

                <div className="max-h-[400px] overflow-y-auto pr-1">
                  {issues.length > 0 ? (
                    <div className="space-y-2">
                      {issues.map((issue) => (
                        <div key={issue.id} className="bg-card border border-border rounded-lg hover:border-destructive/40 hover:shadow-md transition-all group overflow-hidden">
                          <div className="px-4 py-3 flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5">
                              <AlertCircle size={14} className="text-destructive" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground leading-tight mb-1.5">{issue.title}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {issueStatusBadge(issue.status)}
                                {priorityBadge(issue.priority)}
                                {(issue.assignedTo?.name || issue.assigned_to_name) && (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <User size={11} />
                                    {issue.assignedTo?.name || issue.assigned_to_name}
                                  </span>
                                )}
                                {issue.due_date && (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                    <Calendar size={11} />
                                    {formatDate(issue.due_date)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              {has('project-issues.update') && issue.status !== 'closed' && (
                                <button onClick={() => handleResolveIssue(issue)}
                                  className={`p-1.5 rounded transition-colors ${issue.status === 'resolved' ? 'hover:bg-accent text-muted-foreground hover:text-foreground' : 'hover:bg-green-50 text-muted-foreground hover:text-green-600'}`}
                                  title={issue.status === 'resolved' ? 'Reopen' : 'Resolve'}>
                                  {issue.status === 'resolved' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                                </button>
                              )}
                              {has('project-issues.update') && (
                                <button onClick={() => { setEditIssue({ ...issue, task: currentTask }); setShowEditIssueModal(true); }}
                                  className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                                  <SquarePen size={15} />
                                </button>
                              )}
                              {has('project-issues.delete') && (
                                <button onClick={() => { setDeleteIssue({ ...issue, task: currentTask }); setShowDeleteIssueModal(true); }}
                                  className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </div>
                          {(issue.description || issue.resolved_at) && (
                            <div className="px-4 pb-3 pt-0 space-y-2">
                              {issue.description && (
                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 pl-11">
                                  {issue.description}
                                </p>
                              )}
                              {issue.resolved_at && (
                                <div className="pl-11">
                                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-medium">
                                    <CheckCircle2 size={12} />
                                    Resolved {formatDate(issue.resolved_at)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-muted/30 rounded-lg border border-dashed border-border">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <AlertCircle className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">No issues reported</p>
                        <p className="text-xs text-muted-foreground">Everything looks good!</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Progress Update Modals ──────────────────────────────────────────────── */}
      {showAddProgressModal && (
        <AddProgressUpdate setShowAddModal={withRefresh(setShowAddProgressModal)} project={project} tasks={allTasks} preselectedTask={currentTask} />
      )}
      {showEditProgressModal && editProgressUpdate && (
        <EditProgressUpdate setShowEditModal={withRefresh(setShowEditProgressModal)} progressUpdate={editProgressUpdate} project={project} tasks={allTasks} />
      )}
      {showDeleteProgressModal && deleteProgressUpdate && (
        <DeleteProgressUpdate setShowDeleteModal={withRefresh(setShowDeleteProgressModal)} progressUpdate={deleteProgressUpdate} task={deleteProgressUpdate.task || currentTask} />
      )}

      {/* ── Issue Modals ────────────────────────────────────────────────────────── */}
      {showAddIssueModal && (
        <AddIssue setShowAddModal={withRefresh(setShowAddIssueModal)} project={project} milestones={milestones || []} tasks={allTasks || []} users={users || []} preselectedTask={currentTask} />
      )}
      {showEditIssueModal && editIssue && (
        <EditIssue setShowEditModal={withRefresh(setShowEditIssueModal)} issue={editIssue} project={project} milestones={milestones || []} tasks={allTasks || []} users={users || []} />
      )}
      {showDeleteIssueModal && deleteIssue && (
        <DeleteIssue setShowDeleteModal={withRefresh(setShowDeleteIssueModal)} issue={deleteIssue} project={project} />
      )}
    </>
  );
};

export default TaskDetailModal;