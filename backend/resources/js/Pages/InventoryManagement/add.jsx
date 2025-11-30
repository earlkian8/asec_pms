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
import { Loader2, Package } from "lucide-react";

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
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleSubmit = (e) => {
    e.preventDefault();

    post(route("inventory-management.store"), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowAddModal(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Inventory item created successfully!");
        }
      },
      onError: () => {
        toast.error("Please check the form for errors");
      },
    });
  };

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Add New Inventory Item</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Create a new inventory item with its details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Item Name */}
          <div className="col-span-2">
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
            <Input
              type="text"
              value={data.category}
              onChange={(e) => setData("category", e.target.value)}
              placeholder="e.g., Construction Materials, Tools"
              className={inputClass(errors.category)}
            />
            <InputError message={errors.category} />
          </div>

          {/* Unit of Measure */}
          <div>
            <Label className="text-zinc-800">
              Unit of Measure <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={data.unit_of_measure}
              onChange={(e) => setData("unit_of_measure", e.target.value)}
              placeholder="e.g., pieces, kg, meters, liters"
              className={inputClass(errors.unit_of_measure)}
            />
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

          {/* Initial Stock */}
          <div>
            <Label className="text-zinc-800">Initial Stock (Optional)</Label>
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
              <Label className="text-zinc-800">Initial Stock Unit Price (Optional)</Label>
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
              <p className="text-xs text-gray-500 mt-1">Unit price for the initial stock</p>
            </div>
          )}

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
                ({data.is_active ? 'Item will be available for use' : 'Item will be disabled'})
              </span>
            </Label>
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="col-span-2 flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
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
                  Creating...
                </>
              ) : (
                <>
                  <Package size={16} />
                  Create Item
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddInventoryItem;
