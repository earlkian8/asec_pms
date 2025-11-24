import { useForm, router } from "@inertiajs/react";
import { toast } from "sonner";
import { useState, useRef } from "react";
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

const AddProgressUpdate = ({ setShowAddModal, tasks = [], preselectedTask = null, project = null }) => {
  const initialTaskId = preselectedTask?.id 
    ? (typeof preselectedTask.id === 'string' ? parseInt(preselectedTask.id) : preselectedTask.id)
    : (tasks[0]?.id ? (typeof tasks[0].id === 'string' ? parseInt(tasks[0].id) : tasks[0].id) : "");
    
  const { data, setData, post, errors, processing } = useForm({
    project_task_id: initialTaskId,
    description: "",
    file: null,
  });

  const fileInputRef = useRef(null);
  const [previewName, setPreviewName] = useState("");

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setData("file", file);
      setPreviewName(file.name);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // If preselectedTask is provided, use it; otherwise use form data
    const taskId = preselectedTask?.id 
      ? (typeof preselectedTask.id === 'string' ? parseInt(preselectedTask.id) : preselectedTask.id)
      : (typeof data.project_task_id === 'string' ? parseInt(data.project_task_id) : data.project_task_id);

    if (!taskId || isNaN(taskId)) {
      toast.error("Please select a task");
      return;
    }

    // Update form data with correct type
    const submitData = {
      ...data,
      project_task_id: taskId
    };

    post(route("project-management.progress-updates.store"), {
      data: submitData,
      preserveScroll: true,
      forceFormData: true,
      onSuccess: (page) => {
        setShowAddModal(false);
        toast.success("Progress update created successfully!");
        setPreviewName("");
        // Reload the entire page to get fresh data
        setTimeout(() => {
          router.reload({ only: ['milestoneData'] });
        }, 100);
      },
      onError: (errors) => {
        console.error('Progress update errors:', errors);
        if (errors.project_task_id) {
          toast.error(errors.project_task_id);
        } else if (errors.file) {
          toast.error(errors.file);
        } else {
          toast.error("Please check the form for errors");
        }
      },
    });
  };

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Progress Update</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Task - Only show if not preselected */}
          {!preselectedTask && (
            <div>
              <Label>Task</Label>
              <Select
                value={data.project_task_id ? data.project_task_id.toString() : ""}
                onValueChange={(value) => setData("project_task_id", parseInt(value))}
              >
                <SelectTrigger className={inputClass(errors.project_task_id)}>
                  <SelectValue placeholder="Select task" />
                </SelectTrigger>
                <SelectContent>
                  {tasks.length > 0 ? (
                    tasks.map((task) => (
                      <SelectItem key={task.id} value={task.id.toString()}>
                        {task.title} - {task.milestone?.name || 'No Milestone'}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-gray-500">
                      No tasks available
                    </div>
                  )}
                </SelectContent>
              </Select>
              <InputError message={errors.project_task_id} />
            </div>
          )}

          {/* Description */}
          <div>
            <Label>Description <span className="text-red-500">*</span></Label>
            <Textarea
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Enter progress update description"
              className={inputClass(errors.description)}
              required
            />
            <InputError message={errors.description} />
          </div>

          {/* File/Image Upload */}
          <div>
            <Label>File/Image (Proof)</Label>
            <Input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx"
              className={inputClass(errors.file)}
            />
            {previewName && (
              <p className="text-sm text-gray-600 mt-1">Selected: {previewName}</p>
            )}
            <InputError message={errors.file} />
            <p className="text-xs text-gray-500 mt-1">Max size: 20MB. Images or files accepted.</p>
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              Add Progress Update
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddProgressUpdate;

