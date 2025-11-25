import { useForm } from "@inertiajs/react";
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
import { Input } from "@/Components/ui/input";
import InputError from "@/Components/InputError";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";

const AddLaborCost = ({ setShowAddModal, project, teamMembers }) => {
  const { data, setData, post, errors, processing } = useForm({
    user_id: "",
    work_date: new Date().toISOString().split('T')[0],
    hours_worked: "",
    hourly_rate: "",
    description: "",
    notes: "",
  });

  const [selectedUser, setSelectedUser] = useState(null);

  const handleUserChange = (userId) => {
    setData("user_id", userId);
    const user = teamMembers.find(m => m.id === parseInt(userId));
    setSelectedUser(user);
    
    // Auto-fill hourly rate from team member if available
    if (user && user.hourly_rate) {
      setData("hourly_rate", user.hourly_rate);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    post(route("project-management.labor-costs.store", project.id), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowAddModal(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Labor cost entry created successfully!");
        }
      },
      onError: () => toast.error("Please check the form for errors"),
    });
  };

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const calculatedTotal = data.hours_worked && data.hourly_rate 
    ? (parseFloat(data.hours_worked) * parseFloat(data.hourly_rate)).toFixed(2)
    : '0.00';

  return (
    <Dialog open onOpenChange={setShowAddModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Add Labor Cost</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Record labor hours and cost for this project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Employee */}
          <div>
            <Label className="text-zinc-800">Employee <span class="text-red-500">*</span></Label>
            <Select
              value={data.user_id}
              onValueChange={handleUserChange}
            >
              <SelectTrigger className={inputClass(errors.user_id)}>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.length > 0 ? (
                  teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id.toString()}>
                      {member.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-sm text-gray-500">
                    No team members available. Add team members first.
                  </div>
                )}
              </SelectContent>
            </Select>
            <InputError message={errors.user_id} />
          </div>

          {/* Work Date */}
          <div>
            <Label className="text-zinc-800">Work Date <span class="text-red-500">*</span></Label>
            <Input
              type="date"
              value={data.work_date}
              onChange={(e) => setData("work_date", e.target.value)}
              className={inputClass(errors.work_date)}
            />
            <InputError message={errors.work_date} />
          </div>

          {/* Hours Worked */}
          <div>
            <Label className="text-zinc-800">Hours Worked <span class="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={data.hours_worked}
              onChange={(e) => setData("hours_worked", e.target.value)}
              placeholder="Enter hours worked"
              className={inputClass(errors.hours_worked)}
            />
            <InputError message={errors.hours_worked} />
          </div>

          {/* Hourly Rate */}
          <div>
            <Label className="text-zinc-800">Hourly Rate <span class="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={data.hourly_rate}
              onChange={(e) => setData("hourly_rate", e.target.value)}
              placeholder="Enter hourly rate"
              className={inputClass(errors.hourly_rate)}
            />
            <InputError message={errors.hourly_rate} />
          </div>

          {/* Calculated Total */}
          {data.hours_worked && data.hourly_rate && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="text-sm">
                <span className="font-medium text-gray-700">Total Cost: </span>
                <span className="font-bold text-blue-700">
                  ₱{parseFloat(calculatedTotal).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <Label className="text-zinc-800">Description</Label>
            <Textarea
              value={data.description}
              onChange={(e) => setData("description", e.target.value)}
              placeholder="Enter work description..."
              className={inputClass(errors.description)}
              rows={3}
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
              className={inputClass(errors.notes)}
              rows={2}
            />
            <InputError message={errors.notes} />
          </div>

          {/* Footer Buttons */}
          <DialogFooter className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-zinc-800 text-white hover:bg-zinc-900 transition"
              disabled={processing}
            >
              Add Labor Cost
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLaborCost;

