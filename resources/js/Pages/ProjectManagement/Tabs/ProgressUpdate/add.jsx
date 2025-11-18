import { useForm } from "@inertiajs/react";
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

const AddProgressUpdate = ({ setShowAddModal, tasks = [] }) => {
  const { data, setData, post, errors, processing } = useForm({
    project_task_id: tasks[0]?.id || "",
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

    if (!data.project_task_id) {
      toast.error("Please select a task");
      return;
    }

    post(route("project-management.progress-updates.store"), {
      preserveScroll: true,
      forceFormData: true,
      onSuccess: () => {
        setShowAddModal(false);
        toast.success("Progress update created successfully!");
        setPreviewName("");
      },
      onError: () => toast.error("Please check the form for errors"),
    });
  };

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Progress Update</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Task */}
          <div>
            <Label>Task</Label>
            <Select
              value={data.project_task_id ? data.project_task_id.toString() : ""}
              onValueChange={(value) => setData("project_task_id", value)}
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

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Enter progress update description"
              className={inputClass(errors.description)}
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

