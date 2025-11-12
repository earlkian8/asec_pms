import { router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { toast } from "sonner";
import { AlertTriangle, User, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/Components/ui/dialog"
import { Button } from '@/Components/ui/button';

const DeleteUser = ({ setShowDeleteModal, user }) => {
  const currentUserId = usePage().props.auth?.user?.id;
  const isSelfDelete = user.id === currentUserId;

  const handleDelete = (e) => {
    e.preventDefault();

    router.delete(
      `/user-management/users/destroy/${user.id}`,
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowDeleteModal(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            toast.success(`User "${user.name}" deleted successfully`);
          }
        },
        onError: (errors) => {
          setShowDeleteModal(false);
          if (errors.message) {
            toast.error(errors.message);
          } else {
            toast.error('Failed to delete user. Please try again.');
          }
        }
      }
    );
  };

  // Self-delete warning content
  if (isSelfDelete) {
    return (
      <Dialog open onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Cannot Delete Own Account
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-4">
                <p className="mb-4 text-sm text-gray-600">
                  You cannot delete your own account for security reasons.
                </p>

                {/* Warning Info Card */}
                <div className="p-4 border border-red-200 rounded-lg bg-gradient-to-r from-red-50 to-red-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Shield className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="mb-1 font-medium text-red-900">Security Protection</h4>
                      <p className="text-sm text-red-700">
                        This restriction prevents accidental self-deletion and ensures system integrity.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-4 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-2 font-medium text-blue-900">Alternative Options</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Ask another administrator to delete your account</li>
                        <li>• Contact system administrator for account removal</li>
                        <li>• Use the profile settings to update your account instead</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-row justify-end gap-2">
            <Button
              type="button"
              className="px-4 py-2 text-white transition bg-blue-600 rounded hover:bg-blue-700"
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete User</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the user{" "}
            <span className="font-semibold">{user.name}</span>?{" "}
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

export default DeleteUser;