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

const AddLaborCost = ({ setShowAddModal, project, teamMembers }) => {
  const { data, setData, post, errors, processing } = useForm({
    assignable_id: "",
    assignable_type: "user",
    work_date: new Date().toISOString().split('T')[0],
    hours_worked: "",
    hourly_rate: "",
    description: "",
    notes: "",
  });

  const [selectedMember, setSelectedMember] = useState(null);

  const handleMemberChange = (compositeValue) => {
    // Parse composite value: "type-id"
    const [type, id] = compositeValue.split('-');
    const memberIdInt = parseInt(id, 10);
    
    const member = teamMembers.find(m => m && m.id === memberIdInt && (m.type || 'user') === type);
    if (!member) return;
    
    setData("assignable_id", member.id);
    setData("assignable_type", member.type || 'user');
    setSelectedMember(member);
    
    // Auto-fill hourly rate from team member if available
    if (member && member.hourly_rate) {
      setData("hourly_rate", member.hourly_rate);
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
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
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
          {/* Team Member */}
          <div>
            <Label className="text-zinc-800">Team Member <span className="text-red-500">*</span></Label>
            <Select
              value={data.assignable_id && data.assignable_type ? `${data.assignable_type}-${data.assignable_id}` : ""}
              onValueChange={handleMemberChange}
            >
              <SelectTrigger className={inputClass(errors.assignable_id || errors.assignable_type)}>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.length > 0 ? (
                  teamMembers.map((member) => {
                    const compositeValue = `${member.type || 'user'}-${member.id}`;
                    return (
                      <SelectItem key={compositeValue} value={compositeValue}>
                        <div className="flex items-center gap-2">
                          <span>{member.name}</span>
                          {member.type === 'employee' && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                              Employee
                            </span>
                          )}
                          {member.type === 'user' && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                              User
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })
                ) : (
                  <div className="px-2 py-1.5 text-sm text-gray-500">
                    No team members available. Add team members first.
                  </div>
                )}
              </SelectContent>
            </Select>
            <InputError message={errors.assignable_id || errors.assignable_type} />
          </div>

          {/* Work Date */}
          <div>
            <Label className="text-zinc-800">Work Date <span className="text-red-500">*</span></Label>
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
            <Label className="text-zinc-800">Hours Worked <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Enter hours worked (e.g., 3.5)"
              value={data.hours_worked}
              onChange={(e) => setData("hours_worked", e.target.value)}
              className={inputClass(errors.hours_worked)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the actual hours worked for this work date
            </p>
            <InputError message={errors.hours_worked} />
          </div>

          {/* Hourly Rate */}
          <div>
            <Label className="text-zinc-800">Hourly Rate <span className="text-red-500">*</span></Label>
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
                  Add Labor Cost
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLaborCost;
