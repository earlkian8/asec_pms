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

const DeleteMiscellaneousExpense = ({ setShowDeleteModal, project, expense }) => {
  const [processing, setProcessing] = useState(false);

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
    setProcessing(true);
    router.delete(
      route("project-management.miscellaneous-expenses.destroy", [project.id, expense.id]),
      {
        preserveScroll: true,
        onSuccess: (page) => {
          setShowDeleteModal(false);
          setProcessing(false);
          const flash = page.props.flash;
          if (flash && flash.error) {
            toast.error(flash.error);
          } else {
            toast.success("Miscellaneous expense deleted successfully!");
          }
        },
        onError: () => {
          setProcessing(false);
          toast.error("Failed to delete miscellaneous expense");
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
              Delete Miscellaneous Expense
            </DialogTitle>
          </div>
          <DialogDescription className="text-gray-600 pt-2">
            Are you sure you want to delete this expense? This action cannot be undone.
            <br /><br />
            This action will:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Remove this expense entry from the project</li>
              <li>Update the total expenses calculations</li>
            </ul>
            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-sm space-y-1">
                <div>
                  <span className="font-medium text-gray-700">Expense Name:</span>{" "}
                  <span className="text-gray-900">{expense.expense_name || 'Unknown'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Expense Type:</span>{" "}
                  <span className="text-gray-900 capitalize">{expense.expense_type || '---'}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Expense Date:</span>{" "}
                  <span className="text-gray-900">{formatDate(expense.expense_date)}</span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Amount:</span>{" "}
                  <span className="text-gray-900 font-semibold">{formatCurrency(expense.amount)}</span>
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
                Delete Expense
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteMiscellaneousExpense;

