import { useState } from "react";
import { toast } from "sonner";
import { useProjectWizard } from "@/Contexts/ProjectWizardContext";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";
import { Trash2, Plus, Info } from "lucide-react";
import InputError from "@/Components/InputError";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";

export default function Step3Milestones() {
  const { milestones, addMilestone, removeMilestone, projectData } = useProjectWizard();

  const isMilestoneBilling = projectData.billing_type === 'milestone';

  const [newMilestone, setNewMilestone] = useState({
    name: "",
    description: "",
    start_date: "",
    due_date: "",
    billing_percentage: "",
    status: "pending",
  });
  const [errors, setErrors] = useState({});

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-4 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleChange = (field, value) => {
    setNewMilestone(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAddMilestone = () => {
    const validationErrors = {};

    if (!newMilestone.name || newMilestone.name.trim() === '') {
      validationErrors.name = 'The milestone name field is required.';
    } else if (newMilestone.name.trim().length > 255) {
      validationErrors.name = 'Milestone name must not exceed 255 characters.';
    }

    if (newMilestone.start_date && projectData.start_date && newMilestone.start_date < projectData.start_date) {
      validationErrors.start_date = `Start date cannot be before project start date (${projectData.start_date}).`;
    }

    if (newMilestone.due_date && newMilestone.start_date) {
      if (newMilestone.due_date < newMilestone.start_date) {
        validationErrors.due_date = 'Due date must be after or equal to start date.';
      }
    }

    if (newMilestone.due_date && projectData.planned_end_date && newMilestone.due_date > projectData.planned_end_date) {
      validationErrors.due_date = `Due date cannot be after project end date (${projectData.planned_end_date}).`;
    }

    // Only validate billing percentage if milestone billing type
    if (isMilestoneBilling && newMilestone.billing_percentage) {
      const percentage = parseFloat(newMilestone.billing_percentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        validationErrors.billing_percentage = 'Billing percentage must be between 0 and 100.';
      }

      // Warn if total billing percentage would exceed 100
      const currentTotal = milestones.reduce((sum, m) => sum + (parseFloat(m.billing_percentage) || 0), 0);
      const newTotal = currentTotal + (parseFloat(newMilestone.billing_percentage) || 0);
      if (newTotal > 100) {
        validationErrors.billing_percentage = `Adding this would bring total billing to ${newTotal.toFixed(2)}%, which exceeds 100%.`;
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please check the form for errors");
      return;
    }

    addMilestone({
      ...newMilestone,
      name: newMilestone.name.trim(),
      // Always null for fixed_price billing type
      billing_percentage: isMilestoneBilling && newMilestone.billing_percentage
        ? parseFloat(newMilestone.billing_percentage)
        : null,
    });

    setNewMilestone({
      name: "",
      description: "",
      start_date: "",
      due_date: "",
      billing_percentage: "",
      status: "pending",
    });
    setErrors({});
  };

  // Total billing percentage across all added milestones
  const totalBillingPercentage = milestones.reduce(
    (sum, m) => sum + (parseFloat(m.billing_percentage) || 0), 0
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Milestones</h3>

      {/* Billing type context banner */}
      <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${
        isMilestoneBilling
          ? 'bg-blue-50 border-blue-200 text-blue-700'
          : 'bg-amber-50 border-amber-200 text-amber-700'
      }`}>
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        {isMilestoneBilling ? (
          <span>
            <span className="font-semibold">Milestone billing</span> is selected. You can assign a billing percentage to each milestone (total should not exceed 100%).
            {milestones.length > 0 && (
              <span className={`ml-1 font-semibold ${totalBillingPercentage > 100 ? 'text-red-600' : ''}`}>
                Current total: {totalBillingPercentage.toFixed(2)}%
              </span>
            )}
          </span>
        ) : (
          <span>
            <span className="font-semibold">Fixed price billing</span> is selected. Billing percentage per milestone is not applicable and has been hidden.
          </span>
        )}
      </div>

      {/* Project date context hint */}
      {(projectData.start_date || projectData.planned_end_date) && (
        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <span className="font-semibold text-blue-700">Project dates: </span>
          <span className="text-blue-600">
            {projectData.start_date || '—'} → {projectData.planned_end_date || '—'}
          </span>
          <span className="ml-2 text-blue-500">· Milestone dates must fall within this range.</span>
        </div>
      )}

      {/* Add Milestone Form */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {/* Name */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-1">
              <Label>Milestone Name <span className="text-red-500">*</span></Label>
              <span className={`text-xs ${newMilestone.name.length > 255 ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                {newMilestone.name.length}/255
              </span>
            </div>
            <Input
              placeholder="e.g. Phase 1: Design"
              value={newMilestone.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={inputClass(errors.name)}
              maxLength={300}
            />
            <InputError message={errors.name} />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Enter milestone description"
              value={newMilestone.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={2}
              className={inputClass(false)}
            />
          </div>

          {/* Start Date */}
          <div>
            <Label>Start Date</Label>
            <Input
              type="date"
              value={newMilestone.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              min={projectData.start_date || undefined}
              max={projectData.planned_end_date || undefined}
              className={inputClass(errors.start_date)}
            />
            <InputError message={errors.start_date} />
          </div>

          {/* Due Date */}
          <div>
            <Label>Due Date</Label>
            <Input
              type="date"
              value={newMilestone.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
              min={newMilestone.start_date || projectData.start_date || undefined}
              max={projectData.planned_end_date || undefined}
              className={inputClass(errors.due_date)}
            />
            <InputError message={errors.due_date} />
          </div>

          {/* Billing Percentage — only shown for milestone billing */}
          {isMilestoneBilling && (
            <div>
              <Label>
                Billing Percentage (%)
                <span className="ml-1 text-xs text-gray-400 font-normal">
                  — remaining: {Math.max(0, 100 - totalBillingPercentage).toFixed(2)}%
                </span>
              </Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0.00"
                value={newMilestone.billing_percentage}
                onChange={(e) => handleChange('billing_percentage', e.target.value)}
                className={inputClass(errors.billing_percentage)}
              />
              <InputError message={errors.billing_percentage} />
            </div>
          )}

          {/* Status */}
          <div className={isMilestoneBilling ? '' : 'md:col-span-1'}>
            <Label>Status</Label>
            <Select
              value={newMilestone.status}
              onValueChange={(value) => handleChange('status', value)}
            >
              <SelectTrigger className={inputClass(false)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Add Button */}
          <div className="md:col-span-2">
            <Button
              type="button"
              onClick={handleAddMilestone}
              className="w-full bg-zinc-700 hover:bg-zinc-900 text-white"
            >
              <Plus size={18} className="mr-2" />
              Add Milestone
            </Button>
          </div>
        </div>
      </div>

      {/* Milestones List */}
      {milestones.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Due Date</TableHead>
                {isMilestoneBilling && <TableHead>Billing %</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {milestones.map((milestone, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{milestone.name}</TableCell>
                  <TableCell>{milestone.description || "---"}</TableCell>
                  <TableCell>{milestone.start_date || "---"}</TableCell>
                  <TableCell>{milestone.due_date || "---"}</TableCell>
                  {isMilestoneBilling && (
                    <TableCell>
                      {milestone.billing_percentage ? `${milestone.billing_percentage}%` : "---"}
                    </TableCell>
                  )}
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs capitalize ${
                      milestone.status === 'completed' ? 'bg-green-100 text-green-700' :
                      milestone.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {milestone.status.replace('_', ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMilestone(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Total billing percentage footer — only for milestone billing */}
          {isMilestoneBilling && (
            <div className={`px-4 py-2 border-t text-xs font-semibold flex justify-end ${
              totalBillingPercentage > 100
                ? 'bg-red-50 text-red-600'
                : totalBillingPercentage === 100
                ? 'bg-green-50 text-green-600'
                : 'bg-gray-50 text-gray-600'
            }`}>
              Total Billing: {totalBillingPercentage.toFixed(2)}%
              {totalBillingPercentage > 100 && ' ⚠ Exceeds 100%'}
              {totalBillingPercentage === 100 && ' ✓'}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 border rounded-lg">
          <p>No milestones added yet. Add milestones above.</p>
        </div>
      )}
    </div>
  );
}