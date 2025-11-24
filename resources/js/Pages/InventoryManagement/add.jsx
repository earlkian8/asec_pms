import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Textarea } from "@/Components/ui/textarea";
import { Switch } from "@/Components/ui/switch";

const AddInventoryItem = ({ setShowAddModal }) => {
  const { data, setData, post, errors, processing } = useForm({
    item_name: "",
    description: "",
    category: "",
    unit_of_measure: "pieces",
    min_stock_level: "",
    unit_price: "",
    initial_stock: "",
    initial_stock_unit_price: "",
    is_active: true,
  });

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleSubmit = (e) => {
    e.preventDefault();

    post(route("inventory-management.store"), {
      preserveScroll: true,
      onSuccess: () => {
        setShowAddModal(false);
        toast.success("Inventory item created successfully!");
      },
      onError: () => toast.error("Please check the form for errors"),
    });
  };

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Inventory Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Item Name */}
          <div>
            <Label>Item Name <span class="text-red-500">*</span></Label>
            <Input
              value={data.item_name}
              onChange={(e) => setData("item_name", e.target.value)}
              placeholder="Enter item name"
              className={inputClass(errors.item_name)}
            />
            <InputError message={errors.item_name} />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Enter item description"
              className={inputClass(errors.description)}
            />
            <InputError message={errors.description} />
          </div>

          {/* Category */}
          <div>
            <Label>Category</Label>
            <Input
              value={data.category}
              onChange={(e) => setData("category", e.target.value)}
              placeholder="e.g., Construction Materials, Tools"
              className={inputClass(errors.category)}
            />
            <InputError message={errors.category} />
          </div>

          {/* Unit of Measure */}
          <div>
            <Label>Unit of Measure <span class="text-red-500">*</span></Label>
            <Input
              value={data.unit_of_measure}
              onChange={(e) => setData("unit_of_measure", e.target.value)}
              placeholder="e.g., pieces, kg, meters, liters"
              className={inputClass(errors.unit_of_measure)}
            />
            <InputError message={errors.unit_of_measure} />
          </div>

          {/* Min Stock Level */}
          <div>
            <Label>Minimum Stock Level</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={data.min_stock_level}
              onChange={(e) => setData("min_stock_level", e.target.value)}
              placeholder="0.00"
              className={inputClass(errors.min_stock_level)}
            />
            <InputError message={errors.min_stock_level} />
          </div>

          {/* Unit Price */}
          <div>
            <Label>Unit Price</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={data.unit_price}
              onChange={(e) => setData("unit_price", e.target.value)}
              placeholder="0.00"
              className={inputClass(errors.unit_price)}
            />
            <InputError message={errors.unit_price} />
          </div>

          {/* Initial Stock */}
          <div>
            <Label>Initial Stock (Optional)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={data.initial_stock}
              onChange={(e) => setData("initial_stock", e.target.value)}
              placeholder="0.00"
              className={inputClass(errors.initial_stock)}
            />
            <InputError message={errors.initial_stock} />
            <p className="text-xs text-gray-500 mt-1">Add initial stock when creating this item</p>
          </div>

          {/* Initial Stock Unit Price */}
          {data.initial_stock && (
            <div>
              <Label>Initial Stock Unit Price (Optional)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={data.initial_stock_unit_price}
                onChange={(e) => setData("initial_stock_unit_price", e.target.value)}
                placeholder="0.00"
                className={inputClass(errors.initial_stock_unit_price)}
              />
              <InputError message={errors.initial_stock_unit_price} />
            </div>
          )}

          {/* Is Active */}
          <div className="flex items-center gap-3">
            <Switch
              id="is_active"
              checked={data.is_active}
              onCheckedChange={(checked) => setData("is_active", checked)}
              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              {data.is_active ? 'Active' : 'Inactive'}
              <span className={`ml-2 text-xs ${data.is_active ? 'text-green-600' : 'text-red-600'}`}>
                ({data.is_active ? 'Enabled' : 'Disabled'})
              </span>
            </Label>
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddInventoryItem;

