import { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CreditCard, FileText } from 'lucide-react';

export default function Transactions({ transactions: transactionsData, search: initialSearch, projects: initialProjects, project_id: initialProjectId, payment_method: initialPaymentMethod }) {
  const [search, setSearch] = useState(initialSearch || '');
  const [projectFilter, setProjectFilter] = useState(initialProjectId || '');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState(initialPaymentMethod || '');
  const debounceTimer = useRef(null);

  const transactions = transactionsData?.data || [];
  const projects = initialProjects || [];

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0.00';
    return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
      'cash': 'bg-green-100 text-green-800',
      'check': 'bg-blue-100 text-blue-800',
      'bank_transfer': 'bg-purple-100 text-purple-800',
      'credit_card': 'bg-orange-100 text-orange-800',
      'other': 'bg-gray-100 text-gray-800',
    };
    return badges[method] || 'bg-gray-100 text-gray-800';
  };

  // Handle search and filters with debounce
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      router.get(route('billing-management.index'), 
        { 
          tab: 'transactions',
          search: search || undefined,
          transaction_project_id: projectFilter || undefined,
          transaction_payment_method: paymentMethodFilter || undefined,
        },
        { preserveState: true, replace: true }
      );
    }, 300);
  }, [search, projectFilter, paymentMethodFilter]);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search by payment code, billing code, or reference number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 w-full sm:max-w-md"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={projectFilter || ""}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-gray-800"
          >
            <option value="">All Projects</option>
            {projects.map(project => (
              <option key={project.id} value={project.id.toString()}>
                {project.project_code} - {project.project_name}
              </option>
            ))}
          </select>

          <select
            value={paymentMethodFilter || ""}
            onChange={(e) => setPaymentMethodFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-gray-800"
          >
            <option value="">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="check">Check</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="credit_card">Credit Card</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto rounded-lg">
        <Table className="min-w-[1400px] w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Payment Code</TableHead>
              <TableHead>Payment Date</TableHead>
              <TableHead>Billing Code</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>Payment Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Reference Number</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map(transaction => (
                <TableRow 
                  key={transaction.id} 
                  className="hover:bg-gray-50 transition"
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-gray-400" />
                      {transaction.payment_code}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(transaction.payment_date)}</TableCell>
                  <TableCell>
                    {transaction.billing ? (
                      <span className="font-medium text-blue-600">{transaction.billing.billing_code}</span>
                    ) : (
                      <span className="text-gray-400 italic">Billing Deleted</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {transaction.billing?.project ? (
                      <div>
                        <div className="font-medium">{transaction.billing.project.project_code}</div>
                        <div className="text-xs text-gray-500">{transaction.billing.project.project_name}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">---</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-green-600">
                    ₱{formatNumber(transaction.payment_amount)}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPaymentMethodBadge(transaction.payment_method)}`}>
                      {getPaymentMethodLabel(transaction.payment_method)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {transaction.reference_number ? (
                      <span className="text-sm">{transaction.reference_number}</span>
                    ) : (
                      <span className="text-gray-400">---</span>
                    )}
                  </TableCell>
                  <TableCell>{transaction.created_by?.name || '---'}</TableCell>
                  <TableCell className="max-w-xs">
                    {transaction.notes ? (
                      <div className="flex items-center gap-1">
                        
                        <span className="text-sm truncate" title={transaction.notes}>
                          {transaction.notes}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">---</span>
                    )}
                  </TableCell>
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

      {/* Pagination */}
      {transactionsData?.links && transactionsData.links.length > 3 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-gray-600">
            Showing {transactionsData.from || 0} to {transactionsData.to || 0} of {transactionsData.total || 0} transactions
          </div>
          <div className="flex gap-2">
            {transactionsData.links.map((link, index) => (
              <Button
                key={index}
                variant={link.active ? "default" : "outline"}
                onClick={() => link.url && router.get(link.url)}
                disabled={!link.url}
                className="px-3 py-1 h-auto"
                dangerouslySetInnerHTML={{ __html: link.label }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

