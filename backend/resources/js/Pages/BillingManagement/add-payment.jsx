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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const AddPayment = ({ setShowPaymentModal, billing }) => {
  const remainingAmount = parseFloat(billing.billing_amount || 0) - parseFloat(billing.total_paid || 0);

  const { data, setData, post, errors, processing } = useForm({
    payment_amount: "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "bank_transfer",
    reference_number: "",
    notes: "",
  });

  const inputClass = (error, readOnly = false) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
    (readOnly
      ? "bg-zinc-100 text-zinc-600 cursor-not-allowed"
      : error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate payment amount doesn't exceed remaining
    if (parseFloat(data.payment_amount) > remainingAmount) {
      toast.error(`Payment amount cannot exceed remaining amount (₱${remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
      return;
    }

    post(route("billing-management.add-payment", billing.id), {
      preserveScroll: true,
      onSuccess: () => {
        setShowPaymentModal(false);
        toast.success("Payment recorded successfully!");
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
    <Dialog open onOpenChange={setShowPaymentModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Billing Info (read-only) */}
          <div>
            <Label>Billing Code</Label>
            <Input
              value={billing.billing_code}
              readOnly
              className={inputClass(false, true)}
            />
          </div>

          <div>
            <Label>Project</Label>
            <Input
              value={`${billing.project?.project_code} - ${billing.project?.project_name}`}
              readOnly
              className={inputClass(false, true)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Billing Amount</Label>
              <Input
                value={`₱${parseFloat(billing.billing_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                readOnly
                className={inputClass(false, true)}
              />
            </div>
            <div>
              <Label>Remaining Amount</Label>
              <Input
                value={`₱${remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                readOnly
                className={inputClass(false, true)}
              />
            </div>
          </div>

          {/* Payment Amount */}
          <div>
            <Label>Payment Amount <span class="text-red-500">*</span>
</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={remainingAmount}
              value={data.payment_amount}
              onChange={(e) => setData("payment_amount", e.target.value)}
              placeholder="0.00"
              className={inputClass(errors.payment_amount)}
            />
            <InputError message={errors.payment_amount} />
            <p className="text-xs text-gray-500 mt-1">
              Maximum: ₱{remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Payment Date */}
          <div>
            <Label>Payment Date <span class="text-red-500">*</span></Label>
            <Input
              type="date"
              value={data.payment_date}
              onChange={(e) => setData("payment_date", e.target.value)}
              className={inputClass(errors.payment_date)}
            />
            <InputError message={errors.payment_date} />
          </div>

          {/* Payment Method */}
          <div>
            <Label>Payment Method <span class="text-red-500">*</span></Label>
            <Select
              value={data.payment_method}
              onValueChange={(value) => setData("payment_method", value)}
            >
              <SelectTrigger className={inputClass(errors.payment_method)}>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <InputError message={errors.payment_method} />
          </div>

          {/* Reference Number */}
          <div>
            <Label>Reference Number</Label>
            <Input
              value={data.reference_number}
              onChange={(e) => setData("reference_number", e.target.value)}
              placeholder="Check number, transaction ID, etc."
              className={inputClass(errors.reference_number)}
            />
            <InputError message={errors.reference_number} />
          </div>

          {/* Notes */}
          <div>
            <Label>Notes</Label>
            <Textarea
              value={data.notes}
              onChange={(e) => setData("notes", e.target.value)}
              placeholder="Additional payment notes"
              rows={3}
              className={inputClass(errors.notes)}
            />
            <InputError message={errors.notes} />
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPayment;

