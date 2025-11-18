import { useState, useMemo, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
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
import { toast } from 'sonner';
import { Trash2, SquarePen, DollarSign, CreditCard, AlertCircle } from 'lucide-react';
import { usePermission } from '@/utils/permissions';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddBilling from './add';
import EditBilling from './edit';
import DeleteBilling from './delete';
import AddPayment from './add-payment';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function BillingManagement({ billings, search: initialSearch, projects, status: initialStatus, project_id: initialProjectId, billing_type: initialBillingType }) {
  const { has } = usePermission();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editBilling, setEditBilling] = useState(null);
  const [deleteBilling, setDeleteBilling] = useState(null);
  const [paymentBilling, setPaymentBilling] = useState(null);
  const [search, setSearch] = useState(initialSearch || '');
  const [statusFilter, setStatusFilter] = useState(initialStatus || '');
  const [projectFilter, setProjectFilter] = useState(initialProjectId || '');
  const [billingTypeFilter, setBillingTypeFilter] = useState(initialBillingType || '');
  const debounceTimer = useRef(null);

  const breadcrumbs = [
    { title: "Home", href: route("dashboard") },
    { title: "Billing Management" },
  ];

  const billingList = billings?.data || [];

  // Handle search with debounce
  const handleSearch = (e) => {
    setSearch(e.target.value);
  };

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      router.get(route('billing-management.index'), 
        { 
          search: search,
          status: statusFilter || undefined,
          project_id: projectFilter || undefined,
          billing_type: billingTypeFilter || undefined,
        },
        { preserveState: true, replace: true }
      );
    }, 300);
  }, [search, statusFilter, projectFilter, billingTypeFilter]);

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0.00';
    return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH') : '---';

  const getStatusBadge = (status) => {
    const badges = {
      'unpaid': 'bg-red-100 text-red-800',
      'partial': 'bg-yellow-100 text-yellow-800',
      'paid': 'bg-green-100 text-green-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'unpaid': 'Unpaid',
      'partial': 'Partial',
      'paid': 'Paid',
    };
    return labels[status] || status;
  };

  const getProgressBarColor = (percentage, status) => {
    if (status === 'paid') return 'bg-green-500';
    if (status === 'partial') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Check if user has permission to view billing
  if (!has('billing.view')) {
    return (
      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Billing Management" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">You don't have permission to view billing.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
      <Head title="Billing Management" />
      
      <div className="w-full sm:px-6 lg:px-8">
        <div className="overflow-hidden bg-white shadow sm:rounded-lg p-4 mt-2">
          {/* Header with Search and Filters */}
          <div className="py-2 mb-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Input
                placeholder="Search by billing code or project name..."
                value={search}
                onChange={handleSearch}
                className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 w-full sm:max-w-md"
              />
              {has('billing.create') && (
                <Button
                  className="bg-zinc-700 hover:bg-zinc-900 text-white"
                  onClick={() => setShowAddModal(true)}
                >
                  <DollarSign size={16} className="mr-2" />
                  + Add Billing
                </Button>
              )}
            </div>

            {/* Filters */}
            {/* <div className="flex flex-wrap gap-3">
              <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>

              <Select value={projectFilter || "all"} onValueChange={(value) => setProjectFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map(project => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.project_code} - {project.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={billingTypeFilter || "all"} onValueChange={(value) => setBillingTypeFilter(value === "all" ? "" : value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="fixed_price">Fixed Price</SelectItem>
                  <SelectItem value="milestone">Milestone</SelectItem>
                </SelectContent>
              </Select>
            </div> */}
          </div>

          {/* Billings Table */}
          <div className="overflow-x-auto rounded-lg">
            <Table className="min-w-[1400px] w-full">
              <TableHeader>
                <TableRow>
                  <TableHead>Billing Code</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Billing Type</TableHead>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Billing Amount</TableHead>
                  <TableHead>Billing Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Progress</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {billingList.length > 0 ? (
                  billingList.map(billing => {
                    const totalPaid = parseFloat(billing.total_paid || 0);
                    const billingAmount = parseFloat(billing.billing_amount || 0);
                    const remaining = billingAmount - totalPaid;
                    const percentage = billingAmount > 0 ? (totalPaid / billingAmount) * 100 : 0;
                    
                    return (
                      <TableRow 
                        key={billing.id} 
                        className="hover:bg-gray-50 transition"
                      >
                        <TableCell className="font-medium">{billing.billing_code}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{billing.project?.project_code}</div>
                            <div className="text-xs text-gray-500">{billing.project?.project_name}</div>
                            {billing.project?.client && (
                              <div className="text-xs text-gray-400">{billing.project.client.client_name}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                            {billing.billing_type === 'fixed_price' ? 'Fixed Price' : 'Milestone'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {billing.milestone ? (
                            <span className="text-sm">{billing.milestone.name}</span>
                          ) : (
                            <span className="text-gray-400">---</span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          ₱{formatNumber(billingAmount)}
                        </TableCell>
                        <TableCell>{formatDate(billing.billing_date)}</TableCell>
                        <TableCell>{formatDate(billing.due_date)}</TableCell>
                        <TableCell className="font-medium text-green-600">
                          ₱{formatNumber(totalPaid)}
                        </TableCell>
                        <TableCell className={`font-medium ${remaining > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₱{formatNumber(remaining)}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(billing.status)}`}>
                            {getStatusLabel(billing.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`h-2.5 rounded-full transition-all ${getProgressBarColor(percentage, billing.status)}`}
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {percentage.toFixed(1)}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {billing.status !== 'paid' && has('billing.add-payment') && (
                              <button
                                onClick={() => { setPaymentBilling(billing); setShowPaymentModal(true); }}
                                className="p-2 rounded hover:bg-green-100 text-green-600 hover:text-green-700 transition"
                                title="Add Payment"
                              >
                                <CreditCard size={18} />
                              </button>
                            )}
                            {billing.status !== 'paid' && has('billing.update') && (
                              <button
                                onClick={() => { setEditBilling(billing); setShowEditModal(true); }}
                                className="p-2 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                                title="Edit"
                              >
                                <SquarePen size={18} />
                              </button>
                            )}
                            {billing.payments_count === 0 && has('billing.delete') && (
                              <button
                                onClick={() => { setDeleteBilling(billing); setShowDeleteModal(true); }}
                                className="p-2 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            )}
                            {(!has('billing.add-payment') && !has('billing.update') && !has('billing.delete')) && (
                              <span className="text-xs text-gray-400">No actions available</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-4 text-gray-500">
                      No billings found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {billings?.links && billings.links.length > 3 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                Showing {billings.from || 0} to {billings.to || 0} of {billings.total || 0} billings
              </div>
              <div className="flex gap-2">
                {billings.links.map((link, index) => (
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

          {/* Modals */}
          {showAddModal && (
            <AddBilling
              setShowAddModal={setShowAddModal}
              projects={projects || []}
            />
          )}

          {showEditModal && editBilling && (
            <EditBilling
              setShowEditModal={setShowEditModal}
              billing={editBilling}
            />
          )}

          {showDeleteModal && deleteBilling && (
            <DeleteBilling
              setShowDeleteModal={setShowDeleteModal}
              billing={deleteBilling}
            />
          )}

          {showPaymentModal && paymentBilling && (
            <AddPayment
              setShowPaymentModal={setShowPaymentModal}
              billing={paymentBilling}
            />
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

