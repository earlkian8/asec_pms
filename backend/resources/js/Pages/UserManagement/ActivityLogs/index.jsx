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
} from "@/Components/ui/table";
import { Input } from "@/Components/ui/input";
import { Search, FileText, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { usePermission } from '@/utils/permissions';

export default function ActivityLogsIndex() {
  const { has } = usePermission();
  
  const breadcrumbs = [
    { title: "Home", href: route('dashboard') },
    { title: "User Management", href: route('user-management.activity-logs.index') },
    { title: "Activity Logs" },
  ];

  const columns = [
    { header: 'Module', width: '16%' },
    { header: 'Action', width: '16%' },
    { header: 'User', width: '20%' },
    { header: 'Description', width: '24%' },
    { header: 'IP Address', width: '8%' },
    { header: 'Date', width: '16%' },
  ];

  // Data from backend
  const pagination = usePage().props.logs;
  const logs = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const initialSearch = usePage().props.search || '';

  const [searchInput, setSearchInput] = useState(initialSearch);
  const debounceTimer = useRef(null);

  // Helper function to capitalize text properly
  const capitalizeText = (text) => {
    if (!text) return '';
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
        route('user-management.activity-logs.index'),
        { search: searchInput },
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  // Pagination
  const handlePageChange = ({ page }) => {
    router.get(
      route('user-management.activity-logs.index'),
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

  // Get unique modules and actions for stats
  const uniqueModules = new Set(logs.map(log => log.module));
  const uniqueActions = new Set(logs.map(log => log.action));
  const todayLogs = logs.filter(log => {
    const logDate = new Date(log.created_at);
    const today = new Date();
    return logDate.toDateString() === today.toDateString();
  });

  // Check if user has permission to view activity logs
  if (!has('activity-logs.view')) {
    return (
      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Activity Logs" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">You don't have permission to view activity logs.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
      <Head title="Activity Logs" />

      <div className="w-full sm:px-6 lg:px-8">
        <div className="overflow-hidden bg-white shadow-lg sm:rounded-lg p-6 mt-2 border border-gray-100">
          
          {/* Quick Stats */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Logs</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{logs.length}</p>
                  </div>
                  <div className="bg-blue-200 rounded-full p-3">
                    <FileText className="h-5 w-5 text-blue-700" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Today's Logs</p>
                    <p className="text-2xl font-bold text-green-900 mt-1">
                      {todayLogs.length}
                    </p>
                  </div>
                  <div className="bg-green-200 rounded-full p-3">
                    <Clock className="h-5 w-5 text-green-700" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Active Modules</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">
                      {uniqueModules.size}
                    </p>
                  </div>
                  <div className="bg-purple-200 rounded-full p-3">
                    <TrendingUp className="h-5 w-5 text-purple-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search logs by module, action, description, or IP address..."
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
                {logs.length > 0 ? (
                  logs.map((log, index) => (
                    <TableRow 
                      key={log.id}
                      className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <TableCell className="text-left px-4 py-4 text-sm font-semibold text-gray-900">
                        <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200">
                          {capitalizeText(log.module)}
                        </span>
                      </TableCell>
                      <TableCell className="text-left px-4 py-4 text-sm">
                        <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                          {capitalizeText(log.action)}
                        </span>
                      </TableCell>
                      <TableCell className="text-left px-4 py-4 text-sm font-medium text-gray-900">
                        {log.user?.name ? capitalizeText(log.user.name) : (
                          <span className="text-gray-500 italic">System</span>
                        )}
                      </TableCell>
                      <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                        {log.description}
                      </TableCell>
                      <TableCell className="text-left px-4 py-4 text-sm">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                          {log.ip_address || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                        {new Date(log.created_at).toLocaleString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
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
                        <p className="text-gray-500 font-medium text-base">No activity logs found</p>
                        <p className="text-gray-400 text-sm mt-1">Try adjusting your search</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {showPagination && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-gray-200 gap-4">
              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold text-gray-900">{logs.length}</span> of{' '}
                <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> logs
              </div>
              <div className="flex items-center space-x-2">
                <button
                  disabled={!prevLink?.url}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                    !prevLink?.url
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow'
                  }`}
                  onClick={() => handlePageClick(prevLink?.url)}
                >
                  Previous
                </button>

                {pageLinks.map((link, idx) => (
                  <button
                    key={idx}
                    disabled={!link?.url}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 min-w-[40px] ${
                      link?.active
                        ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white hover:from-zinc-800 hover:to-zinc-900 shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow'
                    } ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}
                    onClick={() => handlePageClick(link?.url)}
                  >
                    {link?.label || ''}
                  </button>
                ))}

                <button
                  disabled={!nextLink?.url}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                    !nextLink?.url
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400 shadow-sm hover:shadow'
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
  );
}
