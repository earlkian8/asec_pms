import { useForm } from "@inertiajs/react";
import { useState, useEffect } from "react";
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
} from "@/Components/ui/select";
import { Loader2, Save, CreditCard, Sparkles } from "lucide-react";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/numberFormat";

// Auto-generate a reference number based on payment method and timestamp
const generateReferenceNumber = (paymentMethod = 'bank_transfer') => {
  const prefixMap = {
    cash:          'CASH',
    check:         'CHK',
    bank_transfer: 'BT',
    credit_card:   'CC',
    other:         'REF',
  };
  const prefix = prefixMap[paymentMethod] || 'REF';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const AddPayment = ({ setShowPaymentModal, billing }) => {
  const remainingAmount = parseFloat(billing.billing_amount || 0) - parseFloat(billing.total_paid || 0);

  const { data, setData, post, errors, processing } = useForm({
    payment_amount: "",
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: "bank_transfer",
    reference_number: generateReferenceNumber("bank_transfer"),
    notes: "",
  });

  const [paymentAmountDisplay, setPaymentAmountDisplay] = useState('');

  // Regenerate reference number whenever payment method changes
  useEffect(() => {
    setData("reference_number", generateReferenceNumber(data.payment_method));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.payment_method]);

  const inputClass = (error, readOnly = false) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (readOnly
      ? "bg-zinc-100 text-zinc-600 cursor-not-allowed"
      : error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (parseFloat(data.payment_amount) > remainingAmount) {
      toast.error(`Payment amount cannot exceed remaining amount (₱${remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`);
      return;
    }

    post(route("billing-management.add-payment", billing.id), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowPaymentModal(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Payment recorded successfully!");
        }
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
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Record Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Billing Info (read-only) */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Billing Code</Label>
            <Input
              value={billing.billing_code}
              readOnly
              className={inputClass(false, true)}
            />
          </div>

          <div className="col-span-2">
            <Label className="text-zinc-800">Project</Label>
            <Input
              value={`${billing.project?.project_code} - ${billing.project?.project_name}`}
              readOnly
              className={inputClass(false, true)}
            />
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-2">
            <div>
              <Label className="text-zinc-800">Billing Amount</Label>
              <Input
                value={`₱${parseFloat(billing.billing_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                readOnly
                className={inputClass(false, true)}
              />
            </div>
            <div>
              <Label className="text-zinc-800">Remaining Amount</Label>
              <Input
                value={`₱${remainingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                readOnly
                className={inputClass(false, true)}
              />
            </div>
          </div>

          {/* Payment Amount */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Payment Amount <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              value={paymentAmountDisplay}
              onChange={(e) => {
                let inputValue = e.target.value;

                if (inputValue === '') {
                  setPaymentAmountDisplay('');
                  setData("payment_amount", '');
                  return;
                }

                inputValue = inputValue.replace(/[^\d.]/g, '');

                const parts = inputValue.split('.');
                if (parts.length > 2) {
                  inputValue = parts[0] + '.' + parts.slice(1).join('');
                }

                if (parts.length === 2 && parts[1].length > 2) {
                  inputValue = parts[0] + '.' + parts[1].substring(0, 2);
                }

                const formattedValue = formatNumberWithCommas(inputValue);
                setPaymentAmountDisplay(formattedValue);

                const numericValue = parseFormattedNumber(inputValue);
                setData("payment_amount", numericValue);
              }}
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
            <Label className="text-zinc-800">Payment Date <span className="text-red-500">*</span></Label>
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
            <Label className="text-zinc-800">Payment Method <span className="text-red-500">*</span></Label>
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

          {/* Reference Number — auto-generated, read-only */}
          <div className="col-span-2">
            <Label className="text-zinc-800 flex items-center gap-1.5">
              Reference Number
              <span className="inline-flex items-center gap-1 text-xs font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                <Sparkles className="h-3 w-3" />
                Auto-generated
              </span>
            </Label>
            <Input
              value={data.reference_number}
              readOnly
              className={inputClass(false, true) + " font-mono tracking-wide"}
            />
            <p className="text-xs text-gray-400 mt-1">
              Unique reference ID generated automatically based on payment method.
            </p>
            <InputError message={errors.reference_number} />
          </div>

          {/* Notes */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Notes</Label>
            <Textarea
              value={data.notes}
              onChange={(e) => setData("notes", e.target.value)}
              placeholder="Additional payment notes"
              rows={3}
              className={inputClass(errors.notes)}
            />
            <InputError message={errors.notes} />
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="col-span-2 flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
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
                  Recording...
                </>
              ) : (
                <>
                  <CreditCard size={16} />
                  Record Payment
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPayment;