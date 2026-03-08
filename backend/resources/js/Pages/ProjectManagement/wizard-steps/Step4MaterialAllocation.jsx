import { useState } from "react";
import { toast } from "sonner";
import { useProjectWizard } from "@/Contexts/ProjectWizardContext";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import { Trash2, Search } from "lucide-react";
import InputError from "@/Components/InputError";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";

export default function Step4MaterialAllocation({ inventoryItems }) {
  const { materialAllocations, addMaterialAllocation, removeMaterialAllocation } = useProjectWizard();
  const [search, setSearch] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  // Ensure inventoryItems is always an array
  const safeItems = Array.isArray(inventoryItems) ? inventoryItems : [];

  // Filter available items (not already allocated)
  const availableItems = safeItems.filter((item) => {
    if (!item || !item.id) return false;
    
    const isAlreadyAllocated = materialAllocations.some(
      allocation => allocation.inventory_item_id === item.id.toString()
    );
    
    if (isAlreadyAllocated) return false;
    
    const itemCode = `${item.item_code || ''}`.toLowerCase();
    const itemName = `${item.item_name || ''}`.toLowerCase();
    const searchLower = search.toLowerCase();
    
    return (
      itemCode.includes(searchLower) ||
      itemName.includes(searchLower)
    );
  });

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedItemIds(availableItems.map((item) => item.id.toString()));
    } else {
      setSelectedItemIds([]);
      setFormData({});
    }
  };

  const toggleItem = (itemId) => {
    const itemIdStr = itemId.toString();
    if (selectedItemIds.includes(itemIdStr)) {
      setSelectedItemIds(selectedItemIds.filter((id) => id !== itemIdStr));
      setFormData((prev) => {
        const newData = { ...prev };
        delete newData[itemIdStr];
        return newData;
      });
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`${itemIdStr}_quantity_allocated`];
        return newErrors;
      });
    } else {
      setSelectedItemIds([...selectedItemIds, itemIdStr]);
    }
  };

  const handleChange = (itemId, field, value) => {
    const itemIdStr = itemId.toString();
    setFormData((prev) => ({
      ...prev,
      [itemIdStr]: {
        ...prev[itemIdStr],
        [field]: value,
      },
    }));
    if (errors[`${itemIdStr}_${field}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`${itemIdStr}_${field}`];
        return newErrors;
      });
    }
  };

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-3 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleAddSelected = () => {
    if (selectedItemIds.length === 0) {
      toast.error("Please select at least one inventory item");
      return;
    }

    const validationErrors = {};
    for (const itemIdStr of selectedItemIds) {
      const item = availableItems.find(i => i.id.toString() === itemIdStr);
      
      if (!item) continue;
      
      const itemName = item.item_name || 'Item';
      const enteredQty = formData[itemIdStr]?.quantity_allocated;

      // Validate quantity is required and > 0
      if (!enteredQty || parseFloat(enteredQty) <= 0) {
        validationErrors[`${itemIdStr}_quantity_allocated`] = `Please enter a valid quantity for ${itemName}`;
      } else {
        const quantity = parseFloat(enteredQty);

        // FIX #2: Use parseFloat to safely coerce current_stock regardless of whether
        // it comes in as a number, string, null, or undefined from the backend.
        const availableStock = parseFloat(item.current_stock);

        if (!isNaN(availableStock) && quantity > availableStock) {
          validationErrors[`${itemIdStr}_quantity_allocated`] =
            `Quantity cannot exceed available stock (${availableStock} ${item.unit_of_measure || ''})`.trim();
        }
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fill in all required fields correctly");
      return;
    }

    let addedCount = 0;
    for (const itemIdStr of selectedItemIds) {
      const item = availableItems.find(i => i.id.toString() === itemIdStr);
      
      if (!item) continue;

      const isAlreadyAllocated = materialAllocations.some(
        allocation => allocation.inventory_item_id === itemIdStr
      );

      if (!isAlreadyAllocated) {
        addMaterialAllocation({
          inventory_item_id: itemIdStr,
          item_code: item.item_code,
          item_name: item.item_name,
          unit_of_measure: item.unit_of_measure,
          quantity_allocated: parseFloat(formData[itemIdStr]?.quantity_allocated) || 0,
          notes: formData[itemIdStr]?.notes || null,
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      toast.success(`${addedCount} material allocation(s) added successfully`);
      setSelectedItemIds([]);
      setFormData({});
      setErrors({});
    } else {
      toast.error("No material allocations were added. They may have already been added.");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Allocation</h3>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
        <Input
          placeholder="Search by item code or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 border-gray-300 rounded-lg"
        />
      </div>

      {/* Available Items Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      availableItems.length > 0 &&
                      selectedItemIds.length === availableItems.length
                    }
                    indeterminate={
                      selectedItemIds.length > 0 &&
                      selectedItemIds.length < availableItems.length
                    }
                    onCheckedChange={(checked) => toggleSelectAll(checked)}
                  />
                </TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[120px]">Item Code</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[200px]">Item Name</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[100px]">Available Stock</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[100px]">Unit</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[130px]">
                  Quantity <span className="text-red-500">*</span>
                </TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[200px]">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {availableItems.map((item) => {
                const itemIdStr = item.id.toString();
                const isSelected = selectedItemIds.includes(itemIdStr);
                
                const itemErrors = {
                  quantity_allocated: errors[`${itemIdStr}_quantity_allocated`],
                };

                // FIX #2: Safely parse available stock for display and max attr
                const availableStock = parseFloat(item.current_stock);
                const hasStock = !isNaN(availableStock);

                return (
                  <TableRow
                    key={itemIdStr}
                    onClick={(e) => {
                      if (e.target.closest("input") || e.target.closest("button") || e.target.closest("textarea")) return;
                      toggleItem(item.id);
                    }}
                    className={`cursor-pointer transition ${
                      isSelected ? "bg-blue-50/50" : "hover:bg-gray-50"
                    }`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItem(item.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{item.item_code || '---'}</TableCell>
                    <TableCell className="text-gray-700">{item.item_name || '---'}</TableCell>
                    <TableCell className="text-gray-700">
                      {hasStock ? (
                        <span className={availableStock > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                          {availableStock}
                        </span>
                      ) : (
                        '---'
                      )}
                    </TableCell>
                    <TableCell className="text-gray-700">{item.unit_of_measure || '---'}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        // FIX #2: Set max to available stock so browser also hints the limit
                        max={hasStock ? availableStock : undefined}
                        placeholder="0.00"
                        value={formData[itemIdStr]?.quantity_allocated || ""}
                        onChange={(e) => handleChange(item.id, "quantity_allocated", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={inputClass(itemErrors.quantity_allocated)}
                        required
                      />
                      {itemErrors.quantity_allocated && (
                        <InputError message={itemErrors.quantity_allocated} className="mt-1" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Optional notes"
                        value={formData[itemIdStr]?.notes || ""}
                        onChange={(e) => handleChange(item.id, "notes", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full border text-sm rounded-md px-3 py-2 focus:outline-none transition-all duration-200 border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {availableItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-gray-100 rounded-full p-4 mb-3">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium text-base">
                        {search ? "No items found" : "All available items have been allocated"}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {search ? "Try adjusting your search" : "No more items available to allocate"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Selected Button */}
      {selectedItemIds.length > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleAddSelected}
            className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200"
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
                  <TableHead>Item Code</TableHead>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materialAllocations.map((allocation, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{allocation.item_code}</TableCell>
                    <TableCell>{allocation.item_name}</TableCell>
                    <TableCell className="font-medium">{allocation.quantity_allocated}</TableCell>
                    <TableCell>{allocation.unit_of_measure}</TableCell>
                    <TableCell>{allocation.notes || "---"}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMaterialAllocation(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {materialAllocations.length === 0 && availableItems.length === 0 && !search && (
        <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
          <p>No inventory items available to allocate.</p>
        </div>
      )}
    </div>
  );
}