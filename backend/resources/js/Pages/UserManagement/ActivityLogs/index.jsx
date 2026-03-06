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
    { header: 'Date', width: '14%' },
    { header: 'Module', width: '13%' },
    { header: 'Action', width: '13%' },
    { header: 'User', width: '16%' },
    { header: 'Description', width: '32%' },
    { header: 'IP Address', width: '12%' },
  ];

  const pageProps = usePage().props;
  const pagination = pageProps.logs;
  const logs = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const initialSearch = pageProps.search || '';
  // Server-provided stats — accurate across all records
  const stats = pageProps.stats || { total_logs: 0, today_logs: 0, active_modules: 0 };

  const [searchInput, setSearchInput] = useState(initialSearch);
  const debounceTimer = useRef(null);

  const capitalizeText = (text) => {
    if (!text) return '';
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleSearch = (e) => setSearchInput(e.target.value);

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
  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  const handlePageClick = (url) => {
    if (!url) return;
    try {
      const page = new URL(url, window.location.origin).searchParams.get('page');
      handlePageChange({ page });
    } catch (e) {
      console.error("Failed to parse pagination URL:", e);
    }
  };

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

      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-lg rounded-lg p-4 sm:p-6 mt-2 border border-gray-100">

          {/* Quick Stats — server-driven totals */}
          <div className="mb-6 pb-6 border-b border-gray-200">
            <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Total Logs</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-900 mt-1">{stats.total_logs}</p>
                  </div>
                  <div className="bg-blue-200 rounded-full p-2 sm:p-3">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-700" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 sm:p-4 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Today's Logs</p>
                    <p className="text-xl sm:text-2xl font-bold text-green-900 mt-1">{stats.today_logs}</p>
                  </div>
                  <div className="bg-green-200 rounded-full p-2 sm:p-3">
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-green-700" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 sm:p-4 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Active Modules</p>
                    <p className="text-xl sm:text-2xl font-bold text-purple-900 mt-1">{stats.active_modules}</p>
                  </div>
                  <div className="bg-purple-200 rounded-full p-2 sm:p-3">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full mb-6">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search logs by module, action, user, description, or IP address..."
                value={searchInput}
                onChange={handleSearch}
                className="pl-10 h-11 w-full border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
          </div>

          {/* Table — horizontally scrollable on mobile */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <Table className="min-w-[900px] w-full">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  {columns.map((col, i) => (
                    <TableHead
                      key={i}
                      className="text-left font-bold px-3 sm:px-4 py-3 text-xs text-gray-700 uppercase tracking-wider"
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
                      <TableCell className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </TableCell>
                      <TableCell className="px-3 sm:px-4 py-3 text-sm">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 whitespace-nowrap">
                          {capitalizeText(log.module)}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 sm:px-4 py-3 text-sm">
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 whitespace-nowrap">
                          {capitalizeText(log.action)}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900">
                        {log.user?.name ? capitalizeText(log.user.name) : (
                          <span className="text-gray-400 italic text-xs">System</span>
                        )}
                      </TableCell>
                      <TableCell className="px-3 sm:px-4 py-3 text-sm text-gray-700">
                        {log.description
                          ? log.description.split(/('.*?'|".*?"|\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b)/).map((part, i) =>
                              /^['"].*['"]$/.test(part) || /\S+@\S+\.\S+/.test(part)
                                ? <strong key={i} className="text-gray-900 font-semibold">{part}</strong>
                                : part
                            )
                          : <span className="text-gray-400 italic">No description</span>
                        }
                      </TableCell>
                      <TableCell className="px-3 sm:px-4 py-3 text-sm">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200 whitespace-nowrap">
                          {log.ip_address || 'N/A'}
                        </span>
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
                        <p className="text-gray-500 font-medium">No activity logs found</p>
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
            <div className="flex flex-col sm:flex-row items-center justify-between mt-6 pt-6 border-t border-gray-200 gap-3">
              <p className="text-sm text-gray-600 order-2 sm:order-1">
                Showing <span className="font-semibold text-gray-900">{pagination?.from || 0}</span> to{' '}
                <span className="font-semibold text-gray-900">{pagination?.to || 0}</span> of{' '}
                <span className="font-semibold text-gray-900">{pagination?.total || 0}</span> logs
              </p>
              <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
                <button
                  disabled={!prevLink?.url}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                    !prevLink?.url
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
                  }`}
                  onClick={() => handlePageClick(prevLink?.url)}
                >
                  Previous
                </button>
                {pageLinks.map((link, idx) => (
                  <button
                    key={idx}
                    disabled={!link?.url}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all min-w-[36px] ${
                      link?.active
                        ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
                    } ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}
                    onClick={() => handlePageClick(link?.url)}
                  >
                    {link?.label || ''}
                  </button>
                ))}
                <button
                  disabled={!nextLink?.url}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                    !nextLink?.url
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'
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