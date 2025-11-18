import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { router } from "@inertiajs/react";

const DeleteInventoryItem = ({ setShowDeleteModal, item }) => {

  const handleDelete = () => {
    router.delete(
      route("inventory-management.destroy", item.id),
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success(`Item "${item.item_name}" deleted successfully.`);
          setShowDeleteModal(false);
        },
        onError: (errors) => {
          if (errors.error) {
            toast.error(errors.error);
          } else {
            toast.error("Failed to delete item.");
          }
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="w-[95vw] max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Inventory Item</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the item "{item.item_name}" ({item.item_code})? 
            This action cannot be undone.
            {item.transactions_count > 0 && (
              <span className="block mt-2 text-red-600 font-medium">
                Note: This item has {item.transactions_count} transaction(s). You must delete all transactions first.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700 transition"
            onClick={handleDelete}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteInventoryItem;

