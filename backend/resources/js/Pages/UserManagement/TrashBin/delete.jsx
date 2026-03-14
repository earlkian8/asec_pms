import { router } from '@inertiajs/react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';

const DeleteTrashItem = ({ setShowDeleteModal, item }) => {
  const [processing, setProcessing] = useState(false);

  const handleDelete = (e) => {
    e.preventDefault();
    setProcessing(true);

    router.delete(route('user-management.trash-bin.force-delete'), {
      data: { type: item.type, id: item.id },
      preserveScroll: true,
      onSuccess: (page) => {
        setProcessing(false);
        const flash = page.props.flash;
        if (flash?.error) {
          toast.error(flash.error);
        } else {
          setShowDeleteModal(false);
          toast.success(`"${item.label}" permanently deleted.`);
        }
      },
      onError: (errors) => {
        setProcessing(false);
        const msg =
          errors?.error?.[0] ||
          errors?.error ||
          errors?.message ||
          (typeof errors === 'string' ? errors : null);
        toast.error(msg || 'Failed to delete item. Please try again.');
      },
    });
  };

  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 rounded-full p-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-red-900">Permanently Delete Item</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-gray-900">{item.label}</span>?
            <br /><br />
            This action{' '}
            <span className="font-semibold text-red-600">cannot be undone</span>. The item
            will be removed forever and cannot be restored.
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
                  Delete Forever
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteTrashItem;