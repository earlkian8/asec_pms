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
import { Loader2, Save } from "lucide-react";
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/numberFormat";

const EditBilling = ({ setShowEditModal, billing }) => {
  const { data, setData, put, errors, processing } = useForm({
    billing_amount: billing.billing_amount || "",
    billing_date: billing.billing_date ? new Date(billing.billing_date).toISOString().split('T')[0] : "",
    due_date: billing.due_date ? new Date(billing.due_date).toISOString().split('T')[0] : "",
    description: billing.description || "",
  });

  const [billingAmountDisplay, setBillingAmountDisplay] = useState('');

  // Initialize display value when data.billing_amount changes
  useEffect(() => {
    if (data.billing_amount) {
      setBillingAmountDisplay(formatNumberWithCommas(data.billing_amount));
    } else {
      setBillingAmountDisplay('');
    }
  }, [data.billing_amount]);

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
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Billing updated successfully!");
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
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Edit Billing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Billing Code (read-only) */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Billing Code</Label>
            <Input
              value={billing.billing_code}
              readOnly
              className={inputClass(false, true)}
            />
          </div>

          {/* Project (read-only) */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Project</Label>
            <Input
              value={`${billing.project?.project_code} - ${billing.project?.project_name}`}
              readOnly
              className={inputClass(false, true)}
            />
          </div>

          {/* Billing Type (read-only) */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Billing Type</Label>
            <Input
              value={billing.billing_type === 'fixed_price' ? 'Fixed Price' : billing.billing_type === 'milestone' ? 'Milestone' : ''}
              readOnly
              className="bg-gray-50 border-gray-300 text-gray-600 cursor-not-allowed"
            />
          </div>

          {/* Milestone (if milestone-based) */}
          {billing.billing_type === 'milestone' && billing.milestone && (
            <div className="col-span-2">
              <Label className="text-zinc-800">Milestone</Label>
              <Input
                value={billing.milestone.name + (billing.milestone.billing_percentage ? ` (${billing.milestone.billing_percentage}%)` : '')}
                readOnly
                className="bg-gray-50 border-gray-300 text-gray-600 cursor-not-allowed"
              />
            </div>
          )}

          {/* Billing Amount */}
          <div className="col-span-2">
            <Label className="text-zinc-800">Billing Amount <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              value={billingAmountDisplay}
              onChange={(e) => {
                // Only allow changes for fixed_price type (milestone is read-only)
                if (billing.billing_type === 'fixed_price') {
                  let inputValue = e.target.value;
                  
                  // Allow empty string
                  if (inputValue === '') {
                    setBillingAmountDisplay('');
                    setData("billing_amount", '');
                    return;
                  }
                  
                  // Remove all non-numeric characters except decimal point
                  inputValue = inputValue.replace(/[^\d.]/g, '');
                  
                  // Prevent multiple decimal points
                  const parts = inputValue.split('.');
                  if (parts.length > 2) {
                    inputValue = parts[0] + '.' + parts.slice(1).join('');
                  }
                  
                  // Limit decimal places to 2
                  if (parts.length === 2 && parts[1].length > 2) {
                    inputValue = parts[0] + '.' + parts[1].substring(0, 2);
                  }
                  
                  // Format with commas for display
                  const formattedValue = formatNumberWithCommas(inputValue);
                  setBillingAmountDisplay(formattedValue);
                  
                  // Store numeric value (without commas)
                  const numericValue = parseFormattedNumber(inputValue);
                  setData("billing_amount", numericValue);
                }
              }}
              readOnly={billing.billing_type === 'fixed_price' || billing.billing_type === 'milestone'}
              placeholder="0.00"
              className={billing.billing_type === 'fixed_price' || billing.billing_type === 'milestone'
                ? "bg-gray-50 border-gray-300 text-gray-600 cursor-not-allowed" 
                : inputClass(errors.billing_amount)}
            />
            <InputError message={errors.billing_amount} />
            {billing.billing_type === 'fixed_price' && (
              <p className="text-xs text-gray-500 mt-1">
                Fixed amount cannot be changed.
              </p>
            )}
            {billing.billing_type === 'milestone' && billing.milestone && billing.project && (() => {
              if (billing.milestone.billing_percentage && billing.project.contract_amount) {
                const calculatedAmount = (parseFloat(billing.project.contract_amount) * parseFloat(billing.milestone.billing_percentage)) / 100;
                return (
                  <p className="text-xs text-gray-500 mt-1">
                    Calculated from milestone percentage: ₱{parseFloat(billing.project.contract_amount).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × {billing.milestone.billing_percentage}% = ₱{calculatedAmount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                );
              }
              return (
                <p className="text-xs text-gray-500 mt-1">
                  Amount is calculated from milestone percentage and cannot be changed.
                </p>
              );
            })()}
            {billing.total_paid > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Total paid: ₱{parseFloat(billing.total_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
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

export default EditBilling;
