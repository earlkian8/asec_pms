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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

  // Pagination calculations
  const totalPages = Math.ceil(filteredMilestones.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedMilestones = filteredMilestones.slice(startIdx, endIdx);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const goToPage = (page) => {
    const pageNum = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNum);
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH') : '---';

  const formatStatus = (status) => {
    if (!status) return '---';
    const statusMap = {
      'pending': 'Pending',
      'in_progress': 'In Progress',
      'completed': 'Completed'
    };
    return statusMap[status] || status;
  };

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
              <TableHead className="w-[15%]">Name</TableHead>
              <TableHead className="w-[40%]">Description</TableHead>
              <TableHead className="w-[20%]">Due Date</TableHead>
              <TableHead className="w-[15%]">Status</TableHead>
              <TableHead className="w-[10%]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMilestones.length > 0 ? paginatedMilestones.map(milestone => (
              <TableRow key={milestone.id} className="hover:bg-gray-50 transition">
                <TableCell className="w-[15%]">{milestone.name}</TableCell>
                <TableCell className="w-[40%]">{milestone.description || '---'}</TableCell>
                <TableCell className="w-[20%]">{formatDate(milestone.due_date)}</TableCell>
                <TableCell className="w-[15%]">{formatStatus(milestone.status)}</TableCell>
                <TableCell className="w-[10%]">
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

      {/* Pagination Controls */}
      {filteredMilestones.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {startIdx + 1} to {Math.min(endIdx, filteredMilestones.length)} of {filteredMilestones.length} milestones
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 h-auto"
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`px-3 py-1 rounded text-sm font-medium transition ${
                    currentPage === page
                      ? 'bg-zinc-700 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <Button
              variant="outline"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 h-auto"
            >
              Next
            </Button>
          </div>
        </div>
      )}

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
