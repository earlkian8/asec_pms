import { useState, useMemo } from 'react';
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
import { toast } from 'sonner';
import { Trash2, SquarePen, Package, ArrowDownToLine, ArrowUpFromLine, AlertCircle } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { usePermission } from '@/utils/permissions';
import AddInventoryItem from './add';
import EditInventoryItem from './edit';
import DeleteInventoryItem from './delete';
import StockIn from './stock-in';
import StockOut from './stock-out';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function InventoryManagement({ items, search: initialSearch, projects, transactions, transactionsSearch: initialTransactionsSearch, receivingReports, receivingReportsSearch: initialReceivingReportsSearch }) {
  const { has } = usePermission();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [stockInItem, setStockInItem] = useState(null);
  const [stockOutItem, setStockOutItem] = useState(null);
  const [search, setSearch] = useState(initialSearch || '');
  const [transactionsSearch, setTransactionsSearch] = useState(initialTransactionsSearch || '');
  const [receivingReportsSearch, setReceivingReportsSearch] = useState(initialReceivingReportsSearch || '');
  const [activeTab, setActiveTab] = useState('items');
  const [currentPage, setCurrentPage] = useState(1);
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [receivingReportsPage, setReceivingReportsPage] = useState(1);
  const itemsPerPage = 15;
  const transactionsPerPage = 20;
  const receivingReportsPerPage = 20;

  const breadcrumbs = [
    { title: "Home", href: route("dashboard") },
    { title: "Inventory Management" },
  ];

  const inventoryItems = items?.data || [];
  const transactionList = transactions?.data || [];
  const receivingReportsList = receivingReports?.data || [];

  // Frontend filtering for items
  const filteredItems = useMemo(() => {
    if (!search) return inventoryItems;
    const query = search.toLowerCase();
    return inventoryItems.filter(item => {
      const code = (item.item_code || '').toLowerCase();
      const name = (item.item_name || '').toLowerCase();
      const category = (item.category || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      return code.includes(query) || name.includes(query) || category.includes(query) || desc.includes(query);
    });
  }, [search, inventoryItems]);

  // Frontend filtering for transactions
  const filteredTransactions = useMemo(() => {
    if (!transactionsSearch) return transactionList;
    const query = transactionsSearch.toLowerCase();
    return transactionList.filter(trans => {
      const itemName = (trans.inventory_item?.item_name || '').toLowerCase();
      const itemCode = (trans.inventory_item?.item_code || '').toLowerCase();
      const notes = (trans.notes || '').toLowerCase();
      return itemName.includes(query) || itemCode.includes(query) || notes.includes(query);
    });
  }, [transactionsSearch, transactionList]);

  // Frontend filtering for receiving reports
  const filteredReceivingReports = useMemo(() => {
    if (!receivingReportsSearch) return receivingReportsList;
    const query = receivingReportsSearch.toLowerCase();
    return receivingReportsList.filter(report => {
      const itemName = (report.material_allocation?.inventory_item?.item_name || '').toLowerCase();
      const itemCode = (report.material_allocation?.inventory_item?.item_code || '').toLowerCase();
      const projectName = (report.material_allocation?.project?.project_name || '').toLowerCase();
      const projectCode = (report.material_allocation?.project?.project_code || '').toLowerCase();
      const notes = (report.notes || '').toLowerCase();
      return itemName.includes(query) || itemCode.includes(query) || projectName.includes(query) || projectCode.includes(query) || notes.includes(query);
    });
  }, [receivingReportsSearch, receivingReportsList]);

  // Pagination calculations for items
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIdx, endIdx);

  // Pagination calculations for transactions
  const totalTransactionsPages = Math.ceil(filteredTransactions.length / transactionsPerPage);
  const transactionsStartIdx = (transactionsPage - 1) * transactionsPerPage;
  const transactionsEndIdx = transactionsStartIdx + transactionsPerPage;
  const paginatedTransactions = filteredTransactions.slice(transactionsStartIdx, transactionsEndIdx);

  // Pagination calculations for receiving reports
  const totalReceivingReportsPages = Math.ceil(filteredReceivingReports.length / receivingReportsPerPage);
  const receivingReportsStartIdx = (receivingReportsPage - 1) * receivingReportsPerPage;
  const receivingReportsEndIdx = receivingReportsStartIdx + receivingReportsPerPage;
  const paginatedReceivingReports = filteredReceivingReports.slice(receivingReportsStartIdx, receivingReportsEndIdx);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
    router.get(route('inventory-management.index'), 
      { search: e.target.value },
      { preserveState: true, replace: true }
    );
  };

  const handleTransactionsSearch = (e) => {
    setTransactionsSearch(e.target.value);
    setTransactionsPage(1);
    router.get(route('inventory-management.index'), 
      { transactions_search: e.target.value },
      { preserveState: true, replace: true }
    );
  };

  const handleReceivingReportsSearch = (e) => {
    setReceivingReportsSearch(e.target.value);
    setReceivingReportsPage(1);
    router.get(route('inventory-management.index'), 
      { receiving_reports_search: e.target.value },
      { preserveState: true, replace: true }
    );
  };

  const goToPage = (page) => {
    const pageNum = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNum);
  };

  const goToTransactionsPage = (page) => {
    const pageNum = Math.max(1, Math.min(page, totalTransactionsPages));
    setTransactionsPage(pageNum);
  };

  const goToReceivingReportsPage = (page) => {
    const pageNum = Math.max(1, Math.min(page, totalReceivingReportsPages));
    setReceivingReportsPage(pageNum);
  };

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '---';
    return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-PH') : '---';

  const formatStockOutType = (type) => {
    const types = {
      'project_use': 'Project Use',
      'damage': 'Damage',
      'other': 'Other'
    };
    return types[type] || type;
  };

  // Handle Status Toggle
  const handleStatusChange = (item, newStatus) => {
    router.put(route('inventory-management.update-status', item.id), {
      is_active: newStatus,
    }, {
      preserveScroll: true,
      onSuccess: () => toast.success('Item status updated successfully!'),
      onError: () => toast.error('Failed to update status.'),
    });
  };

  const tabs = [
    { key: 'items', label: 'Items' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'receiving-reports', label: 'Receiving Reports' },
  ];

  const currentTab = tabs.find(t => t.key === activeTab);

  // Check if user has permission to view inventory
  if (!has('inventory.view')) {
    return (
      <AuthenticatedLayout breadcrumbs={breadcrumbs}>
        <Head title="Inventory Management" />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">You don't have permission to view inventory.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
      <Head title="Inventory Management" />
      
      <div className="w-full sm:px-6 lg:px-8">
        <div className="overflow-hidden bg-white shadow sm:rounded-lg p-4 mt-2">
          {/* TAB HEADERS */}
          <div className="border-b border-gray-200 mb-4 overflow-x-auto no-scrollbar">
            <div className="flex gap-4 w-max">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition
                    ${activeTab === tab.key
                      ? "border-zinc-700 text-zinc-700 font-semibold"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* TAB CONTENT */}
          <div className="mt-4">
            {activeTab === 'items' ? (
              <>
                {/* Search + Add */}
                <div className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <Input
                    placeholder="Search items by code, name, category..."
                    value={search}
                    onChange={handleSearch}
                    className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 w-full sm:max-w-md"
                  />
                  {has('inventory.create') && (
                    <Button
                      className="bg-zinc-700 hover:bg-zinc-900 text-white"
                      onClick={() => setShowAddModal(true)}
                    >
                      <Package size={16} className="mr-2" />
                      + Add Item
                    </Button>
                  )}
                </div>

                {/* Inventory Items Table */}
                <div className="overflow-x-auto rounded-lg">
                  <Table className="min-w-[1000px] w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Code</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead>Min Stock Level</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedItems.length > 0 ? (
                        paginatedItems.map(item => (
                          <TableRow 
                            key={item.id} 
                            className={`hover:bg-gray-50 transition ${
                              item.is_low_stock ? 'bg-red-50' : ''
                            }`}
                          >
                            <TableCell className="font-medium">{item.item_code}</TableCell>
                            <TableCell>{item.item_name}</TableCell>
                            <TableCell>{item.category || '---'}</TableCell>
                            <TableCell>{item.unit_of_measure}</TableCell>
                            <TableCell>
                              <span className={`font-medium ${
                                item.is_low_stock ? 'text-red-600' : ''
                              }`}>
                                {formatNumber(item.current_stock)} {item.unit_of_measure}
                              </span>
                            </TableCell>
                            <TableCell>{item.min_stock_level ? formatNumber(item.min_stock_level) : '---'}</TableCell>
                            <TableCell>
                              {item.unit_price ? `₱${formatNumber(item.unit_price)}` : '---'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {has('inventory.update') ? (
                                  <>
                                    <Switch
                                      checked={item.is_active}
                                      onCheckedChange={(checked) => handleStatusChange(item, checked)}
                                      className="data-[state=checked]:bg-green-600 data-[state=unchecked]:bg-red-600"
                                    />
                                    <span
                                      className={`text-xs font-medium ${item.is_active ? 'text-green-600' : 'text-red-600'}`}
                                    >
                                      {item.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </>
                                ) : (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    item.is_active 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {item.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                {has('inventory.stock-in') && (
                                  <button
                                    onClick={() => { setStockInItem(item); setShowStockInModal(true); }}
                                    className="p-2 rounded hover:bg-green-100 text-green-600 hover:text-green-700 transition"
                                    title="Stock In"
                                  >
                                    <ArrowDownToLine size={18} />
                                  </button>
                                )}
                                {has('inventory.stock-out') && (
                                  <button
                                    onClick={() => {
                                      if (item.current_stock <= 0) {
                                        toast.error(`Cannot pull out stock. Item "${item.item_name}" has no available stock.`);
                                        return;
                                      }
                                      setStockOutItem(item);
                                      setShowStockOutModal(true);
                                    }}
                                    className="p-2 rounded hover:bg-orange-100 text-orange-600 hover:text-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={item.current_stock <= 0 ? "No stock available" : "Stock Out"}
                                    disabled={item.current_stock <= 0}
                                  >
                                    <ArrowUpFromLine size={18} />
                                  </button>
                                )}
                                {has('inventory.update') && (
                                  <button
                                    onClick={() => { setEditItem(item); setShowEditModal(true); }}
                                    className="p-2 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 transition"
                                    title="Edit"
                                  >
                                    <SquarePen size={18} />
                                  </button>
                                )}
                                {has('inventory.delete') && (
                                  <button
                                    onClick={() => { setDeleteItem(item); setShowDeleteModal(true); }}
                                    className="p-2 rounded hover:bg-red-100 text-red-600 hover:text-red-700 transition"
                                    title="Delete"
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                                {!has('inventory.stock-in') && !has('inventory.stock-out') && !has('inventory.update') && !has('inventory.delete') && (
                                  <span className="text-xs text-gray-400">No actions available</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-4 text-gray-500">
                            No inventory items found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination Controls */}
                {filteredItems.length > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Showing {startIdx + 1} to {Math.min(endIdx, filteredItems.length)} of {filteredItems.length} items
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
              </>
            ) : activeTab === 'transactions' ? (
              <>
                {/* Transactions Tab */}
                <div className="py-2 mb-4">
                  <Input
                    placeholder="Search transactions by item name, code, or notes..."
                    value={transactionsSearch}
                    onChange={handleTransactionsSearch}
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

                {/* Transactions Pagination */}
                {filteredTransactions.length > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Showing {transactionsStartIdx + 1} to {Math.min(transactionsEndIdx, filteredTransactions.length)} of {filteredTransactions.length} transactions
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => goToTransactionsPage(transactionsPage - 1)}
                        disabled={transactionsPage === 1}
                        className="px-3 py-1 h-auto"
                      >
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalTransactionsPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => goToTransactionsPage(page)}
                            className={`px-3 py-1 rounded text-sm font-medium transition ${
                              transactionsPage === page
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
                        onClick={() => goToTransactionsPage(transactionsPage + 1)}
                        disabled={transactionsPage === totalTransactionsPages}
                        className="px-3 py-1 h-auto"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Receiving Reports Tab */}
                <div className="py-2 mb-4">
                  <Input
                    placeholder="Search receiving reports by item name, code, project, or notes..."
                    value={receivingReportsSearch}
                    onChange={handleReceivingReportsSearch}
                    className="focus:border-gray-800 focus:ring-2 focus:ring-gray-800 w-full sm:max-w-md"
                  />
                </div>

                {/* Receiving Reports Table */}
                <div className="overflow-x-auto rounded-lg">
                  <Table className="min-w-[1200px] w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Received By</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedReceivingReports.length > 0 ? (
                        paginatedReceivingReports.map(report => {
                          // Handle both snake_case (Inertia default) and camelCase
                          const allocation = report.material_allocation || report.materialAllocation || {};
                          const item = allocation?.inventory_item || allocation?.inventoryItem || {};
                          const project = allocation?.project || {};
                          const receivedBy = report.received_by || report.receivedBy || {};
                          
                          return (
                            <TableRow key={report.id} className="hover:bg-gray-50 transition">
                              <TableCell>{formatDate(report.received_at)}</TableCell>
                              <TableCell>
                                {item && (item.item_name || item.item_code) ? (
                                  <div>
                                    <div className="font-medium">{item.item_name || '---'}</div>
                                    <div className="text-xs text-gray-500">{item.item_code || ''}</div>
                                  </div>
                                ) : (
                                  '---'
                                )}
                              </TableCell>
                              <TableCell>
                                {project && project.project_code ? (
                                  <div>
                                    <div className="font-medium">{project.project_code}</div>
                                    <div className="text-xs text-gray-500">{project.project_name || ''}</div>
                                  </div>
                                ) : (
                                  '---'
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatNumber(report.quantity_received)} {item.unit_of_measure || 'units'}
                              </TableCell>
                              <TableCell>
                                {report.condition ? (
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    report.condition.toLowerCase() === 'good' 
                                      ? 'bg-green-100 text-green-800'
                                      : report.condition.toLowerCase() === 'damaged'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-green-100 text-gray-800'
                                  }`}>
                                    {report.condition}
                                  </span>
                                ) : (
                                  '---'
                                )}
                              </TableCell>
                              <TableCell>
                                {receivedBy.name ? (
                                  <div>
                                    <div className="font-medium">{receivedBy.name}</div>
                                    {receivedBy.roles && receivedBy.roles.length > 0 && (
                                      <div className="text-xs text-gray-500">
                                        {receivedBy.roles.map(role => role.name).join(', ')}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  '---'
                                )}
                              </TableCell>
                              <TableCell className="max-w-xs truncate">{report.notes || '---'}</TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                            No receiving reports found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Receiving Reports Pagination */}
                {filteredReceivingReports.length > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-600">
                      Showing {receivingReportsStartIdx + 1} to {Math.min(receivingReportsEndIdx, filteredReceivingReports.length)} of {filteredReceivingReports.length} receiving reports
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => goToReceivingReportsPage(receivingReportsPage - 1)}
                        disabled={receivingReportsPage === 1}
                        className="px-3 py-1 h-auto"
                      >
                        Previous
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalReceivingReportsPages }, (_, i) => i + 1).map(page => (
                          <button
                            key={page}
                            onClick={() => goToReceivingReportsPage(page)}
                            className={`px-3 py-1 rounded text-sm font-medium transition ${
                              receivingReportsPage === page
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
                        onClick={() => goToReceivingReportsPage(receivingReportsPage + 1)}
                        disabled={receivingReportsPage === totalReceivingReportsPages}
                        className="px-3 py-1 h-auto"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modals */}
          {showAddModal && (
            <AddInventoryItem
              setShowAddModal={setShowAddModal}
            />
          )}

          {showEditModal && editItem && (
            <EditInventoryItem
              setShowEditModal={setShowEditModal}
              item={editItem}
            />
          )}

          {showDeleteModal && deleteItem && (
            <DeleteInventoryItem
              setShowDeleteModal={setShowDeleteModal}
              item={deleteItem}
            />
          )}

          {showStockInModal && stockInItem && (
            <StockIn
              setShowStockInModal={setShowStockInModal}
              item={stockInItem}
            />
          )}

          {showStockOutModal && stockOutItem && (
            <StockOut
              setShowStockOutModal={setShowStockOutModal}
              item={stockOutItem}
              projects={projects || []}
            />
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
