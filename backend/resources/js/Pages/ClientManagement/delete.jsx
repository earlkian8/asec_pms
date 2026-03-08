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
import { Loader2, AlertTriangle, Trash2, ShieldAlert, FolderOpen } from 'lucide-react';

const DeleteClient = ({ setShowDeleteModal, client }) => {
  const [processing, setProcessing] = useState(false);

  // active_projects_count is passed from the backend via the client object
  // (add `active_projects_count` to the clients query in ClientsController if not already present)
  const activeProjectsCount = client.active_projects_count ?? 0;
  const isBlocked = activeProjectsCount > 0;

  const handleDelete = (e) => {
    e.preventDefault();
    setProcessing(true);

    router.delete(
      route('client-management.destroy', client.id),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setProcessing(false);
          const flash = page.props.flash;
          if (flash?.error) {
            toast.error(flash.error);
          } else {
            setShowDeleteModal(false);
            toast.success(`Client "${client.client_name}" deleted successfully`);
          }
        },
        onError: (errors) => {
          setProcessing(false);
          if (errors.message) {
            toast.error(errors.message);
          } else {
            toast.error('Failed to delete client. Please try again.');
          }
        }
      }
    );
  };

  // ── Blocked: client has active projects ────────────────────────────────────
  if (isBlocked) {
    return (
      <Dialog open onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-amber-100 rounded-full p-2">
                <ShieldAlert className="h-6 w-6 text-amber-600" />
              </div>
              <DialogTitle className="text-amber-900">Cannot Delete Client</DialogTitle>
            </div>
            <DialogDescription className="text-gray-600 pt-2 space-y-3">
              <p>
                Client <span className="font-semibold text-gray-900">{client.client_name}</span> cannot
                be deleted because they have{' '}
                <span className="font-semibold text-amber-700">
                  {activeProjectsCount} active project{activeProjectsCount !== 1 ? 's' : ''}
                </span>.
              </p>
              <div className="flex items-center gap-2 rounded-lg border bg-amber-50 border-amber-200 px-3 py-2">
                <FolderOpen className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <span className="text-sm text-amber-700">
                  <span className="font-semibold">{activeProjectsCount}</span> active or on-hold project{activeProjectsCount !== 1 ? 's' : ''} linked to this client
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Please <span className="font-medium text-gray-700">complete or cancel all active projects</span> before
                deleting this client.
              </p>
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

  // ── Normal: no active projects — confirm deletion ──────────────────────────
  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 rounded-full p-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-red-900">Delete Client</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2 space-y-3">
            <p>
              Are you sure you want to delete client{' '}
              <span className="font-semibold text-gray-900">{client.client_name}</span>
              {client.client_code && (
                <span className="text-gray-500"> ({client.client_code})</span>
              )}?
            </p>

            <div>
              <p className="text-sm mb-1">
                This action <span className="font-semibold text-red-600">cannot be undone</span>. The following will be permanently deleted:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Client profile and information</li>
                <li>Contact details and credentials</li>
                <li>All associated project history</li>
              </ul>
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
                  Delete Client
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteClient;