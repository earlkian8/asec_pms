import { useState } from 'react';
import {
    X, Flag, Clock, CheckCircle2, Circle, FileText, User, Calendar,
    AlertCircle, Package, Truck, Boxes, ChevronDown, ChevronRight,
    Activity, AlertTriangle,
} from 'lucide-react';

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '---';

const StatusBadge = ({ status }) => {
    const map = {
        pending:     { label: 'Pending',     cls: 'bg-amber-100 text-amber-700 border-amber-200',   Icon: Clock },
        in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700 border-blue-200',     Icon: Circle },
        completed:   { label: 'Completed',   cls: 'bg-green-100 text-green-700 border-green-200',  Icon: CheckCircle2 },
        open:        { label: 'Open',        cls: 'bg-red-100 text-red-700 border-red-200',        Icon: AlertCircle },
        resolved:    { label: 'Resolved',    cls: 'bg-green-100 text-green-700 border-green-200',  Icon: CheckCircle2 },
        closed:      { label: 'Closed',      cls: 'bg-gray-100 text-gray-600 border-gray-200',     Icon: X },
    };
    const s = map[status] ?? { label: status ?? '---', cls: 'bg-gray-100 text-gray-600 border-gray-200', Icon: Clock };
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-full ${s.cls}`}>
            <s.Icon size={10} />{s.label}
        </span>
    );
};

const Section = ({ title, icon: Icon, iconCls = 'text-gray-500', count, children, defaultOpen = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-left"
            >
                <div className="flex items-center gap-2">
                    <Icon size={15} className={iconCls} />
                    <span className="text-sm font-semibold text-gray-700">{title}</span>
                    {count !== undefined && (
                        <span className="text-xs text-gray-400 font-normal">({count})</span>
                    )}
                </div>
                {open ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
            </button>
            {open && <div className="p-4">{children}</div>}
        </div>
    );
};

export default function MilestoneViewModal({ milestone, projectAllocations = [], onClose }) {
    const tasks        = milestone.tasks ?? [];
    const usages       = milestone.material_usages ?? milestone.materialUsages ?? [];
    const milestoneIssues = Array.isArray(milestone.issues)
        ? milestone.issues.filter(i => !i.project_task_id)
        : [];

    const totalTasks     = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const progress       = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (milestone.status === 'completed' ? 100 : 0);

    const today = new Date(); today.setHours(0, 0, 0, 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

                {/* ── Header ── */}
                <div className="flex items-start justify-between px-6 py-4 bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-t-2xl flex-shrink-0">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="bg-white/10 rounded-lg p-2 flex-shrink-0 mt-0.5">
                            <Flag size={16} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base font-semibold text-white leading-tight truncate">{milestone.name}</h2>
                            <p className="text-xs text-zinc-300 mt-0.5">Milestone Details</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white hover:bg-white/10 rounded-lg p-1.5 transition flex-shrink-0 ml-3">
                        <X size={18} />
                    </button>
                </div>

                {/* ── Body ── */}
                <div className="overflow-y-auto flex-1 p-5 space-y-4">

                    {/* ── Overview ── */}
                    <Section title="Overview" icon={Flag} iconCls="text-blue-500">
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Status</p>
                                <StatusBadge status={milestone.status} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Progress</p>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                                        <div
                                            className={`h-2 rounded-full transition-all ${progress === 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : progress > 0 ? 'bg-yellow-500' : 'bg-gray-300'}`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <span className={`text-xs font-semibold ${progress === 100 ? 'text-green-600' : progress >= 50 ? 'text-blue-600' : progress > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                                        {progress}%
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Start Date</p>
                                <p className="text-gray-800 font-medium">{formatDate(milestone.start_date)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-0.5">Due Date</p>
                                <p className={`font-medium ${milestone.due_date && milestone.status !== 'completed' && new Date(milestone.due_date) < today ? 'text-red-500' : 'text-gray-800'}`}>
                                    {formatDate(milestone.due_date)}
                                </p>
                            </div>
                            {milestone.description && (
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-500 mb-0.5">Description</p>
                                    <p className="text-gray-700 text-sm leading-relaxed">{milestone.description}</p>
                                </div>
                            )}
                        </div>
                    </Section>

                    {/* ── Tasks ── */}
                    <Section title="Tasks" icon={FileText} iconCls="text-blue-500" count={totalTasks}>
                        {tasks.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No tasks yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {tasks.map(task => {
                                    const assigned = task.assignedUser ?? task.assigned_user;
                                    const isOverdue = task.due_date && task.status !== 'completed' && new Date(task.due_date) < today;
                                    const rawPU = task.progressUpdates ?? task.progress_updates ?? [];
                                    const puCount = Array.isArray(rawPU) ? rawPU.length : (rawPU?.data?.length ?? 0);
                                    const rawIssues = Array.isArray(task.issues) ? task.issues : [];
                                    const openIssues = rawIssues.filter(i => i.status === 'open' || i.status === 'in_progress').length;

                                    return (
                                        <div key={task.id} className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                                                    {task.description && (
                                                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{task.description}</p>
                                                    )}
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500">
                                                        {assigned && (
                                                            <span className="flex items-center gap-1">
                                                                <User size={11} className="text-gray-400" />{assigned.name}
                                                            </span>
                                                        )}
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={11} className="text-gray-400" />
                                                            <span className={isOverdue ? 'text-red-500 font-medium' : ''}>{formatDate(task.due_date)}</span>
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Activity size={11} className="text-gray-400" />{puCount} update{puCount !== 1 ? 's' : ''}
                                                        </span>
                                                        {openIssues > 0 && (
                                                            <span className="flex items-center gap-1 text-red-500">
                                                                <AlertCircle size={11} />{openIssues} issue{openIssues !== 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                        {isOverdue && (
                                                            <span className="flex items-center gap-1 text-amber-500">
                                                                <AlertTriangle size={11} />Overdue
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <StatusBadge status={task.status} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Section>

                    {/* ── Material Usages ── */}
                    <Section title="Material Usage" icon={Boxes} iconCls="text-emerald-500" count={usages.length}>
                        {usages.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No material usages recorded.</p>
                        ) : (
                            <div className="space-y-2">
                                {usages.map(usage => {
                                    const alloc  = usage.allocation ?? {};
                                    const item   = alloc.inventory_item ?? alloc.inventoryItem ?? {};
                                    const ds     = alloc.direct_supply  ?? alloc.directSupply  ?? null;
                                    const isDs   = !!alloc.direct_supply_id;
                                    const name   = isDs ? (ds?.supply_name ?? 'Direct Supply') : (item.item_name ?? 'Unknown');
                                    const unit   = isDs ? (ds?.unit_of_measure ?? 'units') : (item.unit_of_measure ?? 'units');
                                    const meta   = projectAllocations.find(a => String(a.id) === String(usage.project_material_allocation_id));
                                    const available = meta ? Math.max(0, meta.qty_received - meta.qty_used) : null;

                                    return (
                                        <div key={usage.id} className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white flex items-start gap-2">
                                            {isDs
                                                ? <Truck size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                                : <Package size={14} className="text-green-500 mt-0.5 flex-shrink-0" />}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                                                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5 text-xs text-gray-500">
                                                    <span>Used: <span className="font-medium text-gray-700">{usage.quantity_used} {unit}</span></span>
                                                    {available !== null && (
                                                        <span>Remaining stock: <span className={`font-medium ${available === 0 ? 'text-red-500' : available <= (meta?.qty_received * 0.2) ? 'text-amber-600' : 'text-green-600'}`}>{available} {unit}</span></span>
                                                    )}
                                                    {usage.notes && <span className="text-gray-400">— {usage.notes}</span>}
                                                </div>
                                                {(usage.recorded_by ?? usage.recordedBy) && (
                                                    <p className="text-xs text-gray-400 mt-0.5">
                                                        By {usage.recorded_by?.name ?? usage.recordedBy?.name ?? '---'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Section>

                    {/* ── Milestone-level Issues ── */}
                    <Section title="Issues" icon={AlertCircle} iconCls="text-orange-500" count={milestoneIssues.length} defaultOpen={milestoneIssues.length > 0}>
                        {milestoneIssues.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">No issues reported.</p>
                        ) : (
                            <div className="space-y-2">
                                {milestoneIssues.map(issue => (
                                    <div key={issue.id} className="border border-orange-100 rounded-lg px-3 py-2.5 bg-orange-50/40">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">{issue.title ?? 'Untitled Issue'}</p>
                                                {issue.description && (
                                                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{issue.description}</p>
                                                )}
                                                <div className="flex flex-wrap gap-x-3 mt-1 text-xs text-gray-500">
                                                    <span>Priority: <span className="font-medium capitalize">{issue.priority ?? 'Medium'}</span></span>
                                                    {issue.reportedBy && <span>By: {issue.reportedBy.name}</span>}
                                                    {issue.assignedTo && <span>Assigned: {issue.assignedTo.name}</span>}
                                                    <span>{formatDate(issue.created_at)}</span>
                                                </div>
                                            </div>
                                            <StatusBadge status={issue.status ?? 'open'} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Section>

                </div>

                {/* ── Footer ── */}
                <div className="flex justify-end px-5 py-3 border-t border-gray-200 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
