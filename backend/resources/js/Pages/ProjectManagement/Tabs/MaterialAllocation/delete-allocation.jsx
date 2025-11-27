import { router } from "@inertiajs/react";
import { useState } from "react";
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
import { Loader2, AlertTriangle, Trash2 } from "lucide-react";

const DeleteMaterialAllocation = ({ setShowDeleteModal, project, allocation }) => {
  const [processing, setProcessing] = useState(false);
  const inventoryItem = allocation.inventoryItem || allocation.inventory_item || {};

  const handleDelete = () => {
    setProcessing(true);
    router.delete(
      route("project-management.material-allocations.destroy", [project.id, allocation.id]),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowDeleteModal(false);
          setProcessing(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            toast.success("Material allocation deleted successfully!");
          }
        },
        onError: () => {
          setProcessing(false);
          toast.error("Failed to delete material allocation");
        },
      }
    );
  };

  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="w-[95vw] max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-red-100 rounded-full p-2">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-red-900">
              Delete Material Allocation
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            Are you sure you want to delete this material allocation? This action cannot be undone.
            <br /><br />
            This action will:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Remove this allocation from the project</li>
              <li>Delete all associated receiving reports</li>
              <li>Restore any stock that was removed from inventory</li>
            </ul>
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
            type="button"
            variant="destructive"
            disabled={processing}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={handleDelete}
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Delete Allocation
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteMaterialAllocation;

