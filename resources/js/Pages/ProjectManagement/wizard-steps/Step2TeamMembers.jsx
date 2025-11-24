import { useState } from "react";
import { toast } from "sonner";
import { useProjectWizard } from "@/Contexts/ProjectWizardContext";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Trash2, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Step2TeamMembers({ users }) {
  const { teamMembers, addTeamMember, removeTeamMember, updateTeamMember, projectData } = useProjectWizard();
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newMember, setNewMember] = useState({
    role: "",
    hourly_rate: "",
    start_date: "",
  });

  // Auto-populate role when user is selected
  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    const user = users.find(u => u.id.toString() === userId);
    if (user && user.role) {
      setNewMember(prev => ({ ...prev, role: user.role }));
    }
  };

  const handleAddMember = () => {
    if (!selectedUserId) {
      toast.error("Please select a user");
      return;
    }
    if (!newMember.role) {
      toast.error("Please enter a role");
      return;
    }
    if (!newMember.hourly_rate || parseFloat(newMember.hourly_rate) <= 0) {
      toast.error("Please enter a valid hourly rate");
      return;
    }
    if (!newMember.start_date) {
      toast.error("Please enter a start date");
      return;
    }

    const user = users.find(u => u.id.toString() === selectedUserId);
    if (!user) return;

    // Check if user is already added
    if (teamMembers.some(m => m.id === selectedUserId)) {
      toast.error("This user is already added to the team");
      return;
    }

    // Validate dates against project dates
    if (projectData.start_date && newMember.start_date < projectData.start_date) {
      toast.error(`Start date cannot be before project start date (${projectData.start_date})`);
      return;
    }
    if (projectData.planned_end_date && newMember.start_date > projectData.planned_end_date) {
      toast.error(`Start date cannot be after project end date (${projectData.planned_end_date})`);
      return;
    }

    addTeamMember({
      id: selectedUserId,
      name: user.name,
      email: user.email,
      role: newMember.role,
      hourly_rate: newMember.hourly_rate,
      start_date: newMember.start_date,
    });

    // Reset form
    setSelectedUserId("");
    setNewMember({
      role: "",
      hourly_rate: "",
      start_date: "",
    });
  };

  const availableUsers = users.filter(
    user => !teamMembers.some(member => member.id === user.id.toString())
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Team Members</h3>

      {/* Add Member Form */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>User <span class="text-red-500">*</span></Label>
            <Select value={selectedUserId} onValueChange={handleUserSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Role <span class="text-red-500">*</span></Label>
            <Input
              placeholder="Auto-filled from user role"
              value={newMember.role}
              readOnly
              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Hourly Rate <span class="text-red-500">*</span></Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={newMember.hourly_rate}
              onChange={(e) => setNewMember({ ...newMember, hourly_rate: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Start Date <span class="text-red-500">*</span></Label>
            <Input
              type="date"
              value={newMember.start_date}
              onChange={(e) => setNewMember({ ...newMember, start_date: e.target.value })}
              min={projectData.start_date || undefined}
              max={projectData.planned_end_date || undefined}
              required
            />
          </div>

          <div className="md:col-span-4 flex items-end">
            <Button
              type="button"
              onClick={handleAddMember}
              className="w-full bg-zinc-700 hover:bg-zinc-900 text-white"
            >
              <Plus size={18} className="mr-2" />
              Add
            </Button>
          </div>
        </div>
      </div>

      {/* Team Members List */}
      {teamMembers.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Hourly Rate</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member, index) => (
                <TableRow key={index}>
                  <TableCell>{member.name}</TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.role}</TableCell>
                  <TableCell>{member.hourly_rate ? `₱${parseFloat(member.hourly_rate).toFixed(2)}` : "---"}</TableCell>
                  <TableCell>{member.start_date || "---"}</TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTeamMember(index)}
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
          <p>No team members added yet. Add team members above.</p>
        </div>
      )}
    </div>
  );
}

