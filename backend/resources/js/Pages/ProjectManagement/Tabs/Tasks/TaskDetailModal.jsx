import { useState, useEffect, useRef } from 'react';
import { usePage } from '@inertiajs/react';
import { Dialog, DialogContent } from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import {
  Plus, Download, SquarePen, Trash2, FileText,
  Image as ImageIcon, Calendar, User, AlertCircle,
  Flag, CheckCircle2, XCircle, MessageSquare, Mail,
  LayoutGrid, Activity, Clock, X,
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

// ─── File preview sub-components (unchanged internals) ────────────────────────
const PdfThumbnail = ({ url }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const render = async () => {
      try {
        const token = document.querySelector('meta[name="csrf-token"]')?.content;
        const pdf = await pdfjsLib.getDocument({ url, httpHeaders: token ? { 'X-CSRF-TOKEN': token } : undefined }).promise;
        const page = await pdf.getPage(1);
        const vp = page.getViewport({ scale: 1 });
        const scale = Math.min(400 / vp.width, 300 / vp.height);
        const svp = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.height = svp.height;
        canvas.width = svp.width;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: svp }).promise;
        setLoading(false);
      } catch { setError(true); setLoading(false); }
    };
    if (url) render();
  }, [url]);
  if (error) return <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 rounded"><FileText className="w-6 h-6 text-red-400 mb-1" /><span className="text-[10px] text-zinc-400">Preview unavailable</span></div>;
  return <div className="w-full h-full flex items-center justify-center bg-zinc-100">{loading ? <FileText className="w-6 h-6 text-zinc-400 animate-pulse" /> : <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />}</div>;
};

const DocxPreview = ({ fileUrl }) => {
  const ref = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const render = async () => {
      try {
        if (!ref.current) return;
        ref.current.innerHTML = '';
        const token = document.querySelector('meta[name="csrf-token"]')?.content;
        const res = await fetch(fileUrl, { credentials: 'same-origin', headers: token ? { 'X-CSRF-TOKEN': token } : {} });
        if (!res.ok) throw new Error();
        await renderAsync(await res.arrayBuffer(), ref.current, undefined, { className: 'docx-wrapper', inWrapper: true });
        setLoading(false);
      } catch { setError(true); setLoading(false); }
    };
    if (fileUrl) render();
  }, [fileUrl]);
  if (error) return <div className="w-full h-40 flex items-center justify-center bg-zinc-100 rounded"><FileText className="w-5 h-5 text-red-400" /></div>;
  return <div className="w-full overflow-auto bg-white rounded border p-2">{loading && <div className="h-40 flex items-center justify-center"><FileText className="w-5 h-5 text-zinc-400 animate-pulse" /></div>}<div ref={ref} style={{ minHeight: loading ? '160px' : 'auto' }} /></div>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt     = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
const fmtFull = (d) => d ? new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
const fmtSize = (b) => { if (!b) return ''; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; };
const isImg   = (t) => t && ['jpg','jpeg','png','gif','webp','svg'].some(e => t.toLowerCase().includes(e));
const isPdf   = (t, n) => t?.includes('pdf') || n?.toLowerCase().endsWith('.pdf');

// ─── Status + priority badge helpers ─────────────────────────────────────────
const taskStatusBadge = (status) => {
  const map = {
    pending:     'bg-amber-50 text-amber-700 border-amber-200',
    in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
    completed:   'bg-green-50 text-green-700 border-green-200',
  };
  const label = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${map[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
      {label[status] || status}
    </span>
  );
};

const issueStatusBadge = (status) => {
  const map = { open: 'bg-red-50 text-red-700 border-red-200', in_progress: 'bg-blue-50 text-blue-700 border-blue-200', resolved: 'bg-green-50 text-green-700 border-green-200', closed: 'bg-gray-50 text-gray-600 border-gray-200' };
  const label = { open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${map[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{label[status] || status}</span>;
};

const priorityBadge = (priority) => {
  const map = { low: 'bg-gray-50 text-gray-600 border-gray-200', medium: 'bg-amber-50 text-amber-700 border-amber-200', high: 'bg-orange-50 text-orange-700 border-orange-200', critical: 'bg-red-50 text-red-700 border-red-200' };
  const label = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${map[priority] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>{label[priority] || priority}</span>;
};

// ─── Media aspect detection ───────────────────────────────────────────────────
const useImageAspect = (src) => {
  const [aspect, setAspect] = useState('landscape');
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => setAspect(img.naturalHeight > img.naturalWidth ? 'portrait' : 'landscape');
    img.src = src;
  }, [src]);
  return aspect;
};

// ─── Update Card ──────────────────────────────────────────────────────────────
const UpdateCard = ({ update, currentTask, onEdit, onDelete, downloadUrl, isFirst }) => {
  const fileUrl = update.file_url || (update.file_path ? `${window.location.origin}/storage/${update.file_path.replace(/^\//, '')}` : null);
  const aspect = useImageAspect(isImg(update.file_type || '') || isImg(update.file_path || '') ? fileUrl : null);
  const hasImage = fileUrl && (isImg(update.file_type || '') || isImg(update.file_path || ''));
  const hasPdf   = fileUrl && isPdf(update.file_type || '', update.file_path || '');
  const hasDocx  = fileUrl && ['docx', 'doc'].includes((update.file_path || '').split('.').pop()?.toLowerCase());

  const mediaClass = hasImage
    ? aspect === 'portrait'
      ? 'aspect-[3/4] max-h-[300px]'
      : 'aspect-video'
    : 'aspect-video';

  return (
    <div className={`group bg-white border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 hover:shadow-sm transition-all ${isFirst ? 'col-span-2' : ''}`}>
      {/* Media */}
      {(hasImage || hasPdf || hasDocx) && (
        <div className={`w-full bg-zinc-100 overflow-hidden relative ${mediaClass}`}>
          {hasImage && (
            <img
              src={fileUrl}
              alt="Update attachment"
              className="w-full h-full object-cover"
              onError={e => { e.target.parentElement.classList.add('hidden'); }}
            />
          )}
          {hasPdf && <PdfThumbnail url={fileUrl} />}
          {hasDocx && <DocxPreview fileUrl={fileUrl} />}
          {/* Overlay badge */}
          <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wide">
            {hasPdf ? 'PDF' : hasDocx ? 'DOCX' : 'Photo'}
          </span>
        </div>
      )}

      {/* Body */}
      <div className="p-3.5">
        <div className="flex items-center gap-2 mb-2.5 text-xs text-zinc-400">
          <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-medium text-[10px] flex-shrink-0">
            {(update.created_by_name || 'U').charAt(0).toUpperCase()}
          </div>
          <span className="text-zinc-500 font-medium">{update.created_by_name || 'Unknown'}</span>
          <span>·</span>
          <span>{fmt(update.created_at)}</span>
        </div>

        {update.description && (
          <p className="text-sm text-zinc-700 leading-relaxed line-clamp-4">{update.description}</p>
        )}

        {fileUrl && (
          <div className="mt-2.5 flex items-center gap-2 text-xs text-zinc-400">
            <FileText size={12} />
            <span className="truncate">{update.original_name || 'Attachment'}</span>
            {update.file_size && <span className="flex-shrink-0 text-zinc-300">· {fmtSize(update.file_size)}</span>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-3.5 py-2.5 border-t border-zinc-100 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
        {downloadUrl && (
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
            <Download size={12} /> Download
          </a>
        )}
        <button onClick={onEdit}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 px-2.5 py-1.5 rounded-lg hover:bg-zinc-100 transition-colors">
          <SquarePen size={12} /> Edit
        </button>
        <button onClick={onDelete}
          className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
const TaskDetailModal = ({ task, isOpen, onClose, project, milestones, users, allTasks, onRefresh }) => {
  const { has }   = usePermission();
  const { props } = usePage();
  const [activeTab, setActiveTab] = useState('progress');

  const [showAddProgressModal,    setShowAddProgressModal]    = useState(false);
  const [showEditProgressModal,   setShowEditProgressModal]   = useState(false);
  const [showDeleteProgressModal, setShowDeleteProgressModal] = useState(false);
  const [editProgressUpdate,      setEditProgressUpdate]      = useState(null);
  const [deleteProgressUpdate,    setDeleteProgressUpdate]    = useState(null);

  const [showAddIssueModal,    setShowAddIssueModal]    = useState(false);
  const [showEditIssueModal,   setShowEditIssueModal]   = useState(false);
  const [showDeleteIssueModal, setShowDeleteIssueModal] = useState(false);
  const [editIssue,            setEditIssue]            = useState(null);
  const [deleteIssue,          setDeleteIssue]          = useState(null);

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
  const issues = Array.isArray(rawIssues) ? rawIssues : (rawIssues.data || []);

  const rawRequests = currentTask.clientUpdateRequests || currentTask.client_update_requests || [];
  const clientUpdateRequests = Array.isArray(rawRequests) ? rawRequests : (rawRequests.data || []);

  const getDownloadUrl = (update) => {
    if (!update.file_path || !currentTask.milestone) return null;
    const mId = currentTask.milestone.id || currentTask.milestone_id;
    if (!mId || !currentTask.id || !update.id) return null;
    return route('project-management.progress-updates.download', [mId, currentTask.id, update.id]);
  };

  const withRefresh = (setter) => (value) => {
    setter(value);
    if (!value) setTimeout(() => onRefresh?.(), 100);
  };

  const handleResolveIssue = (issue) => {
    if (!issue?.id || !project) return;
    const newStatus = issue.status === 'resolved' ? 'open' : 'resolved';
    router.put(
      route('project-management.project-issues.update', [project.id, issue.id]),
      { title: issue.title, description: issue.description ?? '', priority: issue.priority ?? 'medium', status: newStatus, assigned_to: issue.assigned_to ?? null, project_milestone_id: issue.project_milestone_id ?? null, project_task_id: issue.project_task_id ?? null, due_date: issue.due_date ?? null },
      { preserveScroll: true, onSuccess: () => { toast.success(issue.status === 'resolved' ? 'Issue reopened' : 'Issue resolved'); onRefresh?.(); }, onError: () => toast.error('Failed to update issue status') }
    );
  };

  // Progress ring calc
  const progressPct = progressUpdates.length > 0
    ? currentTask.status === 'completed' ? 100 : Math.min(progressUpdates.length * 25, 90)
    : 0;
  const circumference = 2 * Math.PI * 26;
  const dashOffset = circumference - (progressPct / 100) * circumference;

  const tabs = [
    // { id: 'overview',  label: 'Overview',         icon: LayoutGrid,    count: null },
    { id: 'progress',  label: 'Progress updates',  icon: Activity,      count: progressUpdates.length },
    { id: 'requests',  label: 'Client requests',   icon: MessageSquare, count: clientUpdateRequests.length },
    { id: 'issues',    label: 'Issues',             icon: AlertCircle,   count: issues.length },
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-[920px] max-h-[92vh] overflow-hidden p-0 bg-white rounded-2xl border border-zinc-200 shadow-2xl">

          {/* ── HEADER ───────────────────────────────────────────────────────── */}
          <div className="flex items-start gap-3.5 px-6 py-5 border-b border-zinc-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 size={18} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-medium text-zinc-900 leading-snug mb-1">
                {currentTask.title}
              </h2>
              <div className="flex items-center gap-2.5 text-xs text-zinc-400 flex-wrap">
                <span className="flex items-center gap-1">
                  <Flag size={10} className="text-zinc-300" />
                  {currentTask.milestone?.name || 'No milestone'}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <User size={10} className="text-zinc-300" />
                  {currentTask.assignedUser?.name || currentTask.assigned_user?.name || 'Unassigned'}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock size={10} className="text-zinc-300" />
                  Due {fmt(currentTask.due_date)}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {taskStatusBadge(currentTask.status)}
              <div className='mx-2'></div>
            </div>
          </div>

          {/* ── BODY: sidebar + main ─────────────────────────────────────────── */}
          <div className="flex overflow-hidden" style={{ height: 'calc(92vh - 90px)' }}>

            {/* SIDEBAR */}
            <div className="w-52 flex-shrink-0 border-r border-zinc-100 flex flex-col py-3 gap-0.5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-300 px-4 py-2">Sections</p>

              {tabs.map(({ id, label, icon: Icon, count }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all text-left border-l-2 ${
                    activeTab === id
                      ? 'border-blue-500 bg-zinc-50 text-zinc-900 font-medium'
                      : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
                  }`}>
                  <Icon size={14} className="flex-shrink-0" />
                  <span className="flex-1 truncate">{label}</span>
                  {count !== null && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full min-w-[18px] text-center ${
                      activeTab === id
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-zinc-100 text-zinc-400'
                    }`}>{count}</span>
                  )}
                </button>
              ))}

              {/* Metadata footer */}
              <div className="mt-auto px-4 py-3 border-t border-zinc-100 space-y-3">
                <div>
                  <p className="text-[10px] text-zinc-300 mb-0.5">Milestone</p>
                  <p className="text-xs text-zinc-700 leading-tight">{currentTask.milestone?.name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-300 mb-0.5">Start date</p>
                  <p className="text-xs text-zinc-700">{fmt(currentTask.start_date) !== 'N/A' ? fmt(currentTask.start_date) : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-300 mb-0.5">Due date</p>
                  <p className="text-xs text-zinc-700">{fmt(currentTask.due_date)}</p>
                </div>
              </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 overflow-y-auto">

              {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
              {activeTab === 'overview' && (
                <div className="p-6 space-y-5">
                  {/* Stat row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Updates filed', value: progressUpdates.length, sub: 'progress entries' },
                      { label: 'Client requests', value: clientUpdateRequests.length, sub: 'linked to task' },
                      { label: 'Open issues', value: issues.filter(i => i.status === 'open').length, sub: `of ${issues.length} total` },
                    ].map((s, i) => (
                      <div key={i} className="bg-zinc-50 rounded-xl p-4">
                        <p className="text-xs text-zinc-400 mb-1">{s.label}</p>
                        <p className="text-2xl font-medium text-zinc-900">{s.value}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">{s.sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress ring */}
                  <div className="flex items-center gap-5 bg-zinc-50 rounded-xl p-4">
                    <svg width="64" height="64" viewBox="0 0 64 64" className="flex-shrink-0">
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#e4e4e7" strokeWidth="5" />
                      <circle cx="32" cy="32" r="26" fill="none" stroke="#3b82f6" strokeWidth="5"
                        strokeDasharray={circumference} strokeDashoffset={dashOffset}
                        strokeLinecap="round" transform="rotate(-90 32 32)" />
                    </svg>
                    <div>
                      <p className="text-2xl font-medium text-zinc-900">{progressPct}%</p>
                      <p className="text-xs text-zinc-400 mt-0.5">Estimated completion · {progressUpdates.length} update{progressUpdates.length !== 1 ? 's' : ''} filed</p>
                    </div>
                  </div>

                  {/* Description */}
                  {currentTask.description && (
                    <div className="text-sm text-zinc-500 leading-relaxed border-l-2 border-zinc-200 pl-4 py-1">
                      {currentTask.description}
                    </div>
                  )}

                  {/* Latest update preview */}
                  {progressUpdates.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-zinc-400 uppercase tracking-widest mb-3">Latest update</p>
                      <div className="border border-zinc-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
                          <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-medium">
                            {(progressUpdates[0].created_by_name || 'U').charAt(0)}
                          </div>
                          <span className="text-zinc-500 font-medium">{progressUpdates[0].created_by_name || 'Unknown'}</span>
                          <span>·</span>
                          <span>{fmt(progressUpdates[0].created_at)}</span>
                        </div>
                        <p className="text-sm text-zinc-700 leading-relaxed line-clamp-3">
                          {progressUpdates[0].description || '(No description)'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── PROGRESS UPDATES ─────────────────────────────────────────── */}
              {activeTab === 'progress' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-900">Progress updates</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">{progressUpdates.length} {progressUpdates.length === 1 ? 'entry' : 'entries'} · most recent first</p>
                    </div>
                    {has('progress-updates.create') && (
                      <Button onClick={() => setShowAddProgressModal(true)} size="sm"
                        className="h-8 text-xs px-3 gap-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-none">
                        <Plus size={12} /> Add update
                      </Button>
                    )}
                  </div>

                  {progressUpdates.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {progressUpdates.map((update, idx) => (
                        <UpdateCard
                          key={update.id}
                          update={update}
                          currentTask={currentTask}
                          isFirst={idx === 0}
                          downloadUrl={getDownloadUrl(update)}
                          onEdit={() => { setEditProgressUpdate({ ...update, task: currentTask }); setShowEditProgressModal(true); }}
                          onDelete={() => { setDeleteProgressUpdate({ ...update, task: currentTask }); setShowDeleteProgressModal(true); }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-16 gap-3 text-zinc-400">
                      <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
                        <Activity size={20} className="text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">No progress updates yet</p>
                      <p className="text-xs text-zinc-400">Add the first update to start tracking progress</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── CLIENT REQUESTS ──────────────────────────────────────────── */}
              {activeTab === 'requests' && (
                <div className="p-6">
                  <div className="mb-5">
                    <h3 className="text-sm font-medium text-zinc-900">Client update requests</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{clientUpdateRequests.length} request{clientUpdateRequests.length !== 1 ? 's' : ''} linked to this task</p>
                  </div>

                  {clientUpdateRequests.length > 0 ? (
                    <div className="space-y-3">
                      {clientUpdateRequests.map((req) => (
                        <div key={req.id} className="border border-zinc-200 rounded-xl overflow-hidden hover:border-zinc-300 transition-colors">
                          {/* Request header */}
                          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
                            <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-medium flex-shrink-0">
                              {(req.client?.client_name || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-zinc-800 truncate">{req.client?.client_name || 'Unknown Client'}</p>
                              <p className="text-[10px] text-zinc-400">{fmtFull(req.created_at)}</p>
                            </div>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-600 border border-violet-100 rounded-full text-[10px] font-medium flex-shrink-0">
                              <Mail size={9} /> Request
                            </span>
                          </div>
                          {/* Request body */}
                          <div className="px-4 py-3.5">
                            <p className="text-sm font-medium text-zinc-800 mb-1.5">{req.subject}</p>
                            <p className="text-xs text-zinc-500 leading-relaxed">{req.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-16 gap-3 text-zinc-400">
                      <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
                        <MessageSquare size={20} className="text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">No client requests</p>
                      <p className="text-xs text-zinc-400">Client update requests linked to this task will appear here</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── ISSUES ───────────────────────────────────────────────────── */}
              {activeTab === 'issues' && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-900">Issues</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">{issues.length} {issues.length === 1 ? 'issue' : 'issues'} · {issues.filter(i => i.status === 'open').length} open</p>
                    </div>
                    {has('project-issues.create') && (
                      <Button onClick={() => setShowAddIssueModal(true)} size="sm"
                        className="h-8 text-xs px-3 gap-1.5 bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-none">
                        <Plus size={12} /> Report issue
                      </Button>
                    )}
                  </div>

                  {issues.length > 0 ? (
                    <div className="space-y-2">
                      {issues.map((issue) => (
                        <div key={issue.id} className="group flex gap-3 border border-zinc-200 rounded-xl p-4 hover:border-zinc-300 transition-colors">
                          {/* Severity bar */}
                          <div className={`w-0.5 rounded-full flex-shrink-0 self-stretch ${
                            issue.priority === 'high' || issue.priority === 'critical' ? 'bg-red-400' :
                            issue.priority === 'medium' ? 'bg-amber-400' : 'bg-zinc-300'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-800 mb-1">{issue.title}</p>
                            {issue.description && (
                              <p className="text-xs text-zinc-500 leading-relaxed mb-2.5 line-clamp-2">{issue.description}</p>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {issueStatusBadge(issue.status)}
                              {priorityBadge(issue.priority)}
                              {(issue.assignedTo?.name || issue.assigned_to_name) && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400">
                                  <User size={9} /> {issue.assignedTo?.name || issue.assigned_to_name}
                                </span>
                              )}
                            </div>
                            {issue.resolved_at && (
                              <div className="mt-2">
                                <span className="inline-flex items-center gap-1 text-[10px] text-green-600 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 size={9} /> Resolved {fmt(issue.resolved_at)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            {has('project-issues.update') && issue.status !== 'closed' && (
                              <button onClick={() => handleResolveIssue(issue)}
                                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${
                                  issue.status === 'resolved'
                                    ? 'border-zinc-200 text-zinc-400 hover:bg-zinc-50'
                                    : 'border-green-200 text-green-500 hover:bg-green-50'
                                }`}
                                title={issue.status === 'resolved' ? 'Reopen' : 'Resolve'}>
                                {issue.status === 'resolved' ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
                              </button>
                            )}
                            {has('project-issues.update') && (
                              <button onClick={() => { setEditIssue({ ...issue, task: currentTask }); setShowEditIssueModal(true); }}
                                className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-colors">
                                <SquarePen size={13} />
                              </button>
                            )}
                            {has('project-issues.delete') && (
                              <button onClick={() => { setDeleteIssue({ ...issue, task: currentTask }); setShowDeleteIssueModal(true); }}
                                className="w-7 h-7 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-16 gap-3 text-zinc-400">
                      <div className="w-12 h-12 rounded-full bg-zinc-50 flex items-center justify-center">
                        <AlertCircle size={20} className="text-zinc-300" />
                      </div>
                      <p className="text-sm font-medium text-zinc-500">No issues reported</p>
                      <p className="text-xs text-zinc-400">Everything looks clean on this task</p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Sub-modals ───────────────────────────────────────────────────────── */}
      {showAddProgressModal && <AddProgressUpdate setShowAddModal={withRefresh(setShowAddProgressModal)} project={project} tasks={allTasks} preselectedTask={currentTask} />}
      {showEditProgressModal && editProgressUpdate && <EditProgressUpdate setShowEditModal={withRefresh(setShowEditProgressModal)} progressUpdate={editProgressUpdate} project={project} tasks={allTasks} />}
      {showDeleteProgressModal && deleteProgressUpdate && <DeleteProgressUpdate setShowDeleteModal={withRefresh(setShowDeleteProgressModal)} progressUpdate={deleteProgressUpdate} task={deleteProgressUpdate.task || currentTask} />}
      {showAddIssueModal && <AddIssue setShowAddModal={withRefresh(setShowAddIssueModal)} project={project} milestones={milestones || []} tasks={allTasks || []} users={users || []} preselectedTask={currentTask} />}
      {showEditIssueModal && editIssue && <EditIssue setShowEditModal={withRefresh(setShowEditIssueModal)} issue={editIssue} project={project} milestones={milestones || []} tasks={allTasks || []} users={users || []} />}
      {showDeleteIssueModal && deleteIssue && <DeleteIssue setShowDeleteModal={withRefresh(setShowDeleteIssueModal)} issue={deleteIssue} project={project} />}
    </>
  );
};

export default TaskDetailModal;