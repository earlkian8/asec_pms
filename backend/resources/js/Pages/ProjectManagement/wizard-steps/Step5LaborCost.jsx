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
} from "@/Components/ui/table";

export default function Step5LaborCost({ users }) {
  const { laborCosts, addLaborCost, removeLaborCost } = useProjectWizard();
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [newLaborCost, setNewLaborCost] = useState({
    work_date: "",
    hours_worked: "",
    hourly_rate: "",
    description: "",
    notes: "",
  });

  const handleAddLaborCost = () => {
    if (!selectedMemberId) {
      toast.error("Please select a team member");
      return;
    }
    if (!newLaborCost.work_date) {
      toast.error("Please select a work date");
      return;
    }
    if (!newLaborCost.hours_worked || parseFloat(newLaborCost.hours_worked) <= 0) {
      toast.error("Please enter valid hours worked");
      return;
    }
    if (!newLaborCost.hourly_rate || parseFloat(newLaborCost.hourly_rate) <= 0) {
      toast.error("Please enter a valid hourly rate");
      return;
    }

    const member = (users || []).find(u => u && u.id && u.id.toString() === selectedMemberId.toString());
    if (!member) {
      toast.error("Selected team member not found. Please refresh and try again.");
      return;
    }

    // Ensure type is set
    const memberType = member.type || 'user';
    const memberIdInt = parseInt(selectedMemberId, 10);

    addLaborCost({
      assignable_id: memberIdInt,
      assignable_type: memberType,
      assignable_name: member.name || 'Unknown',
      work_date: newLaborCost.work_date,
      hours_worked: parseFloat(newLaborCost.hours_worked),
      hourly_rate: parseFloat(newLaborCost.hourly_rate),
      description: newLaborCost.description || null,
      notes: newLaborCost.notes || null,
    });

    // Reset form
    setSelectedMemberId("");
    setNewLaborCost({
      work_date: "",
      hours_worked: "",
      hourly_rate: "",
      description: "",
      notes: "",
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Labor Cost</h3>

      {/* Add Labor Cost Form */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Team Member *</Label>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {(users || []).filter(m => m && m.id).map((member) => (
                  <SelectItem key={`${member.type || 'user'}-${member.id}`} value={member.id.toString()}>
                    <div className="flex items-center gap-2">
                      <span>{member.name} ({member.email})</span>
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
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Work Date *</Label>
            <Input
              type="date"
              value={newLaborCost.work_date}
              onChange={(e) => setNewLaborCost({ ...newLaborCost, work_date: e.target.value })}
            />
          </div>

          <div>
            <Label>Hours Worked *</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={newLaborCost.hours_worked}
              onChange={(e) => setNewLaborCost({ ...newLaborCost, hours_worked: e.target.value })}
            />
          </div>

          <div>
            <Label>Hourly Rate *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={newLaborCost.hourly_rate}
              onChange={(e) => setNewLaborCost({ ...newLaborCost, hourly_rate: e.target.value })}
            />
          </div>

          <div>
            <Label>Description</Label>
            <Input
              placeholder="Work description"
              value={newLaborCost.description}
              onChange={(e) => setNewLaborCost({ ...newLaborCost, description: e.target.value })}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Input
              placeholder="Optional notes"
              value={newLaborCost.notes}
              onChange={(e) => setNewLaborCost({ ...newLaborCost, notes: e.target.value })}
            />
          </div>

          <div className="md:col-span-3">
            <Button
              type="button"
              onClick={handleAddLaborCost}
              className="w-full bg-zinc-700 hover:bg-zinc-900 text-white"
            >
              <Plus size={18} className="mr-2" />
              Add Labor Cost
            </Button>
          </div>
        </div>
      </div>

      {/* Labor Costs List */}
      {laborCosts.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Work Date</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laborCosts.map((laborCost, index) => {
                const totalCost = laborCost.hours_worked * laborCost.hourly_rate;
                const assignableName = laborCost.assignable_name || laborCost.user_name || 'Unknown';
                const assignableType = laborCost.assignable_type || 'user';
                return (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{assignableName}</TableCell>
                    <TableCell>
                      {assignableType === 'employee' ? (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                          Employee
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          User
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{laborCost.work_date}</TableCell>
                    <TableCell>{laborCost.hours_worked} hrs</TableCell>
                    <TableCell>{formatCurrency(laborCost.hourly_rate)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(totalCost)}</TableCell>
                    <TableCell>{laborCost.description || "---"}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLaborCost(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500 border rounded-lg">
          <p>No labor costs added yet. Add labor costs above.</p>
        </div>
      )}
    </div>
  );
}

