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
import { Trash2, SquarePen, AlertCircle } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { toast } from 'sonner';
import { usePermission } from '@/utils/permissions';

import AddClient from './add';
import EditClient from './edit';
import DeleteClient from './delete';

export default function ClientsIndex() {
  const { has } = usePermission();
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "Client Management", href: route('client-management.index') },
    { title: "Clients" },
  ];

  const columns = [
    { header: 'Code', width: '10%' },
    { header: 'Name', width: '15%' },
    { header: 'Type', width: '10%' },
    { header: 'Contact Person', width: '15%' },
    { header: 'Email', width: '15%' },
    { header: 'Phone/Mobile', width: '10%' },
    { header: 'City / Province', width: '15%' },
    { header: 'Status', width: '10%' },
    { header: 'Actions', width: '10%' },
  ];

  const pagination = usePage().props.clients;
  const clients = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const initialSearch = usePage().props.search || '';

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteClient, setDeleteClient] = useState(null);
  const debounceTimer = useRef(null);

  // 🔍 Debounced Search
  const handleSearch = (e) => {
    setSearchInput(e.target.value);
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.get(
        route('client-management.index'),
        { search: searchInput },
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  // 📄 Pagination Logic
  const handlePageChange = ({ page }) => {
    router.get(
      route('client-management.index'),
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

  // ✅ Handle Status Toggle
  const handleStatusChange = (client, newStatus) => {
    router.put(route('client-management.update-status', client.id), {
      is_active: newStatus,
    }, {
      preserveScroll: true,
      onSuccess: () => toast.success('Client status updated successfully!'),
      onError: () => toast.error('Failed to update status.'),
    });
  };

  // Check if user has permission to view clients
  if (!has('clients.view')) {
    return (
      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Clients" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">You don't have permission to view clients.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <>
      {/* 🔹 Modals */}
      {showAddModal && <AddClient setShowAddModal={setShowAddModal} />}
      {showEditModal && <EditClient setShowEditModal={setShowEditModal} client={editClient} />}
      {showDeleteModal && <DeleteClient setShowDeleteModal={setShowDeleteModal} client={deleteClient} />}

      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Clients" />

        <div>
          <div className="w-full sm:px-6 lg:px-8">
            <div className="overflow-hidden bg-white shadow sm:rounded-lg p-2 mt-2">

              {/* 🔍 Search Row */}
              <div className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="w-full sm:w-auto flex-1 max-w-md">
                  <Input
                    placeholder="Search clients..."
                    value={searchInput}
                    onChange={handleSearch}
                    className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 w-full"
                  />
                </div>
                <div className="flex gap-2">
                  {has('clients.create') && (
                    <Button
                      onClick={() => setShowAddModal(true)}
                      className="bg-zinc-700 hover:bg-zinc-900 text-white"
                    >
                      Add Client
                    </Button>
                  )}
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
                    {clients.length > 0 ? (
                      clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell className="text-xs sm:text-sm capitalize">{client.client_code}</TableCell>
                          <TableCell className="text-xs sm:text-sm capitalize">{client.client_name}</TableCell>
                          <TableCell className="text-xs sm:text-sm capitalize">{client.client_type}</TableCell>
                          <TableCell className="text-xs sm:text-sm capitalize">{client.contact_person || '---'}</TableCell>
                          <TableCell className="text-xs sm:text-sm">{client.email || '---'}</TableCell>
                          <TableCell className="text-xs sm:text-sm capitalize">{client.phone_number || '---'}</TableCell>
                          <TableCell className="text-xs sm:text-sm capitalize">
                            {client.city || '---'} {client.province ? `/ ${client.province}` : ''}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="flex items-center gap-2">
                              {has('clients.update-status') ? (
                                <>
                                  <Switch
                                    checked={client.is_active}
                                    onCheckedChange={(checked) => handleStatusChange(client, checked)}
                                    className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                                  />
                                  <span
                                    className={`text-xs font-medium ${client.is_active ? 'text-green-600' : 'text-red-600'}`}
                                  >
                                    {client.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </>
                              ) : (
                                <span
                                  className={`text-xs font-medium px-2 py-1 rounded ${client.is_active ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                                >
                                  {client.is_active ? 'Active' : 'Inactive'}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="flex gap-2">
                              {has('clients.update') && (
                                <button
                                  onClick={() => {
                                    setEditClient(client);
                                    setShowEditModal(true);
                                  }}
                                  className="p-2 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                                  title="Edit"
                                >
                                  <SquarePen size={18} />
                                </button>
                              )}
                              {has('clients.delete') && (
                                <button
                                  onClick={() => {
                                    setDeleteClient(client);
                                    setShowDeleteModal(true);
                                  }}
                                  className="p-2 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                              {!has('clients.update') && !has('clients.delete') && (
                                <span className="text-xs text-gray-400">No actions available</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={columns.length} className="text-center py-4 text-gray-500">
                          No clients found
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
