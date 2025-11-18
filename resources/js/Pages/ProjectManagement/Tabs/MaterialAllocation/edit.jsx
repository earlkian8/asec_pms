import { useForm } from "@inertiajs/react";
import { toast } from "sonner";
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

const EditReceivingReport = ({ setShowEditModal, project, allocation, receivingReport }) => {
  const currentReceived = allocation.quantity_received - (receivingReport.quantity_received || 0);
  const remaining = allocation.quantity_allocated - currentReceived;
  const inventoryItem = allocation.inventoryItem || {};

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
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
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
            <Label className="text-zinc-800">Quantity Received *</Label>
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
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-zinc-800 text-white hover:bg-zinc-900 transition"
              disabled={processing}
            >
              Update Receiving Report
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditReceivingReport;

