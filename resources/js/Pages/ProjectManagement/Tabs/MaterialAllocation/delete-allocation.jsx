import { router } from "@inertiajs/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { AlertTriangle } from "lucide-react";

const DeleteMaterialAllocation = ({ setShowDeleteModal, project, allocation }) => {
  const inventoryItem = allocation.inventoryItem || allocation.inventory_item || {};

  const handleDelete = () => {
    router.delete(
      route("project-management.material-allocations.destroy", [project.id, allocation.id]),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowDeleteModal(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            toast.success("Material allocation deleted successfully!");
          }
        },
        onError: () => toast.error("Failed to delete material allocation"),
      }
    );
  };

  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="w-[95vw] max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-zinc-800 flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={20} />
            Delete Material Allocation
          </DialogTitle>
          <DialogDescription className="text-zinc-600">
            Are you sure you want to delete this material allocation? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
            <div className="text-sm">
              <span className="font-medium text-gray-700">Item:</span>{" "}
              <span className="text-gray-900">{inventoryItem.item_name || 'Unknown'}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Item Code:</span>{" "}
              <span className="text-gray-900">{inventoryItem.item_code || '---'}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Quantity Allocated:</span>{" "}
              <span className="text-gray-900">
                {allocation.quantity_allocated} {inventoryItem.unit_of_measure || 'units'}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Quantity Received:</span>{" "}
              <span className="text-gray-900">
                {allocation.quantity_received || 0} {inventoryItem.unit_of_measure || 'units'}
              </span>
            </div>
          </div>
          <p className="text-sm text-red-600 mt-4">
            <strong>Warning:</strong> Deleting this allocation will also delete all associated receiving reports and restore any stock that was removed.
          </p>
        </div>

        <DialogFooter className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowDeleteModal(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-600 text-white hover:bg-red-700 transition"
            onClick={handleDelete}
          >
            Delete Allocation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteMaterialAllocation;

