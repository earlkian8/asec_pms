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
import { Lock } from "lucide-react";

const EditIssue = ({ setShowEditModal, issue, project, milestones = [], tasks = [], users = [] }) => {
  // If this modal was opened from TaskDetailModal, issue.task is injected
  const contextTask = issue?.task ?? null;
  const isFromTask  = !!contextTask;

  // Resolve the assigned user: prefer the task's assigned user when in task context
  const taskAssignedId = contextTask
    ? (contextTask.assigned_to ?? contextTask.assignedUser?.id ?? contextTask.assigned_user?.id ?? null)
    : null;

  const taskAssignedName = contextTask
    ? (contextTask.assignedUser?.name ?? contextTask.assigned_user?.name ?? null)
    : null;

  const { data, setData, put, errors, processing } = useForm({
    project_milestone_id: issue?.project_milestone_id
      ? issue.project_milestone_id.toString()
      : "none",
    project_task_id: contextTask
      ? contextTask.id.toString()
      : (issue?.project_task_id ? issue.project_task_id.toString() : "none"),
    title:       issue?.title       || "",
    description: issue?.description || "",
    priority:    issue?.priority    || "medium",
    status:      issue?.status      || "open",
    // In task context always use the task's assigned user
    assigned_to: isFromTask
      ? (taskAssignedId ? taskAssignedId.toString() : "none")
      : (issue?.assigned_to ? issue.assigned_to.toString() : "none"),
    due_date: issue?.due_date || "",
  });

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const readonlyClass =
    "w-full border border-zinc-200 text-sm rounded-md px-4 py-2 bg-zinc-50 text-zinc-500 cursor-not-allowed select-none flex items-center gap-2";

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!issue?.id) {
      toast.error("Issue information is missing");
      return;
    }

    const submitData = {
      ...data,
      project_milestone_id:
        data.project_milestone_id && data.project_milestone_id !== "none"
          ? parseInt(data.project_milestone_id)
          : null,
      project_task_id:
        data.project_task_id && data.project_task_id !== "none"
          ? parseInt(data.project_task_id)
          : null,
      assigned_to:
        data.assigned_to && data.assigned_to !== "none"
          ? parseInt(data.assigned_to)
          : null,
    };

    put(route("project-management.project-issues.update", [project.id, issue.id]), {
      data: submitData,
      preserveScroll: true,
      onSuccess: () => {
        setShowEditModal(false);
        toast.success("Issue updated successfully!");
      },
      onError: () => {
        toast.error("Please check the form for errors");
      },
    });
  };

  return (
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Issue</DialogTitle>
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

          {/* Milestone — only show when NOT inside a task context */}
          {!isFromTask && (
            <div>
              <Label>Milestone (Optional)</Label>
              <Select
                value={data.project_milestone_id}
                onValueChange={(value) => setData("project_milestone_id", value)}
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
          )}

          {/* Task — read-only when opened from TaskDetailModal */}
          <div>
            <Label className="flex items-center gap-1.5">
              Task
              {isFromTask && <Lock size={11} className="text-zinc-400" />}
            </Label>
            {isFromTask ? (
              <div className={readonlyClass}>
                <span className="flex-1 truncate">{contextTask.title}</span>
                {contextTask.milestone?.name && (
                  <span className="text-xs text-zinc-400 flex-shrink-0">
                    ({contextTask.milestone.name})
                  </span>
                )}
              </div>
            ) : (
              <>
                <Select
                  value={data.project_task_id}
                  onValueChange={(value) => {
                    setData("project_task_id", value);
                    if (value && value !== "none") {
                      const selectedTask = tasks.find(t => t.id === parseInt(value));
                      if (selectedTask) {
                        const milestoneId = selectedTask.project_milestone_id || selectedTask.milestone?.id;
                        if (milestoneId) setData("project_milestone_id", milestoneId.toString());
                      }
                    }
                  }}
                >
                  <SelectTrigger className={inputClass(errors.project_task_id)}>
                    <SelectValue placeholder="Select task (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {tasks.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.title} {t.milestone ? `(${t.milestone.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <InputError message={errors.project_task_id} />
              </>
            )}
          </div>

          {/* Priority */}
          <div>
            <Label>Priority</Label>
            <Select value={data.priority} onValueChange={(v) => setData("priority", v)}>
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
            <Select value={data.status} onValueChange={(v) => setData("status", v)}>
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

          {/* Assigned To — read-only when opened from TaskDetailModal */}
          <div>
            <Label className="flex items-center gap-1.5">
              Assigned To
              {isFromTask && <Lock size={11} className="text-zinc-400" />}
            </Label>
            {isFromTask ? (
              <div className={readonlyClass}>
                <span className="flex-1 truncate">
                  {taskAssignedName ?? "Unassigned"}
                </span>
              </div>
            ) : (
              <>
                <Select
                  value={data.assigned_to}
                  onValueChange={(v) => setData("assigned_to", v)}
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
              </>
            )}
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
            <Button variant="outline" type="button" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={processing}
              className="bg-zinc-700 hover:bg-zinc-900 text-white"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditIssue;