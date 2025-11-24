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
import { Textarea } from "@/Components/ui/textarea";

const EditProgressUpdate = ({ setShowEditModal, progressUpdate, tasks = [] }) => {
  const { data, setData, put, errors, processing } = useForm({
    description: progressUpdate.description || "",
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

    if (!progressUpdate || !progressUpdate.id) {
      toast.error("Progress update information is missing");
      return;
    }

    // Find task and milestone
    const task = progressUpdate.task || tasks.find(t => t.id === progressUpdate.project_task_id);
    if (!task || !task.milestone) {
      toast.error("Task or milestone information is missing");
      return;
    }

    // Ensure description is always included and not empty
    const trimmedDescription = (data.description || "").trim();
    if (!trimmedDescription) {
      toast.error("Description is required");
      return;
    }

    // Update the form data with trimmed description to ensure it's always sent
    setData("description", trimmedDescription);

    // Only use forceFormData if there's a file, otherwise use regular form submission
    const hasFile = data.file !== null;
    
    put(route("project-management.progress-updates.update", [task.milestone.id, task.id, progressUpdate.id]), {
      preserveScroll: true,
      forceFormData: hasFile,
      onSuccess: () => {
        setShowEditModal(false);
        toast.success("Progress update updated successfully!");
        setPreviewName("");
        // Reload the entire page to get fresh data
        setTimeout(() => {
          router.reload({ only: ['milestoneData'] });
        }, 100);
      },
      onError: (errors) => {
        console.error('Progress update errors:', errors);
        if (errors.description) {
          toast.error(errors.description);
        } else {
          toast.error("Please check the form for errors");
        }
      },
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '---';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileUrl = () => {
    if (!progressUpdate?.file_path) return null;
    const task = progressUpdate.task || tasks.find(t => t.id === progressUpdate.project_task_id);
    if (!task || !task.milestone) return null;
    return route('project-management.progress-updates.download', [
      task.milestone.id,
      task.id,
      progressUpdate.id
    ]);
  };

  return (
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Progress Update</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Task (Read-only) */}
          <div>
            <Label>Task</Label>
            <Input
              value={progressUpdate.task?.title || '---'}
              disabled
              className="bg-gray-100"
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description <span className="text-red-500">*</span></Label>
            <Textarea
              value={data.description || ""}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Enter progress update description"
              className={inputClass(errors.description)}
              rows={4}
              required
            />
            <InputError message={errors.description} />
          </div>

          {/* Current File */}
          {progressUpdate.file_path && getFileUrl() && (
            <div>
              <Label>Current File</Label>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <a
                  href={getFileUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  {progressUpdate.original_name || 'View File'}
                </a>
                {progressUpdate.file_size && (
                  <span className="text-xs text-gray-500">
                    ({formatFileSize(progressUpdate.file_size)})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* File/Image Upload */}
          <div>
            <Label>Update File/Image (Optional)</Label>
            <Input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx"
              className={inputClass(errors.file)}
            />
            {previewName && (
              <p className="text-sm text-gray-600 mt-1">New file: {previewName}</p>
            )}
            <InputError message={errors.file} />
            <p className="text-xs text-gray-500 mt-1">Leave empty to keep current file. Max size: 20MB.</p>
          </div>

          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={processing}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProgressUpdate;

