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
} from "@/Components/ui/table";

export default function Step2TeamMembers({ users }) {
  const { teamMembers, addTeamMember, removeTeamMember, updateTeamMember, projectData } = useProjectWizard();
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [newMember, setNewMember] = useState({
    role: "",
    hourly_rate: "",
    start_date: "",
  });

  // Auto-populate role when member is selected
  const handleMemberSelect = (compositeValue) => {
    // Parse composite value: "type-id"
    const [type, id] = compositeValue.split('-');
    setSelectedMemberId(compositeValue);
    const member = users.find(u => u && u.id && u.id.toString() === id && (u.type || 'user') === type);
    if (member) {
      // Auto-fill role from user role or employee position
      if (member.type === 'user' && member.role) {
        setNewMember(prev => ({ ...prev, role: member.role }));
      } else if (member.type === 'employee' && member.position) {
        setNewMember(prev => ({ ...prev, role: member.position }));
      }
    }
  };

  const handleAddMember = () => {
    if (!selectedMemberId) {
      toast.error("Please select a team member");
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

    // Parse composite value: "type-id"
    const [memberType, memberIdStr] = selectedMemberId.split('-');
    const memberIdInt = parseInt(memberIdStr, 10);
    
    const member = users.find(u => u && u.id && u.id.toString() === memberIdStr && (u.type || 'user') === memberType);
    if (!member) {
      toast.error("Selected team member not found. Please refresh and try again.");
      return;
    }

    // Check if member is already added (compare by id and type)
    if (teamMembers.some(m => {
      const mId = typeof m.id === 'string' ? parseInt(m.id, 10) : m.id;
      const mType = m.type || 'user';
      return mId === memberIdInt && mType === memberType;
    })) {
      toast.error("This team member is already added to the team");
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
      id: memberIdInt,
      type: memberType,
      name: member.name || 'Unknown',
      email: member.email || '',
      role: newMember.role,
      hourly_rate: parseFloat(newMember.hourly_rate) || 0,
      start_date: newMember.start_date,
      end_date: null, // Can be added later if needed
    });

    // Reset form
    setSelectedMemberId("");
    setNewMember({
      role: "",
      hourly_rate: "",
      start_date: "",
    });
  };

  const availableMembers = (users || []).filter(member => {
    if (!member || !member.id) return false;
    const memberId = typeof member.id === 'number' ? member.id : parseInt(member.id, 10);
    const memberType = member.type || 'user';
    
    return !teamMembers.some(tm => {
      const tmId = typeof tm.id === 'string' ? parseInt(tm.id, 10) : tm.id;
      const tmType = tm.type || 'user';
      return tmId === memberId && tmType === memberType;
    });
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Team Members</h3>

      {/* Add Member Form */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Team Member <span class="text-red-500">*</span></Label>
            <Select value={selectedMemberId || ""} onValueChange={handleMemberSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {availableMembers.map((member) => {
                  const compositeValue = `${member.type || 'user'}-${member.id}`;
                  return (
                    <SelectItem key={compositeValue} value={compositeValue}>
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
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Role <span class="text-red-500">*</span></Label>
            <Input
              placeholder="Auto-filled from role/position"
              value={newMember.role}
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
                <TableHead>Type</TableHead>
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
                  <TableCell>
                    {member.type === 'employee' ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                        Employee
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                        User
                      </span>
                    )}
                  </TableCell>
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

