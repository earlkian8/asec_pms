import { useState } from "react";
import { toast } from "sonner";
import { useProjectWizard } from "@/Contexts/ProjectWizardContext";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
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
    }

    // Validate start date against project dates
    if (newMilestone.start_date && projectData.start_date && newMilestone.start_date < projectData.start_date) {
      validationErrors.start_date = `Start date cannot be before project start date (${projectData.start_date}).`;
    }

    // Validate due date: must be after or equal to start date
    if (newMilestone.due_date && newMilestone.start_date) {
      if (newMilestone.due_date < newMilestone.start_date) {
        validationErrors.due_date = 'Due date must be after or equal to start date.';
      }
    }

    // Validate due date against project end date
    if (newMilestone.due_date && projectData.planned_end_date && newMilestone.due_date > projectData.planned_end_date) {
      validationErrors.due_date = `Due date cannot be after project end date (${projectData.planned_end_date}).`;
    }

    // Validate billing percentage
    if (newMilestone.billing_percentage) {
      const percentage = parseFloat(newMilestone.billing_percentage);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        validationErrors.billing_percentage = 'Billing percentage must be between 0 and 100.';
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
      billing_percentage: newMilestone.billing_percentage ? parseFloat(newMilestone.billing_percentage) : null,
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

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Milestones</h3>

      {/* Add Milestone Form */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Milestone Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Phase 1: Design"
              value={newMilestone.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={inputClass(errors.name)}
            />
            <InputError message={errors.name} />
          </div>

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

          <div>
            <Label>Billing Percentage (%)</Label>
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

          <div>
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
                <TableHead>Billing %</TableHead>
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
                  <TableCell>{milestone.billing_percentage ? `${milestone.billing_percentage}%` : "---"}</TableCell>
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
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 border rounded-lg">
          <p>No milestones added yet. Add milestones above.</p>
        </div>
      )}
    </div>
  );
}