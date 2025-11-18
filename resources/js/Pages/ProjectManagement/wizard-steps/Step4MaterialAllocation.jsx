import { useState } from "react";
import { toast } from "sonner";
import { useProjectWizard } from "@/Contexts/ProjectWizardContext";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Step4MaterialAllocation({ inventoryItems }) {
  const { materialAllocations, addMaterialAllocation, removeMaterialAllocation } = useProjectWizard();
  const [selectedItemId, setSelectedItemId] = useState("");
  const [newAllocation, setNewAllocation] = useState({
    quantity_allocated: "",
    notes: "",
  });

  const handleAddAllocation = () => {
    if (!selectedItemId) {
      toast.error("Please select an inventory item");
      return;
    }
    if (!newAllocation.quantity_allocated || parseFloat(newAllocation.quantity_allocated) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const item = inventoryItems.find(i => i.id.toString() === selectedItemId);
    if (!item) return;

    // Check if item is already allocated
    if (materialAllocations.some(a => a.inventory_item_id === selectedItemId)) {
      toast.error("This item is already allocated");
      return;
    }

    addMaterialAllocation({
      inventory_item_id: selectedItemId,
      item_code: item.item_code,
      item_name: item.item_name,
      unit_of_measure: item.unit_of_measure,
      quantity_allocated: parseFloat(newAllocation.quantity_allocated),
      notes: newAllocation.notes || null,
    });

    // Reset form
    setSelectedItemId("");
    setNewAllocation({
      quantity_allocated: "",
      notes: "",
    });
  };

  const availableItems = inventoryItems.filter(
    item => !materialAllocations.some(allocation => allocation.inventory_item_id === item.id.toString())
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Allocation</h3>

      {/* Add Allocation Form */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Inventory Item *</Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {availableItems.map((item) => (
                  <SelectItem key={item.id} value={item.id.toString()}>
                    {item.item_code} - {item.item_name} ({item.current_stock} {item.unit_of_measure})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Quantity Allocated *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={newAllocation.quantity_allocated}
              onChange={(e) => setNewAllocation({ ...newAllocation, quantity_allocated: e.target.value })}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              placeholder="Optional notes"
              value={newAllocation.notes}
              onChange={(e) => setNewAllocation({ ...newAllocation, notes: e.target.value })}
              rows={1}
            />
          </div>

          <div className="flex items-end">
            <Button
              type="button"
              onClick={handleAddAllocation}
              className="w-full bg-zinc-700 hover:bg-zinc-900 text-white"
            >
              <Plus size={18} className="mr-2" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Allocations List */}
      {materialAllocations.length > 0 ? (
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
                  <TableCell>{allocation.quantity_allocated}</TableCell>
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
      ) : (
        <div className="text-center py-8 text-gray-500 border rounded-lg">
          <p>No material allocations added yet. Add allocations above.</p>
        </div>
      )}
    </div>
  );
}

