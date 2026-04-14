import { useMemo, useState } from "react";
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

export default function Step3BOQ({ errors = {} }) {
  const {
    boqSections,
    addBoqSection,
    removeBoqSection,
    updateBoqSection,
    addBoqItem,
    removeBoqItem,
    updateBoqItem,
  } = useProjectWizard();

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
            (sub, i) =>
              sub +
              (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_cost) || 0),
            0
          ),
        0
      ),
    [boqSections]
  );

  const sectionSubtotal = (section) =>
    (section.items || []).reduce(
      (sub, i) =>
        sub + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_cost) || 0),
      0
    );

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
                        <TableHead className="w-24">Unit</TableHead>
                        <TableHead className="w-28 text-right">Qty</TableHead>
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
                      {(section.items || []).map((item, itemIndex) => {
                        const qty = parseFloat(item.quantity) || 0;
                        const rate = parseFloat(item.unit_cost) || 0;
                        const amount = qty * rate;
                        const descKey = `boq_sections.${sectionIndex}.items.${itemIndex}.description`;
                        return (
                          <TableRow key={itemIndex}>
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
                              {errors[descKey] && (
                                <InputError message={errors[descKey]} />
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.unit || ""}
                                onChange={(e) =>
                                  updateBoqItem(sectionIndex, itemIndex, {
                                    unit: e.target.value,
                                  })
                                }
                                placeholder="e.g. m³"
                              />
                            </TableCell>
                            <TableCell>
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
                                className="text-right"
                              />
                            </TableCell>
                            <TableCell>
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
                                className="text-right"
                              />
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
                        );
                      })}
                      {(section.items || []).length === 0 && (
                        <TableRow>
                          <TableCell
                            colSpan={7}
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
