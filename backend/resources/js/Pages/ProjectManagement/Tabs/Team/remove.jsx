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
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react';

const RemoveTeamMember = ({ setShowRemoveModal, project, teamMember, onSuccess }) => {
  const [processing, setProcessing] = useState(false);

  const memberName = teamMember?.assignable_name || teamMember?.user?.name || 'this team member';
  const memberRole = teamMember?.role || 'Unknown role';

  const handleRemove = (e) => {
    e.preventDefault();
    setProcessing(true);

    router.delete(
      route('project-management.project-teams.force-remove', [project.id, teamMember.id]),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowRemoveModal(false);
          setProcessing(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            toast.success(`${memberName} permanently removed from the project.`);
            if (onSuccess) {
              onSuccess();
            }
          }
        },
        onError: (errors) => {
          setShowRemoveModal(false);
          setProcessing(false);
          if (errors.message) {
            toast.error(errors.message);
          } else {
            toast.error('Failed to remove team member. Please try again.');
          }
        }
      }
    );
  };

  return (
    <Dialog open onOpenChange={setShowRemoveModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 rounded-full p-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-red-900">
              Permanently Remove Member
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            Are you sure you want to permanently remove{" "}
            <span className="font-semibold text-gray-900">{memberName}</span>{" "}
            ({memberRole}) from this project?
            <br /><br />
            This action will:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Completely delete their record from this project</li>
              <li>Unassign any tasks assigned to this member</li>
              <li className="text-red-600 font-medium">This action <span className="font-bold">cannot be undone</span></li>
            </ul>
            <span className="text-xs text-gray-500 mt-3 block">
              If you just want to free them for other projects while keeping the history, use <span className="font-semibold text-amber-600">Release</span> instead.
            </span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleRemove} className="flex flex-col gap-4">
          <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowRemoveModal(false)}
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
                  Removing...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Remove Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RemoveTeamMember;
