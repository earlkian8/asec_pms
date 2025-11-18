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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";

const AddIssue = ({ setShowAddModal, project, milestones = [], tasks = [], users = [] }) => {
  const { data, setData, post, errors, processing } = useForm({
    project_id: project?.id || "",
    project_milestone_id: "none",
    project_task_id: "none",
    title: "",
    description: "",
    priority: "medium",
    status: "open",
    assigned_to: "none",
    due_date: "",
  });

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleSubmit = (e) => {
    e.preventDefault();

    const submitData = {
      ...data,
      project_id: project.id,
      project_milestone_id: data.project_milestone_id && data.project_milestone_id !== "none" 
        ? (typeof data.project_milestone_id === 'string' ? parseInt(data.project_milestone_id) : data.project_milestone_id)
        : null,
      project_task_id: data.project_task_id && data.project_task_id !== "none" 
        ? (typeof data.project_task_id === 'string' ? parseInt(data.project_task_id) : data.project_task_id)
        : null,
      assigned_to: data.assigned_to && data.assigned_to !== "none" 
        ? (typeof data.assigned_to === 'string' ? parseInt(data.assigned_to) : data.assigned_to)
        : null,
    };

    post(route("project-management.project-issues.store"), {
      data: submitData,
      preserveScroll: true,
      onSuccess: () => {
        setShowAddModal(false);
        toast.success("Issue created successfully!");
      },
      onError: () => {
        toast.error("Please check the form for errors");
      },
    });
  };

  // Filter tasks based on selected milestone
  const filteredTasks = data.project_milestone_id && data.project_milestone_id !== "none"
    ? tasks.filter(t => t.project_milestone_id === parseInt(data.project_milestone_id))
    : [];

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Issue</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Title */}
          <div>
            <Label>Issue Title</Label>
            <Input
              value={data.title}
              onChange={(e) => setData("title", e.target.value)}
              placeholder="Enter issue title"
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
              placeholder="Enter issue description"
              className={inputClass(errors.description)}
            />
            <InputError message={errors.description} />
          </div>

          {/* Milestone (Optional) */}
          <div>
            <Label>Milestone (Optional)</Label>
            <Select
              value={data.project_milestone_id}
              onValueChange={(value) => {
                setData("project_milestone_id", value);
                setData("project_task_id", "none"); // Reset task when milestone changes
              }}
            >
              <SelectTrigger className={inputClass(errors.project_milestone_id)}>
                <SelectValue placeholder="Select milestone (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputError message={errors.project_milestone_id} />
          </div>

          {/* Task (Optional, depends on milestone) */}
          <div>
            <Label>Task (Optional)</Label>
            <Select
              value={data.project_task_id}
              onValueChange={(value) => setData("project_task_id", value)}
              disabled={!data.project_milestone_id || data.project_milestone_id === "none"}
            >
              <SelectTrigger className={inputClass(errors.project_task_id)}>
                <SelectValue placeholder={data.project_milestone_id ? "Select task (optional)" : "Select milestone first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {filteredTasks.map((t) => (
                  <SelectItem key={t.id} value={t.id.toString()}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputError message={errors.project_task_id} />
          </div>

          {/* Priority */}
          <div>
            <Label>Priority</Label>
            <Select
              value={data.priority}
              onValueChange={(value) => setData("priority", value)}
            >
              <SelectTrigger className={inputClass(errors.priority)}>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <InputError message={errors.priority} />
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
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <InputError message={errors.status} />
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
                <SelectItem value="none">None (Unassigned)</SelectItem>
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

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing} className="bg-zinc-700 hover:bg-zinc-900 text-white">
              Add Issue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddIssue;

