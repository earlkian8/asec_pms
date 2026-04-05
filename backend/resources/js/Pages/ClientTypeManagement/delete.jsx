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

const DeleteClientType = ({ setShowDeleteModal, clientType }) => {
  const [processing, setProcessing] = useState(false);

  const clientsCount = clientType.clients_count ?? 0;
  const isBlocked = clientsCount > 0;

  const handleDelete = (e) => {
    e.preventDefault();
    setProcessing(true);

    router.delete(
      route('client-type-management.destroy', clientType.id),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setProcessing(false);
          const flash = page.props.flash;
          if (flash?.error) {
            toast.error(flash.error);
          } else {
            setShowDeleteModal(false);
            toast.success(`Client type "${clientType.name}" deleted successfully`);
          }
        },
        onError: (errors) => {
          setProcessing(false);
          if (errors.message) {
            toast.error(errors.message);
          } else {
            toast.error('Failed to delete client type. Please try again.');
          }
        }
      }
    );
  };

  // ── Blocked: client type has linked clients ─────────────────────────────────
  if (isBlocked) {
    return (
      <Dialog open onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-amber-100 rounded-full p-2">
                <ShieldAlert className="h-6 w-6 text-amber-600" />
              </div>
              <DialogTitle className="text-amber-900">Cannot Delete Client Type</DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 pt-2">
              <div className="space-y-4">
                <p className="text-sm">
                  Client type <span className="font-semibold text-gray-900">{clientType.name}</span> cannot
                  be deleted because it is currently assigned to clients.
                </p>

                <div className="p-4 border border-amber-200 rounded-lg bg-gradient-to-r from-amber-50 to-amber-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <ShieldAlert className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="mb-1 font-medium text-amber-900">Deletion Blocked</h4>
                      <p className="text-sm text-amber-700">
                        This client type has{' '}
                        <span className="font-semibold">{clientsCount}</span>{' '}
                        client{clientsCount !== 1 ? 's' : ''} assigned and cannot be removed.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-blue-200 rounded-lg bg-gradient-to-r from-blue-50 to-blue-100">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="mb-2 font-medium text-blue-900">What You Can Do Instead</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Reassign all clients to a different client type first</li>
                        <li>• Set this type to <span className="font-medium">Inactive</span> to prevent new assignments</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="border-gray-300 hover:bg-gray-50"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Normal: no clients — confirm deletion ───────────────────────────────────
  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 rounded-full p-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-red-900">Delete Client Type</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2 space-y-3">
            <p>
              Are you sure you want to delete client type{' '}
              <span className="font-semibold text-gray-900">{clientType.name}</span>?
            </p>

            <div>
              <p className="text-sm mb-1">
                This action <span className="font-semibold text-red-600">cannot be undone</span>.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleDelete}>
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
                  Delete Client Type
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteClientType;
