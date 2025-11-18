import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import { useState } from "react";
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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";

const AddTask = ({ setShowAddModal, milestones = [], users = [], preselectedMilestone = null, project = null }) => {
  const { data, setData, post, errors, processing } = useForm({
    title: "",
    description: "",
    project_milestone_id: preselectedMilestone?.id || milestones[0]?.id || "",
    assigned_to: "",
    due_date: "",
    status: "pending",
  });

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!data.project_milestone_id) {
      toast.error("Please select a milestone");
      return;
    }

    // Ensure assigned_to is null if empty string, otherwise convert to integer
    const submitData = {
      ...data,
      project_milestone_id: typeof data.project_milestone_id === 'string' 
        ? parseInt(data.project_milestone_id) 
        : data.project_milestone_id,
      assigned_to: data.assigned_to && data.assigned_to !== "" 
        ? (typeof data.assigned_to === 'string' ? parseInt(data.assigned_to) : data.assigned_to)
        : null,
    };

    post(route("project-management.project-tasks.store"), {
      data: submitData,
      preserveScroll: true,
      onSuccess: () => {
        setShowAddModal(false);
        toast.success("Task created successfully!");
      },
      onError: (errors) => {
        console.error('Task creation errors:', errors);
        toast.error("Please check the form for errors");
      },
    });
  };

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Title */}
          <div>
            <Label>Task Title</Label>
            <Input
              value={data.title}
              onChange={(e) => setData("title", e.target.value)}
              placeholder="Enter task title"
              className={inputClass(errors.title)}
            />
            <InputError message={errors.title} />
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Enter task description"
              className={inputClass(errors.description)}
            />
            <InputError message={errors.description} />
          </div>

          {/* Milestone */}
          <div>
            <Label>Milestone</Label>
            <Select
              value={data.project_milestone_id.toString()}
              onValueChange={(value) => setData("project_milestone_id", value)}
            >
              <SelectTrigger className={inputClass(errors.project_milestone_id)}>
                <SelectValue placeholder="Select milestone" />
              </SelectTrigger>
              <SelectContent>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputError message={errors.project_milestone_id} />
          </div>

          {/* Assigned To */}
          <div>
            <Label>Assign To</Label>
            <Select
              value={data.assigned_to}
              onValueChange={(value) => setData("assigned_to", value)}
            >
              <SelectTrigger className={inputClass(errors.assigned_to)}>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Unassigned)</SelectItem>
                {users.length > 0 ? (
                  users.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-sm text-gray-500">
                    No users available
                  </div>
                )}
              </SelectContent>
            </Select>
            <InputError message={errors.assigned_to} />
          </div>

          {/* Due Date */}
          <div>
            <Label>Due Date</Label>
            <Input
              type="date"
              value={data.due_date}
              onChange={(e) => setData("due_date", e.target.value)}
              className={inputClass(errors.due_date)}
            />
            <InputError message={errors.due_date} />
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>
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
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <InputError message={errors.status} />
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              Add Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTask;
