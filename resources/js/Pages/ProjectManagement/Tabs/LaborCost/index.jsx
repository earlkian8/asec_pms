import { useState, useEffect, useRef } from 'react';
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
import { 
  Trash2, 
  SquarePen, 
  Plus,
  Search,
  User,
  Calendar,
  Eye,
  DollarSign,
  Clock,
  TrendingUp
} from 'lucide-react';
import AddLaborCost from './add';
import EditLaborCost from './edit';
import DeleteLaborCost from './delete';
import ViewLaborCost from './view';

export default function LaborCostTab({ project, laborCostData }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editLaborCost, setEditLaborCost] = useState(null);
  const [deleteLaborCost, setDeleteLaborCost] = useState(null);
  const [viewLaborCost, setViewLaborCost] = useState(null);
  
  const pagination = laborCostData?.laborCosts;
  const laborCosts = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const initialSearch = laborCostData?.search || '';
  const totalHours = parseFloat(laborCostData?.totalHours || 0);
  const totalCost = parseFloat(laborCostData?.totalCost || 0);

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [dateFrom, setDateFrom] = useState(laborCostData?.dateFrom || '');
  const [dateTo, setDateTo] = useState(laborCostData?.dateTo || '');
  const debounceTimer = useRef(null);

  const columns = [
    { header: 'Employee', width: '20%' },
    { header: 'Work Date', width: '12%' },
    { header: 'Hours', width: '10%' },
    { header: 'Hourly Rate', width: '12%' },
    { header: 'Total Cost', width: '12%' },
    { header: 'Description', width: '20%' },
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
          date_from: dateFrom,
          date_to: dateTo,
          page: 1
        },
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  // Handle date filter changes
  useEffect(() => {
    router.get(
      route('project-management.view', project.id),
      { 
        search: searchInput,
        date_from: dateFrom,
        date_to: dateTo,
        page: 1
      },
      { preserveState: true, preserveScroll: true, replace: true }
    );
  }, [dateFrom, dateTo]);

  // Pagination
  const handlePageChange = ({ page }) => {
    router.get(
      route('project-management.view', project.id),
      { search: searchInput, date_from: dateFrom, date_to: dateTo, page },
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Labor Cost</h2>
          <p className="text-sm text-gray-500 mt-1">Track labor hours and costs for this project</p>
        </div>
        <Button
          className="bg-zinc-700 hover:bg-zinc-900 text-white shadow-sm"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={18} className="mr-2" />
          Add Labor Cost
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Hours</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {isNaN(totalHours) ? '0.00' : totalHours.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Clock className="text-blue-600" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalCost)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <DollarSign className="text-green-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search by employee name, description, or notes..."
            value={searchInput}
            onChange={handleSearch}
            className="pl-10 focus:border-gray-800 focus:ring-2 focus:ring-gray-800 border-2 shadow-sm"
          />
        </div>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="From Date"
          className="w-full sm:w-[150px] border-2 shadow-sm"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="To Date"
          className="w-full sm:w-[150px] border-2 shadow-sm"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg">
        <Table className="min-w-[900px] w-full">
          <TableHeader>
            <TableRow>
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
            {laborCosts.length > 0 ? (
              laborCosts.map((cost) => {
                const user = cost.user || cost.user_id || {};
                const totalCost = (cost.hours_worked || 0) * (cost.hourly_rate || 0);
                
                return (
                  <TableRow key={cost.id} className="hover:bg-gray-50 transition">
                    <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-900">{user.name || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span>{formatDate(cost.work_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                      {cost.hours_worked} hrs
                    </TableCell>
                    <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                      {formatCurrency(cost.hourly_rate)}
                    </TableCell>
                    <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm font-semibold text-gray-900">
                      {formatCurrency(totalCost)}
                    </TableCell>
                    <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                      <div className="max-w-xs truncate" title={cost.description || ''}>
                        {cost.description || '---'}
                      </div>
                    </TableCell>
                    <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setViewLaborCost(cost);
                            setShowViewModal(true);
                          }}
                          className="p-2 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-700 transition"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setEditLaborCost(cost);
                            setShowEditModal(true);
                          }}
                          className="p-2 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                          title="Edit"
                        >
                          <SquarePen size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteLaborCost(cost);
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
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No labor cost entries found</p>
                  {searchInput && <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>}
                  <Button
                    className="mt-4 bg-zinc-700 hover:bg-zinc-900 text-white shadow-sm"
                    onClick={() => setShowAddModal(true)}
                  >
                    <Plus size={18} className="mr-2" />
                    Add First Labor Cost Entry
                  </Button>
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
      {showAddModal && (
        <AddLaborCost
          setShowAddModal={setShowAddModal}
          project={project}
          teamMembers={laborCostData?.teamMembers || []}
        />
      )}

      {showEditModal && editLaborCost && (
        <EditLaborCost
          setShowEditModal={setShowEditModal}
          project={project}
          laborCost={editLaborCost}
          teamMembers={laborCostData?.teamMembers || []}
        />
      )}

      {showDeleteModal && deleteLaborCost && (
        <DeleteLaborCost
          setShowDeleteModal={setShowDeleteModal}
          project={project}
          laborCost={deleteLaborCost}
        />
      )}

      {showViewModal && viewLaborCost && (
        <ViewLaborCost
          setShowViewModal={setShowViewModal}
          project={project}
          laborCost={viewLaborCost}
        />
      )}
    </div>
  );
}

