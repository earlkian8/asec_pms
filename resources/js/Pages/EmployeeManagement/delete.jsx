import { router } from '@inertiajs/react';
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/Components/ui/dialog"
import { Button } from '@/Components/ui/button';

const DeleteEmployee = ({ setShowDeleteModal, employee }) => {
  const handleDelete = (e) => {
    e.preventDefault();

    router.delete(
      route('employee-management.destroy', employee.id),
      {
        preserveScroll: true,
        onSuccess: (page) => {
        setShowDeleteModal(false);
        const flash = page.props.flash;

        if (flash && flash.error) {
          //  Custom FK violation message
          toast.error(
            flash.error.includes("project team")
              ? `Employee "${employee.first_name} ${employee.last_name}" cannot be deleted because they are still assigned to a project team.`
              : flash.error
          );
        } else {
          toast.success(`Employee "${employee.first_name} ${employee.last_name}" deleted successfully`);
        }
      },
      onError: (errors) => {
        setShowDeleteModal(false);

        //  Catch any unexpected backend errors
        if (errors.message?.includes("violates foreign key")) {
          toast.error(`Employee "${employee.first_name} ${employee.last_name}" is assigned to a project team and cannot be deleted.`);
        } else if (errors.message) {
          toast.error(errors.message);
        } else {
          toast.error("Failed to delete employee. Please try again.");
        }
      }
      }
    );
  };

  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Employee</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the employee{" "}
            <span className="font-semibold">{employee.first_name} {employee.last_name}</span>? 
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleDelete} className="flex flex-col gap-4">
          <DialogFooter className="flex flex-row gap-2 justify-end">
            <Button
              type="button"
              className="px-4 py-2 rounded bg-white border text-black hover:bg-gray-300 transition"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 transition"
            >
              Delete
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteEmployee;
