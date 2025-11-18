import { useState, useMemo, useEffect, useRef } from 'react';
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
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { toast } from 'sonner';
import { 
  Trash2, 
  SquarePen, 
  Plus,
  Filter,
  Search,
  Package,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Calendar,
  Eye
} from 'lucide-react';
import AddReceivingReport from './add';
import EditReceivingReport from './edit';
import DeleteReceivingReport from './delete';
import DeleteMaterialAllocation from './delete-allocation';
import ViewMaterialAllocation from './view';

export default function MaterialAllocationTab({ project, materialAllocationData }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllocationModal, setShowDeleteAllocationModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editReceivingReport, setEditReceivingReport] = useState(null);
  const [deleteReceivingReport, setDeleteReceivingReport] = useState(null);
  const [deleteAllocation, setDeleteAllocation] = useState(null);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [viewAllocation, setViewAllocation] = useState(null);
  
  const pagination = materialAllocationData?.allocations;
  const allocations = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const initialSearch = materialAllocationData?.search || '';
  const initialStatusFilter = materialAllocationData?.statusFilter || 'all';

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const debounceTimer = useRef(null);

  const columns = [
    { header: 'Item', width: '20%' },
    { header: 'Code', width: '10%' },
    { header: 'Allocated', width: '12%' },
    { header: 'Received', width: '12%' },
    { header: 'Remaining', width: '12%' },
    { header: 'Status', width: '10%' },
    { header: 'Progress', width: '10%' },
    { header: 'Actions', width: '14%' },
  ];

  // Handle search input
  const handleSearch = (e) => {
    setSearchInput(e.target.value);
  };

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      router.get(
        route('project-management.view', project.id),
        { 
          search: searchInput,
          status_filter: statusFilter,
          page: 1
        },
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  // Handle status filter change
  useEffect(() => {
    router.get(
      route('project-management.view', project.id),
      { 
        search: searchInput,
        status_filter: statusFilter,
        page: 1
      },
      { preserveState: true, preserveScroll: true, replace: true }
    );
  }, [statusFilter]);

  // Pagination
  const handlePageChange = ({ page }) => {
    router.get(
      route('project-management.view', project.id),
      { search: searchInput, status_filter: statusFilter, page },
      { preserveState: true, preserveScroll: true, replace: true }
    );
  };

  const pageLinks = Array.isArray(paginationLinks)
    ? paginationLinks.filter(link => link?.label && !isNaN(Number(link.label)))
    : [];

  const prevLink = paginationLinks.find?.(link => link.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink = paginationLinks.find?.(link => link.label?.toLowerCase()?.includes('next')) ?? null;

  const handlePageClick = (url) => {
    if (url) {
      try {
        const urlObj = new URL(url, window.location.origin);
        const page = urlObj.searchParams.get('page');
        handlePageChange({ page });
      } catch (e) {
        console.error("Failed to parse pagination URL:", e);
      }
    }
  };

  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }) : '---';

  const formatStatus = (status) => {
    if (!status) return { label: '---', color: 'gray', icon: Clock, bgColor: 'bg-gray-100', textColor: 'text-gray-700' };
    const statusMap = {
      'pending': { label: 'Pending', color: 'yellow', icon: Clock, bgColor: 'bg-yellow-100', textColor: 'text-yellow-700' },
      'partial': { label: 'Partial', color: 'blue', icon: AlertCircle, bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
      'received': { label: 'Received', color: 'green', icon: CheckCircle2, bgColor: 'bg-green-100', textColor: 'text-green-700' }
    };
    return statusMap[status] || { label: status, color: 'gray', icon: Clock, bgColor: 'bg-gray-100', textColor: 'text-gray-700' };
  };

  const getStatusBadge = (status) => {
    const statusInfo = formatStatus(status);
    const Icon = statusInfo.icon;
    
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded-full font-medium ${statusInfo.bgColor} ${statusInfo.textColor}`}>
        <Icon size={12} />
        {statusInfo.label}
      </span>
    );
  };

  const calculateProgress = (allocation) => {
    if (!allocation.quantity_allocated || allocation.quantity_allocated === 0) return 0;
    const received = allocation.quantity_received || 0;
    return Math.min(Math.round((received / allocation.quantity_allocated) * 100), 100);
  };


  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Material Allocation</h2>
          <p className="text-sm text-gray-500 mt-1">Manage material allocations and receiving reports</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search by item name, code, or notes..."
            value={searchInput}
            onChange={handleSearch}
            className="pl-10 focus:border-gray-800 focus:ring-2 focus:ring-gray-800 border-2 shadow-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] border-2 shadow-sm">
            <Filter size={16} className="mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="received">Received</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg">
        <Table className="min-w-[900px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]"></TableHead>
              {columns.map((col, i) => (
                <TableHead
                  key={i}
                  className="text-left font-semibold px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm"
                  style={col.width ? { width: col.width } : {}}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {allocations.length > 0 ? (
              allocations.map((allocation) => {
                const inventoryItem = allocation.inventory_item || allocation.inventoryItem || {};
                const remaining = (allocation.quantity_allocated || 0) - (allocation.quantity_received || 0);
                const progress = calculateProgress(allocation);
                
                return (
                  <>
                    <TableRow key={allocation.id} className="hover:bg-gray-50 transition">
                      <TableCell className="w-[30px]">
                      </TableCell>
                      <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                        <div className="font-medium text-gray-900">{inventoryItem.item_name || 'Unknown'}</div>
                      </TableCell>
                      <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm text-gray-600">
                        {inventoryItem.item_code || '---'}
                      </TableCell>
                      <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                        {allocation.quantity_allocated} {inventoryItem.unit_of_measure || 'units'}
                      </TableCell>
                      <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                        {allocation.quantity_received || 0} {inventoryItem.unit_of_measure || 'units'}
                      </TableCell>
                      <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                        {remaining} {inventoryItem.unit_of_measure || 'units'}
                      </TableCell>
                      <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                        {getStatusBadge(allocation.status)}
                      </TableCell>
                      <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[60px]">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 w-8">{progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                        <div className="flex gap-2">
                          {remaining > 0 && (
                            <button
                              onClick={() => {
                                setSelectedAllocation(allocation);
                                setShowAddModal(true);
                              }}
                              className="p-2 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                              title="Add Receiving Report"
                            >
                              <Plus size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setViewAllocation(allocation);
                              setShowViewModal(true);
                            }}
                            className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-700 transition"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteAllocation(allocation);
                              setShowDeleteAllocationModal(true);
                            }}
                            className="p-2 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition"
                            title="Delete Allocation"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  </>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No material allocations found</p>
                  {searchInput && <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>}
                  <p className="text-xs text-gray-400 mt-2">
                    Material allocations are created when you stock out items from inventory with "Project Use" type.
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex justify-end mt-4">
          <div className="flex items-center space-x-2">
            <button
              disabled={!prevLink?.url}
              className={`px-4 py-1 rounded border text-sm font-medium ${
                !prevLink?.url
                  ? 'bg-white text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-black border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => handlePageClick(prevLink?.url)}
            >
              Previous
            </button>

            {pageLinks.map((link, idx) => (
              <button
                key={idx}
                disabled={!link?.url}
                className={`px-4 py-1 rounded border text-sm font-medium transition-all duration-150 ${
                  link?.active
                    ? 'bg-zinc-700 text-white hover:bg-zinc-900'
                    : 'bg-white text-black border-gray-300 hover:bg-gray-200'
                } ${!link?.url ? 'cursor-not-allowed text-gray-400' : ''}`}
                onClick={() => handlePageClick(link?.url)}
              >
                {link?.label || ''}
              </button>
            ))}

            <button
              disabled={!nextLink?.url}
              className={`px-4 py-1 rounded border text-sm font-medium ${
                !nextLink?.url
                  ? 'bg-white text-gray-400 border-gray-200 cursor-not-allowed'
                  : 'bg-white text-black border-gray-300 hover:bg-gray-100'
              }`}
              onClick={() => handlePageClick(nextLink?.url)}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddModal && selectedAllocation && (
        <AddReceivingReport
          setShowAddModal={setShowAddModal}
          project={project}
          allocation={selectedAllocation}
        />
      )}

      {showEditModal && editReceivingReport && (
        <EditReceivingReport
          setShowEditModal={setShowEditModal}
          project={project}
          allocation={editReceivingReport.allocation}
          receivingReport={editReceivingReport}
        />
      )}

      {showDeleteModal && deleteReceivingReport && (
        <DeleteReceivingReport
          setShowDeleteModal={setShowDeleteModal}
          project={project}
          allocation={deleteReceivingReport.allocation}
          receivingReport={deleteReceivingReport}
        />
      )}

      {showDeleteAllocationModal && deleteAllocation && (
        <DeleteMaterialAllocation
          setShowDeleteModal={setShowDeleteAllocationModal}
          project={project}
          allocation={deleteAllocation}
        />
      )}

      {showViewModal && viewAllocation && (
        <ViewMaterialAllocation
          setShowViewModal={setShowViewModal}
          project={project}
          allocation={viewAllocation}
        />
      )}
    </div>
  );
}
