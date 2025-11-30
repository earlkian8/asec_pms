import { router } from '@inertiajs/react';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/Components/ui/dialog";
import { Button } from '@/Components/ui/button';

const DeleteFile = ({ setShowDeleteModal, file }) => {
  const handleDelete = (e) => {
    e.preventDefault();

    router.delete(
      route('project-management.project-files.destroy', [file.project_id, file.id]),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowDeleteModal(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            toast.success(`File "${file.original_name}" deleted successfully`);
          }
        },
        onError: (errors) => {
          setShowDeleteModal(false);
          if (errors.message) {
            toast.error(errors.message);
          } else {
            toast.error('Failed to delete file. Please try again.');
          }
        }
      }
    );
  };

  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete File</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the file{" "}
            <span className="font-semibold">{file.original_name}</span>? 
            This action cannot be undone and the file will be permanently removed.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleDelete} className="flex flex-col gap-4">
          <DialogFooter className="flex flex-row gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
            >
              Delete File
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteFile;
