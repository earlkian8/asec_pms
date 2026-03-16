import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Components/ui/select";
import { Loader2, Save, Lock } from "lucide-react";

const EditInventoryItem = ({ setShowEditModal, item }) => {
  const categories = [
    "Construction Materials",
    "Electrical",
    "Plumbing",
    "Tools & Equipment",
    "Safety Equipment",
    "Office Supplies",
  ];

  const units = [
    "pieces",
    "kg",
    "meters",
    "liters",
    "boxes",
    "rolls",
    "units",
    "packs",
    "sets",
    "tons",
    "gallons",
    "square meters",
    "cubic meters",
    "feet",
    "yards",
    "pounds",
    "bags",
    "cartons",
    "bundles",
    "sheets",
    "pallets",
  ];

  const { data, setData, put, errors, processing } = useForm({
    item_code: item.item_code || "",
    item_name: item.item_name || "",
    description: item.description || "",
    category: item.category || "",
    unit_of_measure: item.unit_of_measure || "pieces",
    min_stock_level: item.min_stock_level || "",
    unit_price: item.unit_price || "",
    is_active: item.is_active ?? true,
  });

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleSubmit = (e) => {
    e.preventDefault();

    put(route("inventory-management.update", item.id), {
      preserveScroll: true,
      preserveState: true,
      only: ['items'],
      onSuccess: (page) => {
        setShowEditModal(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Inventory item updated successfully!");
        }
      },
      onError: () => {
        toast.error("Please check the form for errors");
      },
    });
  };

  return (
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Edit Inventory Item</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Update the inventory item details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Item Code — readonly, system-generated */}
          <div>
            <Label className="text-zinc-800 flex items-center gap-1.5">
              Item Code
              <span className="inline-flex items-center gap-1 text-xs font-normal text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
                <Lock className="h-3 w-3" />
                Auto-generated
              </span>
            </Label>
            <div className="relative mt-1">
              <Input
                type="text"
                value={data.item_code}
                readOnly
                disabled
                className="w-full border text-sm rounded-md px-4 py-2 bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed font-mono select-none"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Item code is system-generated and cannot be changed.</p>
          </div>

          {/* Item Name */}
          <div>
            <Label className="text-zinc-800">
              Item Name <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={data.item_name}
              onChange={(e) => setData("item_name", e.target.value)}
              placeholder="Enter item name"
              className={inputClass(errors.item_name)}
            />
            <InputError message={errors.item_name} />
          </div>

          {/* Description */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Description</Label>
            <Textarea
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Enter item description"
              className={inputClass(errors.description)}
              rows={3}
            />
            <InputError message={errors.description} />
          </div>

          {/* Category */}
          <div>
            <Label className="text-zinc-800">Category</Label>
            <Select
              value={data.category}
              onValueChange={(value) => setData("category", value)}
            >
              <SelectTrigger
                className={
                  "w-full text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
                  (errors.category
                    ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800")
                }
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputError message={errors.category} />
          </div>

          {/* Unit of Measure */}
          <div>
            <Label className="text-zinc-800">
              Unit of Measure <span className="text-red-500">*</span>
            </Label>
            <Select
              value={data.unit_of_measure}
              onValueChange={(value) => setData("unit_of_measure", value)}
            >
              <SelectTrigger
                className={
                  "w-full text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
                  (errors.unit_of_measure
                    ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
                    : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800")
                }
              >
                <SelectValue placeholder="Select unit of measure" />
              </SelectTrigger>
              <SelectContent>
                {units.map((unit) => (
                  <SelectItem key={unit} value={unit}>
                    {unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputError message={errors.unit_of_measure} />
          </div>

          {/* Min Stock Level */}
          <div>
            <Label className="text-zinc-800">Minimum Stock Level</Label>
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
            <p className="text-xs text-gray-500 mt-1">Alert when stock falls below this level</p>
          </div>

          {/* Unit Price */}
          <div>
            <Label className="text-zinc-800">Unit Price</Label>
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
            <p className="text-xs text-gray-500 mt-1">Default unit price for this item</p>
          </div>

          {/* Is Active */}
          <div className="col-span-2 flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <Switch
              id="is_active"
              checked={data.is_active}
              onCheckedChange={(checked) => setData("is_active", checked)}
              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
            />
            <Label htmlFor="is_active" className="cursor-pointer text-zinc-800">
              {data.is_active ? 'Active' : 'Inactive'}
              <span className={`ml-2 text-xs font-medium ${data.is_active ? 'text-green-600' : 'text-red-600'}`}>
                ({data.is_active ? 'Item is available for use' : 'Item is disabled'})
              </span>
            </Label>
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="col-span-2 flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
              disabled={processing}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditInventoryItem;