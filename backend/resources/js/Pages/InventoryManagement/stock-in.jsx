import { useForm, router } from "@inertiajs/react";
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
import { Loader2, ArrowDownToLine } from "lucide-react";

const StockIn = ({ setShowStockInModal, item }) => {
  const { data, setData, post, errors, processing } = useForm({
    quantity: "",
    unit_price: "",
    transaction_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleSubmit = (e) => {
    e.preventDefault();

    post(route("inventory-management.stock-in", item.id), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowStockInModal(false);
        router.reload({ only: ['items'] });
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Stock added successfully!");
        }
      },
      onError: () => {
        toast.error("Please check the form for errors");
      },
    });
  };

  return (
    <Dialog open onOpenChange={setShowStockInModal}>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Stock In - {item.item_name}</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Add stock to this inventory item. The quantity will be added to the current stock.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Current Stock Info */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Current Stock</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {parseFloat(item.current_stock || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {item.unit_of_measure}
                </p>
              </div>
              <div className="bg-blue-200 rounded-full p-3">
                <ArrowDownToLine className="h-5 w-5 text-blue-700" />
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
              value={data.quantity}
              onChange={(e) => setData("quantity", e.target.value)}
              placeholder="0.00"
              className={inputClass(errors.quantity)}
            />
            <InputError message={errors.quantity} />
            <p className="text-xs text-gray-500 mt-1">Unit: {item.unit_of_measure}</p>
          </div>

          {/* Unit Price */}
          <div>
            <Label className="text-zinc-800">Unit Price (Optional)</Label>
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
            <p className="text-xs text-gray-500 mt-1">Price per unit for this stock in transaction</p>
          </div>

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
              placeholder="Additional notes about this stock in transaction..."
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
              onClick={() => setShowStockInModal(false)}
              disabled={processing}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <ArrowDownToLine size={16} />
                  Add Stock
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockIn;
