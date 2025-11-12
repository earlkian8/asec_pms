import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Trash2, SquarePen } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';

import AddEmployee from './add';
import EditEmployee from './edit';
import DeleteEmployee from './delete';

export default function EmployeesIndex() {
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Project Management", href: route('employee-management.index') },
    { title: "Employees" },
  ];

  const columns = [
    { header: 'Name', width: '25%' },
    { header: 'Email', width: '20%' },
    { header: 'Phone', width: '15%' },
    { header: 'Position', width: '15%' },
    { header: 'Status', width: '10%' },
    { header: 'Actions', width: '15%' },
  ];

  const employees = usePage().props.employees?.data || [];
  const pagination = usePage().props.employees;
  const paginationLinks = pagination?.links || [];
  const initialSearch = usePage().props.search || '';

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteEmployee, setDeleteEmployee] = useState(null);
  const debounceTimer = useRef(null);

  // SEARCH HANDLER (debounced)
  const handleSearch = (e) => {
    setSearchInput(e.target.value);
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      router.get(
        route('employee-management.index'),
        { search: searchInput },
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  // PAGINATION HANDLERS
  const handlePageChange = ({ page }) => {
    router.get(
      route('employee-management.index'),
      { search: searchInput, page },
      { preserveState: true, preserveScroll: true, replace: true }
    );
  };

  const pageLinks = Array.isArray(paginationLinks) 
    ? paginationLinks.filter(link => link?.label && !isNaN(Number(link.label))) 
    : [];

  const prevLink = paginationLinks.find?.(link => link?.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink = paginationLinks.find?.(link => link?.label?.toLowerCase()?.includes('next')) ?? null;

  const handlePageClick = (url) => {
    if (!url) return;
    try {
      const urlObj = new URL(url, window.location.origin);
      const page = urlObj.searchParams.get('page');
      handlePageChange({ search: searchInput, page });
    } catch (e) {
      console.error("Pagination URL parse error:", e);
    }
  };

  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  // STATUS TOGGLE
  const handleStatusChange = (employee, newStatus) => {
    router.put(
      route('employee-management.update-status', employee.id),
      { is_active: newStatus },
      {
        preserveScroll: true,
        onSuccess: (page) => {
          const flash = page.props.flash;
          if (flash?.error) toast.error(flash.error);
          else if (flash?.success) toast.success(flash.success);
          else toast.success(
            `Employee "${employee.first_name} ${employee.last_name}" is now ${newStatus ? 'Active' : 'Inactive'}.`
          );
        },
        onError: (errors) => {
          if (errors?.is_active) toast.error(errors.is_active);
          else toast.error('Failed to update status. Please try again.');
        },
      }
    );
  };

  return (
    <>
      {showAddModal && <AddEmployee setShowAddModal={setShowAddModal} />}
      {showEditModal && <EditEmployee setShowEditModal={setShowEditModal} employee={editEmployee} />}
      {showDeleteModal && <DeleteEmployee setShowDeleteModal={setShowDeleteModal} employee={deleteEmployee} />}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Employees" />

        <div className="w-full sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow sm:rounded-lg p-2 mt-2">

            {/* SEARCH + ADD BUTTON */}
            <div className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="w-full sm:w-auto flex-1 max-w-md">
                <Input 
                  placeholder="Search employee..." 
                  value={searchInput} 
                  onChange={handleSearch} 
                  className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 w-full"
                />
              </div>
              <Button 
                onClick={() => setShowAddModal(true)}
                className="bg-zinc-700 hover:bg-zinc-900 text-white"
              >
                Add Employee
              </Button>
            </div>

            {/* TABLE */}
            <div className="overflow-x-auto rounded-lg">
              <Table className="min-w-[700px] w-full">
                <TableHeader>
                  <TableRow>
                    {columns.map((column, index) => (
                      <TableHead 
                        key={index}
                        className="text-left font-semibold px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm"
                        style={column.width ? { width: column.width } : {}}
                      >
                        {column.header}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {employees.length > 0 ? (
                    employees.map(employee => (
                      <TableRow key={employee.id}>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm capitalize">
                          {employee.first_name} {employee.last_name}
                        </TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                          {employee.email}
                        </TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                          {employee.phone || '---'}
                        </TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm capitalize">
                          {employee.position || '---'}
                        </TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={employee.is_active}
                              onCheckedChange={(checked) => handleStatusChange(employee, checked)}
                              className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                            />
                            <span
                              className={`text-xs font-medium ${
                                employee.is_active ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {employee.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditEmployee(employee);
                                setShowEditModal(true);
                              }}
                              className="p-2 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                              title="Edit"
                              aria-label="Edit"
                              type="button"
                            >
                              <SquarePen size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteEmployee(employee);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition"
                              title="Delete"
                              aria-label="Delete"
                              type="button"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center py-4 text-gray-500">
                        No employees found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* PAGINATION */}
            {showPagination && (
              <div className="flex justify-end mt-4">
                <div className="flex items-center space-x-2">
                  {/* Prev */}
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

                  {/* Page Numbers */}
                  {pageLinks.map((link, idx) => (
                    <button
                      key={idx}
                      disabled={!link?.url}
                      className={`px-4 py-1 rounded border text-sm font-medium transition-all duration-150
                        ${link?.active ? 'bg-zinc-700 text-white hover:bg-zinc-900' : 'bg-white text-black border-gray-300 hover:bg-gray-200'}
                        ${!link?.url ? 'cursor-not-allowed text-gray-400' : ''}
                      `}
                      onClick={() => handlePageClick(link?.url)}
                    >
                      {link?.label || ''}
                    </button>
                  ))}

                  {/* Next */}
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
          </div>
        </div>
      </AuthenticatedLayout>
    </>
  );
}
