import { useForm } from "@inertiajs/react";
import { useState, useEffect } from "react";
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

const EditLaborCost = ({ setShowEditModal, project, laborCost, teamMembers }) => {
  const { data, setData, put, errors, processing } = useForm({
    user_id: laborCost.user_id || laborCost.user?.id || "",
    work_date: laborCost.work_date 
      ? new Date(laborCost.work_date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    hours_worked: laborCost.hours_worked || "",
    hourly_rate: laborCost.hourly_rate || "",
    description: laborCost.description || "",
    notes: laborCost.notes || "",
  });

  const [selectedUser, setSelectedUser] = useState(null);
  const [period, setPeriod] = useState("");

  // Convert period to hours worked
  const periodToHours = (selectedPeriod) => {
    switch (selectedPeriod) {
      case "weekly":
        return 40; // Standard work week
      case "bi-weekly":
        return 80; // 2 weeks
      case "month":
        return 173.33; // Average month (4.33 weeks)
      default:
        return 0;
    }
  };

  // Reverse calculate period from hours worked
  const hoursToPeriod = (hours) => {
    const hoursNum = parseFloat(hours);
    if (Math.abs(hoursNum - 40) < 0.1) return "weekly";
    if (Math.abs(hoursNum - 80) < 0.1) return "bi-weekly";
    if (Math.abs(hoursNum - 173.33) < 0.1) return "month";
    return ""; // No match, will show as empty
  };

  useEffect(() => {
    if (data.user_id) {
      const user = teamMembers.find(m => m.id === parseInt(data.user_id));
      setSelectedUser(user);
    }
    // Set initial period based on existing hours_worked
    const initialHours = laborCost.hours_worked || data.hours_worked;
    if (initialHours) {
      const calculatedPeriod = hoursToPeriod(initialHours);
      setPeriod(calculatedPeriod);
    }
  }, []);

  const handlePeriodChange = (selectedPeriod) => {
    setPeriod(selectedPeriod);
    const hours = periodToHours(selectedPeriod);
    setData("hours_worked", hours);
  };

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

    put(route("project-management.labor-costs.update", [project.id, laborCost.id]), {
      preserveScroll: true,
      onSuccess: (page) => {
        setShowEditModal(false);
        const flash = page.props.flash;
        if (flash && flash.error) {
          toast.error(flash.error);
        } else {
          toast.success("Labor cost entry updated successfully!");
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
    <Dialog open onOpenChange={setShowEditModal}>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-zinc-800">Edit Labor Cost</DialogTitle>
          <DialogDescription className="text-zinc-600">
            Update labor hours and cost for this project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          {/* Employee */}
          <div>
            <Label className="text-zinc-800">Employee <span className="text-red-500">*</span></Label>
            <Select
              value={data.user_id ? data.user_id.toString() : ""}
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
                    No team members available
                  </div>
                )}
              </SelectContent>
            </Select>
            <InputError message={errors.user_id} />
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

          {/* Hours Worked - Period Selection */}
          <div>
            <Label className="text-zinc-800">Hours Worked <span className="text-red-500">*</span></Label>
            <Select
              value={period}
              onValueChange={handlePeriodChange}
            >
              <SelectTrigger className={inputClass(errors.hours_worked)}>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">Weekly (40 hours)</SelectItem>
                <SelectItem value="bi-weekly">Bi-weekly (80 hours)</SelectItem>
                <SelectItem value="month">Month (173.33 hours)</SelectItem>
              </SelectContent>
            </Select>
            {period && (
              <p className="text-xs text-gray-500 mt-1">
                Calculated hours: {data.hours_worked} hours
              </p>
            )}
            {!period && data.hours_worked && (
              <p className="text-xs text-gray-500 mt-1">
                Current hours: {data.hours_worked} hours (does not match standard periods)
              </p>
            )}
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
                  Update Labor Cost
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditLaborCost;
