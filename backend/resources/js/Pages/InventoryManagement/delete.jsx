import { router } from "@inertiajs/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";

const DeleteInventoryItem = ({ setShowDeleteModal, item }) => {
  const [processing, setProcessing] = useState(false);

  const handleDelete = (e) => {
    e.preventDefault();
    setProcessing(true);

    router.delete(
      route("inventory-management.destroy", item.id),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowDeleteModal(false);
          setProcessing(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            toast.success(`Item "${item.item_name}" deleted successfully.`);
          }
        },
        onError: (errors) => {
          setShowDeleteModal(false);
          setProcessing(false);
          if (errors.error) {
            toast.error(errors.error);
          } else if (errors.message) {
            toast.error(errors.message);
          } else {
            toast.error("Failed to delete item. Please try again.");
          }
        },
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
            <DialogTitle className="text-red-900">Delete Inventory Item</DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            Are you sure you want to delete the item{" "}
            <span className="font-semibold text-gray-900">{item.item_name}</span> ({item.item_code})?
            <br /><br />
            This action <span className="font-semibold text-red-600">cannot be undone</span> and all associated data including:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Stock transactions</li>
              <li>Material allocations</li>
              <li>Receiving reports</li>
            </ul>
            will be permanently removed.
            {item.transactions_count > 0 && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <strong>Warning:</strong> This item has {item.transactions_count} transaction(s). You must delete all transactions first.
              </div>
            )}
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
                  Delete Item
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteInventoryItem;
