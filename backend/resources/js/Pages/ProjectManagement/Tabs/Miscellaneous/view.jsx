import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { Calendar, DollarSign, FileText, Receipt, Tag } from "lucide-react";

const ViewMiscellaneousExpense = ({ setShowViewModal, project, expense }) => {
  const createdBy = expense.created_by || expense.createdBy || {};

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

  const capitalizeText = (text) => {
    if (!text) return '';
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <Dialog open onOpenChange={setShowViewModal}>
      <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800 text-xl">Miscellaneous Expense Details</DialogTitle>
          <DialogDescription className="text-zinc-600">
            View details for this expense entry
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Expense Information */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign size={20} />
              Expense Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Expense Name:</span>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
                  <span className="font-semibold">{expense.expense_name || '---'}</span>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Expense Type:</span>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
                  <Tag size={14} className="text-gray-400" />
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                    {capitalizeText(expense.expense_type)}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Expense Date:</span>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
                  <Calendar size={14} className="text-gray-400" />
                  <span>{formatDate(expense.expense_date)}</span>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Amount:</span>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(expense.amount)}</p>
              </div>
              {expense.receipt_number && (
                <div>
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Receipt size={14} />
                    Receipt/Invoice Number:
                  </span>
                  <p className="text-sm text-gray-900 mt-1">{expense.receipt_number}</p>
                </div>
              )}
              {expense.description && (
                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                    <FileText size={14} />
                    Description:
                  </span>
                  <p className="text-sm text-gray-900 mt-1 bg-white p-3 rounded-lg border border-gray-200">
                    {expense.description}
                  </p>
                </div>
              )}
              {expense.notes && (
                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Notes:</span>
                  <p className="text-sm text-gray-900 mt-1 bg-white p-3 rounded-lg border border-gray-200">
                    {expense.notes}
                  </p>
                </div>
              )}
              {createdBy && createdBy.name && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Created By:</span>
                  <p className="text-sm text-gray-900 mt-1">{createdBy.name || 'Unknown'}</p>
                </div>
              )}
              {expense.created_at && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Created At:</span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
                    <Calendar size={14} className="text-gray-400" />
                    <span>{formatDate(expense.created_at)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowViewModal(false)}
            className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewMiscellaneousExpense;

