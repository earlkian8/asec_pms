import { toast } from "sonner";
import { useState } from 'react';
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
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';

const DeleteMilestone = ({ setShowDeleteModal, milestone, project }) => {
  const [processing, setProcessing] = useState(false);

  const handleDelete = (e) => {
    e.preventDefault();
    setProcessing(true);

    router.delete(
      route("project-management.project-milestones.destroy", [project.id, milestone.id]),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowDeleteModal(false);
          setProcessing(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            toast.success(`Milestone "${milestone.name}" deleted successfully.`);
          }
        },
        onError: (errors) => {
          setShowDeleteModal(false);
          setProcessing(false);
          if (errors.message) {
            toast.error(errors.message);
          } else {
            toast.error("Failed to delete milestone. Please try again.");
          }
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 rounded-full p-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-red-900">
              Delete Milestone
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            Are you sure you want to delete the milestone{" "}
            <span className="font-semibold text-gray-900">
              "{milestone.name}"
            </span>?
            <br /><br />
            This action will:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Delete the milestone and all associated data</li>
              <li>Remove all tasks under this milestone</li>
              <li>Delete all progress updates and issues related to this milestone</li>
            </ul>
            <span className="text-xs text-gray-500 mt-2 block">
              This action <span className="font-semibold text-red-600">cannot be undone</span>.
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleDelete} className="flex flex-col gap-4">
          <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={processing}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={processing}
              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Delete Milestone
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteMilestone;
