import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { router } from "@inertiajs/react";

const DeleteProgressUpdate = ({ setShowDeleteModal, progressUpdate, task }) => {

  const handleDelete = () => {
    if (!task || !task.milestone) {
      toast.error("Task or milestone information is missing");
      return;
    }

    router.delete(
      route("project-management.progress-updates.destroy", [task.milestone.id, task.id, progressUpdate.id]),
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success("Progress update deleted successfully.");
          setShowDeleteModal(false);
        },
        onError: () => {
          toast.error("Failed to delete progress update.");
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="w-[95vw] max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Progress Update</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this progress update? This action cannot be undone.
            {progressUpdate.file_path && " The associated file will also be deleted."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700 transition"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteProgressUpdate;

