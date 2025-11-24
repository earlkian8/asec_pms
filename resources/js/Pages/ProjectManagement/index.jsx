import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router, Link } from '@inertiajs/react';
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
import { Trash2, SquarePen, Eye } from 'lucide-react';
import { usePermission } from '@/utils/permissions';

import AddProject from './add';
import EditProject from './edit';
import DeleteProject from './delete';

export default function ProjectsIndex() {
  const { has } = usePermission();
  
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Project Management", href: route('project-management.index') },
    { title: "Projects" },
  ];

  const columns = [
    { header: 'Code', width: '8%' },
    { header: 'Name', width: '18%' },
    { header: 'Client', width: '12%' },
    { header: 'Type', width: '10%' },
    { header: 'Contract Amount', width: '12%' },
    { header: 'Progress', width: '15%' },
    { header: 'Status', width: '8%' },
    { header: 'Priority', width: '8%' },
    { header: 'Action', width: '9%' },
  ];

  // Data from backend
  const pagination = usePage().props.projects;
  const projects = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const clients = usePage().props.clients;
  const users = usePage().props.users || [];
  const inventoryItems = usePage().props.inventoryItems || [];
//   const categories = usePage().props.categories;
  const initialSearch = usePage().props.search || '';

  // States
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteProject, setDeleteProject] = useState(null);
  const debounceTimer = useRef(null);

  // Tag color mappings
  const typeColors = {
    design: 'bg-purple-100 text-purple-800',
    construction: 'bg-yellow-100 text-yellow-800',
    consultancy: 'bg-blue-100 text-blue-800',
    maintenance: 'bg-green-100 text-green-800',
  };

  const statusColors = {
    planning: 'bg-gray-100 text-gray-800',
    active: 'bg-blue-100 text-blue-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-yellow-100 text-yellow-800',
  };

  // Handle search input
  const handleSearch = (e) => {
    setSearchInput(e.target.value);
  };

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      router.get(
        route('project-management.index'),
        { search: searchInput },
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  // Pagination
  const handlePageChange = ({ page }) => {
    router.get(
      route('project-management.index'),
      { search: searchInput, page },
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

  return (
    <>
      {showAddModal && (
        <AddProject 
          setShowAddModal={setShowAddModal} 
          clients={clients}
          users={users}
          inventoryItems={inventoryItems}
        />
      )}
      {showEditModal && (
        <EditProject setShowEditModal={setShowEditModal} project={editProject} clients={clients} />
      )}
      {showDeleteModal && (
        <DeleteProject setShowDeleteModal={setShowDeleteModal} project={deleteProject} />
      )}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Projects" />

        <div className="w-full sm:px-6 lg:px-8">
          <div className="overflow-hidden bg-white shadow sm:rounded-lg p-2 mt-2">
            
            {/* Search + Add Button */}
            <div className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="w-full sm:w-auto flex-1 max-w-md">
                <Input
                  placeholder="Search project..."
                  value={searchInput}
                  onChange={handleSearch}
                  className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 w-full"
                />
              </div>
              <div className="flex gap-2">
                {has('projects.create') && (
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="bg-zinc-700 hover:bg-zinc-900 text-white"
                  >
                    Add Project
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-lg">
              <Table className="min-w-[1200px] w-full">
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
                  {projects.length > 0 ? (
                    projects.map((project) => {
                      const progress = project.progress_percentage || 0;
                      return (
                      <TableRow key={project.id}>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm font-medium">{project.project_code || '---'}</TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm capitalize">{project.project_name}</TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm capitalize">{project.client?.client_name || '---'}</TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm capitalize">
                          <span className={`px-2 py-1 rounded text-xs ${typeColors[project.project_type] || 'bg-gray-100 text-gray-800'}`}>
                            {project.project_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                          <span className="font-semibold text-gray-900">
                            ₱{parseFloat(project.contract_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2.5 max-w-[120px] shadow-inner">
                              <div 
                                className={`h-2.5 rounded-full transition-all duration-500 ${
                                  progress === 100 ? 'bg-green-500' :
                                  progress >= 50 ? 'bg-blue-500' :
                                  progress > 0 ? 'bg-yellow-500' :
                                  'bg-gray-300'
                                }`}
                                style={{ width: `${Math.min(progress, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold w-10 ${
                              progress === 100 ? 'text-green-600' :
                              progress >= 50 ? 'text-blue-600' :
                              progress > 0 ? 'text-yellow-600' :
                              'text-gray-500'
                            }`}>{progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm capitalize">
                          <span className={`px-2 py-1 rounded text-xs ${statusColors[project.status] || 'bg-gray-100 text-gray-800'}`}>
                            {project.status?.replace('_', ' ')}
                          </span>
                        </TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm capitalize">
                          <span className={`px-2 py-1 rounded text-xs ${priorityColors[project.priority] || 'bg-gray-100 text-gray-800'}`}>
                            {project.priority}
                          </span>
                        </TableCell>
                        <TableCell className="text-left px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm capitalize">
                          <div className="flex gap-2">
                            {has('projects.view') && (
                              <Link href={route('project-management.view', project.id)}>
                                <button
                                    className="p-2 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                                    title="View Project"
                                    aria-label="View Project"
                                >
                                    <Eye size={18} />
                                </button>
                              </Link>
                            )}
                            {has('projects.update') && (
                              <button
                                onClick={() => {
                                  setEditProject(project);
                                  setShowEditModal(true);
                                }}
                                className="p-2 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                                title="Edit"
                              >
                                <SquarePen size={18} />
                              </button>
                            )}
                            {has('projects.delete') && (
                              <button
                                onClick={() => {
                                  setDeleteProject(project);
                                  setShowDeleteModal(true);
                                }}
                                className="p-2 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="text-center py-4 text-gray-500">
                        No projects found
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
          </div>
        </div>
      </AuthenticatedLayout>
    </>
  );
}
