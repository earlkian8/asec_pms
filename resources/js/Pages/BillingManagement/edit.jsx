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

          {/* Billing Amount */}
          <div>
            <Label>Billing Amount *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={data.billing_amount}
              onChange={(e) => setData("billing_amount", e.target.value)}
              placeholder="0.00"
              className={inputClass(errors.billing_amount)}
            />
            <InputError message={errors.billing_amount} />
            {billing.total_paid > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                Total paid: ₱{parseFloat(billing.total_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Billing Date */}
          <div>
            <Label>Billing Date *</Label>
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

