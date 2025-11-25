import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";

const EditMilestone = ({ setShowEditModal, milestone, project }) => {
  const { data, setData, put, errors, processing } = useForm({
    name: milestone.name || "",
    description: milestone.description || "",
    start_date: milestone.start_date || "",
    due_date: milestone.due_date || "",
    billing_percentage: milestone.billing_percentage || "",
    status: milestone.status || "pending",
  });

  // Helper function to check if all tasks in a milestone are completed
  const areAllTasksCompleted = (milestone) => {
    const tasks = milestone.tasks || [];
    if (tasks.length === 0) return true; // No tasks means it can be completed
    
    const allCompleted = tasks.every(task => task.status === 'completed');
    return allCompleted;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate: Cannot mark as completed unless all tasks are completed
    if (data.status === 'completed' && !areAllTasksCompleted(milestone)) {
      const tasks = milestone.tasks || [];
      const incompleteTasks = tasks.filter(task => task.status !== 'completed').length;
      toast.error(`Cannot mark milestone as completed. ${incompleteTasks} task(s) still need to be completed.`);
      return;
    }

    put(route("project-management.project-milestones.update", [project.id, milestone.id]), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowEditModal(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Milestone updated successfully!");
        }
      },
      onError: (errors) => {
        if (errors?.status) {
          toast.error(errors.status);
        } else {
          toast.error("Please check the form for errors");
        }
      },
    });
  };

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  return (
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Edit Milestone</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Update the milestone details below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Name */}
          <div>
            <Label className="text-zinc-800">Milestone Name</Label>
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
              min={data.start_date || undefined}
              className={inputClass(errors.due_date)}
            />
            <InputError message={errors.due_date} />
          </div>

          {/* Billing Percentage */}
          <div>
            <Label className="text-zinc-800">Billing Percentage (%)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={data.billing_percentage}
              onChange={(e) => setData("billing_percentage", e.target.value)}
              placeholder="0.00"
              className={inputClass(errors.billing_percentage)}
            />
            <InputError message={errors.billing_percentage} />
          </div>

          {/* Status */}
          <div>
            <Label className="text-zinc-800">Status</Label>
            <Select
              value={data.status}
              onValueChange={(value) => setData("status", value)}
            >
              <SelectTrigger className={inputClass(errors.status)}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem 
                  value="completed"
                  disabled={!areAllTasksCompleted(milestone)}
                >
                  Completed
                  {!areAllTasksCompleted(milestone) && ' (All tasks must be completed)'}
                </SelectItem>
              </SelectContent>
            </Select>
            <InputError message={errors.status} />
            {!areAllTasksCompleted(milestone) && data.status !== 'completed' && (
              <p className="text-xs text-gray-500 mt-1">
                Complete all tasks to mark this milestone as completed.
              </p>
            )}
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-zinc-800 text-white hover:bg-zinc-900 transition"
              disabled={processing}
            >
              Update Milestone
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMilestone;
