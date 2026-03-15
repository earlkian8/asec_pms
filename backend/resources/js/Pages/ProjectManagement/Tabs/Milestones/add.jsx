import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import { Loader2, Plus, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";

const AddMilestone = ({ setShowAddModal, project, existingBillingTotal = 0 }) => {
  const isMilestoneBilling = project?.billing_type === 'milestone';
  const remaining = Math.max(0, 100 - existingBillingTotal);

  const { data, setData, post, errors, processing } = useForm({
    name:               "",
    description:        "",
    start_date:         "",
    due_date:           "",
    billing_percentage: "",
    status:             "pending",
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    // Frontend billing % guard
    if (isMilestoneBilling && data.billing_percentage) {
      const newTotal = existingBillingTotal + parseFloat(data.billing_percentage);
      if (newTotal > 100) {
        toast.error(
          `Total billing would reach ${newTotal.toFixed(2)}%. Only ${remaining.toFixed(2)}% remaining.`
        );
        return;
      }
    }

    post(route("project-management.project-milestones.store", project.id), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowAddModal(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Milestone created successfully!");
        }
      },
      onError: () => toast.error("Please check the form for errors"),
    });
  };

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Add Milestone</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Fill in the milestone details below.
          </DialogDescription>
        </DialogHeader>

        {/* Billing type context banner */}
        <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${
          isMilestoneBilling
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          {isMilestoneBilling ? (
            <span>
              <span className="font-semibold">Milestone billing</span> — assign a billing percentage to this milestone.
              {existingBillingTotal > 0 && (
                <span className={`ml-1 ${remaining === 0 ? 'text-red-600 font-semibold' : 'text-blue-600'}`}>
                  {remaining.toFixed(2)}% remaining of 100%.
                </span>
              )}
            </span>
          ) : (
            <span>
              <span className="font-semibold">Fixed price billing</span> — billing percentage per milestone is not applicable.
            </span>
          )}
        </div>

        {/* Warn if billing is already at 100% */}
        {isMilestoneBilling && remaining === 0 && (
          <div className="flex items-start gap-2 text-xs px-3 py-2 rounded-lg border bg-red-50 border-red-200 text-red-700">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              <span className="font-semibold">Billing is already at 100%.</span> You cannot assign any more billing percentage to new milestones.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Name */}
          <div>
            <Label className="text-zinc-800">Milestone Name <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              value={data.name}
              onChange={(e) => setData("name", e.target.value)}
              placeholder="Enter milestone name"
              className={inputClass(errors.name)}
            />
            <InputError message={errors.name} />
          </div>

          {/* Description */}
          <div>
            <Label className="text-zinc-800">Description</Label>
            <Textarea
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Enter milestone description"
              className={inputClass(errors.description)}
            />
            <InputError message={errors.description} />
          </div>

          {/* Start Date */}
          <div>
            <Label className="text-zinc-800">Start Date</Label>
            <Input
              type="date"
              value={data.start_date}
              onChange={(e) => setData("start_date", e.target.value)}
              min={project?.start_date || undefined}
              max={project?.planned_end_date || undefined}
              className={inputClass(errors.start_date)}
            />
            <InputError message={errors.start_date} />
          </div>

          {/* Due Date */}
          <div>
            <Label className="text-zinc-800">Due Date</Label>
            <Input
              type="date"
              value={data.due_date}
              onChange={(e) => setData("due_date", e.target.value)}
              min={data.start_date || project?.start_date || undefined}
              max={project?.planned_end_date || undefined}
              className={inputClass(errors.due_date)}
            />
            <InputError message={errors.due_date} />
          </div>

          {/* Billing Percentage — only shown for milestone billing */}
          {isMilestoneBilling && (
            <div>
              <Label className="text-zinc-800">
                Billing Percentage (%)
                <span className={`ml-1 text-xs font-normal ${remaining === 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  — {remaining.toFixed(2)}% remaining
                </span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={remaining}
                value={data.billing_percentage}
                onChange={(e) => setData("billing_percentage", e.target.value)}
                placeholder="0.00"
                disabled={remaining === 0}
                className={inputClass(errors.billing_percentage) + (remaining === 0 ? ' opacity-50 cursor-not-allowed' : '')}
              />
              <InputError message={errors.billing_percentage} />
            </div>
          )}

          {/* Status */}
          <div>
            <Label className="text-zinc-800">Status</Label>
            <Select value={data.status} onValueChange={(value) => setData("status", value)}>
              <SelectTrigger className={inputClass(errors.status)}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <InputError message={errors.status} />
          </div>

          {/* Footer */}
          <DialogFooter className="flex justify-end gap-2 mt-4 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
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
                <><Loader2 className="h-4 w-4 animate-spin" />Adding...</>
              ) : (
                <><Plus size={16} />Add Milestone</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMilestone;