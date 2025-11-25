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
import { Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { usePermission } from '@/utils/permissions';
import DeleteRequest from './delete';

export default function RequestUpdatesIndex() {
  const { has } = usePermission();
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Client Management", href: route('client-management.index') },
    { title: "Request Updates" },
  ];

  const columns = [
    { header: 'Client', width: '15%' },
    { header: 'Project', width: '15%' },
    { header: 'Subject', width: '20%' },
    { header: 'Message', width: '30%' },
    { header: 'Date', width: '10%' },
    { header: 'Actions', width: '10%' },
  ];

  const pagination = usePage().props.requests;
  const requests = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const initialSearch = usePage().props.search || '';

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Extract pagination links
  const prevLink = paginationLinks.find(link => link.label === '&laquo; Previous');
  const nextLink = paginationLinks.find(link => link.label === 'Next &raquo;');
  const pageLinks = paginationLinks.filter(link => 
    link.label !== '&laquo; Previous' && link.label !== 'Next &raquo;'
  );
  const showPagination = paginationLinks.length > 3;

  // Handle search
  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      router.get(route('client-management.request-updates.index'), 
        { search: value },
        { preserveState: true, replace: true }
      );
    }, 500);
  };

  // Handle pagination
  const handlePageClick = (url) => {
    if (url) {
      router.visit(url, { preserveState: true });
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Check if user has permission to view request updates
  if (!has('clients.view')) {
    return (
      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Request Updates" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">You don't have permission to view request updates.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <>
      {/* 🔹 Modals */}
      {showDeleteModal && (
        <DeleteRequest 
          setShowDeleteModal={setShowDeleteModal} 
          request={deleteRequest} 
        />
      )}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Request Updates" />

        <div>
          <div className="w-full sm:px-6 lg:px-8">
            <div className="overflow-hidden bg-white shadow sm:rounded-lg p-2 mt-2">

              {/* 🔍 Search Row */}
              <div className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="w-full sm:w-auto flex-1 max-w-md">
                  <Input
                    placeholder="Search requests..."
                    value={searchInput}
                    onChange={handleSearch}
                    className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 w-full"
                  />
                </div>
              </div>

              {/* 📋 Table */}
              <div className="overflow-x-auto rounded-lg">
                <Table className="min-w-[900px] w-full">
                  <TableHeader>
                    <TableRow>
                      {columns.map((col, index) => (
                        <TableHead
                          key={index}
                          className="text-left font-semibold px-2 py-2 sm:px-4 md:px-6 text-xs sm:text-sm"
                          style={col.width ? { width: col.width } : {}}
                        >
                          {col.header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {requests.length > 0 ? (
                      requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="text-xs sm:text-sm">
                            {request.client?.client_name || 'N/A'}
                            {request.client?.client_code && (
                              <span className="text-gray-500 text-xs block">
                                ({request.client.client_code})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {request.project?.project_name || 'N/A'}
                            {request.project?.project_code && (
                              <span className="text-gray-500 text-xs block">
                                ({request.project.project_code})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm font-medium">
                            {request.subject}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="max-w-md truncate" title={request.message}>
                              {request.message}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {new Date(request.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="flex gap-2">
                              {has('clients.delete') && (
                                <button
                                  onClick={() => {
                                    setDeleteRequest(request);
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-2 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                              {!has('clients.delete') && (
                                <span className="text-xs text-gray-400">No actions available</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center py-4 text-gray-500">
                          No request updates found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* 🔸 Pagination */}
              {showPagination && (
                <div className="flex justify-end mt-4">
                  <div className="flex items-center space-x-2">
                    {/* Prev Button */}
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

