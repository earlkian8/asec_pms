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

const DeleteReceivingReport = ({ setShowDeleteModal, project, allocation, receivingReport }) => {
  const [processing, setProcessing] = useState(false);
  const inventoryItem = allocation.inventoryItem || allocation.inventory_item || {};

  const handleDelete = () => {
    setProcessing(true);
    router.delete(
      route("project-management.material-allocations.destroy-receiving-report", [
        project.id,
        allocation.id,
        receivingReport.id
      ]),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowDeleteModal(false);
          setProcessing(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            toast.success("Receiving report deleted successfully!");
          }
        },
        onError: () => {
          setProcessing(false);
          toast.error("Failed to delete receiving report");
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
              Delete Receiving Report
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            Are you sure you want to delete this receiving report? This action cannot be undone.
            <br /><br />
            This action will:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Remove this receiving report from the allocation</li>
              <li>Update the quantity received for this allocation</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium text-gray-700">Item:</span>{" "}
                  <span className="text-gray-900">{inventoryItem.item_name || 'Unknown'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Quantity in Report:</span>{" "}
                  <span className="text-gray-900">
                    {receivingReport.quantity_received || 0} {inventoryItem.unit_of_measure || 'units'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Received Date:</span>{" "}
                  <span className="text-gray-900">
                    {receivingReport.received_at ? new Date(receivingReport.received_at).toLocaleDateString('en-PH') : '---'}
                  </span>
                </div>
              </div>
            </div>
            <span className="text-xs text-gray-500 mt-2 block">
              This action <span className="font-semibold text-red-600">cannot be undone</span>.
            </span>
          </DialogDescription>
        </DialogHeader>

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
                Delete Receiving Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteReceivingReport;
