import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";
import { Button } from "@/Components/ui/button";
import { User, Calendar, Clock, DollarSign, FileText } from "lucide-react";

const ViewLaborCost = ({ setShowViewModal, project, laborCost }) => {
  const assignableName = laborCost.assignable_name || laborCost.user?.name || (laborCost.employee?.first_name + ' ' + laborCost.employee?.last_name) || 'Unknown';
  const assignableType = laborCost.assignable_type || (laborCost.user_id ? 'user' : 'employee');
  const createdBy = laborCost.created_by || laborCost.createdBy || {};
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

  return (
    <Dialog open onOpenChange={setShowViewModal}>
      <DialogContent className="w-[95vw] max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800 text-xl">Labor Cost Details</DialogTitle>
          <DialogDescription className="text-zinc-600">
            View details for labor cost entry
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Labor Cost Information */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock size={20} />
              Labor Cost Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Team Member:</span>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
                  <User size={14} className="text-gray-400" />
                  <span>{assignableName}</span>
                  {assignableType === 'employee' && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                      Employee
                    </span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Work Date:</span>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
                  <Calendar size={14} className="text-gray-400" />
                  <span>{formatDate(laborCost.work_date)}</span>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Hours Worked:</span>
                <p className="text-sm text-gray-900 mt-1">{laborCost.hours_worked} hours</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Hourly Rate:</span>
                <p className="text-sm text-gray-900 mt-1">{formatCurrency(laborCost.hourly_rate)}</p>
              </div>
              <div className="md:col-span-2">
                <span className="text-sm font-medium text-gray-700">Total Cost:</span>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalCost)}</p>
              </div>
              {laborCost.description && (
                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
                    <FileText size={14} />
                    Description:
                  </span>
                  <p className="text-sm text-gray-900 mt-1 bg-white p-3 rounded-lg border border-gray-200">
                    {laborCost.description}
                  </p>
                </div>
              )}
              {laborCost.notes && (
                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Notes:</span>
                  <p className="text-sm text-gray-900 mt-1 bg-white p-3 rounded-lg border border-gray-200">
                    {laborCost.notes}
                  </p>
                </div>
              )}
              {createdBy && createdBy.name && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Created By:</span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
                    <User size={14} className="text-gray-400" />
                    <span>{createdBy.name || 'Unknown'}</span>
                  </div>
                </div>
              )}
              {laborCost.created_at && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Created At:</span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
                    <Calendar size={14} className="text-gray-400" />
                    <span>{formatDate(laborCost.created_at)}</span>
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

export default ViewLaborCost;
