import { Fragment, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';
import {
    Plus,
    Trash2,
    Copy,
    Pencil,
    X,
    Save,
    ChevronDown,
    ChevronRight,
    Info,
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
                    unit: i.unit || '',
                    quantity: i.quantity ?? 0,
                    unit_cost: i.unit_cost ?? 0,
                    resource_type: i.resource_type || '',
                    planned_inventory_item_id: i.planned_inventory_item_id || '',
                    planned_direct_supply_id: i.planned_direct_supply_id || '',
                    planned_user_id: i.planned_user_id || '',
                    planned_employee_id: i.planned_employee_id || '',
                    resource_link: i.resource_link || null,
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
    const users = resourceOptions.users || [];
    const employees = resourceOptions.employees || [];

    const [editing, setEditing] = useState(false);
    const [sections, setSections] = useState(initialSections);
    const [collapsed, setCollapsed] = useState({});
    const [saving, setSaving] = useState(false);

    const contractAmount = boqData?.contract_amount ?? project?.contract_amount ?? 0;
    const actualTotal = boqData?.actual_total ?? 0;

    const grandTotal = useMemo(
        () =>
            sections.reduce(
                (sum, s) =>
                    sum +
                    (s.items || []).reduce(
                        (sub, i) =>
                            sub +
                            (parseFloat(i.quantity) || 0) *
                                (parseFloat(i.unit_cost) || 0),
                        0
                    ),
                0
            ),
        [sections]
    );

    const variance = Number(contractAmount) - grandTotal;
    const plannedVsActualVariance = grandTotal - Number(actualTotal || 0);

    const sectionSubtotal = (section) =>
        (section.items || []).reduce(
            (sub, i) =>
                sub +
                (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_cost) || 0),
            0
        );

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

    const toggleCollapse = (index) =>
        setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }));

    const addSection = () => {
        setSections((prev) => [
            ...prev,
            {
                code: toSectionCode(prev.length),
                name: '',
                description: '',
                sort_order: prev.length,
                items: [],
            },
        ]);
    };

    const removeSection = (index) =>
        setSections((prev) => prev.filter((_, i) => i !== index));

    const updateSection = (index, data) =>
        setSections((prev) =>
            prev.map((s, i) => (i === index ? { ...s, ...data } : s))
        );

    const addItem = (sectionIndex, item = {}) => {
        setSections((prev) =>
            prev.map((s, i) => {
                if (i !== sectionIndex) return s;
                const nextItems = [
                    ...(s.items || []),
                    {
                        item_code: '',
                        description: '',
                        unit: '',
                        quantity: 0,
                        unit_cost: 0,
                        resource_type: '',
                        planned_inventory_item_id: '',
                        planned_direct_supply_id: '',
                        planned_user_id: '',
                        planned_employee_id: '',
                        remarks: '',
                        sort_order: (s.items || []).length,
                        ...item,
                    },
                ];
                return { ...s, items: nextItems };
            })
        );
    };

    const removeItem = (sectionIndex, itemIndex) =>
        setSections((prev) =>
            prev.map((s, i) =>
                i === sectionIndex
                    ? {
                          ...s,
                          items: (s.items || []).filter(
                              (_, j) => j !== itemIndex
                          ),
                      }
                    : s
            )
        );

    const updateItem = (sectionIndex, itemIndex, data) => {
        setSections((prev) =>
            prev.map((s, i) => {
                if (i !== sectionIndex) return s;
                const nextItems = (s.items || []).map((item, j) =>
                    j === itemIndex ? { ...item, ...data } : item
                );
                return { ...s, items: nextItems };
            })
        );
    };

    // ── View mode ────────────────────────────────────────────────────────────
    const renderViewMode = () => (
        <div className="space-y-4">
            {sections.length === 0 ? (
                <div className="rounded-md border border-dashed border-zinc-300 p-10 text-center">
                    <p className="text-sm text-zinc-500">
                        No BOQ defined for this project yet.
                    </p>
                    {canEdit && (
                        <Button
                            type="button"
                            onClick={startEdit}
                            className="mt-4 flex items-center gap-2 bg-zinc-800 text-white hover:bg-zinc-900 mx-auto"
                        >
                            <Plus size={16} /> Create BOQ
                        </Button>
                    )}
                </div>
            ) : (
                sections.map((section, sIndex) => {
                    const isCollapsed = collapsed[sIndex];
                    const subtotal = sectionSubtotal(section);
                    return (
                        <div
                            key={sIndex}
                            className="rounded-md border border-zinc-200 bg-white"
                        >
                            <div className="flex items-center justify-between border-b bg-zinc-50 px-4 py-2">
                                <button
                                    type="button"
                                    onClick={() => toggleCollapse(sIndex)}
                                    className="flex items-center gap-2 text-left"
                                >
                                    {isCollapsed ? (
                                        <ChevronRight size={16} />
                                    ) : (
                                        <ChevronDown size={16} />
                                    )}
                                    <span className="font-semibold text-zinc-800">
                                        {section.code
                                            ? `${section.code} — `
                                            : ''}
                                        {section.name}
                                    </span>
                                </button>
                                <span className="text-sm text-zinc-700">
                                    ₱{formatCurrency(subtotal)}
                                </span>
                            </div>
                            {!isCollapsed && (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-24">
                                                Code
                                            </TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead className="w-20">
                                                Unit
                                            </TableHead>
                                            <TableHead className="w-24 text-right">
                                                Qty
                                            </TableHead>
                                            <TableHead className="w-32 text-right">
                                                Unit Cost
                                            </TableHead>
                                            <TableHead className="w-32 text-right">
                                                Amount
                                            </TableHead>
                                            <TableHead className="w-32 text-right">
                                                Actual
                                            </TableHead>
                                            <TableHead className="w-32 text-right">
                                                Item Variance
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(section.items || []).length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={8}
                                                    className="py-4 text-center text-sm text-zinc-400"
                                                >
                                                    No items in this section.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            section.items.map((item, iIndex) => {
                                                const amount =
                                                    (parseFloat(item.quantity) ||
                                                        0) *
                                                    (parseFloat(item.unit_cost) ||
                                                        0);
                                                return (
                                                    <TableRow key={iIndex}>
                                                        {(() => {
                                                            const plannedVsActual = item.planned_vs_actual || {};
                                                            const itemActual = Number(plannedVsActual.total_actual || 0);
                                                            const itemVariance = Number(plannedVsActual.variance ?? amount - itemActual);
                                                            return (
                                                                <>
                                                        <TableCell>
                                                            {item.item_code || '—'}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div>
                                                                {item.description}
                                                            </div>
                                                            {item.resource_type === 'material' && item.resource_link && (
                                                                <div className="mt-1 text-xs text-blue-600">
                                                                    Material link: {item.resource_link.inventory_item?.name || item.resource_link.direct_supply?.name || 'Not selected'}
                                                                </div>
                                                            )}
                                                            {item.resource_type === 'labor' && item.resource_link && (
                                                                <div className="mt-1 text-xs text-emerald-600">
                                                                    Labor link: {item.resource_link.user?.name || item.resource_link.employee?.name || 'Not selected'}
                                                                </div>
                                                            )}
                                                            {item.remarks && (
                                                                <div className="mt-1 text-xs text-zinc-500">
                                                                    {item.remarks}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.unit || '—'}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            {Number(
                                                                item.quantity || 0
                                                            ).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            ₱
                                                            {formatCurrency(
                                                                item.unit_cost
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            ₱{formatCurrency(amount)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            ₱{formatCurrency(itemActual)}
                                                        </TableCell>
                                                        <TableCell className={`text-right font-medium ${itemVariance < 0 ? 'text-red-600' : itemVariance > 0 ? 'text-emerald-600' : 'text-zinc-800'}`}>
                                                            ₱{formatCurrency(Math.abs(itemVariance))}
                                                            {itemVariance < 0 ? ' over' : itemVariance > 0 ? ' under' : ''}
                                                        </TableCell>
                                                                </>
                                                            );
                                                        })()}
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );

    // ── Edit mode ────────────────────────────────────────────────────────────
    const renderEditMode = () => (
        <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <div>
                    Editing replaces the entire BOQ for this project on save.
                    Linked allocations/milestones keep working — their{' '}
                    <code className="rounded bg-white px-1">boq_item_id</code>{' '}
                    is cleared only if the referenced item is removed.
                </div>
            </div>

            {sections.map((section, sIndex) => {
                const isCollapsed = collapsed[sIndex];
                const subtotal = sectionSubtotal(section);
                return (
                    <div
                        key={sIndex}
                        className="rounded-md border border-zinc-200 bg-white shadow-sm"
                    >
                        <div className="flex items-center gap-2 border-b bg-zinc-50 px-3 py-2">
                            <button
                                type="button"
                                onClick={() => toggleCollapse(sIndex)}
                                className="text-zinc-500 hover:text-zinc-800"
                            >
                                {isCollapsed ? (
                                    <ChevronRight size={18} />
                                ) : (
                                    <ChevronDown size={18} />
                                )}
                            </button>
                            <Input
                                value={section.code || ''}
                                onChange={(e) =>
                                    updateSection(sIndex, {
                                        code: e.target.value,
                                    })
                                }
                                placeholder="Code"
                                className="w-20"
                            />
                            <Input
                                value={section.name || ''}
                                onChange={(e) =>
                                    updateSection(sIndex, {
                                        name: e.target.value,
                                    })
                                }
                                placeholder="Section name"
                                className="flex-1 font-medium"
                            />
                            <div className="text-sm text-zinc-600 whitespace-nowrap">
                                ₱{formatCurrency(subtotal)}
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeSection(sIndex)}
                                className="text-red-500 hover:bg-red-50"
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>

                        {!isCollapsed && (
                            <>
                                <div className="px-3 pt-2">
                                    <Textarea
                                        value={section.description || ''}
                                        onChange={(e) =>
                                            updateSection(sIndex, {
                                                description: e.target.value,
                                            })
                                        }
                                        placeholder="Section notes (optional)"
                                        rows={2}
                                        className="text-sm"
                                    />
                                </div>
                                <div className="p-3">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-24">
                                                    Code
                                                </TableHead>
                                                <TableHead>Description</TableHead>
                                                <TableHead className="w-20">
                                                    Unit
                                                </TableHead>
                                                <TableHead className="w-24 text-right">
                                                    Qty
                                                </TableHead>
                                                <TableHead className="w-32 text-right">
                                                    Unit Cost
                                                </TableHead>
                                                <TableHead className="w-32 text-right">
                                                    Amount
                                                </TableHead>
                                                <TableHead className="w-20"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(section.items || []).map(
                                                (item, iIndex) => {
                                                    const qty =
                                                        parseFloat(
                                                            item.quantity
                                                        ) || 0;
                                                    const rate =
                                                        parseFloat(
                                                            item.unit_cost
                                                        ) || 0;
                                                    return (
                                                        <Fragment key={iIndex}>
                                                            <TableRow key={`${iIndex}-main`}>
                                                                <TableCell>
                                                                    <Input
                                                                        value={item.item_code || ''}
                                                                        onChange={(e) =>
                                                                            updateItem(sIndex, iIndex, {
                                                                                item_code: e.target.value,
                                                                            })
                                                                        }
                                                                        placeholder={`${section.code || ''}.${iIndex + 1}`}
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        value={item.description || ''}
                                                                        onChange={(e) =>
                                                                            updateItem(sIndex, iIndex, {
                                                                                description: e.target.value,
                                                                            })
                                                                        }
                                                                        placeholder="Describe the scope item"
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        value={item.unit || ''}
                                                                        onChange={(e) =>
                                                                            updateItem(sIndex, iIndex, {
                                                                                unit: e.target.value,
                                                                            })
                                                                        }
                                                                        placeholder="m³"
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.0001"
                                                                        value={item.quantity ?? ''}
                                                                        onChange={(e) =>
                                                                            updateItem(sIndex, iIndex, {
                                                                                quantity: e.target.value,
                                                                            })
                                                                        }
                                                                        className="text-right"
                                                                    />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        step="0.01"
                                                                        value={item.unit_cost ?? ''}
                                                                        onChange={(e) =>
                                                                            updateItem(sIndex, iIndex, {
                                                                                unit_cost: e.target.value,
                                                                            })
                                                                        }
                                                                        className="text-right"
                                                                    />
                                                                </TableCell>
                                                                <TableCell className="text-right font-medium">
                                                                    ₱{formatCurrency(qty * rate)}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="flex justify-end gap-1">
                                                                        <Button
                                                                            type="button"
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => addItem(sIndex, { ...item })}
                                                                            title="Duplicate row"
                                                                        >
                                                                            <Copy size={14} />
                                                                        </Button>
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
                                                                </TableCell>
                                                            </TableRow>
                                                            <TableRow key={`${iIndex}-resource`}>
                                                                <TableCell colSpan={7} className="bg-zinc-50/60 py-2">
                                                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                                                        <select
                                                                            value={item.resource_type || ''}
                                                                            onChange={(e) =>
                                                                                updateItem(sIndex, iIndex, {
                                                                                    resource_type: e.target.value,
                                                                                    planned_inventory_item_id: '',
                                                                                    planned_direct_supply_id: '',
                                                                                    planned_user_id: '',
                                                                                    planned_employee_id: '',
                                                                                })
                                                                            }
                                                                            className="h-9 rounded-md border border-zinc-300 px-2 text-sm"
                                                                        >
                                                                            <option value="">No resource link</option>
                                                                            <option value="material">Material</option>
                                                                            <option value="labor">Labor</option>
                                                                        </select>

                                                                        {item.resource_type === 'material' && (
                                                                            <>
                                                                                <select
                                                                                    value={item.planned_inventory_item_id || ''}
                                                                                    onChange={(e) =>
                                                                                        updateItem(sIndex, iIndex, {
                                                                                            planned_inventory_item_id: e.target.value,
                                                                                            planned_direct_supply_id: '',
                                                                                        })
                                                                                    }
                                                                                    className="h-9 rounded-md border border-zinc-300 px-2 text-sm"
                                                                                >
                                                                                    <option value="">Inventory item (optional)</option>
                                                                                    {inventoryItems.map((inv) => (
                                                                                        <option key={inv.id} value={inv.id}>
                                                                                            {inv.code ? `${inv.code} - ` : ''}{inv.name}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                                <select
                                                                                    value={item.planned_direct_supply_id || ''}
                                                                                    onChange={(e) =>
                                                                                        updateItem(sIndex, iIndex, {
                                                                                            planned_direct_supply_id: e.target.value,
                                                                                            planned_inventory_item_id: '',
                                                                                        })
                                                                                    }
                                                                                    className="h-9 rounded-md border border-zinc-300 px-2 text-sm"
                                                                                >
                                                                                    <option value="">Direct supply (optional)</option>
                                                                                    {directSupplies.map((supply) => (
                                                                                        <option key={supply.id} value={supply.id}>
                                                                                            {supply.code ? `${supply.code} - ` : ''}{supply.name}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            </>
                                                                        )}

                                                                        {item.resource_type === 'labor' && (
                                                                            <>
                                                                                <select
                                                                                    value={item.planned_user_id || ''}
                                                                                    onChange={(e) =>
                                                                                        updateItem(sIndex, iIndex, {
                                                                                            planned_user_id: e.target.value,
                                                                                            planned_employee_id: '',
                                                                                        })
                                                                                    }
                                                                                    className="h-9 rounded-md border border-zinc-300 px-2 text-sm"
                                                                                >
                                                                                    <option value="">User (optional)</option>
                                                                                    {users.map((person) => (
                                                                                        <option key={`u-${person.id}`} value={person.id}>
                                                                                            {person.name}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                                <select
                                                                                    value={item.planned_employee_id || ''}
                                                                                    onChange={(e) =>
                                                                                        updateItem(sIndex, iIndex, {
                                                                                            planned_employee_id: e.target.value,
                                                                                            planned_user_id: '',
                                                                                        })
                                                                                    }
                                                                                    className="h-9 rounded-md border border-zinc-300 px-2 text-sm"
                                                                                >
                                                                                    <option value="">Employee (optional)</option>
                                                                                    {employees.map((person) => (
                                                                                        <option key={`e-${person.id}`} value={person.id}>
                                                                                            {person.name}
                                                                                        </option>
                                                                                    ))}
                                                                                </select>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                        </Fragment>
                                                    );
                                                }
                                            )}
                                            {(section.items || []).length === 0 && (
                                                <TableRow>
                                                    <TableCell
                                                        colSpan={7}
                                                        className="py-4 text-center text-sm text-zinc-400"
                                                    >
                                                        No items yet.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                    <div className="mt-3 flex justify-end">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => addItem(sIndex)}
                                            className="flex items-center gap-2"
                                        >
                                            <Plus size={14} /> Add Item
                                        </Button>
                                    </div>
                                </div>
                            </>
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

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-zinc-200 bg-white p-4">
                <div className="flex gap-6">
                    <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">
                            Contract Amount
                        </div>
                        <div className="text-lg font-semibold text-zinc-800">
                            ₱{formatCurrency(contractAmount)}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">
                            BOQ Total
                        </div>
                        <div className="text-lg font-semibold text-zinc-800">
                            ₱{formatCurrency(grandTotal)}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">
                            Actual (Linked)
                        </div>
                        <div className="text-lg font-semibold text-zinc-800">
                            ₱{formatCurrency(actualTotal)}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">
                            Variance
                        </div>
                        <div
                            className={`text-lg font-semibold ${
                                variance < 0
                                    ? 'text-red-600'
                                    : variance > 0
                                    ? 'text-emerald-600'
                                    : 'text-zinc-800'
                            }`}
                        >
                            ₱{formatCurrency(Math.abs(variance))}
                            {variance < 0 && (
                                <span className="ml-1 text-xs">(over)</span>
                            )}
                            {variance > 0 && (
                                <span className="ml-1 text-xs">(under)</span>
                            )}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs uppercase tracking-wide text-zinc-500">
                            Planned vs Actual
                        </div>
                        <div className={`text-lg font-semibold ${plannedVsActualVariance < 0 ? 'text-red-600' : plannedVsActualVariance > 0 ? 'text-emerald-600' : 'text-zinc-800'}`}>
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

            {variance < 0 && (
                <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    BOQ total currently exceeds contract by ₱{formatCurrency(Math.abs(variance))}. Saving is blocked until BOQ is brought within contract amount.
                </div>
            )}

            {editing ? renderEditMode() : renderViewMode()}
        </div>
    );
}
