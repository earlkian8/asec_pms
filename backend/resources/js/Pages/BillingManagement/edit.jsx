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
import { Loader2, Save, AlertTriangle } from "lucide-react";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/numberFormat";

const fmt = (n) => parseFloat(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EditBilling = ({ setShowEditModal, billing }) => {
  const { data, setData, put, errors, processing } = useForm({
    billing_amount: billing.billing_amount || "",
    billing_date: billing.billing_date ? new Date(billing.billing_date).toISOString().split('T')[0] : "",
    due_date: billing.due_date ? new Date(billing.due_date).toISOString().split('T')[0] : "",
    description: billing.description || "",
  });

  const [billingAmountDisplay, setBillingAmountDisplay] = useState(
    billing.billing_amount ? formatNumberWithCommas(billing.billing_amount) : ''
  );

  const contractAmount = billing.project?.contract_amount ? parseFloat(billing.project.contract_amount) : 0;
  const totalPaid      = parseFloat(billing.total_paid || 0);
  const enteredAmount  = parseFloat(data.billing_amount) || 0;

  // Total billed for the project excluding this billing, to compute variance correctly
  // We don't have that from the billing prop, so we compute: if enteredAmount > contractAmount it's over
  const wouldExceed = contractAmount > 0 && enteredAmount > contractAmount;

  const setAmount = (raw) => {
    setBillingAmountDisplay(formatNumberWithCommas(raw));
    setData('billing_amount', parseFormattedNumber(raw));
  };

  const handleAmountChange = (e) => {
    let v = e.target.value;
    if (v === '') { setBillingAmountDisplay(''); setData('billing_amount', ''); return; }
    v = v.replace(/[^\d.]/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    if (parts.length === 2 && parts[1].length > 2) v = parts[0] + '.' + parts[1].substring(0, 2);
    setAmount(v);
  };

  // Presets based on contract amount
  const presets = [];
  if (contractAmount > 0) {
    presets.push({ label: 'Full', value: contractAmount.toFixed(2) });
    [75, 50, 25].forEach(pct => {
      presets.push({ label: `${pct}%`, value: ((contractAmount * pct) / 100).toFixed(2) });
    });
  }

  const inputClass = (error, readOnly = false) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (readOnly
      ? "bg-zinc-100 text-zinc-600 cursor-not-allowed"
      : error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleSubmit = (e) => {
    e.preventDefault();
    put(route("billing-management.update", billing.id), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowEditModal(false);
        const flash = page.props.flash;
        if (flash?.error) { toast.error(flash.error); return; }
        if (flash?.warning) toast.warning(flash.warning);
        toast.success("Billing updated successfully!");
      },
      onError: () => toast.error("Please check the form for errors"),
    });
  };

  return (
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Edit Billing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Billing Code */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Billing Code</Label>
            <Input value={billing.billing_code} readOnly className={inputClass(false, true)} />
          </div>

          {/* Project */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Project</Label>
            <Input
              value={`${billing.project?.project_code} - ${billing.project?.project_name}`}
              readOnly
              className={inputClass(false, true)}
            />
          </div>

          {/* Contract amount info */}
          {contractAmount > 0 && (
            <div className="col-span-2">
              <Label className="text-zinc-800">Contract Amount</Label>
              <Input
                value={`₱${fmt(contractAmount)}`}
                readOnly
                className="bg-gray-50 border-gray-300 text-gray-600 cursor-not-allowed"
              />
              {totalPaid > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Total paid so far: <span className="font-medium">₱{fmt(totalPaid)}</span>
                  {' '}— billing amount cannot be set below this.
                </p>
              )}
            </div>
          )}

          {/* Billing Amount */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Billing Amount <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              value={billingAmountDisplay}
              onChange={handleAmountChange}
              placeholder="0.00"
              className={inputClass(errors.billing_amount)}
            />
            <InputError message={errors.billing_amount} />

            {/* Presets */}
            {presets.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {presets.map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setAmount(value)}
                    className="px-2.5 py-1 text-xs rounded-md border border-zinc-300 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 transition-colors font-medium"
                  >
                    {label} ₱{fmt(value)}
                  </button>
                ))}
              </div>
            )}

            {/* Over-contract warning */}
            {wouldExceed && (
              <div className="mt-2 flex items-start gap-2 text-xs rounded-lg px-3 py-2 border bg-amber-50 border-amber-200 text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <span>
                  This amount (<strong>₱{fmt(enteredAmount)}</strong>) exceeds the contract amount of <strong>₱{fmt(contractAmount)}</strong> by <strong>₱{fmt(enteredAmount - contractAmount)}</strong>. You can still proceed.
                </span>
              </div>
            )}
          </div>

          {/* Billing Date */}
          <div>
            <Label className="text-zinc-800">Billing Date <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={data.billing_date}
              onChange={(e) => setData("billing_date", e.target.value)}
              className={inputClass(errors.billing_date)}
            />
            <InputError message={errors.billing_date} />
          </div>

          {/* Due Date */}
          <div>
            <Label className="text-zinc-800">Due Date</Label>
            <Input
              type="date"
              value={data.due_date}
              onChange={(e) => setData("due_date", e.target.value)}
              min={data.billing_date}
              className={inputClass(errors.due_date)}
            />
            <InputError message={errors.due_date} />
          </div>

          {/* Description */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Description</Label>
            <Textarea
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Enter billing description"
              rows={3}
              className={inputClass(errors.description)}
            />
            <InputError message={errors.description} />
          </div>

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
                <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><Save size={16} />Save Changes</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBilling;
