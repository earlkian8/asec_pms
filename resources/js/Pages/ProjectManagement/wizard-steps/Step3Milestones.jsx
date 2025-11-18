import { useState } from "react";
import { toast } from "sonner";
import { useProjectWizard } from "@/Contexts/ProjectWizardContext";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Textarea } from "@/Components/ui/textarea";
import { Trash2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Step3Milestones() {
  const { milestones, addMilestone, removeMilestone } = useProjectWizard();
  const [newMilestone, setNewMilestone] = useState({
    name: "",
    description: "",
    due_date: "",
    status: "pending",
  });

  const handleAddMilestone = () => {
    if (!newMilestone.name.trim()) {
      toast.error("Please enter a milestone name");
      return;
    }

    addMilestone({
      ...newMilestone,
      name: newMilestone.name.trim(),
    });

    // Reset form
    setNewMilestone({
      name: "",
      description: "",
      due_date: "",
      status: "pending",
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Milestones</h3>

      {/* Add Milestone Form */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Label>Milestone Name *</Label>
            <Input
              placeholder="e.g. Phase 1: Design"
              value={newMilestone.name}
              onChange={(e) => setNewMilestone({ ...newMilestone, name: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea
              placeholder="Enter milestone description"
              value={newMilestone.description}
              onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
              rows={2}
            />
          </div>

          <div>
            <Label>Due Date</Label>
            <Input
              type="date"
              value={newMilestone.due_date}
              onChange={(e) => setNewMilestone({ ...newMilestone, due_date: e.target.value })}
            />
          </div>

          <div>
            <Label>Status</Label>
            <Select
              value={newMilestone.status}
              onValueChange={(value) => setNewMilestone({ ...newMilestone, status: value })}
            >
              <SelectTrigger>
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
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {milestones.map((milestone, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{milestone.name}</TableCell>
                  <TableCell>{milestone.description || "---"}</TableCell>
                  <TableCell>{milestone.due_date || "---"}</TableCell>
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

