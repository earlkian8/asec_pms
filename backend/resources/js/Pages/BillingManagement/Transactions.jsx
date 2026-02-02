import { useState, useEffect, useRef } from 'react';
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
import { CreditCard, Search } from 'lucide-react';

export default function Transactions({ transactions: transactionsData, search: initialSearch }) {
  const [searchInput, setSearchInput] = useState(initialSearch || '');
  const debounceTimer = useRef(null);

  const transactions = transactionsData?.data || [];
  const paginationLinks = transactionsData?.links || [];

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0.00';
    return parseFloat(num).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH') : '---';

  const getPaymentMethodLabel = (method) => {
    const methods = {
      'cash': 'Cash',
      'check': 'Check',
      'bank_transfer': 'Bank Transfer',
      'credit_card': 'Credit Card',
      'other': 'Other'
    };
    return methods[method] || method;
  };

  const getPaymentMethodBadge = (method) => {
    const badges = {
      'cash': 'bg-green-100 text-green-800 border border-green-200',
      'check': 'bg-blue-100 text-blue-800 border border-blue-200',
      'bank_transfer': 'bg-purple-100 text-purple-800 border border-purple-200',
      'credit_card': 'bg-orange-100 text-orange-800 border border-orange-200',
      'other': 'bg-gray-100 text-gray-800 border border-gray-200',
    };
    return badges[method] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const getStatusBadge = (status) => {
    const badges = {
      'paid': 'bg-green-100 text-green-800 border border-green-200',
      'pending': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'failed': 'bg-red-100 text-red-800 border border-red-200',
      'cancelled': 'bg-gray-100 text-gray-800 border border-gray-200',
    };
    return badges[status?.toLowerCase()] || 'bg-gray-100 text-gray-800 border border-gray-200';
  };

  const getStatusLabel = (status) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  // Handle search with debounce
  const handleSearch = (e) => {
    setSearchInput(e.target.value);
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      router.get(route('billing-management.index'), 
        { 
          tab: 'transactions',
          search: searchInput || undefined,
        },
        { preserveState: true, preserveScroll: true, replace: true }
      );
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  // Pagination
  const handlePageChange = ({ page }) => {
    const params = {
      search: searchInput,
      page,
      tab: 'transactions',
    };
    
    router.get(
      route('billing-management.index'),
      params,
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

  const columns = [
    { header: 'Payment Code', width: '12%' },
    { header: 'Payment Date', width: '10%' },
    { header: 'Billing Code', width: '12%' },
    { header: 'Project', width: '15%' },
    { header: 'Payment Amount', width: '12%' },
    { header: 'Payment Method', width: '12%' },
    { header: 'Reference Number', width: '12%' },
    { header: 'Status', width: '10%' },
  ];

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by payment code, billing code, or reference number..."
            value={searchInput}
            onChange={handleSearch}
            className="pl-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-full h-11 border-gray-300 rounded-lg"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white relative z-0">
        <Table className="min-w-[1400px] w-full">
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
            {transactions.length > 0 ? (
              transactions.map((transaction, index) => (
                <TableRow 
                  key={transaction.id}
                  className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  <TableCell className="text-left px-4 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-gray-400" />
                      <span className="font-semibold text-gray-900 font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                        {transaction.payment_code}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                    {formatDate(transaction.payment_date)}
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm">
                    {transaction.billing ? (
                      <span className="font-medium text-blue-600 font-mono text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200">
                        {transaction.billing.billing_code}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Billing Deleted</span>
                    )}
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm">
                    {transaction.billing?.project ? (
                      <div>
                        <div className="font-medium text-gray-900">{transaction.billing.project.project_code}</div>
                        <div className="text-xs text-gray-500">{transaction.billing.project.project_name}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">---</span>
                    )}
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm font-bold text-green-600">
                    ₱{formatNumber(transaction.payment_amount)}
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getPaymentMethodBadge(transaction.payment_method)}`}>
                      {getPaymentMethodLabel(transaction.payment_method)}
                    </span>
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm text-gray-700">
                    {(transaction.reference_number || transaction.paymongo_payment_intent_id) ? (
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                        {transaction.reference_number || transaction.paymongo_payment_intent_id}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">---</span>
                    )}
                  </TableCell>
                  <TableCell className="text-left px-4 py-4 text-sm">
                    {transaction.payment_status ? (
                      <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${getStatusBadge(transaction.payment_status)}`}>
                        {getStatusLabel(transaction.payment_status)}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">---</span>
                    )}
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
                    <p className="text-gray-500 font-medium text-base">No transactions found</p>
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
            Showing <span className="font-semibold text-gray-900">{transactions.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{transactionsData?.total || 0}</span> transactions
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
  );
}
