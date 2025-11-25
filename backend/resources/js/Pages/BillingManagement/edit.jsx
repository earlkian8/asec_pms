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

const EditBilling = ({ setShowEditModal, billing }) => {
  const { data, setData, put, errors, processing } = useForm({
    billing_amount: billing.billing_amount || "",
    billing_date: billing.billing_date ? new Date(billing.billing_date).toISOString().split('T')[0] : "",
    due_date: billing.due_date ? new Date(billing.due_date).toISOString().split('T')[0] : "",
    description: billing.description || "",
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

    put(route("billing-management.update", billing.id), {
      preserveScroll: true,
      onSuccess: () => {
        setShowEditModal(false);
        toast.success("Billing updated successfully!");
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
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Billing</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Billing Code (read-only) */}
          <div>
            <Label>Billing Code</Label>
            <Input
              value={billing.billing_code}
              readOnly
              className={inputClass(false, true)}
            />
          </div>

          {/* Project (read-only) */}
          <div>
            <Label>Project</Label>
            <Input
              value={`${billing.project?.project_code} - ${billing.project?.project_name}`}
              readOnly
              className={inputClass(false, true)}
            />
          </div>

          {/* Billing Type (read-only) */}
          <div>
            <Label>Billing Type</Label>
            <Input
              value={billing.billing_type === 'fixed_price' ? 'Fixed Price' : billing.billing_type === 'milestone' ? 'Milestone' : ''}
              readOnly
              className="bg-gray-50 border-gray-300 text-gray-600"
            />
          </div>

          {/* Milestone (if milestone-based) */}
          {billing.billing_type === 'milestone' && billing.milestone && (
            <div>
              <Label>Milestone</Label>
              <Input
                value={billing.milestone.name + (billing.milestone.billing_percentage ? ` (${billing.milestone.billing_percentage}%)` : '')}
                readOnly
                className="bg-gray-50 border-gray-300 text-gray-600"
              />
            </div>
          )}

          {/* Billing Amount */}
          <div>
            <Label>Billing Amount <span class="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={data.billing_amount}
              onChange={(e) => {
                // Only allow changes for fixed_price type (milestone is read-only)
                if (billing.billing_type === 'fixed_price') {
                  setData("billing_amount", e.target.value);
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
            <Label>Billing Date <span class="text-red-500">*</span></Label>
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
            <Label>Due Date</Label>
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
          <div>
            <Label>Description</Label>
            <Textarea
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Enter billing description"
              rows={3}
              className={inputClass(errors.description)}
            />
            <InputError message={errors.description} />
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              Update Billing
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBilling;

