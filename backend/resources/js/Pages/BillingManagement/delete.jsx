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

const DeleteBilling = ({ setShowDeleteModal, billing }) => {

  const handleDelete = () => {
    router.delete(
      route("billing-management.destroy", billing.id),
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success(`Billing "${billing.billing_code}" deleted successfully.`);
          setShowDeleteModal(false);
        },
        onError: (errors) => {
          if (errors.error) {
            toast.error(errors.error);
          } else {
            toast.error("Failed to delete billing.");
          }
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="w-[95vw] max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-red-600">Delete Billing</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete the billing "{billing.billing_code}"? 
            This action cannot be undone.
            {billing.payments_count > 0 && (
              <span className="block mt-2 text-amber-600 font-medium">
                Note: This billing has {billing.payments_count} transaction(s). The billing will be deleted but transaction records will be preserved.
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

export default DeleteBilling;

