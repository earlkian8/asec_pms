import { useForm, router } from "@inertiajs/react";
import { toast } from "sonner";
import { useState } from "react";
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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";

const StockOut = ({ setShowStockOutModal, item, projects = [] }) => {
  const { data, setData, post, errors, processing } = useForm({
    quantity: "",
    stock_out_type: "",
    project_id: "",
    unit_price: "",
    transaction_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const [showProjectSelect, setShowProjectSelect] = useState(false);

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleStockOutTypeChange = (value) => {
    setData("stock_out_type", value);
    setData("project_id", ""); // Reset project when type changes
    setShowProjectSelect(value === "project_use");
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (data.stock_out_type === "project_use" && !data.project_id) {
      toast.error("Please select a project for project use");
      return;
    }

    post(route("inventory-management.stock-out", item.id), {
      preserveScroll: false,
      onSuccess: () => {
        setShowStockOutModal(false);
        toast.success("Stock removed successfully!");
        router.reload({ only: ['items'] });
      },
      onError: (errors) => {
        if (errors.error) {
          toast.error(errors.error);
        } else {
          toast.error("Please check the form for errors");
        }
      },
    });
  };

  return (
    <Dialog open onOpenChange={setShowStockOutModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stock Out - {item.item_name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Current Stock Info */}
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">
              Available Stock: <span className="font-medium">{item.current_stock} {item.unit_of_measure}</span>
            </p>
          </div>

          {/* Quantity */}
          <div>
            <Label>Quantity *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={item.current_stock}
              value={data.quantity}
              onChange={(e) => setData("quantity", e.target.value)}
              placeholder="0.00"
              className={inputClass(errors.quantity)}
            />
            <InputError message={errors.quantity} />
            <p className="text-xs text-gray-500 mt-1">Unit: {item.unit_of_measure}</p>
          </div>

          {/* Stock Out Type */}
          <div>
            <Label>Stock Out Type *</Label>
            <Select
              value={data.stock_out_type}
              onValueChange={handleStockOutTypeChange}
            >
              <SelectTrigger className={inputClass(errors.stock_out_type)}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="project_use">Project Use</SelectItem>
                <SelectItem value="damage">Damage</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <InputError message={errors.stock_out_type} />
          </div>

          {/* Project Selection (only for project_use) */}
          {showProjectSelect && (
            <div>
              <Label>Project *</Label>
              <Select
                value={data.project_id ? data.project_id.toString() : ""}
                onValueChange={(value) => setData("project_id", value)}
              >
                <SelectTrigger className={inputClass(errors.project_id)}>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.length > 0 ? (
                    projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.project_code} - {project.project_name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-gray-500">
                      No projects available
                    </div>
                  )}
                </SelectContent>
              </Select>
              <InputError message={errors.project_id} />
            </div>
          )}

          {/* Unit Price */}
          <div>
            <Label>Unit Price (Optional)</Label>
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

          {/* Transaction Date */}
          <div>
            <Label>Transaction Date</Label>
            <Input
              type="date"
              value={data.transaction_date}
              onChange={(e) => setData("transaction_date", e.target.value)}
              className={inputClass(errors.transaction_date)}
            />
            <InputError message={errors.transaction_date} />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={data.notes}
              onChange={(e) => setData("notes", e.target.value)}
              placeholder="Additional notes about this stock out..."
              className={inputClass(errors.notes)}
            />
            <InputError message={errors.notes} />
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowStockOutModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              Remove Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockOut;

