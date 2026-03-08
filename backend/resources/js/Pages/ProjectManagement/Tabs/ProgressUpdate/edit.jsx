import { router } from "@inertiajs/react";
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
  const [description, setDescription] = useState(progressUpdate.description || "");
  const [file,        setFile]        = useState(null);
  const [previewName, setPreviewName] = useState("");
  const [processing,  setProcessing]  = useState(false);
  const [errors,      setErrors]      = useState({});

  const fileInputRef = useRef(null);

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f) {
      setFile(f);
      setPreviewName(f.name);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    if (!progressUpdate?.id) {
      toast.error("Progress update information is missing");
      return;
    }

    const task = progressUpdate.task || tasks.find(t => t.id === progressUpdate.project_task_id);
    if (!task?.milestone) {
      toast.error("Task or milestone information is missing");
      return;
    }

    // Validate description synchronously — no setState race condition
    const trimmed = description.trim();
    if (!trimmed) {
      setErrors({ description: "Description is required." });
      return;
    }

    // Build FormData so the file (if any) is included alongside the description
    const formData = new FormData();
    formData.append("description", trimmed);
    formData.append("_method", "PUT"); // Laravel method spoofing
    if (file) {
      formData.append("file", file);
    }

    setProcessing(true);

    router.post(
      route("project-management.progress-updates.update", [
        task.milestone.id,
        task.id,
        progressUpdate.id,
      ]),
      formData,
      {
        preserveScroll: true,
        forceFormData: true,
        onSuccess: () => {
          setShowEditModal(false);
          toast.success("Progress update saved successfully!");
          setTimeout(() => router.reload({ only: ["milestoneData"] }), 100);
        },
        onError: (errs) => {
          setErrors(errs);
          if (errs.description) {
            toast.error(errs.description);
          } else {
            toast.error("Please check the form for errors");
          }
        },
        onFinish: () => setProcessing(false),
      }
    );
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "---";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const getFileUrl = () => {
    if (!progressUpdate?.file_path) return null;
    const task = progressUpdate.task || tasks.find(t => t.id === progressUpdate.project_task_id);
    if (!task?.milestone) return null;
    return route("project-management.progress-updates.download", [
      task.milestone.id,
      task.id,
      progressUpdate.id,
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
              value={progressUpdate.task?.title || "---"}
              disabled
              className="bg-gray-100"
            />
          </div>

          {/* Description */}
          <div>
            <Label>
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter progress update description"
              className={inputClass(errors.description)}
              rows={4}
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description}</p>
            )}
          </div>

          {/* Current File */}
          {progressUpdate.file_path && getFileUrl() && (
            <div>
              <Label>Current File</Label>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                <a
                  href={getFileUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm underline truncate flex-1"
                >
                  {progressUpdate.original_name || "View File"}
                </a>
                {progressUpdate.file_size && (
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    ({formatFileSize(progressUpdate.file_size)})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* File Upload */}
          <div>
            <Label>Update File / Image (Optional)</Label>
            <Input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className={inputClass(errors.file)}
            />
            {previewName && (
              <p className="text-sm text-gray-600 mt-1">New file: {previewName}</p>
            )}
            {errors.file && (
              <p className="text-xs text-red-500 mt-1">{errors.file}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to keep the current file. Max size: 20 MB.
            </p>
          </div>

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
              disabled={processing}
              className="bg-zinc-700 hover:bg-zinc-900 text-white"
            >
              {processing ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditProgressUpdate;