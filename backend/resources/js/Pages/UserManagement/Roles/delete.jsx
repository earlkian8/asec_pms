import { useForm } from '@inertiajs/react';
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
import { Loader2, Trash2, AlertTriangle, Users, ShieldAlert } from 'lucide-react';

const DeleteRole = ({ setShowDeleteModal, role }) => {
  if (!role) return null;

  const { delete: destroy, processing } = useForm({});
  const hasUsers = (role.users_count || 0) > 0;

  const handleDelete = () => {
    destroy(route('user-management.roles-and-permissions.destroy', role.id), {
      preserveScroll: true,
      onSuccess: () => {
        setShowDeleteModal(false);
        toast.success(`Role "${role.name}" deleted successfully`);
      },
      onError: (errors) => {
        const errorMessage = errors?.message || errors?.error || 'Failed to delete role.';
        toast.error(errorMessage);
      },
    });
  };

  // Blocking dialog — role is assigned to users
  if (hasUsers) {
    return (
      <Dialog open onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-100 rounded-full p-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-red-900">Cannot Delete Role</DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 pt-2">
              <div className="space-y-4">
                <p className="text-sm">
                  The role <span className="font-semibold text-gray-900">{role.name}</span> cannot be deleted because it is currently assigned to users.
                </p>

                {/* In-use warning */}
                <div className="p-4 border border-red-200 rounded-lg bg-gradient-to-r from-red-50 to-red-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                      <ShieldAlert className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="mb-1 font-medium text-red-900">Deletion Blocked</h4>
                      <p className="text-sm text-red-700">
                        This role is currently assigned to{' '}
                        <span className="font-semibold">{role.users_count}</span>{' '}
                        user{role.users_count > 1 ? 's' : ''} and cannot be removed.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Alternative actions */}
                <div className="p-4 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-2 font-medium text-blue-900">What You Can Do Instead</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Reassign all users to a different role first</li>
                        <li>• Remove this role from all users in User Management</li>
                        <li>• Contact an administrator if you need further assistance</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-row justify-end gap-2 mt-4">
            <Button
              type="button"
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-md transition-all duration-200"
              onClick={() => setShowDeleteModal(false)}
            >
              I Understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Normal delete confirmation
  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 rounded-full p-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-red-900">Delete Role</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            Are you sure you want to delete the role{" "}
            <span className="font-semibold text-gray-900">{role.name}</span>?
            <br /><br />
            This action <span className="font-semibold text-red-600">cannot be undone</span> and the
            following will be permanently removed:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Role record</li>
              <li>All associated permissions</li>
              <li>User role assignments</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => { e.preventDefault(); handleDelete(); }}
          className="flex flex-col gap-4"
        >
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
                  Delete Role
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteRole;