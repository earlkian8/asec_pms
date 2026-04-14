import { Fragment, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import {
    Plus,
    Trash2,
    Pencil,
    X,
    Save,
    ChevronDown,
    ChevronRight,
    Info,
    Package,
    Wrench,
} from 'lucide-react';
import { usePermission } from '@/utils/permissions';

const toSectionCode = (index) => {
    let n = index;
    let out = '';
    do {
        out = String.fromCharCode(65 + (n % 26)) + out;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return out;
};

const formatCurrency = (n) =>
    Number(n || 0).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const toNumber = (value) => {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
};

const ReadOnlyInput = ({ value, className = '' }) => (
    <input
        readOnly
        value={value ?? ''}
        className={`w-full rounded border border-gray-200 bg-gray-50 px-2 py-1 text-sm text-gray-700 cursor-default focus:outline-none ${className}`}
    />
);

const VarianceBadge = ({ planned, actual }) => {
    const diff = Number(planned || 0) - Number(actual || 0);
    if (Number(planned || 0) === 0 && Number(actual || 0) === 0) return null;
    if (diff > 0)
        return (
            <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                ₱{formatCurrency(diff)} under
            </span>
        );
    if (diff < 0)
        return (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                ₱{formatCurrency(Math.abs(diff))} over
            </span>
        );
    return (
        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            on budget
        </span>
    );
};

export default function BOQTab({ project, boqData }) {
    const { has } = usePermission();
    const canEdit = has('project-boq.update') || has('project-boq.create');

    const initialSections = useMemo(
        () =>
            (boqData?.sections || []).map((s) => ({
                code: s.code || '',
                name: s.name || '',
                description: s.description || '',
                sort_order: s.sort_order ?? 0,
                items: (s.items || []).map((i) => ({
                    item_code: i.item_code || '',
                    description: i.description || '',
                    resources: (i.resources || []).map((r) => ({ ...r })),
                    planned_vs_actual: i.planned_vs_actual || null,
                    remarks: i.remarks || '',
                    sort_order: i.sort_order ?? 0,
                })),
            })),
        [boqData]
    );

    const resourceOptions = boqData?.resource_options || {};
    const inventoryItems = resourceOptions.inventory_items || [];
    const directSupplies = resourceOptions.direct_supplies || [];
    const userOptions = resourceOptions.users || [];
    const employeeOptions = resourceOptions.employees || [];

    const [editing, setEditing] = useState(false);
    const [sections, setSections] = useState(initialSections);
    const [collapsedSections, setCollapsedSections] = useState({});
    const [collapsedItems, setCollapsedItems] = useState({});
    const [saving, setSaving] = useState(false);

    const contractAmount = boqData?.contract_amount ?? project?.contract_amount ?? 0;
    const actualTotal = boqData?.actual_total ?? 0;

    const projectDays = (() => {
        const start = project?.start_date;
        const end   = project?.planned_end_date;
        if (!start || !end) return null;
        return Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1;
    })();

    const getResourceTotal = (resource) =>
        toNumber(resource?.quantity) * toNumber(resource?.unit_price);

    const getItemTotal = (item) => {
        if (Array.isArray(item?.resources) && item.resources.length > 0) {
            return item.resources.reduce((sum, r) => sum + getResourceTotal(r), 0);
        }
        return 0;
    };

    const grandTotal = useMemo(
        () =>
            sections.reduce(
                (sum, s) =>
                    sum + (s.items || []).reduce((sub, i) => sub + getItemTotal(i), 0),
                0
            ),
        [sections]
    );

    const sectionSubtotal = (section) =>
        (section.items || []).reduce((sub, i) => sub + getItemTotal(i), 0);

    const sectionActual = (section) =>
        (section.items || []).reduce(
            (sub, i) => sub + Number(i.planned_vs_actual?.total_actual || 0),
            0
        );

    const contractVariance = Number(contractAmount) - grandTotal;
    const plannedVsActualVariance = grandTotal - Number(actualTotal || 0);

    const toggleSection = (sIndex) =>
        setCollapsedSections((prev) => ({ ...prev, [sIndex]: !prev[sIndex] }));

    const toggleItem = (sIndex, iIndex) => {
        const key = `${sIndex}-${iIndex}`;
        setCollapsedItems((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const startEdit = () => {
        setSections(initialSections);
        setEditing(true);
    };

    const cancelEdit = () => {
        setSections(initialSections);
        setEditing(false);
    };

    const handleSave = () => {
        setSaving(true);
        router.post(
            route('project-management.project-boq.store', project.id),
            { sections },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('BOQ saved');
                    setEditing(false);
                    setSaving(false);
                },
                onError: (errors) => {
                    setSaving(false);
                    const firstError = Object.values(errors || {})[0];
                    toast.error(firstError || 'Failed to save BOQ');
                },
            }
        );
    };

    // ── Section CRUD ─────────────────────────────────────────────────────────
    const addSection = () =>
        setSections((prev) => [
            ...prev,
            {
                code: toSectionCode(prev.length),
                name: '',
                description: '',
                sort_order: prev.length,
                create_milestone: true,
                items: [],
            },
        ]);

    const removeSection = (sIndex) =>
        setSections((prev) => prev.filter((_, i) => i !== sIndex));

    const updateSection = (sIndex, data) =>
        setSections((prev) =>
            prev.map((s, i) => (i === sIndex ? { ...s, ...data } : s))
        );

    // ── Item CRUD ─────────────────────────────────────────────────────────────
    const addItem = (sIndex) =>
        setSections((prev) =>
            prev.map((s, i) => {
                if (i !== sIndex) return s;
                return {
                    ...s,
                    items: [
                        ...(s.items || []),
                        {
                            item_code: '',
                            description: '',
                            resources: [],
                            remarks: '',
                            sort_order: (s.items || []).length,
                        },
                    ],
                };
            })
        );

    const removeItem = (sIndex, iIndex) =>
        setSections((prev) =>
            prev.map((s, i) =>
                i === sIndex
                    ? { ...s, items: (s.items || []).filter((_, j) => j !== iIndex) }
                    : s
            )
        );

    const updateItem = (sIndex, iIndex, data) =>
        setSections((prev) =>
            prev.map((s, i) => {
                if (i !== sIndex) return s;
                return {
                    ...s,
                    items: (s.items || []).map((item, j) =>
                        j === iIndex ? { ...item, ...data } : item
                    ),
                };
            })
        );

    // ── Resource CRUD ─────────────────────────────────────────────────────────
    const applyResourceRollup = (sIndex, iIndex, resources) =>
        updateItem(sIndex, iIndex, { resources });

    const addResource = (sIndex, iIndex, resourceCategory) => {
        const item = sections?.[sIndex]?.items?.[iIndex] || {};
        const current = Array.isArray(item.resources) ? item.resources : [];
        applyResourceRollup(sIndex, iIndex, [
            ...current,
            {
                resource_category: resourceCategory,
                source_type: resourceCategory === 'material' ? 'inventory' : 'employee',
                inventory_item_id: '',
                direct_supply_id: '',
                user_id: '',
                employee_id: '',
                resource_name: '',
                unit: '',
                quantity: 1,
                unit_price: 0,
                remarks: '',
                sort_order: current.length,
            },
        ]);
    };

    const removeResource = (sIndex, iIndex, rIndex) => {
        const item = sections?.[sIndex]?.items?.[iIndex] || {};
        const current = Array.isArray(item.resources) ? item.resources : [];
        applyResourceRollup(
            sIndex,
            iIndex,
            current.filter((_, idx) => idx !== rIndex).map((r, idx) => ({ ...r, sort_order: idx }))
        );
    };

    const updateResource = (sIndex, iIndex, rIndex, patch) => {
        const item = sections?.[sIndex]?.items?.[iIndex] || {};
        const current = Array.isArray(item.resources) ? item.resources : [];

        const next = current.map((resource, idx) => {
            if (idx !== rIndex) return resource;
            const updated = { ...resource, ...patch };

            if (patch.source_type) {
                updated.inventory_item_id = '';
                updated.direct_supply_id = '';
                updated.user_id = '';
                updated.employee_id = '';
                updated.resource_name = '';
                updated.unit = '';
                updated.unit_price = 0;
            }

            if (patch.inventory_item_id) {
                const sel = inventoryItems.find((x) => String(x.id) === String(patch.inventory_item_id));
                if (sel) {
                    updated.resource_name = sel.name;
                    updated.unit = sel.unit || '';
                    updated.unit_price = toNumber(sel.unit_price);
                    updated.source_type = 'inventory';
                    updated.direct_supply_id = '';
                }
            }

            if (patch.direct_supply_id) {
                const sel = directSupplies.find((x) => String(x.id) === String(patch.direct_supply_id));
                if (sel) {
                    updated.resource_name = sel.name;
                    updated.unit = sel.unit || '';
                    updated.unit_price = toNumber(sel.unit_price);
                    updated.source_type = 'direct_supply';
                    updated.inventory_item_id = '';
                }
            }

            if (patch.user_id) {
                const sel = userOptions.find((x) => String(x.id) === String(patch.user_id));
                if (sel) {
                    const hr = toNumber(sel?.compensation?.hourly_rate);
                    const ms = toNumber(sel?.compensation?.monthly_salary);
                    const raw = hr > 0 ? hr * 8 : ms > 0 ? ms / 26 : 0;
                    updated.resource_name = sel.name;
                    updated.unit = 'day';
                    updated.unit_price = Math.round(raw * 100) / 100;
                    updated.source_type = 'user';
                    updated.employee_id = '';
                }
            }

            if (patch.employee_id) {
                const sel = employeeOptions.find((x) => String(x.id) === String(patch.employee_id));
                if (sel) {
                    const hr = toNumber(sel?.compensation?.hourly_rate);
                    const ms = toNumber(sel?.compensation?.monthly_salary);
                    const raw = hr > 0 ? hr * 8 : ms > 0 ? ms / 26 : 0;
                    updated.resource_name = sel.name;
                    updated.unit = 'day';
                    updated.unit_price = Math.round(raw * 100) / 100;
                    updated.source_type = 'employee';
                    updated.user_id = '';
                }
            }

            return updated;
        });

        applyResourceRollup(sIndex, iIndex, next);
    };

    // ── Resource table (view mode) ────────────────────────────────────────────
    const renderResourceTable = (resources, category, icon) => {
        const filtered = (resources || []).filter((r) => r.resource_category === category);
        if (filtered.length === 0) return null;
        const subtotal = filtered.reduce((s, r) => s + getResourceTotal(r), 0);

        return (
            <div className="mt-3">
                <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {icon}
                    {category === 'material' ? 'Materials & Equipment' : 'Labor'}
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-200 text-xs text-gray-500">
                            <th className="pb-1 text-left font-medium">Resource</th>
                            <th className="pb-1 text-right font-medium w-16">Unit</th>
                            <th className="pb-1 text-right font-medium w-20">Qty</th>
                            <th className="pb-1 text-right font-medium w-28">Unit Price</th>
                            <th className="pb-1 text-right font-medium w-28">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((r, idx) => (
                            <tr key={idx} className="border-b border-gray-100 last:border-0">
                                <td className="py-1 pr-2">
                                    <ReadOnlyInput value={r.resource_name || '—'} />
                                </td>
                                <td className="py-1 px-1">
                                    <ReadOnlyInput value={r.unit || '—'} className="text-right" />
                                </td>
                                <td className="py-1 px-1">
                                    <ReadOnlyInput
                                        value={Number(r.quantity || 0).toLocaleString()}
                                        className="text-right"
                                    />
                                </td>
                                <td className="py-1 px-1">
                                    <ReadOnlyInput
                                        value={`₱${formatCurrency(r.unit_price || 0)}`}
                                        className="text-right"
                                    />
                                </td>
                                <td className="py-1 pl-1">
                                    <ReadOnlyInput
                                        value={`₱${formatCurrency(getResourceTotal(r))}`}
                                        className="text-right font-medium"
                                    />
                                </td>
                            </tr>
                        ))}
                        <tr className="border-t border-gray-300">
                            <td colSpan={4} className="pt-1 text-right text-xs font-semibold text-gray-600 pr-2">
                                Subtotal
                            </td>
                            <td className="pt-1 pl-1 text-right text-xs font-semibold text-gray-800">
                                ₱{formatCurrency(subtotal)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    };

    // ── Resource rows (edit mode) ─────────────────────────────────────────────
    const renderEditResourceRows = (resources, category, sIndex, iIndex) => {
        const filtered = (resources || [])
            .map((r, origIdx) => ({ ...r, _origIdx: origIdx }))
            .filter((r) => r.resource_category === category);

        return filtered.map((resource) => {
            const rIndex = resource._origIdx;
            return (
                <div
                    key={rIndex}
                    className="grid grid-cols-1 gap-2 rounded-md border border-zinc-200 bg-white p-2 sm:grid-cols-6"
                >
                    <select
                        value={resource.source_type || ''}
                        onChange={(e) =>
                            updateResource(sIndex, iIndex, rIndex, { source_type: e.target.value })
                        }
                        className="h-9 rounded-md border border-zinc-300 px-2 text-sm"
                    >
                        {category === 'material' ? (
                            <>
                                <option value="inventory">Inventory</option>
                                <option value="direct_supply">Direct Supply</option>
                            </>
                        ) : (
                            <>
                                <option value="employee">Employee</option>
                                <option value="user">User</option>
                            </>
                        )}
                    </select>

                    {category === 'material' && resource.source_type === 'inventory' && (
                        <select
                            value={resource.inventory_item_id || ''}
                            onChange={(e) =>
                                updateResource(sIndex, iIndex, rIndex, { inventory_item_id: e.target.value })
                            }
                            className="h-9 rounded-md border border-zinc-300 px-2 text-sm sm:col-span-2"
                        >
                            <option value="">Select inventory item</option>
                            {inventoryItems.map((inv) => (
                                <option key={inv.id} value={inv.id}>
                                    {inv.code ? `${inv.code} - ` : ''}{inv.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {category === 'material' && resource.source_type === 'direct_supply' && (
                        <select
                            value={resource.direct_supply_id || ''}
                            onChange={(e) =>
                                updateResource(sIndex, iIndex, rIndex, { direct_supply_id: e.target.value })
                            }
                            className="h-9 rounded-md border border-zinc-300 px-2 text-sm sm:col-span-2"
                        >
                            <option value="">Select direct supply</option>
                            {directSupplies.map((supply) => (
                                <option key={supply.id} value={supply.id}>
                                    {supply.code ? `${supply.code} - ` : ''}{supply.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {category === 'labor' && resource.source_type === 'employee' && (
                        <select
                            value={resource.employee_id || ''}
                            onChange={(e) =>
                                updateResource(sIndex, iIndex, rIndex, { employee_id: e.target.value })
                            }
                            className="h-9 rounded-md border border-zinc-300 px-2 text-sm sm:col-span-2"
                        >
                            <option value="">Select employee</option>
                            {employeeOptions.map((person) => (
                                <option key={person.id} value={person.id}>
                                    {person.name}
                                </option>
                            ))}
                        </select>
                    )}

                    {category === 'labor' && resource.source_type === 'user' && (
                        <select
                            value={resource.user_id || ''}
                            onChange={(e) =>
                                updateResource(sIndex, iIndex, rIndex, { user_id: e.target.value })
                            }
                            className="h-9 rounded-md border border-zinc-300 px-2 text-sm sm:col-span-2"
                        >
                            <option value="">Select user</option>
                            {userOptions.map((person) => (
                                <option key={person.id} value={person.id}>
                                    {person.name}
                                </option>
                            ))}
                        </select>
                    )}

                    <div className={category === 'labor' ? 'sm:col-span-1' : ''}>
                        <Input
                            type="number"
                            min="0"
                            step="0.0001"
                            value={resource.quantity ?? ''}
                            onChange={(e) =>
                                updateResource(sIndex, iIndex, rIndex, { quantity: e.target.value })
                            }
                            placeholder={category === 'labor' ? 'Days' : 'Qty'}
                            className="text-right w-full"
                        />
                        {category === 'labor' && projectDays !== null && (
                            <p className={`mt-0.5 text-xs ${parseFloat(resource.quantity || 0) > projectDays ? 'text-amber-600 font-medium' : 'text-zinc-400'}`}>
                                {parseFloat(resource.quantity || 0) > projectDays
                                    ? `Exceeds project duration (${projectDays} days)`
                                    : `Max: ${projectDays} days`}
                            </p>
                        )}
                    </div>

                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={resource.unit_price ?? ''}
                        onChange={(e) =>
                            updateResource(sIndex, iIndex, rIndex, { unit_price: e.target.value })
                        }
                        placeholder="Daily Rate"
                        className="text-right"
                    />

                    <div className="flex items-center justify-between rounded-md bg-zinc-50 px-2 text-xs sm:col-span-6">
                        <span className="text-zinc-600">
                            {resource.resource_name || 'Select resource'}{' '}
                            {resource.unit ? `(${resource.unit})` : ''}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-800">
                                ₱{formatCurrency(getResourceTotal(resource))}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500"
                                onClick={() => removeResource(sIndex, iIndex, rIndex)}
                            >
                                <Trash2 size={12} />
                            </Button>
                        </div>
                    </div>
                </div>
            );
        });
    };

    // ── View mode ────────────────────────────────────────────────────────────
    const renderViewMode = () => (
        <div className="space-y-3">
            {sections.length === 0 ? (
                <div className="rounded-md border border-dashed border-zinc-300 p-10 text-center">
                    <p className="text-sm text-zinc-500">No BOQ defined for this project yet.</p>
                    {canEdit && (
                        <Button
                            type="button"
                            onClick={startEdit}
                            className="mt-4 mx-auto flex items-center gap-2 bg-zinc-800 text-white hover:bg-zinc-900"
                        >
                            <Plus size={16} /> Create BOQ
                        </Button>
                    )}
                </div>
            ) : (
                sections.map((section, sIndex) => {
                    const sectionOpen = !collapsedSections[sIndex];
                    const subtotal = sectionSubtotal(section);
                    const actTotal = sectionActual(section);

                    return (
                        <div key={sIndex} className="overflow-hidden rounded-lg border border-zinc-200 shadow-sm">
                            {/* Section header */}
                            <button
                                type="button"
                                onClick={() => toggleSection(sIndex)}
                                className="flex w-full items-center justify-between bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 text-left text-white"
                            >
                                <div className="flex items-center gap-2">
                                    {sectionOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                    <span className="font-semibold">
                                        {section.code ? `${section.code} — ` : ''}
                                        {section.name || 'Unnamed Section'}
                                    </span>
                                    {section.description && (
                                        <span className="hidden text-xs text-zinc-300 sm:inline">
                                            — {section.description}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    {(section.create_milestone ?? true) && (
                                        <span className="rounded-full bg-zinc-600/60 px-2 py-0.5 text-xs text-zinc-200">
                                            Milestone
                                        </span>
                                    )}
                                    <span>₱{formatCurrency(subtotal)}</span>
                                    <VarianceBadge planned={subtotal} actual={actTotal} />
                                </div>
                            </button>

                            {/* Items */}
                            {sectionOpen && (
                                <div className="divide-y divide-gray-100 bg-white">
                                    {(section.items || []).length === 0 ? (
                                        <p className="px-6 py-4 text-sm text-zinc-400">No items in this section.</p>
                                    ) : (
                                        section.items.map((item, iIndex) => {
                                            const itemKey = `${sIndex}-${iIndex}`;
                                            const itemOpen = !collapsedItems[itemKey];
                                            const itemTotal = getItemTotal(item);
                                            const pva = item.planned_vs_actual || {};
                                            const itemActual = Number(pva.total_actual || 0);

                                            return (
                                                <div key={iIndex}>
                                                    {/* Item header */}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleItem(sIndex, iIndex)}
                                                        className="flex w-full items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 px-5 py-2.5 text-left hover:from-gray-100 hover:to-gray-200"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            {itemOpen ? (
                                                                <ChevronDown size={14} className="text-zinc-400" />
                                                            ) : (
                                                                <ChevronRight size={14} className="text-zinc-400" />
                                                            )}
                                                            {item.item_code && (
                                                                <span className="text-xs font-mono text-zinc-500">
                                                                    {item.item_code}
                                                                </span>
                                                            )}
                                                            <span className="text-sm font-medium text-zinc-800">
                                                                {item.description || 'Unnamed Item'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-sm">
                                                            <span className="text-zinc-500 text-xs">
                                                                Planned:{' '}
                                                                <span className="font-medium text-zinc-800">
                                                                    ₱{formatCurrency(itemTotal)}
                                                                </span>
                                                            </span>
                                                            {itemActual > 0 && (
                                                                <span className="text-zinc-500 text-xs">
                                                                    Actual:{' '}
                                                                    <span className="font-medium text-zinc-800">
                                                                        ₱{formatCurrency(itemActual)}
                                                                    </span>
                                                                </span>
                                                            )}
                                                            <VarianceBadge planned={itemTotal} actual={itemActual} />
                                                        </div>
                                                    </button>

                                                    {/* Item resources */}
                                                    {itemOpen && (
                                                        <div className="px-6 py-3 bg-white">
                                                            {(item.resources || []).length === 0 ? (
                                                                <p className="text-sm text-zinc-400 italic">No resources defined.</p>
                                                            ) : (
                                                                <>
                                                                    {renderResourceTable(
                                                                        item.resources,
                                                                        'material',
                                                                        <Package size={12} />
                                                                    )}
                                                                    {renderResourceTable(
                                                                        item.resources,
                                                                        'labor',
                                                                        <Wrench size={12} />
                                                                    )}
                                                                    <div className="mt-3 flex justify-end border-t border-gray-200 pt-2">
                                                                        <span className="text-sm font-semibold text-zinc-800">
                                                                            Item Total: ₱{formatCurrency(itemTotal)}
                                                                        </span>
                                                                    </div>
                                                                </>
                                                            )}
                                                            {item.remarks && (
                                                                <p className="mt-2 text-xs text-zinc-400 italic">
                                                                    {item.remarks}
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );

    // ── Edit mode ────────────────────────────────────────────────────────────
    const renderEditMode = () => (
        <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                    Editing replaces the entire BOQ for this project on save. Linked allocations and
                    milestones are preserved.
                </div>
            </div>

            {sections.map((section, sIndex) => {
                const sectionOpen = !collapsedSections[sIndex];
                const subtotal = sectionSubtotal(section);

                return (
                    <div key={sIndex} className="overflow-hidden rounded-lg border border-zinc-200 shadow-sm">
                        {/* Section header (edit) */}
                        <div className="flex items-center gap-2 bg-gradient-to-r from-zinc-700 to-zinc-800 px-3 py-2">
                            <button
                                type="button"
                                onClick={() => toggleSection(sIndex)}
                                className="text-zinc-300 hover:text-white"
                            >
                                {sectionOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                            </button>
                            <Input
                                value={section.code || ''}
                                onChange={(e) => updateSection(sIndex, { code: e.target.value })}
                                placeholder="Code"
                                className="w-20 bg-zinc-600 border-zinc-500 text-white placeholder-zinc-400"
                            />
                            <Input
                                value={section.name || ''}
                                onChange={(e) => updateSection(sIndex, { name: e.target.value })}
                                placeholder="Section name"
                                className="flex-1 bg-zinc-600 border-zinc-500 text-white placeholder-zinc-400 font-medium"
                            />
                            <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-300 whitespace-nowrap select-none">
                                <input
                                    type="checkbox"
                                    checked={section.create_milestone ?? true}
                                    onChange={(e) => updateSection(sIndex, { create_milestone: e.target.checked })}
                                    className="rounded"
                                />
                                Milestone
                            </label>
                            <span className="text-sm text-zinc-300 whitespace-nowrap">
                                ₱{formatCurrency(subtotal)}
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSection(sIndex)}
                                className="text-red-400 hover:bg-red-900/30 hover:text-red-300"
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>

                        {sectionOpen && (
                            <div className="bg-white">
                                {/* Section description */}
                                <div className="px-4 pt-3">
                                    <Textarea
                                        value={section.description || ''}
                                        onChange={(e) =>
                                            updateSection(sIndex, { description: e.target.value })
                                        }
                                        placeholder="Section notes (optional)"
                                        rows={2}
                                        className="text-sm"
                                    />
                                </div>

                                {/* Items */}
                                <div className="mt-3 divide-y divide-gray-100">
                                    {(section.items || []).length === 0 && (
                                        <p className="px-4 py-3 text-sm text-zinc-400">No items yet.</p>
                                    )}
                                    {(section.items || []).map((item, iIndex) => {
                                        const itemKey = `${sIndex}-${iIndex}`;
                                        const itemOpen = !collapsedItems[itemKey];
                                        const itemTotal = getItemTotal(item);
                                        const materialResources = (item.resources || []).filter(
                                            (r) => r.resource_category === 'material'
                                        );
                                        const laborResources = (item.resources || []).filter(
                                            (r) => r.resource_category === 'labor'
                                        );

                                        return (
                                            <div key={iIndex} className="border-l-2 border-transparent hover:border-zinc-300">
                                                {/* Item header (edit) */}
                                                <div className="flex items-center gap-2 bg-gray-50 px-4 py-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleItem(sIndex, iIndex)}
                                                        className="text-zinc-400 hover:text-zinc-600"
                                                    >
                                                        {itemOpen ? (
                                                            <ChevronDown size={16} />
                                                        ) : (
                                                            <ChevronRight size={16} />
                                                        )}
                                                    </button>
                                                    <Input
                                                        value={item.item_code || ''}
                                                        onChange={(e) =>
                                                            updateItem(sIndex, iIndex, {
                                                                item_code: e.target.value,
                                                            })
                                                        }
                                                        placeholder={`${section.code || ''}.${iIndex + 1}`}
                                                        className="w-24"
                                                    />
                                                    <Input
                                                        value={item.description || ''}
                                                        onChange={(e) =>
                                                            updateItem(sIndex, iIndex, {
                                                                description: e.target.value,
                                                            })
                                                        }
                                                        placeholder="Item description (e.g. Excavation)"
                                                        className="flex-1"
                                                    />
                                                    <span className="text-xs text-zinc-500 whitespace-nowrap">
                                                        ₱{formatCurrency(itemTotal)}
                                                    </span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeItem(sIndex, iIndex)}
                                                        className="text-red-500 hover:bg-red-50"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>

                                                {/* Item resources (edit) */}
                                                {itemOpen && (
                                                    <div className="px-6 py-3 space-y-4">
                                                        {/* Materials */}
                                                        <div>
                                                            <div className="mb-2 flex items-center justify-between">
                                                                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                                    <Package size={12} /> Materials &amp; Equipment
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    className="h-7 text-xs"
                                                                    onClick={() => addResource(sIndex, iIndex, 'material')}
                                                                >
                                                                    <Plus size={12} /> Add Material
                                                                </Button>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {materialResources.length === 0 && (
                                                                    <p className="text-xs text-zinc-400 italic">No materials added.</p>
                                                                )}
                                                                {renderEditResourceRows(item.resources, 'material', sIndex, iIndex)}
                                                            </div>
                                                        </div>

                                                        {/* Labor */}
                                                        <div>
                                                            <div className="mb-2 flex items-center justify-between">
                                                                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                                                    <Wrench size={12} /> Labor
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    className="h-7 text-xs"
                                                                    onClick={() => addResource(sIndex, iIndex, 'labor')}
                                                                >
                                                                    <Plus size={12} /> Add Labor
                                                                </Button>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {laborResources.length === 0 && (
                                                                    <p className="text-xs text-zinc-400 italic">No labor added.</p>
                                                                )}
                                                                {renderEditResourceRows(item.resources, 'labor', sIndex, iIndex)}
                                                            </div>
                                                        </div>

                                                        {/* Item remarks */}
                                                        <Textarea
                                                            value={item.remarks || ''}
                                                            onChange={(e) =>
                                                                updateItem(sIndex, iIndex, { remarks: e.target.value })
                                                            }
                                                            placeholder="Item notes (optional)"
                                                            rows={1}
                                                            className="text-xs"
                                                        />

                                                        {(item.resources || []).length > 0 && (
                                                            <div className="text-right text-xs font-semibold text-zinc-700">
                                                                Item total: ₱{formatCurrency(itemTotal)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="flex justify-end px-4 py-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => addItem(sIndex)}
                                        className="flex items-center gap-2 text-sm"
                                    >
                                        <Plus size={14} /> Add Item
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            <Button
                type="button"
                variant="outline"
                onClick={addSection}
                className="flex items-center gap-2"
            >
                <Plus size={14} /> Add Section
            </Button>
        </div>
    );

    // ── Summary bar ──────────────────────────────────────────────────────────
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap gap-6">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Contract Amount</div>
                        <div className="text-lg font-semibold text-zinc-800">₱{formatCurrency(contractAmount)}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">BOQ Total (Planned)</div>
                        <div className="text-lg font-semibold text-zinc-800">₱{formatCurrency(grandTotal)}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Actual (Used)</div>
                        <div className="text-lg font-semibold text-zinc-800">₱{formatCurrency(actualTotal)}</div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">vs Contract</div>
                        <div
                            className={`text-lg font-semibold ${
                                contractVariance < 0
                                    ? 'text-red-600'
                                    : contractVariance > 0
                                    ? 'text-emerald-600'
                                    : 'text-zinc-800'
                            }`}
                        >
                            ₱{formatCurrency(Math.abs(contractVariance))}
                            {contractVariance < 0 && <span className="ml-1 text-xs">(over)</span>}
                            {contractVariance > 0 && <span className="ml-1 text-xs">(under)</span>}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">Planned vs Actual</div>
                        <div
                            className={`text-lg font-semibold ${
                                plannedVsActualVariance < 0
                                    ? 'text-red-600'
                                    : plannedVsActualVariance > 0
                                    ? 'text-emerald-600'
                                    : 'text-zinc-800'
                            }`}
                        >
                            ₱{formatCurrency(Math.abs(plannedVsActualVariance))}
                            {plannedVsActualVariance < 0 && (
                                <span className="ml-1 text-xs">(overrun)</span>
                            )}
                            {plannedVsActualVariance > 0 && (
                                <span className="ml-1 text-xs">(remaining)</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    {!editing && canEdit && sections.length > 0 && (
                        <Button
                            type="button"
                            onClick={startEdit}
                            className="flex items-center gap-2 bg-zinc-800 text-white hover:bg-zinc-900"
                        >
                            <Pencil size={14} /> Edit BOQ
                        </Button>
                    )}
                    {editing && (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={cancelEdit}
                                disabled={saving}
                                className="flex items-center gap-2"
                            >
                                <X size={14} /> Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                <Save size={14} />
                                {saving ? 'Saving…' : 'Save BOQ'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {contractVariance < 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    BOQ total exceeds contract by ₱{formatCurrency(Math.abs(contractVariance))}. Saving is blocked until BOQ is within contract amount.
                </div>
            )}

            {editing ? renderEditMode() : renderViewMode()}
        </div>
    );
}
