import { router } from '@inertiajs/react';
import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from "sonner";
import { AlertTriangle, User, Shield, Loader2, Trash2 } from 'lucide-react';
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
  const [processing, setProcessing] = useState(false);
  const currentUserId = usePage().props.auth?.user?.id;
  const isSelfDelete = user.id === currentUserId;

  const handleDelete = (e) => {
    e.preventDefault();
    setProcessing(true);

    router.delete(
      route('user-management.users.destroy', user.id),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowDeleteModal(false);
          setProcessing(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            toast.success(`User "${user.name}" deleted successfully`);
          }
        },
        onError: (errors) => {
          setShowDeleteModal(false);
          setProcessing(false);
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-red-100 rounded-full p-2">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-red-900">Cannot Delete Own Account</DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 pt-2">
              <div className="space-y-4">
                <p className="mb-4 text-sm">
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
            <DialogTitle className="text-red-900">Delete User</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            Are you sure you want to delete the user{" "}
            <span className="font-semibold text-gray-900">{user.name}</span>? 
            <br /><br />
            This action <span className="font-semibold text-red-600">cannot be undone</span> and all associated data including:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>User account and profile</li>
              <li>Role assignments</li>
              <li>All user-related records</li>
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
                  Delete User
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteUser;
