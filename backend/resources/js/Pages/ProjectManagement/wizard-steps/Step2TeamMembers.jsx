import { useState } from "react";
import { toast } from "sonner";
import { useProjectWizard } from "@/Contexts/ProjectWizardContext";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import { Trash2, Search } from "lucide-react";
import InputError from "@/Components/InputError";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";

export default function Step2TeamMembers({ users }) {
  const { teamMembers, addTeamMember, removeTeamMember, projectData } = useProjectWizard();
  const [search, setSearch] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  // Ensure users is always an array
  const safeUsers = Array.isArray(users) ? users : [];

  // Filter available members (not already added)
  const availableMembers = safeUsers.filter((member) => {
    if (!member || !member.id) return false;
    const memberId = typeof member.id === 'number' ? member.id : parseInt(member.id, 10);
    const memberType = member.type || 'user';

    const isAlreadyAdded = teamMembers.some(tm => {
      const tmId = typeof tm.id === 'string' ? parseInt(tm.id, 10) : tm.id;
      const tmType = tm.type || 'user';
      return tmId === memberId && tmType === memberType;
    });

    if (isAlreadyAdded) return false;

    const fullName = `${member.name || ''}`.toLowerCase();
    const email = member.email ? member.email.toLowerCase() : '';
    const position = member.position ? member.position.toLowerCase() : '';
    const searchLower = search.toLowerCase();

    return (
      fullName.includes(searchLower) ||
      email.includes(searchLower) ||
      position.includes(searchLower)
    );
  });

  // Derive the read-only role label for a member
  const getMemberRole = (member) => {
    if (member.type === 'employee') return member.position || 'No Position';
    return member.role || 'No Role';
  };

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedMemberIds(availableMembers.map((m) => {
        const memberId = typeof m.id === 'number' ? m.id : parseInt(m.id, 10);
        return `${m.type || 'user'}-${memberId}`;
      }));
    } else {
      setSelectedMemberIds([]);
    }
  };

  const toggleMember = (compositeId) => {
    if (selectedMemberIds.includes(compositeId)) {
      setSelectedMemberIds(selectedMemberIds.filter((id) => id !== compositeId));
      setFormData((prev) => {
        const newData = { ...prev };
        delete newData[compositeId];
        return newData;
      });
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`${compositeId}_hourly_rate`];
        delete newErrors[`${compositeId}_start_date`];
        delete newErrors[`${compositeId}_end_date`];
        return newErrors;
      });
    } else {
      setSelectedMemberIds([...selectedMemberIds, compositeId]);
    }
  };

  const handleChange = (compositeId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [compositeId]: {
        ...prev[compositeId],
        [field]: value,
      },
    }));
    if (errors[`${compositeId}_${field}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`${compositeId}_${field}`];
        return newErrors;
      });
    }
  };

  const inputClass = (error) =>
    "w-full border text-sm rounded-md px-3 py-2 focus:outline-none transition-all duration-200 " +
    (error
      ? "border-red-500 ring-2 ring-red-400 focus:border-red-500 focus:ring-red-500"
      : "border-zinc-300 focus:border-zinc-800 focus:ring-2 focus:ring-zinc-800");

  const handleAddSelected = () => {
    if (selectedMemberIds.length === 0) {
      toast.error("Please select at least one team member");
      return;
    }

    const validationErrors = {};
    for (const compositeId of selectedMemberIds) {
      const member = availableMembers.find(m => {
        const mId = typeof m.id === 'number' ? m.id : parseInt(m.id, 10);
        const mType = m.type || 'user';
        return `${mType}-${mId}` === compositeId;
      });

      if (!member) continue;

      const memberName = member.name || 'Team Member';

      // Hourly rate — must be present and >= 0
      const hourlyRateVal = formData[compositeId]?.hourly_rate;
      if (hourlyRateVal === undefined || hourlyRateVal === '' || parseFloat(hourlyRateVal) < 0) {
        validationErrors[`${compositeId}_hourly_rate`] = `Hourly rate for ${memberName} must be at least 0.`;
      }

      // Start date — required
      if (!formData[compositeId]?.start_date) {
        validationErrors[`${compositeId}_start_date`] = `Please enter a start date for ${memberName}.`;
      } else {
        // Validate against project dates
        if (projectData.start_date && formData[compositeId].start_date < projectData.start_date) {
          validationErrors[`${compositeId}_start_date`] = `Start date cannot be before project start date (${projectData.start_date}).`;
        }
        if (projectData.planned_end_date && formData[compositeId].start_date > projectData.planned_end_date) {
          validationErrors[`${compositeId}_start_date`] = `Start date cannot be after project end date (${projectData.planned_end_date}).`;
        }
      }

      // End date — optional but must be >= start date if provided
      if (formData[compositeId]?.end_date && formData[compositeId]?.start_date) {
        if (formData[compositeId].end_date < formData[compositeId].start_date) {
          validationErrors[`${compositeId}_end_date`] = `End date must be after or equal to start date for ${memberName}.`;
        }
      }
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error("Please fill in all required fields correctly");
      return;
    }

    let addedCount = 0;
    for (const compositeId of selectedMemberIds) {
      const [memberType, memberIdStr] = compositeId.split('-');
      const memberIdInt = parseInt(memberIdStr, 10);

      const member = availableMembers.find(m => {
        const mId = typeof m.id === 'number' ? m.id : parseInt(m.id, 10);
        const mType = m.type || 'user';
        return mId === memberIdInt && mType === memberType;
      });

      if (!member) continue;

      const isAlreadyAdded = teamMembers.some(tm => {
        const tmId = typeof tm.id === 'string' ? parseInt(tm.id, 10) : tm.id;
        const tmType = tm.type || 'user';
        return tmId === memberIdInt && tmType === memberType;
      });

      if (!isAlreadyAdded) {
        addTeamMember({
          id: memberIdInt,
          type: memberType,
          name: member.name || 'Unknown',
          email: member.email || '',
          role: getMemberRole(member),
          hourly_rate: parseFloat(formData[compositeId]?.hourly_rate) || 0,
          start_date: formData[compositeId]?.start_date || '',
          end_date: formData[compositeId]?.end_date || null,
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      toast.success(`${addedCount} team member(s) added successfully`);
      setSelectedMemberIds([]);
      setFormData({});
      setErrors({});
    } else {
      toast.error("No team members were added. They may have already been added.");
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Assign Team Members</h3>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
        <Input
          placeholder="Search by name, email, or position..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 border-gray-300 rounded-lg"
        />
      </div>

      {/* Available Members Table */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      availableMembers.length > 0 &&
                      selectedMemberIds.length === availableMembers.length
                    }
                    indeterminate={
                      selectedMemberIds.length > 0 &&
                      selectedMemberIds.length < availableMembers.length
                    }
                    onCheckedChange={(checked) => toggleSelectAll(checked)}
                  />
                </TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider w-24">Type</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[150px]">Name</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[180px]">Email</TableHead>
                {/* Role: read-only, auto-filled from user role / employee position */}
                <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[130px]">Role</TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[130px]">
                  Hourly Rate <span className="text-red-500">*</span>
                </TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[140px]">
                  Start Date <span className="text-red-500">*</span>
                </TableHead>
                <TableHead className="font-bold text-xs sm:text-sm text-gray-700 uppercase tracking-wider min-w-[140px]">
                  End Date
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {availableMembers.map((member) => {
                const memberId = typeof member.id === 'number' ? member.id : parseInt(member.id, 10);
                const memberType = member.type || 'user';
                const compositeId = `${memberType}-${memberId}`;
                const isSelected = selectedMemberIds.includes(compositeId);

                const memberErrors = {
                  hourly_rate: errors[`${compositeId}_hourly_rate`],
                  start_date:  errors[`${compositeId}_start_date`],
                  end_date:    errors[`${compositeId}_end_date`],
                };

                return (
                  <TableRow
                    key={compositeId}
                    onClick={(e) => {
                      if (e.target.closest("input") || e.target.closest("button")) return;
                      toggleMember(compositeId);
                    }}
                    className={`cursor-pointer transition ${
                      isSelected ? "bg-blue-50/50" : "hover:bg-gray-50"
                    }`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleMember(compositeId)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell>
                      {memberType === 'employee' ? (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200 whitespace-nowrap">
                          Employee
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                          User
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium text-gray-900">{member.name || '---'}</TableCell>
                    <TableCell className="text-gray-700">{member.email || '---'}</TableCell>

                    {/* Role — read-only badge, value comes from member data */}
                    <TableCell>
                      <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 whitespace-nowrap">
                        {getMemberRole(member)}
                      </span>
                    </TableCell>

                    {/* Hourly Rate */}
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={formData[compositeId]?.hourly_rate ?? ""}
                        onChange={(e) => handleChange(compositeId, "hourly_rate", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className={inputClass(memberErrors.hourly_rate)}
                        required
                      />
                      {memberErrors.hourly_rate && (
                        <InputError message={memberErrors.hourly_rate} className="mt-1" />
                      )}
                    </TableCell>

                    {/* Start Date */}
                    <TableCell>
                      <Input
                        type="date"
                        value={formData[compositeId]?.start_date ?? ""}
                        onChange={(e) => handleChange(compositeId, "start_date", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        min={projectData.start_date || undefined}
                        max={projectData.planned_end_date || undefined}
                        className={inputClass(memberErrors.start_date)}
                        required
                      />
                      {memberErrors.start_date && (
                        <InputError message={memberErrors.start_date} className="mt-1" />
                      )}
                    </TableCell>

                    {/* End Date */}
                    <TableCell>
                      <Input
                        type="date"
                        value={formData[compositeId]?.end_date ?? ""}
                        onChange={(e) => handleChange(compositeId, "end_date", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        min={formData[compositeId]?.start_date || projectData.start_date || undefined}
                        max={projectData.planned_end_date || undefined}
                        className={inputClass(memberErrors.end_date)}
                      />
                      {memberErrors.end_date && (
                        <InputError message={memberErrors.end_date} className="mt-1" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {availableMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-gray-100 rounded-full p-4 mb-3">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium text-base">
                        {search ? "No team members found" : "All available members have been added"}
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        {search ? "Try adjusting your search" : "No more members available to add"}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add Selected Button */}
      {selectedMemberIds.length > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleAddSelected}
            className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200"
          >
            Add Selected ({selectedMemberIds.length})
          </Button>
        </div>
      )}

      {/* Added Team Members List */}
      {teamMembers.length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Added Team Members</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Hourly Rate</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers.map((member, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{member.name}</TableCell>
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
                    <TableCell>{member.email || '---'}</TableCell>
                    <TableCell>{member.role || '---'}</TableCell>
                    <TableCell>{member.hourly_rate ? `₱${parseFloat(member.hourly_rate).toFixed(2)}` : "---"}</TableCell>
                    <TableCell>{member.start_date || "---"}</TableCell>
                    <TableCell>{member.end_date || "---"}</TableCell>
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
        </div>
      )}

      {teamMembers.length === 0 && availableMembers.length === 0 && !search && (
        <div className="text-center py-8 text-gray-500 border rounded-lg bg-gray-50">
          <p>No team members available to add.</p>
        </div>
      )}
    </div>
  );
}