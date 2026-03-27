import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";

const EditReceivingReport = ({ setShowEditModal, project, allocation, receivingReport, budgetSummary }) => {
  const currentReceived = allocation.quantity_received - (receivingReport.quantity_received || 0);
  const remaining = allocation.quantity_allocated - currentReceived;
  const inventoryItem = allocation.inventoryItem || allocation.inventory_item || {};

  const fmt = (n) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(n ?? 0);
  const thisItemCost = (allocation.quantity_allocated || 0) * (inventoryItem.unit_price || 0);
  const budgetRemaining = budgetSummary?.budget_remaining ?? (project?.contract_amount ?? 0);
  const isOverBudget = budgetRemaining < 0;

  const { data, setData, put, errors, processing } = useForm({
    quantity_received: receivingReport.quantity_received || "",
    condition: receivingReport.condition || "",
    notes: receivingReport.notes || "",
    received_at: receivingReport.received_at 
      ? new Date(receivingReport.received_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (parseFloat(data.quantity_received) > remaining) {
      toast.error(`Quantity received cannot exceed remaining quantity (${remaining} ${inventoryItem.unit_of_measure || 'units'})`);
      return;
    }

    put(route("project-management.material-allocations.update-receiving-report", [
      project.id,
      allocation.id,
      receivingReport.id
    ]), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowEditModal(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Receiving report updated successfully!");
        }
      },
      onError: (errors) => {
        if (errors.quantity_received) {
          toast.error(errors.quantity_received);
        } else {
          toast.error("Please check the form for errors");
        }
      },
    });
  };

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  return (
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Edit Receiving Report</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Update the receiving report for {inventoryItem.item_name || 'this item'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Budget Comparison Strip */}
          {budgetSummary && (
            <div className={`rounded-lg border px-3 py-2 text-xs ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="text-gray-500">Contract: <span className="font-semibold text-gray-800">{fmt(budgetSummary.contract_amount)}</span></span>
                <span className="text-blue-600">Allocated Cost: <span className="font-semibold">{fmt(budgetSummary.total_allocated_cost)}</span></span>
                <span className={isOverBudget ? 'text-red-600' : 'text-emerald-600'}>
                  Remaining: <span className="font-semibold">{fmt(budgetRemaining)}</span>
                </span>
                {inventoryItem.unit_price > 0 && (
                  <span className="text-purple-600">This Item Cost: <span className="font-semibold">{fmt(thisItemCost)}</span></span>
                )}
              </div>
              {budgetSummary.contract_amount > 0 && (
                <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full ${isOverBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(Math.round((budgetSummary.total_allocated_cost / budgetSummary.contract_amount) * 100), 100)}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Item Info */}
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 space-y-1">
              <div><span className="font-medium">Item:</span> {inventoryItem.item_name || 'Unknown'}</div>
              <div><span className="font-medium">Allocated:</span> {allocation.quantity_allocated} {inventoryItem.unit_of_measure || 'units'}</div>
              <div><span className="font-medium">Other Reports Received:</span> {currentReceived} {inventoryItem.unit_of_measure || 'units'}</div>
              <div><span className="font-medium">Remaining (with this report):</span> {remaining} {inventoryItem.unit_of_measure || 'units'}</div>
            </div>
          </div>

          {/* Quantity Received */}
          <div>
            <Label className="text-zinc-800">Quantity Received <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              value={data.quantity_received}
              onChange={(e) => setData("quantity_received", e.target.value)}
              placeholder={`Enter quantity (max: ${remaining} ${inventoryItem.unit_of_measure || 'units'})`}
              className={inputClass(errors.quantity_received)}
            />
            <InputError message={errors.quantity_received} />
            <p className="text-xs text-gray-500 mt-1">
              Maximum: {remaining} {inventoryItem.unit_of_measure || 'units'}
            </p>
          </div>

          {/* Condition */}
          <div>
            <Label className="text-zinc-800">Condition</Label>
            <Select
              value={data.condition}
              onValueChange={(value) => setData("condition", value)}
            >
              <SelectTrigger className={inputClass(errors.condition)}>
                <SelectValue placeholder="Select condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
            <InputError message={errors.condition} />
          </div>

          {/* Received Date */}
          <div>
            <Label className="text-zinc-800">Received Date</Label>
            <Input
              type="date"
              value={data.received_at}
              onChange={(e) => setData("received_at", e.target.value)}
              className={inputClass(errors.received_at)}
            />
            <InputError message={errors.received_at} />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-zinc-800">Notes</Label>
            <Textarea
              value={data.notes}
              onChange={(e) => setData("notes", e.target.value)}
              placeholder="Enter any additional notes about the received materials..."
              className={inputClass(errors.notes)}
              rows={3}
            />
            <InputError message={errors.notes} />
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="flex justify-end gap-2 mt-4 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
              disabled={processing}
              className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Update Receiving Report
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditReceivingReport;

