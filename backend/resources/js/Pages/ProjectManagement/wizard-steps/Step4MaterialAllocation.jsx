import { useState } from "react";
import { toast } from "sonner";
import { useProjectWizard } from "@/Contexts/ProjectWizardContext";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import { Trash2, Search, Package, Truck } from "lucide-react";
import InputError from "@/Components/InputError";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";

export default function Step4MaterialAllocation({ inventoryItems, directSupplyItems = [] }) {
  const { materialAllocations, addMaterialAllocation, removeMaterialAllocation } = useProjectWizard();
  const [activeTab, setActiveTab] = useState("inventory");
  const [search, setSearch] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  const safeInventory = Array.isArray(inventoryItems) ? inventoryItems : [];
  const safeDirectSupply = Array.isArray(directSupplyItems) ? directSupplyItems : [];

  // ── Inventory helpers ────────────────────────────────────────────────────
  const getRemainingStock = (item) => {
    const allocated = materialAllocations.find(a => a.inventory_item_id === item.id.toString());
    const currentStock = parseFloat(item.current_stock);
    if (isNaN(currentStock)) return null;
    const alreadyAllocated = allocated ? parseFloat(allocated.quantity_allocated) || 0 : 0;
    return Math.max(0, currentStock - alreadyAllocated);
  };

  const availableInventory = safeInventory.filter((item) => {
    if (!item?.id) return false;
    const remaining = getRemainingStock(item);
    if (remaining !== null && remaining <= 0) return false;
    const s = search.toLowerCase();
    return `${item.item_code || ""}`.toLowerCase().includes(s) ||
           `${item.item_name || ""}`.toLowerCase().includes(s);
  });

  const availableDirectSupply = safeDirectSupply.filter((item) => {
    if (!item?.id) return false;
    const s = search.toLowerCase();
    return `${item.supply_code || ""}`.toLowerCase().includes(s) ||
           `${item.supply_name || ""}`.toLowerCase().includes(s) ||
           `${item.supplier_name || ""}`.toLowerCase().includes(s);
  });

  const activeItems = activeTab === "inventory" ? availableInventory : availableDirectSupply;

  const getItemKey = (item) => activeTab === "inventory"
    ? `inv_${item.id}`
    : `ds_${item.id}`;

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedItemIds(activeItems.map(getItemKey));
    } else {
      setSelectedItemIds([]);
      setFormData({});
    }
  };

  const toggleItem = (item) => {
    const key = getItemKey(item);
    if (selectedItemIds.includes(key)) {
      setSelectedItemIds(selectedItemIds.filter(id => id !== key));
      setFormData(prev => { const n = { ...prev }; delete n[key]; return n; });
      setErrors(prev => { const n = { ...prev }; delete n[`${key}_quantity`]; return n; });
    } else {
      setSelectedItemIds([...selectedItemIds, key]);
    }
  };

  const handleChange = (key, field, value) => {
    setFormData(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    if (errors[`${key}_${field}`]) {
      setErrors(prev => { const n = { ...prev }; delete n[`${key}_${field}`]; return n; });
    }
  };

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-3 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleAddSelected = () => {
    if (selectedItemIds.length === 0) {
      toast.error("Please select at least one item");
      return;
    }

    const validationErrors = {};

    for (const key of selectedItemIds) {
      const isInv = key.startsWith("inv_");
      const id = key.replace(/^(inv_|ds_)/, "");
      const item = isInv
        ? availableInventory.find(i => i.id.toString() === id)
        : availableDirectSupply.find(i => i.id.toString() === id);
      if (!item) continue;

      const enteredQty = formData[key]?.quantity;
      const name = isInv ? item.item_name : item.supply_name;

      if (!enteredQty || parseFloat(enteredQty) <= 0) {
        validationErrors[`${key}_quantity`] = `Please enter a valid quantity for ${name}.`;
      } else if (isInv) {
        const remaining = getRemainingStock(item);
        if (remaining !== null && parseFloat(enteredQty) > remaining) {
          validationErrors[`${key}_quantity`] =
            `Quantity cannot exceed remaining stock (${remaining} ${item.unit_of_measure || ""})`.trim();
        }
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fill in all required fields correctly");
      return;
    }

    let addedCount = 0;

    for (const key of selectedItemIds) {
      const isInv = key.startsWith("inv_");
      const id = key.replace(/^(inv_|ds_)/, "");
      const item = isInv
        ? availableInventory.find(i => i.id.toString() === id)
        : availableDirectSupply.find(i => i.id.toString() === id);
      if (!item) continue;

      const qty = parseFloat(formData[key]?.quantity) || 0;
      const notes = formData[key]?.notes || null;

      if (isInv) {
        const existingIndex = materialAllocations.findIndex(a => a.inventory_item_id === id);
        if (existingIndex !== -1) {
          const existing = materialAllocations[existingIndex];
          const updatedQty = (parseFloat(existing.quantity_allocated) || 0) + qty;
          removeMaterialAllocation(existingIndex);
          addMaterialAllocation({
            inventory_item_id: id,
            item_code: item.item_code,
            item_name: item.item_name,
            unit_of_measure: item.unit_of_measure,
            quantity_allocated: updatedQty,
            notes: notes || existing.notes || null,
          });
        } else {
          addMaterialAllocation({
            inventory_item_id: id,
            item_code: item.item_code,
            item_name: item.item_name,
            unit_of_measure: item.unit_of_measure,
            quantity_allocated: qty,
            notes,
          });
        }
      } else {
        addMaterialAllocation({
          direct_supply_id: id,
          supply_code: item.supply_code,
          supply_name: item.supply_name,
          unit_of_measure: item.unit_of_measure,
          unit_price: item.unit_price || null,
          quantity_allocated: qty,
          notes,
        });
      }
      addedCount++;
    }

    if (addedCount > 0) {
      toast.success(`${addedCount} allocation(s) added successfully`);
      setSelectedItemIds([]);
      setFormData({});
      setErrors({});
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearch("");
    setSelectedItemIds([]);
    setFormData({});
    setErrors({});
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Allocation</h3>

      {/* Tab Toggle */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => handleTabChange("inventory")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "inventory"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Package size={15} /> Inventory
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("direct_supply")}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            activeTab === "direct_supply"
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Truck size={15} /> Direct Supply
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
        <Input
          placeholder={activeTab === "inventory" ? "Search by item code or name..." : "Search by supply code, name, or supplier..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 border-gray-300 rounded-lg"
        />
      </div>

      {/* Items Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <TableHead className="w-12">
                  <Checkbox
                    checked={activeItems.length > 0 && selectedItemIds.length === activeItems.length}
                    indeterminate={selectedItemIds.length > 0 && selectedItemIds.length < activeItems.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                {activeTab === "inventory" ? (
                  <>
                    <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wider min-w-[120px]">Item Code</TableHead>
                    <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wider min-w-[180px]">Item Name</TableHead>
                    <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wider min-w-[100px]">Remaining</TableHead>
                    <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wider min-w-[70px]">Unit</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wider min-w-[120px]">Supply Code</TableHead>
                    <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wider min-w-[180px]">Supply Name</TableHead>
                    <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wider min-w-[130px]">Supplier</TableHead>
                    <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wider min-w-[70px]">Unit</TableHead>
                        <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wider min-w-[110px]">Unit Price</TableHead>
                  </>
                )}
                <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wider min-w-[130px]">
                  Quantity <span className="text-red-500">*</span>
                </TableHead>
                <TableHead className="font-bold text-xs text-gray-700 uppercase tracking-wider min-w-[180px]">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeItems.map((item) => {
                const key = getItemKey(item);
                const isSelected = selectedItemIds.includes(key);
                const isInv = activeTab === "inventory";
                const remainingStock = isInv ? getRemainingStock(item) : null;
                const totalStock = isInv ? parseFloat(item.current_stock) : null;
                const isPartiallyAllocated = isInv && materialAllocations.some(a => a.inventory_item_id === item.id.toString());

                return (
                  <TableRow
                    key={key}
                    onClick={(e) => {
                      if (e.target.closest("input") || e.target.closest("button")) return;
                      toggleItem(item);
                    }}
                    className={`cursor-pointer transition ${isSelected ? "bg-blue-50/50" : "hover:bg-gray-50"}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItem(item)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>

                    {isInv ? (
                      <>
                        <TableCell className="font-medium text-gray-900">{item.item_code || "---"}</TableCell>
                        <TableCell className="text-gray-700">
                          <div className="flex items-center gap-2">
                            {item.item_name || "---"}
                            {isPartiallyAllocated && (
                              <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium whitespace-nowrap">+allocated</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {remainingStock !== null ? (
                            <span className={`font-semibold text-sm ${
                              remainingStock <= 0 ? "text-red-600" :
                              remainingStock < totalStock * 0.2 ? "text-amber-600" : "text-green-600"
                            }`}>{remainingStock}</span>
                          ) : <span className="text-gray-400">---</span>}
                        </TableCell>
                        <TableCell className="text-gray-700">{item.unit_of_measure || "---"}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium text-gray-900">{item.supply_code || "---"}</TableCell>
                        <TableCell className="text-gray-700">{item.supply_name || "---"}</TableCell>
                        <TableCell className="text-gray-500 text-xs">{item.supplier_name || "---"}</TableCell>
                        <TableCell className="text-gray-700">{item.unit_of_measure || "---"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-gray-900">
                              {item.unit_price ? `₱${parseFloat(item.unit_price).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '---'}
                            </span>
                          </div>
                        </TableCell>
                      </>
                    )}

                    <TableCell>
                      <Input
                        type="number" step="0.01" min="0.01"
                        max={isInv && remainingStock !== null ? remainingStock : undefined}
                        placeholder="0.00"
                        value={formData[key]?.quantity || ""}
                        onChange={(e) => handleChange(key, "quantity", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={inputClass(errors[`${key}_quantity`])}
                      />
                      {errors[`${key}_quantity`] && (
                        <InputError message={errors[`${key}_quantity`]} className="mt-1" />
                      )}
                    </TableCell>

                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Optional notes"
                        value={formData[key]?.notes || ""}
                        onChange={(e) => handleChange(key, "notes", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full border text-sm rounded-md px-3 py-2 border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}

              {activeItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={activeTab === "inventory" ? 7 : 8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-gray-100 rounded-full p-4 mb-3">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium text-base">
                        {search ? "No items found" : activeTab === "inventory" ? "All available items have been fully allocated" : "No active direct supply items available"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedItemIds.length > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleAddSelected}
            className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md"
          >
            Add Selected ({selectedItemIds.length})
          </Button>
        </div>
      )}

      {/* Allocations List */}
      {materialAllocations.length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Added Material Allocations</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialAllocations.map((allocation, index) => {
                  const isDs = !!allocation.direct_supply_id;
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          isDs ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                        }`}>
                          {isDs ? <Truck size={11} /> : <Package size={11} />}
                          {isDs ? "Direct" : "Inventory"}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{isDs ? allocation.supply_code : allocation.item_code}</TableCell>
                      <TableCell>{isDs ? allocation.supply_name : allocation.item_name}</TableCell>
                      <TableCell className="font-semibold text-blue-700">{allocation.quantity_allocated}</TableCell>
                      <TableCell>{allocation.unit_of_measure}</TableCell>
                      <TableCell>{allocation.notes || "---"}</TableCell>
                      <TableCell>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeMaterialAllocation(index)} className="text-red-600 hover:text-red-700">
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
