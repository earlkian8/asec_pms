import { useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { X, Plus, Trash2, SquarePen, Package, Truck, Save } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/Components/ui/select';
import { usePermission } from '@/utils/permissions';

const EMPTY_FORM = { project_material_allocation_id: '', quantity_used: '', notes: '' };

export default function MilestoneMaterialUsage({ milestone, project, projectAllocations, onClose }) {
    const { has } = usePermission();
    const usages = milestone.material_usages ?? milestone.materialUsages ?? [];

    const getUsedForAllocation = (allocationId) => {
        return usages
            .filter(u => String(u.project_material_allocation_id) === String(allocationId))
            .reduce((sum, u) => sum + parseFloat(u.quantity_used || 0), 0);
    };

    const [form, setForm]         = useState(EMPTY_FORM);
    const [editUsage, setEditUsage] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const resetForm = () => { setForm(EMPTY_FORM); setEditUsage(null); };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.project_material_allocation_id || !form.quantity_used) {
            toast.error('Please fill in all required fields.');
            return;
        }
        setSubmitting(true);

        const isEdit = !!editUsage;
        const opts = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(isEdit ? 'Usage updated.' : 'Usage recorded.');
                resetForm();
                setSubmitting(false);
            },
            onError: (errors) => {
                toast.error(Object.values(errors)[0] || 'Failed to save.');
                setSubmitting(false);
            },
        };

        if (isEdit) {
            router.put(
                route('project-management.project-milestones.material-usage.update', [project.id, milestone.id, editUsage.id]),
                form,
                opts
            );
        } else {
            router.post(
                route('project-management.project-milestones.material-usage.store', [project.id, milestone.id]),
                form,
                opts
            );
        }
    };

    const handleDelete = (usage) => {
        if (!confirm('Delete this material usage record?')) return;
        router.delete(
            route('project-management.project-milestones.material-usage.destroy', [project.id, milestone.id, usage.id]),
            {
                preserveScroll: true,
                onSuccess: () => toast.success('Usage deleted.'),
                onError: () => toast.error('Failed to delete.'),
            }
        );
    };

    const startEdit = (usage) => {
        setEditUsage(usage);
        setForm({
            project_material_allocation_id: String(usage.project_material_allocation_id),
            quantity_used: String(usage.quantity_used),
            notes: usage.notes ?? '',
        });
    };

    const getAllocationLabel = (allocationId) => {
        const a = projectAllocations.find(x => String(x.id) === String(allocationId));
        if (!a) return '---';
        const available = Math.max(0, a.qty_received - a.qty_used);
        return `${a.name} (${a.code}) — ${available} ${a.unit} available`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-t-2xl">
                    <div>
                        <h2 className="text-base font-semibold text-white">Material Usage</h2>
                        <p className="text-xs text-zinc-300 mt-0.5">{milestone.name}</p>
                    </div>
                    <button onClick={onClose} className="text-white hover:bg-zinc-600 rounded-lg p-1.5 transition">
                        <X size={18} />
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                    {/* Add / Edit Form */}
                    {(has('milestone-material-usage.create') || has('milestone-material-usage.update')) && (
                        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                            <h3 className="text-sm font-semibold text-gray-700">
                                {editUsage ? 'Edit Usage' : 'Record Material Usage'}
                            </h3>

                            <div>
                                <Label className="text-xs font-medium text-gray-600 mb-1 block">Material *</Label>
                                <Select
                                    value={form.project_material_allocation_id}
                                    onValueChange={v => setForm(p => ({ ...p, project_material_allocation_id: v }))}
                                >
                                    <SelectTrigger className="h-9 w-full">
                                        <SelectValue placeholder="Select material..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {projectAllocations.map(a => {
                                            const available = Math.max(0, a.qty_received - a.qty_used);
                                            const isEditingSelf = editUsage && String(editUsage.project_material_allocation_id) === String(a.id);
                                            const disabled = available <= 0 && !isEditingSelf;
                                            return (
                                                <SelectItem key={a.id} value={String(a.id)} disabled={disabled}>
                                                    <span className="flex items-center gap-1.5">
                                                        {a.is_direct
                                                            ? <Truck size={12} className="text-blue-500 flex-shrink-0" />
                                                            : <Package size={12} className="text-green-500 flex-shrink-0" />}
                                                        {a.name} ({a.code})
                                                        <span className={`ml-1 text-xs font-medium ${disabled ? 'text-red-400' : available <= a.qty_received * 0.2 ? 'text-amber-600' : 'text-green-600'}`}>
                                                            {available} {a.unit} available
                                                        </span>
                                                    </span>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs font-medium text-gray-600 mb-1 block">Quantity Used *</Label>
                                    {(() => {
                                        const selected = projectAllocations.find(a => String(a.id) === String(form.project_material_allocation_id));
                                        const available = selected ? Math.max(0, selected.qty_received - selected.qty_used) : undefined;
                                        const editingOwnQty = editUsage && String(editUsage.project_material_allocation_id) === String(form.project_material_allocation_id)
                                            ? parseFloat(editUsage.quantity_used) : 0;
                                        const maxQty = available !== undefined ? available + editingOwnQty : undefined;
                                        return (
                                            <>
                                                <Input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    max={maxQty}
                                                    value={form.quantity_used}
                                                    onChange={e => setForm(p => ({ ...p, quantity_used: e.target.value }))}
                                                    className="h-9"
                                                    placeholder="0.00"
                                                />
                                                {maxQty !== undefined && (
                                                    <p className="text-xs text-gray-400 mt-1">Max: {maxQty} {selected?.unit}</p>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                                <div>
                                    <Label className="text-xs font-medium text-gray-600 mb-1 block">Notes</Label>
                                    <Input
                                        value={form.notes}
                                        onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                                        className="h-9"
                                        placeholder="Optional notes..."
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-1">
                                <Button type="submit" disabled={submitting}
                                    className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white h-9 px-4 text-sm flex items-center gap-1.5">
                                    <Save size={14} />
                                    {editUsage ? 'Update' : 'Save'}
                                </Button>
                                {editUsage && (
                                    <Button type="button" variant="outline" onClick={resetForm} className="h-9 px-4 text-sm">
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </form>
                    )}

                    {/* Usage List */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                            Recorded Usages
                            <span className="ml-2 text-xs font-normal text-gray-400">({usages.length})</span>
                        </h3>

                        {usages.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">
                                No material usages recorded yet.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {usages.map(usage => {
                                    const alloc = usage.allocation ?? {};
                                    const item  = alloc.inventory_item ?? alloc.inventoryItem ?? {};
                                    const ds    = alloc.direct_supply  ?? alloc.directSupply  ?? null;
                                    const isDs  = !!alloc.direct_supply_id;
                                    const name  = isDs ? (ds?.supply_name ?? 'Direct Supply') : (item.item_name ?? 'Unknown');
                                    const unit  = isDs ? (ds?.unit_of_measure ?? 'units') : (item.unit_of_measure ?? 'units');
                                    const totalUsed = getUsedForAllocation(usage.project_material_allocation_id);
                                    const allocMeta = projectAllocations.find(a => String(a.id) === String(usage.project_material_allocation_id));
                                    // remaining = received stock minus ALL usage across all milestones
                                    const remaining = allocMeta ? Math.max(0, allocMeta.qty_received - allocMeta.qty_used) : null;

                                    return (
                                        <div key={usage.id}
                                            className="flex items-start justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
                                            <div className="flex items-start gap-2 min-w-0">
                                                {isDs
                                                    ? <Truck size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                                    : <Package size={14} className="text-green-500 mt-0.5 flex-shrink-0" />}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                                        <p className="text-xs text-gray-500">
                                                            Used: <span className="font-medium text-gray-700">{usage.quantity_used} {unit}</span>
                                                        </p>
                                                        {remaining !== null && (
                                                            <p className="text-xs text-gray-500">
                                                                Remaining stock: <span className={`font-medium ${remaining === 0 ? 'text-red-500' : remaining <= (allocMeta?.qty_received * 0.2) ? 'text-amber-600' : 'text-green-600'}`}>{remaining} {unit}</span>
                                                            </p>
                                                        )}
                                                        {usage.notes && <span className="text-xs text-gray-400">— {usage.notes}</span>}
                                                    </div>
                                                    {usage.recorded_by && (
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            By {usage.recorded_by?.name ?? usage.recordedBy?.name ?? '---'}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0">
                                                {has('milestone-material-usage.update') && (
                                                    <button onClick={() => startEdit(usage)}
                                                        className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition" title="Edit">
                                                        <SquarePen size={15} />
                                                    </button>
                                                )}
                                                {has('milestone-material-usage.delete') && (
                                                    <button onClick={() => handleDelete(usage)}
                                                        className="p-1.5 rounded hover:bg-red-100 text-red-600 transition" title="Delete">
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
