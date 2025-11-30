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
import { Loader2, AlertTriangle, Trash2, MessageSquare } from 'lucide-react';

const DeleteRequest = ({ setShowDeleteModal, request, project }) => {
  const [processing, setProcessing] = useState(false);

  const handleDelete = (e) => {
    e.preventDefault();
    setProcessing(true);

    router.delete(
      route('project-management.request-updates.destroy', [project.id, request.id]),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowDeleteModal(false);
          setProcessing(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            toast.success('Request update deleted successfully');
          }
        },
        onError: (errors) => {
          setShowDeleteModal(false);
          setProcessing(false);
          if (errors.message) {
            toast.error(errors.message);
          } else {
            toast.error('Failed to delete request update. Please try again.');
          }
        }
      }
    );
  };

  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 rounded-full p-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-red-900">Delete Request Update</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            Are you sure you want to delete this request update from{" "}
            <span className="font-semibold text-gray-900">{request?.client?.client_name || 'N/A'}</span>?
            <br /><br />
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-3">
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Subject:</p>
                  <p className="text-sm text-gray-900">{request?.subject || 'N/A'}</p>
                </div>
              </div>
            </div>
            This action <span className="font-semibold text-red-600">cannot be undone</span> and the request update will be permanently removed.
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
                  Delete Request
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteRequest;

