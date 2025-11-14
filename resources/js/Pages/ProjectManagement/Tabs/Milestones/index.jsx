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
import { Trash2, SquarePen } from 'lucide-react';
import AddMilestone from './add';
import EditMilestone from './edit';
import DeleteMilestone from './delete';
export default function MilestonesTab({ project, milestoneData }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editMilestone, setEditMilestone] = useState(null);
  const [deleteMilestone, setDeleteMilestone] = useState(null);
  const [search, setSearch] = useState('');

  const milestones = milestoneData.milestones.data || [];

  // Frontend filtering
  const filteredMilestones = useMemo(() => {
    if (!search) return milestones;
    return milestones.filter(m => {
      const name = (m.name || '').toLowerCase();
      const desc = (m.description || '').toLowerCase();
      const status = (m.status || '').toLowerCase();
      const query = search.toLowerCase();
      return name.includes(query) || desc.includes(query) || status.includes(query);
    });
  }, [search, milestones]);

  const handleSearch = (e) => setSearch(e.target.value);

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH') : '---';

  return (
    <div className="w-full">
      {/* Search + Add */}
      <div className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <Input
          placeholder="Search milestones..."
          value={search}
          onChange={handleSearch}
          className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 w-full sm:max-w-md"
        />
        <Button
          className="bg-zinc-700 hover:bg-zinc-900 text-white"
          onClick={() => setShowAddModal(true)}
        >
          + Add Milestone
        </Button>
      </div>

      {/* Milestones Table */}
      <div className="overflow-x-auto rounded-lg">
        <Table className="min-w-[600px] w-full">
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
            {filteredMilestones.length > 0 ? filteredMilestones.map(milestone => (
              <TableRow key={milestone.id} className="hover:bg-gray-50 transition">
                <TableCell>{milestone.name}</TableCell>
                <TableCell>{milestone.description || '---'}</TableCell>
                <TableCell>{formatDate(milestone.due_date)}</TableCell>
                <TableCell className="capitalize">{milestone.status}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditMilestone(milestone); setShowEditModal(true); }}
                      className="p-2 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                      title="Edit"
                    >
                      <SquarePen size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteMilestone(milestone);
                        setShowDeleteModal(true);
                      }}
                      className="p-2 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                  No milestones found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddMilestone
          setShowAddModal={setShowAddModal}
          project={project}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editMilestone && (
        <EditMilestone
          setShowEditModal={setShowEditModal}
          milestone={editMilestone}
          project={project}
        />
      )}

      {showDeleteModal && deleteMilestone && (
        <DeleteMilestone
            setShowDeleteModal={setShowDeleteModal}
            milestone={deleteMilestone}
            project={project}
        />
        )}
    </div>
  );
}
