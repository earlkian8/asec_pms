import { useForm } from "@inertiajs/react";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
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
import { formatNumberWithCommas, parseFormattedNumber } from "@/utils/numberFormat";

const AddMiscellaneousExpense = ({ setShowAddModal, project }) => {
  const { data, setData, post, errors, processing } = useForm({
    expense_type: "",
    expense_name: "",
    expense_date: new Date().toISOString().split('T')[0],
    amount: "",
    description: "",
    notes: "",
  });

  const [amountDisplay, setAmountDisplay] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    post(route("project-management.miscellaneous-expenses.store", project.id), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowAddModal(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Miscellaneous expense created successfully!");
        }
      },
      onError: () => toast.error("Please check the form for errors"),
    });
  };

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  // Common expense types
  const expenseTypes = [
    'transportation',
    'meals',
    'supplies',
    'equipment',
    'utilities',
    'communication',
    'office',
    'maintenance',
    'other'
  ];

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Add Miscellaneous Expense</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Record an expense for this project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Expense Type */}
          <div>
            <Label className="text-zinc-800">Expense Type <span className="text-red-500">*</span></Label>
            <Select
              value={data.expense_type}
              onValueChange={(value) => setData("expense_type", value)}
            >
              <SelectTrigger className={inputClass(errors.expense_type)}>
                <SelectValue placeholder="Select expense type" />
              </SelectTrigger>
              <SelectContent>
                {expenseTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <InputError message={errors.expense_type} />
          </div>

          {/* Expense Name */}
          <div>
            <Label className="text-zinc-800">Expense Name <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              placeholder="Enter expense name (e.g., Taxi fare, Office supplies)"
              value={data.expense_name}
              onChange={(e) => setData("expense_name", e.target.value)}
              className={inputClass(errors.expense_name)}
            />
            <InputError message={errors.expense_name} />
          </div>

          {/* Expense Date */}
          <div>
            <Label className="text-zinc-800">Expense Date <span className="text-red-500">*</span></Label>
            <Input
              type="date"
              value={data.expense_date}
              onChange={(e) => setData("expense_date", e.target.value)}
              className={inputClass(errors.expense_date)}
            />
            <InputError message={errors.expense_date} />
          </div>

          {/* Amount */}
          <div>
            <Label className="text-zinc-800">Amount <span className="text-red-500">*</span></Label>
            <Input
              type="text"
              placeholder="0.00"
              value={amountDisplay}
              onChange={(e) => {
                let inputValue = e.target.value;
                
                // Allow empty string
                if (inputValue === '') {
                  setAmountDisplay('');
                  setData("amount", '');
                  return;
                }
                
                // Remove all non-numeric characters except decimal point
                inputValue = inputValue.replace(/[^\d.]/g, '');
                
                // Prevent multiple decimal points
                const parts = inputValue.split('.');
                if (parts.length > 2) {
                  inputValue = parts[0] + '.' + parts.slice(1).join('');
                }
                
                // Limit decimal places to 2
                if (parts.length === 2 && parts[1].length > 2) {
                  inputValue = parts[0] + '.' + parts[1].substring(0, 2);
                }
                
                // Format with commas for display
                const formattedValue = formatNumberWithCommas(inputValue);
                setAmountDisplay(formattedValue);
                
                // Store numeric value (without commas)
                const numericValue = parseFormattedNumber(inputValue);
                setData("amount", numericValue);
              }}
              className={inputClass(errors.amount)}
            />
            <InputError message={errors.amount} />
          </div>

          {/* Description */}
          <div>
            <Label className="text-zinc-800">Description</Label>
            <Textarea
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Enter expense description..."
              rows={3}
              className={inputClass(errors.description)}
            />
            <InputError message={errors.description} />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-zinc-800">Notes</Label>
            <Textarea
              value={data.notes}
              onChange={(e) => setData("notes", e.target.value)}
              placeholder="Enter any additional notes..."
              rows={2}
              className={inputClass(errors.notes)}
            />
            <InputError message={errors.notes} />
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="flex justify-end gap-2 mt-4 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
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
                  Adding...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Add Expense
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMiscellaneousExpense;

