import { useState, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Check, Trash2, SquarePen } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import AddProjectTeam from './add'; // import the Add modal
import EditProjectTeam from './edit';
export default function TeamTab({ project, teamData }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProjectTeam, setEditProjectTeam] = useState(null);
  const [search, setSearch] = useState('');

  const projectTeams = teamData.projectTeams.data || [];

  // Frontend filtering
  const filteredTeam = useMemo(() => {
    if (!search) return projectTeams;
    return projectTeams.filter(team => {
      const fullName = `${team.employee?.first_name} ${team.employee?.last_name}`.toLowerCase();
      const email = (team.employee?.email || '').toLowerCase();
      const role = (team.role || '').toLowerCase();
      const query = search.toLowerCase();
      return fullName.includes(query) || email.includes(query) || role.includes(query);
    });
  }, [search, projectTeams]);

  // Selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTeam.length) setSelectedIds([]);
    else setSelectedIds(filteredTeam.map(member => member.id));
  };
  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // Backend actions
  const handleBulkUnassign = () => {
    if (selectedIds.length === 0) return;
    router.post(
      route('project-management.project-teams.destroy', project.id),
      { ids: selectedIds },
      {
        preserveScroll: true,
        onSuccess: () => {
          toast.success("Selected team members unassigned successfully.");
          setSelectedIds([]);
        },
        onError: () => toast.error("Failed to unassign team members.")
      }
    );
  };
  const handleToggleStatus = (team) => {
    router.put(
      route("project-management.project-teams.update-status", [project.id, team.id]),
      { is_active: !team.is_active },
      {
        preserveScroll: true,
        onSuccess: () => toast.success(`${team.employee?.first_name} ${team.employee?.last_name} status updated.`),
        onError: () => toast.error("Failed to update status.")
      }
    );
  };

  const formatCurrency = (amount) => amount ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount) : '---';
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH') : '---';

  return (
    <div className="w-full">

      {/* Search + Add + Bulk Unassign */}
      <div className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <Input
          placeholder="Search team members..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 w-full sm:max-w-md"
        />
        <div className="flex gap-2">
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={selectedIds.length === 0}
            onClick={handleBulkUnassign}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Unassign Selected
          </Button>
          <Button
            className="bg-zinc-700 hover:bg-zinc-900 text-white"
            onClick={() => setShowAddModal(true)}
          >
            + Add Team Member
          </Button>
        </div>
      </div>

      {/* Team Table */}
      <div className="overflow-x-auto rounded-lg">
        <Table className="min-w-[600px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]">
                <div
                  onClick={toggleSelectAll}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition ${
                    selectedIds.length === filteredTeam.length && filteredTeam.length > 0
                      ? 'border-gray-800 bg-gray-800'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {selectedIds.length === filteredTeam.length && filteredTeam.length > 0 && (
                    <Check className="h-3 w-3 text-white" />
                  )}
                </div>
              </TableHead>
              <TableHead>Employee</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Hourly Rate</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTeam.length > 0 ? filteredTeam.map(team => {
              const isSelected = selectedIds.includes(team.id);
              return (
                <TableRow key={team.id} className={`cursor-pointer transition ${isSelected ? "bg-gray-100" : "hover:bg-gray-50"}`}>
                  <TableCell>
                    <div
                      onClick={() => toggleSelect(team.id)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition ${
                        isSelected ? 'border-gray-800 bg-gray-800' : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </TableCell>
                  <TableCell>{team.employee?.first_name} {team.employee?.last_name}</TableCell>
                  <TableCell>{team.employee?.email}</TableCell>
                  <TableCell className="capitalize">{team.role}</TableCell>
                  <TableCell>{formatCurrency(team.hourly_rate)}</TableCell>
                  <TableCell>{formatDate(team.start_date)}</TableCell>
                  <TableCell>{formatDate(team.end_date)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={team.is_active}
                      onCheckedChange={() => handleToggleStatus(team)}
                      className="switch data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => { setEditProjectTeam(team); setShowEditModal(true); }}
                      className="p-2 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                    >
                      <SquarePen size={18} />
                    </button>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-4 text-gray-500">
                  No team members found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddProjectTeam
          setShowAddModal={setShowAddModal}
          employees={teamData.employees || []}
          project={project}
        />
      )}
        {showEditModal && (
        <EditProjectTeam setShowEditModal={setShowEditModal} projectTeam={editProjectTeam} project={project} />
      )}
    </div>
  );
}
