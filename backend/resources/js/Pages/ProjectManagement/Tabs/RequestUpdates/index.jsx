import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/Components/ui/table";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Trash2, Search, MessageSquare, Calendar, AlertCircle, User } from 'lucide-react';
import { usePermission } from '@/utils/permissions';
import { toast } from 'sonner';
import DeleteRequest from './delete';

export default function RequestUpdatesTab({ project, requestUpdatesData }) {
  const { has } = usePermission();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRequest, setDeleteRequest] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const debounceTimer = useRef(null);

  const requests = requestUpdatesData || [];

  // Filter requests based on search
  const filteredRequests = requests.filter(request => {
    if (!searchInput) return true;
    const searchLower = searchInput.toLowerCase();
    return (
      request.subject?.toLowerCase().includes(searchLower) ||
      request.message?.toLowerCase().includes(searchLower) ||
      request.client?.client_name?.toLowerCase().includes(searchLower) ||
      request.client?.client_code?.toLowerCase().includes(searchLower)
    );
  });

  // Handle search input
  const handleSearch = (e) => {
    setSearchInput(e.target.value);
  };

  // Helper function to capitalize text properly
  const capitalizeText = (text) => {
    if (!text) return '';
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const columns = [
    { header: 'Client', width: '20%' },
    { header: 'Subject', width: '25%' },
    { header: 'Message', width: '35%' },
    { header: 'Date', width: '15%' },
    { header: 'Actions', width: '5%' },
  ];

  // Check if user has permission to view projects
  if (!has('projects.view')) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">You don't have permission to view request updates.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteRequest 
          setShowDeleteModal={setShowDeleteModal} 
          request={deleteRequest}
          project={project}
        />
      )}

      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Requests</p>
                <p className="text-2xl font-bold text-blue-900 mt-1">{requests.length}</p>
              </div>
              <div className="bg-blue-200 rounded-full p-3">
                <MessageSquare className="h-5 w-5 text-blue-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-700 uppercase tracking-wide">This Week</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {requests.filter(r => {
                    const requestDate = new Date(r.created_at);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return requestDate >= weekAgo;
                  }).length}
                </p>
              </div>
              <div className="bg-green-200 rounded-full p-3">
                <Calendar className="h-5 w-5 text-green-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">This Month</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {requests.filter(r => {
                    const requestDate = new Date(r.created_at);
                    const monthAgo = new Date();
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    return requestDate >= monthAgo;
                  }).length}
                </p>
              </div>
              <div className="bg-purple-200 rounded-full p-3">
                <Calendar className="h-5 w-5 text-purple-700" />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search requests by subject, message, or client..."
              value={searchInput}
              onChange={handleSearch}
              className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-full h-11 border-gray-300 rounded-lg"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
          <Table className="min-w-[1000px] w-full">
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                {columns.map((col, i) => (
                  <TableHead
                    key={i}
                    className="text-left font-bold px-4 py-4 text-xs sm:text-sm text-gray-700 uppercase tracking-wider"
                    style={col.width ? { width: col.width } : {}}
                  >
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.length > 0 ? (
                filteredRequests.map((request, index) => (
                  <TableRow 
                    key={request.id}
                    className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                      {request.client ? (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <span className="font-medium">{capitalizeText(request.client.client_name)}</span>
                            {request.client.client_code && (
                              <span className="text-gray-500 text-xs block font-mono">
                                {request.client.client_code}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">N/A</span>
                      )}
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-400" />
                        {capitalizeText(request.subject)}
                      </div>
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                      <div className="max-w-md truncate" title={request.message}>
                        {request.message}
                      </div>
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        {new Date(request.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-left px-4 py-4 text-sm">
                      <div className="flex gap-1.5">
                        {has('projects.delete') && (
                          <button
                            onClick={() => {
                              setDeleteRequest(request);
                              setShowDeleteModal(true);
                            }}
                            className="p-2 rounded-lg hover:bg-red-100 text-red-600 hover:text-red-700 transition-all duration-200 hover:scale-110 border border-red-200 hover:border-red-300"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {!has('projects.delete') && (
                          <span className="text-xs text-gray-400">No actions</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center">
                      <div className="bg-gray-100 rounded-full p-4 mb-3">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-gray-500 font-medium text-base">No request updates found</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {searchInput ? 'Try adjusting your search' : 'No requests have been made for this project yet'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}

