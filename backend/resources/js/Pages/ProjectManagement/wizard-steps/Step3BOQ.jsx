import { Fragment, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import { useProjectWizard } from "@/Contexts/ProjectWizardContext";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Textarea } from "@/Components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
} from "lucide-react";
import InputError from "@/Components/InputError";

// Excel-style column letters for auto section codes (A, B, ..., Z, AA, AB, ...)
const toSectionCode = (index) => {
  let n = index;
  let out = "";
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

export default function Step3BOQ({ errors = {} }) {
  const { props } = usePage();
  const inventoryItems = props.inventoryItems || [];
  const directSupplyItems = props.directSupplyItems || [];
  const assignables = props.users || [];

  const userOptions = assignables.filter((a) => a.type === "user");
  const employeeOptions = assignables.filter((a) => a.type === "employee");

  const {
    projectData,
    boqSections,
    addBoqSection,
    removeBoqSection,
    updateBoqSection,
    addBoqItem,
    removeBoqItem,
    updateBoqItem,
  } = useProjectWizard();

  const projectDays = (() => {
    const start = projectData?.start_date;
    const end   = projectData?.planned_end_date;
    if (!start || !end) return null;
    return Math.ceil((new Date(end) - new Date(start)) / 86400000) + 1;
  })();

  const [collapsed, setCollapsed] = useState({});

  const toggleCollapse = (index) => {
    setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleAddSection = () => {
    const nextIndex = boqSections.length;
    addBoqSection({
      code: toSectionCode(nextIndex),
      name: "",
      description: "",
      sort_order: nextIndex,
      items: [],
    });
  };

  const handleDuplicateItem = (sectionIndex, itemIndex) => {
    const item = boqSections[sectionIndex]?.items?.[itemIndex];
    if (!item) return;
    addBoqItem(sectionIndex, { ...item });
  };

  const grandTotal = useMemo(
    () =>
      boqSections.reduce(
        (sum, s) =>
          sum +
          (s.items || []).reduce(
            (sub, i) => sub + getItemTotal(i),
            0
          ),
        0
      ),
    [boqSections]
  );

  const sectionSubtotal = (section) =>
    (section.items || []).reduce(
      (sub, i) => sub + getItemTotal(i),
      0
    );

  function getResourceTotal(resource) {
    return toNumber(resource?.quantity) * toNumber(resource?.unit_price);
  }

  function getItemTotal(item) {
    return toNumber(item?.quantity) * toNumber(item?.unit_cost);
  }

  function applyResourceRollup(sectionIndex, itemIndex, resources) {
    const total = resources.reduce((sum, resource) => sum + getResourceTotal(resource), 0);
    const item = boqSections?.[sectionIndex]?.items?.[itemIndex] || {};
    const qty = toNumber(item.quantity) > 0 ? toNumber(item.quantity) : 1;

    updateBoqItem(sectionIndex, itemIndex, {
      resources,
      quantity: qty,
      unit: item.unit || (resources.length > 0 ? "lot" : ""),
      unit_cost: +total.toFixed(2),
    });
  }

  function addResource(sectionIndex, itemIndex, resourceCategory) {
    const item = boqSections?.[sectionIndex]?.items?.[itemIndex] || {};
    const current = Array.isArray(item.resources) ? item.resources : [];

    const next = [
      ...current,
      {
        resource_category: resourceCategory,
        source_type: resourceCategory === "material" ? "inventory" : "employee",
        inventory_item_id: "",
        direct_supply_id: "",
        user_id: "",
        employee_id: "",
        resource_name: "",
        unit: "",
        quantity: 1,
        unit_price: 0,
        remarks: "",
        sort_order: current.length,
      },
    ];

    applyResourceRollup(sectionIndex, itemIndex, next);
  }

  function removeResource(sectionIndex, itemIndex, resourceIndex) {
    const item = boqSections?.[sectionIndex]?.items?.[itemIndex] || {};
    const current = Array.isArray(item.resources) ? item.resources : [];
    const next = current
      .filter((_, idx) => idx !== resourceIndex)
      .map((resource, idx) => ({ ...resource, sort_order: idx }));

    applyResourceRollup(sectionIndex, itemIndex, next);
  }

  function updateResource(sectionIndex, itemIndex, resourceIndex, patch) {
    const item = boqSections?.[sectionIndex]?.items?.[itemIndex] || {};
    const current = Array.isArray(item.resources) ? item.resources : [];
    const next = current.map((resource, idx) => {
      if (idx !== resourceIndex) return resource;

      const updated = { ...resource, ...patch };

      if (patch.source_type) {
        updated.inventory_item_id = "";
        updated.direct_supply_id = "";
        updated.user_id = "";
        updated.employee_id = "";
        updated.resource_name = "";
        updated.unit = "";
        updated.unit_price = 0;
      }

      if (patch.inventory_item_id) {
        const selected = inventoryItems.find((inv) => String(inv.id) === String(patch.inventory_item_id));
        if (selected) {
          updated.resource_name = selected.item_name;
          updated.unit = selected.unit_of_measure || "";
          updated.unit_price = toNumber(selected.unit_price);
          updated.source_type = "inventory";
          updated.direct_supply_id = "";
        }
      }

      if (patch.direct_supply_id) {
        const selected = directSupplyItems.find((supply) => String(supply.id) === String(patch.direct_supply_id));
        if (selected) {
          updated.resource_name = selected.supply_name;
          updated.unit = selected.unit_of_measure || "";
          updated.unit_price = toNumber(selected.unit_price);
          updated.source_type = "direct_supply";
          updated.inventory_item_id = "";
        }
      }

      if (patch.user_id) {
        const selected = userOptions.find((person) => String(person.id) === String(patch.user_id));
        if (selected) {
          const hourlyRate = toNumber(selected?.compensation?.hourly_rate);
          const monthlySalary = toNumber(selected?.compensation?.monthly_salary);
          const raw = hourlyRate > 0 ? hourlyRate * 8 : monthlySalary > 0 ? monthlySalary / 26 : 0;
          updated.resource_name = selected.name;
          updated.unit = "day";
          updated.unit_price = Math.round(raw * 100) / 100;
          updated.source_type = "user";
          updated.employee_id = "";
        }
      }

      if (patch.employee_id) {
        const selected = employeeOptions.find((person) => String(person.id) === String(patch.employee_id));
        if (selected) {
          const hourlyRate = toNumber(selected?.compensation?.hourly_rate);
          const monthlySalary = toNumber(selected?.compensation?.monthly_salary);
          const raw = hourlyRate > 0 ? hourlyRate * 8 : monthlySalary > 0 ? monthlySalary / 26 : 0;
          updated.resource_name = selected.name;
          updated.unit = "day";
          updated.unit_price = Math.round(raw * 100) / 100;
          updated.source_type = "employee";
          updated.user_id = "";
        }
      }

      return updated;
    });

    applyResourceRollup(sectionIndex, itemIndex, next);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
        <Info size={16} className="mt-0.5 flex-shrink-0" />
        <div>
          Define the project scope as a Bill of Quantities. Group work under{" "}
          <strong>categories</strong> (e.g. Earthworks, Structural) and add{" "}
          <strong>breakdown items</strong> with quantity and unit cost. BOQ is
          optional — you can skip this step and fill it in later.
        </div>
      </div>

      {boqSections.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-zinc-300 p-10 text-center">
          <p className="text-sm text-zinc-500">
            No BOQ sections yet. Add a category to start scoping the project.
          </p>
          <Button
            type="button"
            onClick={handleAddSection}
            className="mt-4 flex items-center gap-2 bg-zinc-800 text-white hover:bg-zinc-900"
          >
            <Plus size={16} /> Add Section
          </Button>
        </div>
      )}

      {boqSections.map((section, sectionIndex) => {
        const isCollapsed = collapsed[sectionIndex];
        const subtotal = sectionSubtotal(section);
        const sectionErrorKey = `boq_sections.${sectionIndex}.name`;

        return (
          <div
            key={sectionIndex}
            className="rounded-md border border-zinc-200 bg-white shadow-sm"
          >
            <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2">
              <button
                type="button"
                onClick={() => toggleCollapse(sectionIndex)}
                className="text-zinc-500 hover:text-zinc-800"
              >
                {isCollapsed ? (
                  <ChevronRight size={18} />
                ) : (
                  <ChevronDown size={18} />
                )}
              </button>
              <Input
                value={section.code || ""}
                onChange={(e) =>
                  updateBoqSection(sectionIndex, { code: e.target.value })
                }
                placeholder="Code"
                className="w-20"
              />
              <Input
                value={section.name || ""}
                onChange={(e) =>
                  updateBoqSection(sectionIndex, { name: e.target.value })
                }
                placeholder="Section name (e.g. Earthworks)"
                className="flex-1 font-medium"
              />
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-zinc-600 whitespace-nowrap select-none">
                <input
                  type="checkbox"
                  checked={section.create_milestone ?? true}
                  onChange={(e) =>
                    updateBoqSection(sectionIndex, { create_milestone: e.target.checked })
                  }
                  className="rounded"
                />
                Milestone
              </label>
              <div className="text-sm text-zinc-600">
                Subtotal:{" "}
                <span className="font-semibold text-zinc-800">
                  ₱{formatCurrency(subtotal)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeBoqSection(sectionIndex)}
                className="text-red-500 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 size={16} />
              </Button>
            </div>

            {errors[sectionErrorKey] && (
              <div className="px-3 pt-2">
                <InputError message={errors[sectionErrorKey]} />
              </div>
            )}

            {!isCollapsed && (
              <>
                <div className="px-3 pt-2">
                  <Textarea
                    value={section.description || ""}
                    onChange={(e) =>
                      updateBoqSection(sectionIndex, {
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
                        <TableHead className="w-20">Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-32 text-right">
                          Amount
                        </TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(section.items || []).map((item, itemIndex) => {
                        const amount = getItemTotal(item);
                        const hasResources = Array.isArray(item.resources) && item.resources.length > 0;
                        const derivedUnitCost = (item.resources || []).reduce(
                          (sum, resource) => sum + getResourceTotal(resource),
                          0
                        );
                        const descKey = `boq_sections.${sectionIndex}.items.${itemIndex}.description`;
                        return (
                          <Fragment key={itemIndex}>
                            <TableRow key={`${itemIndex}-main`}>
                              <TableCell>
                                <Input
                                  value={item.item_code || ""}
                                  onChange={(e) =>
                                    updateBoqItem(sectionIndex, itemIndex, {
                                      item_code: e.target.value,
                                    })
                                  }
                                  placeholder={`${section.code || ""}.${itemIndex + 1}`}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  value={item.description || ""}
                                  onChange={(e) =>
                                    updateBoqItem(sectionIndex, itemIndex, {
                                      description: e.target.value,
                                    })
                                  }
                                  placeholder="Describe the scope item"
                                />
                                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  <div>
                                    <Label className="mb-1 block text-[11px] text-zinc-500">Unit</Label>
                                    <Input
                                      value={item.unit || ""}
                                      onChange={(e) =>
                                        updateBoqItem(sectionIndex, itemIndex, {
                                          unit: e.target.value,
                                        })
                                      }
                                      placeholder="lot"
                                    />
                                  </div>
                                  <div>
                                    <Label className="mb-1 block text-[11px] text-zinc-500">Unit Qty</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.0001"
                                      value={item.quantity ?? ""}
                                      onChange={(e) =>
                                        updateBoqItem(sectionIndex, itemIndex, {
                                          quantity: e.target.value,
                                        })
                                      }
                                      placeholder="0"
                                      className="text-right"
                                    />
                                  </div>
                                  <div>
                                    <Label className="mb-1 block text-[11px] text-zinc-500">Cost</Label>
                                    <Input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={item.unit_cost ?? ""}
                                      onChange={(e) =>
                                        updateBoqItem(sectionIndex, itemIndex, {
                                          unit_cost: e.target.value,
                                        })
                                      }
                                      placeholder="0.00"
                                      className="text-right"
                                    />
                                  </div>
                                </div>
                                {hasResources && (
                                  <p className="mt-1 text-[11px] text-zinc-500">
                                    Auto-filled from resources. Editable as needed. Resource subtotal used as cost:
                                    {" "}₱{formatCurrency(derivedUnitCost)}
                                  </p>
                                )}
                                {errors[descKey] && (
                                  <InputError message={errors[descKey]} />
                                )}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                ₱{formatCurrency(amount)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      handleDuplicateItem(sectionIndex, itemIndex)
                                    }
                                    title="Duplicate row"
                                    className="text-zinc-500 hover:text-zinc-800"
                                  >
                                    <Copy size={14} />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      removeBoqItem(sectionIndex, itemIndex)
                                    }
                                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                                  >
                                    <Trash2 size={14} />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>

                            <TableRow key={`${itemIndex}-resource`}>
                              <TableCell colSpan={4} className="bg-zinc-50/60 py-2">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-8 text-xs"
                                      onClick={() => addResource(sectionIndex, itemIndex, "material")}
                                    >
                                      <Plus size={12} /> Add Material/Equipment
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-8 text-xs"
                                      onClick={() => addResource(sectionIndex, itemIndex, "labor")}
                                    >
                                      <Plus size={12} /> Add Labor
                                    </Button>
                                  </div>

                                  {(item.resources || []).map((resource, resourceIndex) => (
                                    <div key={resourceIndex} className="grid grid-cols-1 gap-2 rounded-md border border-zinc-200 bg-white p-2 sm:grid-cols-6">
                                      <select
                                        value={resource.source_type || ""}
                                        onChange={(e) => updateResource(sectionIndex, itemIndex, resourceIndex, { source_type: e.target.value })}
                                        className="h-9 rounded-md border border-zinc-300 px-2 text-sm"
                                      >
                                        {resource.resource_category === "material" ? (
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

                                      {resource.resource_category === "material" && resource.source_type === "inventory" && (
                                        <select
                                          value={resource.inventory_item_id || ""}
                                          onChange={(e) => updateResource(sectionIndex, itemIndex, resourceIndex, { inventory_item_id: e.target.value })}
                                          className="h-9 rounded-md border border-zinc-300 px-2 text-sm sm:col-span-2"
                                        >
                                          <option value="">Select inventory item</option>
                                          {inventoryItems.map((inv) => (
                                            <option key={inv.id} value={inv.id}>
                                              {inv.item_code ? `${inv.item_code} - ` : ""}{inv.item_name}
                                            </option>
                                          ))}
                                        </select>
                                      )}

                                      {resource.resource_category === "material" && resource.source_type === "direct_supply" && (
                                        <select
                                          value={resource.direct_supply_id || ""}
                                          onChange={(e) => updateResource(sectionIndex, itemIndex, resourceIndex, { direct_supply_id: e.target.value })}
                                          className="h-9 rounded-md border border-zinc-300 px-2 text-sm sm:col-span-2"
                                        >
                                          <option value="">Select direct supply</option>
                                          {directSupplyItems.map((supply) => (
                                            <option key={supply.id} value={supply.id}>
                                              {supply.supply_code ? `${supply.supply_code} - ` : ""}{supply.supply_name}
                                            </option>
                                          ))}
                                        </select>
                                      )}

                                      {resource.resource_category === "labor" && resource.source_type === "employee" && (
                                        <select
                                          value={resource.employee_id || ""}
                                          onChange={(e) => updateResource(sectionIndex, itemIndex, resourceIndex, { employee_id: e.target.value })}
                                          className="h-9 rounded-md border border-zinc-300 px-2 text-sm sm:col-span-2"
                                        >
                                          <option value="">Select employee</option>
                                          {employeeOptions.map((person) => (
                                            <option key={person.id} value={person.id}>{person.name}</option>
                                          ))}
                                        </select>
                                      )}

                                      {resource.resource_category === "labor" && resource.source_type === "user" && (
                                        <select
                                          value={resource.user_id || ""}
                                          onChange={(e) => updateResource(sectionIndex, itemIndex, resourceIndex, { user_id: e.target.value })}
                                          className="h-9 rounded-md border border-zinc-300 px-2 text-sm sm:col-span-2"
                                        >
                                          <option value="">Select user</option>
                                          {userOptions.map((person) => (
                                            <option key={person.id} value={person.id}>{person.name}</option>
                                          ))}
                                        </select>
                                      )}

                                      <div>
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.0001"
                                          value={resource.quantity ?? ""}
                                          onChange={(e) => updateResource(sectionIndex, itemIndex, resourceIndex, { quantity: e.target.value })}
                                          placeholder={resource.resource_category === "labor" ? "Days" : "Qty"}
                                          className="text-right"
                                        />
                                        {resource.resource_category === "labor" && projectDays !== null && (
                                          <p className={`mt-0.5 text-xs ${parseFloat(resource.quantity || 0) > projectDays ? "text-amber-600 font-medium" : "text-zinc-400"}`}>
                                            {parseFloat(resource.quantity || 0) > projectDays
                                              ? `Exceeds project duration (${projectDays} days)`
                                              : `Max: ${projectDays} days`}
                                          </p>
                                        )}
                                        {resource.resource_category === "material" && resource.source_type === "inventory" && resource.inventory_item_id && (() => {
                                          const inv = inventoryItems.find((x) => String(x.id) === String(resource.inventory_item_id));
                                          if (!inv) return null;
                                          const stock = toNumber(inv.current_stock);
                                          const qty = parseFloat(resource.quantity || 0);
                                          const over = qty > stock;
                                          return (
                                            <p className={`mt-0.5 text-xs ${over ? "text-red-600 font-medium" : "text-zinc-400"}`}>
                                              {over
                                                ? `Only ${stock} ${inv.unit_of_measure || ""} in stock`
                                                : `Stock: ${stock} ${inv.unit_of_measure || ""}`}
                                            </p>
                                          );
                                        })()}
                                      </div>

                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={resource.unit_price ?? ""}
                                        onChange={(e) => updateResource(sectionIndex, itemIndex, resourceIndex, { unit_price: e.target.value })}
                                        placeholder={resource.resource_category === "labor" ? "Daily Rate" : "Unit Cost"}
                                        className="text-right"
                                      />

                                      <div className="flex items-center justify-between rounded-md bg-zinc-50 px-2 text-xs sm:col-span-6">
                                        <span className="text-zinc-600">
                                          {resource.resource_name || "Select resource"} {resource.unit ? `(${resource.unit})` : ""}
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-zinc-800">₱{formatCurrency(getResourceTotal(resource))}</span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-red-500"
                                            onClick={() => removeResource(sectionIndex, itemIndex, resourceIndex)}
                                          >
                                            <Trash2 size={12} />
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}

                                  {(item.resources || []).length > 0 && (
                                    <div className="text-right text-xs font-semibold text-zinc-700">
                                      Resource subtotal: ₱{formatCurrency((item.resources || []).reduce((sum, resource) => sum + getResourceTotal(resource), 0))}
                                    </div>
                                  )}
                                </div>

                              </TableCell>
                            </TableRow>
                          </Fragment>
                        );
                      })}
                      {(section.items || []).length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="py-4 text-center text-sm text-zinc-400"
                          >
                            No items yet. Add a breakdown row below.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>

                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => addBoqItem(sectionIndex)}
                      className="flex items-center gap-2 border-zinc-300 text-sm"
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

      {boqSections.length > 0 && (
        <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddSection}
            className="flex items-center gap-2 border-zinc-300"
          >
            <Plus size={14} /> Add Section
          </Button>
          <div className="text-sm text-zinc-700">
            BOQ Total:{" "}
            <span className="ml-2 text-base font-semibold text-zinc-900">
              ₱{formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
