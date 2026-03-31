import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/Components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import { Button } from "@/Components/ui/button";
import { User, Calendar, Package, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const ViewMaterialAllocation = ({ setShowViewModal, project, allocation }) => {
  const inventoryItem = allocation.inventoryItem || allocation.inventory_item || {};
  const directSupply = allocation.directSupply || allocation.direct_supply || {};
  const isDs = !!allocation.direct_supply_id;
  const itemName = isDs ? (directSupply.supply_name || 'Direct Supply') : (inventoryItem.item_name || '---');
  const itemCode = isDs ? (directSupply.supply_code || '---') : (inventoryItem.item_code || '---');
  const unitOfMeasure = isDs ? (directSupply.unit_of_measure || 'units') : (inventoryItem.unit_of_measure || 'units');
  const receivingReports = allocation.receiving_reports || allocation.receivingReports || [];
  const allocatedBy = allocation.allocated_by || allocation.allocatedBy;
  const remaining = (allocation.quantity_allocated || 0) - (allocation.quantity_received || 0);
  const progress = allocation.quantity_allocated > 0
    ? Math.min(Math.round(((allocation.quantity_received || 0) / allocation.quantity_allocated) * 100), 100)
    : 0;

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }) : '---';

  const formatStatus = (status) => {
    if (!status) return { label: '---', color: 'gray', icon: Clock, bgColor: 'bg-gray-100', textColor: 'text-gray-700' };
    const statusMap = {
      'pending': { label: 'Pending', color: 'yellow', icon: Clock, bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
      'partial': { label: 'Partial', color: 'blue', icon: AlertCircle, bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
      'received': { label: 'Received', color: 'green', icon: CheckCircle2, bgColor: 'bg-green-100', textColor: 'text-green-700' }
    };
    return statusMap[status] || { label: status, color: 'gray', icon: Clock, bgColor: 'bg-gray-100', textColor: 'text-gray-700' };
  };

  const getStatusBadge = (status) => {
    const statusInfo = formatStatus(status);
    const Icon = statusInfo.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-full font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
        <Icon size={14} />
        {statusInfo.label}
      </span>
    );
  };

  const getConditionBadge = (condition) => {
    if (!condition) return null;
    const conditionMap = {
      'complete': { label: 'Complete', bgColor: 'bg-green-100', textColor: 'text-green-700' },
      'damaged': { label: 'Damaged', bgColor: 'bg-red-100', textColor: 'text-red-700' },
      'incomplete': { label: 'Incomplete', bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
    };
    const cond = conditionMap[condition.toLowerCase()] || { label: condition, bgColor: 'bg-gray-100', textColor: 'text-gray-700' };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${cond.bgColor} ${cond.textColor}`}>
        {cond.label}
      </span>
    );
  };

  return (
    <Dialog open onOpenChange={setShowViewModal}>
      <DialogContent className="w-[95vw] max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800 text-xl">Material Allocation Details</DialogTitle>
          <DialogDescription className="text-zinc-600">
            View details for {itemName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Allocation Information */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Package size={20} />
              Allocation Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Item Name:</span>
                <p className="text-sm text-gray-900 mt-1">{itemName}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Item Code:</span>
                <p className="text-sm text-gray-900 mt-1">{itemCode}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Quantity Allocated:</span>
                <p className="text-sm text-gray-900 mt-1">
                  {allocation.quantity_allocated} {unitOfMeasure}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Quantity Received:</span>
                <p className="text-sm text-gray-900 mt-1">
                  {allocation.quantity_received || 0} {unitOfMeasure}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Quantity Remaining:</span>
                <p className="text-sm text-gray-900 mt-1">
                  {remaining} {unitOfMeasure}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <div className="mt-1">
                  {getStatusBadge(allocation.status)}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Progress:</span>
                <div className="mt-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[200px]">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600">{progress}%</span>
                </div>
              </div>
              {allocatedBy && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Allocated By:</span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
                    <User size={14} className="text-gray-400" />
                    <span>{allocatedBy.name || allocatedBy || 'Unknown'}</span>
                  </div>
                </div>
              )}
              {allocation.allocated_at && (
                <div>
                  <span className="text-sm font-medium text-gray-700">Allocated Date:</span>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-900">
                    <Calendar size={14} className="text-gray-400" />
                    <span>{formatDate(allocation.allocated_at)}</span>
                  </div>
                </div>
              )}
              {allocation.notes && (
                <div className="md:col-span-2">
                  <span className="text-sm font-medium text-gray-700">Notes:</span>
                  <p className="text-sm text-gray-900 mt-1">{allocation.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Receiving Reports */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Receiving Reports</h3>
            {receivingReports.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                      <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Quantity</TableHead>
                      <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Condition</TableHead>
                      <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Received By</TableHead>
                      <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Date</TableHead>
                      <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivingReports.map((report, index) => (
                      <TableRow 
                        key={report.id} 
                        className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <TableCell>
                          <div className="font-medium text-gray-900">
                            {report.quantity_received} {unitOfMeasure}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getConditionBadge(report.condition)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-gray-600">
                            <User size={14} className="text-gray-400" />
                            <span>{report.received_by?.name || report.receivedBy?.name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600">{formatDate(report.received_at)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-600 max-w-xs truncate" title={report.notes || ''}>
                            {report.notes || '---'}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">No receiving reports yet</p>
                <p className="text-xs text-gray-400 mt-1">Receiving reports will appear here once created</p>
              </div>
            )}
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

export default ViewMaterialAllocation;

