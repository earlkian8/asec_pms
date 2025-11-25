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

const DeleteLaborCost = ({ setShowDeleteModal, project, laborCost }) => {
  const user = laborCost.user || laborCost.user_id || {};
  const totalCost = (laborCost.hours_worked || 0) * (laborCost.hourly_rate || 0);

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }) : '---';

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleDelete = () => {
    router.delete(
      route("project-management.labor-costs.destroy", [project.id, laborCost.id]),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowDeleteModal(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            toast.success("Labor cost entry deleted successfully!");
          }
        },
        onError: () => toast.error("Failed to delete labor cost entry"),
      }
    );
  };

  return (
    <Dialog open onOpenChange={setShowDeleteModal}>
      <DialogContent className="w-[95vw] max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-zinc-800 flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={20} />
            Delete Labor Cost Entry
          </DialogTitle>
          <DialogDescription className="text-zinc-600">
            Are you sure you want to delete this labor cost entry? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
            <div className="text-sm">
              <span className="font-medium text-gray-700">Employee:</span>{" "}
              <span className="text-gray-900">{user.name || 'Unknown'}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Work Date:</span>{" "}
              <span className="text-gray-900">{formatDate(laborCost.work_date)}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Hours Worked:</span>{" "}
              <span className="text-gray-900">{laborCost.hours_worked} hrs</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Hourly Rate:</span>{" "}
              <span className="text-gray-900">{formatCurrency(laborCost.hourly_rate)}</span>
            </div>
            <div className="text-sm">
              <span className="font-medium text-gray-700">Total Cost:</span>{" "}
              <span className="text-gray-900 font-semibold">{formatCurrency(totalCost)}</span>
            </div>
          </div>
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
            Delete Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteLaborCost;

