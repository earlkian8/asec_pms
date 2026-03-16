import { router } from '@inertiajs/react';
import { useState } from 'react';
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
import { Loader2, AlertTriangle, Trash2, ShieldAlert, Users } from 'lucide-react';

const DeleteEmployee = ({ setShowDeleteModal, employee }) => {
  const [processing, setProcessing] = useState(false);

  const isAssignedToProject = employee.project_teams_count > 0 || employee.projectTeams?.length > 0;

  const handleDelete = (e) => {
    e.preventDefault();

    if (isAssignedToProject) {
      toast.error(`Cannot delete an employee who is still assigned to a project team.`);
      return;
    }

    setProcessing(true);

    router.delete(
      route('employee-management.destroy', employee.id),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setProcessing(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            setShowDeleteModal(false);
            toast.success(`Employee "${employee.first_name} ${employee.last_name}" deleted successfully`);
          }
        },
        onError: (errors) => {
          setProcessing(false);
          if (errors.message) {
            toast.error(errors.message);
          } else {
            toast.error('Failed to delete employee. Please try again.');
          }
        }
      }
    );
  };

  const fullName = `${employee.first_name} ${employee.last_name}`;
  const teamCount = employee.project_teams_count ?? employee.projectTeams?.length ?? 0;

  // Blocked state — employee is still assigned to one or more project teams
  if (isAssignedToProject) {
    return (
      <Dialog open onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-amber-100 rounded-full p-2">
                <ShieldAlert className="h-6 w-6 text-amber-600" />
              </div>
              <DialogTitle className="text-amber-900">Cannot Delete Employee</DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 pt-2 space-y-3">
              <p>
                <span className="font-semibold text-gray-900">{fullName}</span> cannot be
                deleted because they are still assigned to an active project team.
              </p>
              <div className="flex items-center gap-2 rounded-lg border bg-amber-50 border-amber-200 px-3 py-2">
                <Users className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm font-semibold text-amber-700">
                  Assigned to {teamCount} project team{teamCount !== 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Please <span className="font-medium text-gray-700">remove this employee from all project teams</span> before
                attempting to delete their record.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Normal deletion confirmation — only shown when employee has no project assignments
  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 rounded-full p-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-red-900">Delete Employee</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            Are you sure you want to delete the employee{" "}
            <span className="font-semibold text-gray-900">{fullName}</span>?
            <br /><br />
            This action <span className="font-semibold text-red-600">cannot be undone</span> and all associated data including:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Employee profile and information</li>
              <li>Project team assignments</li>
              <li>Labor cost records</li>
            </ul>
            will be permanently removed.
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
                  Delete Employee
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteEmployee;