import { useState, useMemo } from 'react';
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
import { toast } from 'sonner';
import { ArrowLeft, Package } from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

export default function Transactions({ transactions: transactionsData, search: initialSearch }) {
  const [search, setSearch] = useState(initialSearch || '');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const breadcrumbs = [
    { title: "Home", href: route("dashboard") },
    { title: "Inventory Management", href: route("inventory-management.index") },
    { title: "Transactions" },
  ];

  const transactions = transactionsData?.data || [];
  const paginationLinks = transactionsData?.links || [];

  // Frontend filtering
  const filteredTransactions = useMemo(() => {
    if (!search) return transactions;
    const query = search.toLowerCase();
    return transactions.filter(trans => {
      const itemName = (trans.inventory_item?.item_name || '').toLowerCase();
      const itemCode = (trans.inventory_item?.item_code || '').toLowerCase();
      const notes = (trans.notes || '').toLowerCase();
      return itemName.includes(query) || itemCode.includes(query) || notes.includes(query);
    });
  }, [search, transactions]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(startIdx, endIdx);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
    router.get(route('inventory-management.transactions'), 
      { search: e.target.value },
      { preserveState: true, replace: true }
    );
  };

  const goToPage = (page) => {
    const pageNum = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNum);
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH') : '---';
  const formatNumber = (num) => {
    if (num === null || num === undefined) return '---';
    return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatStockOutType = (type) => {
    const types = {
      'project_use': 'Project Use',
      'damage': 'Damage',
      'other': 'Other'
    };
    return types[type] || type;
  };

  return (
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
      <Head title="Inventory Transactions" />
      
      <div className="w-full sm:px-6 lg:px-8">
        <div className="overflow-hidden bg-white shadow sm:rounded-lg p-4 mt-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Link href={route('inventory-management.index')}>
                <Button variant="outline" size="sm">
                  <ArrowLeft size={16} className="mr-2" />
                  Back to Inventory
                </Button>
              </Link>
              <h1 className="text-2xl font-semibold text-gray-900">Inventory Transactions</h1>
            </div>
          </div>

          {/* Search */}
          <div className="py-2 mb-4">
            <Input
              placeholder="Search transactions by item name, code, or notes..."
              value={search}
              onChange={handleSearch}
              className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 w-full sm:max-w-md"
            />
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto rounded-lg">
            <Table className="min-w-[1200px] w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Stock Out Type</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Unit Price</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Created By</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map(trans => (
                    <TableRow key={trans.id} className="hover:bg-gray-50 transition">
                      <TableCell>{formatDate(trans.transaction_date)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{trans.inventory_item?.item_name || '---'}</div>
                          <div className="text-xs text-gray-500">{trans.inventory_item?.item_code || ''}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          trans.transaction_type === 'stock_in'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {trans.transaction_type === 'stock_in' ? 'Stock In' : 'Stock Out'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {trans.stock_out_type ? (
                          <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
                            {formatStockOutType(trans.stock_out_type)}
                          </span>
                        ) : (
                          '---'
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatNumber(trans.quantity)} {trans.inventory_item?.unit_of_measure || ''}
                      </TableCell>
                      <TableCell>
                        {trans.unit_price ? `₱${formatNumber(trans.unit_price)}` : '---'}
                      </TableCell>
                      <TableCell>
                        {trans.project ? (
                          <div>
                            <div className="font-medium">{trans.project.project_code}</div>
                            <div className="text-xs text-gray-500">{trans.project.project_name}</div>
                          </div>
                        ) : (
                          '---'
                        )}
                      </TableCell>
                      <TableCell>{trans.created_by?.name || '---'}</TableCell>
                      <TableCell className="max-w-xs truncate">{trans.notes || '---'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-4 text-gray-500">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          {filteredTransactions.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {startIdx + 1} to {Math.min(endIdx, filteredTransactions.length)} of {filteredTransactions.length} transactions
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 h-auto"
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => goToPage(page)}
                      className={`px-3 py-1 rounded text-sm font-medium transition ${
                        currentPage === page
                          ? 'bg-zinc-700 text-white'
                          : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 h-auto"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

