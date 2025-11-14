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

const DeleteMilestone = ({ setShowDeleteModal, milestone, project }) => {

  const handleDelete = () => {
    router.delete(
      route("project-management.project-milestones.destroy", [project.id, milestone.id]),
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success(`Milestone "${milestone.name}" deleted successfully.`);
          setShowDeleteModal(false);
        },
        onError: () => {
          toast.error("Failed to delete milestone.");
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="w-[95vw] max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Milestone</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the milestone "{milestone.name}"? This action cannot be undone.
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

export default DeleteMilestone;
