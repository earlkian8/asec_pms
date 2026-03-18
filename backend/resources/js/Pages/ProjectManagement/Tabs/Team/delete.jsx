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
import { Loader2, AlertTriangle, LogOut } from 'lucide-react';

const UnassignTeamMember = ({ setShowUnassignModal, project, teamMembers, selectedIds, onSuccess }) => {
  const [processing, setProcessing] = useState(false);

  // Determine if it's bulk or single
  const isBulk = selectedIds && selectedIds.length > 1;
  const membersToUnassign = teamMembers?.filter(member => selectedIds?.includes(member.id)) || [];
  const memberCount = selectedIds?.length || 0;

  const handleRelease = (e) => {
    e.preventDefault();
    setProcessing(true);

    router.post(
      route('project-management.project-teams.destroy', project.id),
      { ids: selectedIds },
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowUnassignModal(false);
          setProcessing(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            if (isBulk) {
              toast.success(`${memberCount} team member(s) released successfully.`);
            } else {
              const memberName = membersToUnassign[0]?.assignable_name || membersToUnassign[0]?.user?.name || 'Team member';
              toast.success(`${memberName} released successfully.`);
            }
            if (onSuccess) {
              onSuccess();
            }
          }
        },
        onError: (errors) => {
          setShowUnassignModal(false);
          setProcessing(false);
          if (errors.message) {
            toast.error(errors.message);
          } else {
            toast.error('Failed to release team member(s). Please try again.');
          }
        }
      }
    );
  };

  return (
    <Dialog open onOpenChange={setShowUnassignModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-amber-100 rounded-full p-2">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-amber-900">
              {isBulk ? 'Release Team Members' : 'Release Team Member'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            {isBulk ? (
              <>
                Are you sure you want to release <span className="font-semibold text-gray-900">{memberCount} team member(s)</span> from this project?
                <br /><br />
                This action will:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Set their assignment status to <span className="font-semibold">Released</span></li>
                  <li>Make them available for assignment to other projects</li>
                  <li>Unassign any tasks assigned to these members</li>
                  <li className="text-green-700">Their assignment history is preserved</li>
                </ul>
                <div className="mt-3 p-2 bg-gray-50 rounded-lg border border-gray-200 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Members to be released:</p>
                  <ul className="text-xs text-gray-600 space-y-0.5">
                    {membersToUnassign.slice(0, 5).map((member) => (
                      <li key={member.id}>• {member.assignable_name || member.user?.name || 'Unknown'} ({member.role})</li>
                    ))}
                    {membersToUnassign.length > 5 && (
                      <li className="text-gray-500 italic">... and {membersToUnassign.length - 5} more</li>
                    )}
                  </ul>
                </div>
              </>
            ) : (
              <>
                Are you sure you want to release{" "}
                <span className="font-semibold text-gray-900">
                  {membersToUnassign[0]?.assignable_name || membersToUnassign[0]?.user?.name || 'this team member'}
                </span>{" "}
                ({membersToUnassign[0]?.role || 'Unknown role'}) from this project?
                <br /><br />
                This action will:
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  <li>Set their assignment status to <span className="font-semibold">Released</span></li>
                  <li>Make them available for assignment to other projects</li>
                  <li>Unassign any tasks assigned to this member</li>
                  <li className="text-green-700">Their assignment history is preserved</li>
                </ul>
                <span className="text-xs text-gray-500 mt-2 block">
                  Need to permanently remove instead? Use the <span className="font-semibold text-red-600">Remove</span> button from the action column.
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleRelease} className="flex flex-col gap-4">
          <DialogFooter className="flex flex-row gap-2 justify-end mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUnassignModal(false)}
              disabled={processing}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={processing}
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Releasing...
                </>
              ) : (
                <>
                  <LogOut size={16} />
                  {isBulk ? `Release ${memberCount} Member(s)` : 'Release Member'}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UnassignTeamMember;
