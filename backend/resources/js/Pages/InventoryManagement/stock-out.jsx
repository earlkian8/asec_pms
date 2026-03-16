import { useForm, router } from "@inertiajs/react";
import { toast } from "sonner";
import { useState } from "react";
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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";
import { Loader2, ArrowUpFromLine } from "lucide-react";

// All stock-out types. Only 'project_use' requires project selection.
const STOCK_OUT_TYPES = [
  {
    value: "project_use",
    label: "Project Use",
    description: "Stock allocated to a specific project",
    requiresProject: true,
  },
  {
    value: "damage",
    label: "Damage",
    description: "Items damaged and written off",
    requiresProject: false,
  },
  {
    value: "expired",
    label: "Expired",
    description: "Items that have passed their expiry date",
    requiresProject: false,
  },
  {
    value: "lost",
    label: "Lost / Missing",
    description: "Items that are lost or unaccounted for",
    requiresProject: false,
  },
  {
    value: "returned_to_supplier",
    label: "Returned to Supplier",
    description: "Items returned to the vendor or supplier",
    requiresProject: false,
  },
  {
    value: "adjustment",
    label: "Stock Adjustment",
    description: "Manual correction to reconcile physical count",
    requiresProject: false,
  },
  {
    value: "other",
    label: "Other",
    description: "Any other reason not listed above",
    requiresProject: false,
  },
];

const StockOut = ({ setShowStockOutModal, item, projects = [] }) => {
  const { data, setData, post, errors, processing } = useForm({
    quantity: "",
    stock_out_type: "",
    project_id: "",
    transaction_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const selectedType = STOCK_OUT_TYPES.find(t => t.value === data.stock_out_type) || null;
  const requiresProject = selectedType?.requiresProject ?? false;

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleStockOutTypeChange = (value) => {
    setData(prev => ({
      ...prev,
      stock_out_type: value,
      project_id: "", // reset project whenever type changes
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (requiresProject && !data.project_id) {
      toast.error("Please select a project for project use.");
      return;
    }

    post(route("inventory-management.stock-out", item.id), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowStockOutModal(false);
        router.reload({ only: ['items'] });
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Stock removed successfully!");
        }
      },
      onError: (errs) => {
        if (errs.error) {
          toast.error(errs.error);
        } else {
          toast.error("Please check the form for errors.");
        }
      },
    });
  };

  return (
    <Dialog open onOpenChange={setShowStockOutModal}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Stock Out — {item.item_name}</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Remove stock from this inventory item. Select the reason and provide details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Current Stock Info */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-700 uppercase tracking-wide">Available Stock</p>
                <p className="text-2xl font-bold text-orange-900 mt-1">
                  {parseFloat(item.current_stock || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit_of_measure}
                </p>
              </div>
              <div className="bg-orange-200 rounded-full p-3">
                <ArrowUpFromLine className="h-5 w-5 text-orange-700" />
              </div>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <Label className="text-zinc-800">
              Quantity <span className="text-red-500">*</span>
            </Label>
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
            <p className="text-xs text-gray-500 mt-1">
              Unit: {item.unit_of_measure} &nbsp;·&nbsp; Max:{" "}
              {parseFloat(item.current_stock || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Stock Out Type */}
          <div>
            <Label className="text-zinc-800">
              Stock Out Type <span className="text-red-500">*</span>
            </Label>
            <Select
              value={data.stock_out_type}
              onValueChange={handleStockOutTypeChange}
            >
              <SelectTrigger className={inputClass(errors.stock_out_type)}>
                <SelectValue placeholder="Select reason for stock removal" />
              </SelectTrigger>
              <SelectContent>
                {STOCK_OUT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{type.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputError message={errors.stock_out_type} />
            {selectedType && (
              <p className="text-xs text-gray-500 mt-1">{selectedType.description}</p>
            )}
          </div>

          {/* Project Selection — only for project_use */}
          {requiresProject && (
            <div>
              <Label className="text-zinc-800">
                Project <span className="text-red-500">*</span>
              </Label>
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
                        {project.project_code} — {project.project_name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-gray-500">
                      No active projects available
                    </div>
                  )}
                </SelectContent>
              </Select>
              <InputError message={errors.project_id} />
              <p className="text-xs text-gray-500 mt-1">Select the project this stock is allocated to</p>
            </div>
          )}

          {/* Transaction Date */}
          <div>
            <Label className="text-zinc-800">Transaction Date</Label>
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
            <Label className="text-zinc-800">Notes</Label>
            <Textarea
              value={data.notes}
              onChange={(e) => setData("notes", e.target.value)}
              placeholder="Additional notes about this stock out transaction..."
              className={inputClass(errors.notes)}
              rows={3}
            />
            <InputError message={errors.notes} />
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowStockOutModal(false)}
              disabled={processing}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <ArrowUpFromLine size={16} />
                  Remove Stock
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockOut;