import { useForm, router } from "@inertiajs/react";
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

const StockIn = ({ setShowStockInModal, item }) => {
  const { data, setData, post, errors, processing } = useForm({
    quantity: "",
    unit_price: "",
    transaction_date: new Date().toISOString().split('T')[0],
    notes: "",
  });

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleSubmit = (e) => {
    e.preventDefault();

    post(route("inventory-management.stock-in", item.id), {
      preserveScroll: false,
      onSuccess: () => {
        setShowStockInModal(false);
        toast.success("Stock added successfully!");
        router.reload({ only: ['items'] });
      },
      onError: () => toast.error("Please check the form for errors"),
    });
  };

  return (
    <Dialog open onOpenChange={setShowStockInModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Stock In - {item.item_name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Current Stock Info */}
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">
              Current Stock: <span className="font-medium">{item.current_stock} {item.unit_of_measure}</span>
            </p>
          </div>

          {/* Quantity */}
          <div>
            <Label>Quantity *</Label>
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
              placeholder="Additional notes about this stock in..."
              className={inputClass(errors.notes)}
            />
            <InputError message={errors.notes} />
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowStockInModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              Add Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default StockIn;

