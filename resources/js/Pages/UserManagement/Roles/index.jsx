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
} from "@/components/ui/table"
import { Input } from "@/Components/ui/input"
import { Button } from "@/Components/ui/button"
import { Trash2, Users, SquarePen } from 'lucide-react';
import AddRole from './add';
import DeleteRole from './delete';

export default function RolesIndex() {
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "User Management", href: route('user-management.roles-and-permissions.index') },
    { title: "Roles" },
  ];

  const columns = [
    { header: 'Role Name', width: '40%' },
    { header: 'Users Count', width: '20%' },
    { header: 'Created At', width: '20%' },
    { header: 'Actions', width: '5%' },
  ];

  const roles = usePage().props.roles?.data || [];
  const pagination = usePage().props.roles;
  const paginationLinks = pagination?.links || [];
  const initialSearch = usePage().props.search || '';

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRole, setDeleteRole] = useState(null);
  const debounceTimer = useRef(null);

  const handleSearch = (e) => {
    setSearchInput(e.target.value);
  };

  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      router.get(
        route('user-management.roles-and-permissions.index'),
        { search: searchInput },
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  const handlePageChange = ({ page }) => {
    router.get(
      route('user-management.roles-and-permissions.index'),
      { search: searchInput, page },
      { preserveState: true, preserveScroll: true, replace: true }
    );
  };

  // Pagination logic
  const pageLinks = Array.isArray(paginationLinks) 
    ? paginationLinks.filter(link => link?.label && !isNaN(Number(link.label))) 
    : [];

  const prevLink = paginationLinks.find?.(link => link?.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink = paginationLinks.find?.(link => link?.label?.toLowerCase()?.includes('next')) ?? null;

  const handlePageClick = (url) => {
    if (url) {
      try {
        const urlObj = new URL(url, window.location.origin);
        const page = urlObj.searchParams.get('page');
        handlePageChange({ search: searchInput, page });
      } catch (e) {
        console.error("Failed to parse pagination URL:", e);
      }
    }
  };

  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  return (
    <>
    {showAddModal && (
        <AddRole setShowAddModal={setShowAddModal} />
    )}

    {showDeleteModal && (
        <DeleteRole setShowDeleteModal={setShowDeleteModal} role={deleteRole} />
    )}
    
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
      <Head title="Roles" />

      <div>
        <div className="w-full sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow sm:rounded-lg p-2 mt-2">
            {/* Search Row */}
            <div className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="w-full sm:w-auto flex-1 max-w-md">
                <Input 
                  placeholder="Search by role name..." 
                  value={searchInput} 
                  onChange={handleSearch} 
                  className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 focus-visible:ring-gray-800 focus-within:ring-gray-800 w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setShowAddModal(true);
                  }}
                  className="bg-zinc-700 hover:bg-zinc-900 text-white"
                >
                  Add Role
                </Button>
              </div>
            </div>

            {/* Table Content */}
            <div className="overflow-x-auto rounded-lg">
              <Table className="min-w-[600px] w-full">
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
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm font-medium">
                          {role.name}
                        </TableCell>
                        {/* <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                          {role.guard_name || 'web'}
                        </TableCell> */}
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <Users size={16} className="text-gray-500" />
                            <span>{role.users_count || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                          {new Date(role.created_at).toLocaleString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </TableCell>   
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                router.visit(route('user-management.roles-and-permissions.edit', role.id));
                              }}
                              className="p-2 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                              title="Edit Permissions"
                              aria-label="Edit Permissions"
                              type="button"
                            >
                              <SquarePen size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteRole(role);
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
                        No roles found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Integrated Pagination */}
            {showPagination && (
              <div className="flex justify-end mt-4">
                <div className="flex items-center space-x-2">
                  {/* Previous Button */}
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

                  {/* Next Button */}
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
      </div>
    </AuthenticatedLayout>
    </>
  );
}