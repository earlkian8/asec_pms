import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/Components/ui/table";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { ArchiveRestore, Search, ArrowLeft, ArrowUpDown, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { Label } from "@/Components/ui/label";
import { toast } from 'sonner';
import { usePermission } from '@/utils/permissions';

export default function ArchivedInventory() {
  const { has } = usePermission();
  const pageProps = usePage().props;

  const pagination      = pageProps.items;
  const items           = pagination?.data || [];
  const paginationLinks = pagination?.links || [];
  const initialSearch   = pageProps.search || '';

  const [searchInput,  setSearchInput]  = useState(initialSearch);
  const [sortBy,       setSortBy]       = useState(pageProps.sort_by    || 'archived_at');
  const [sortOrder,    setSortOrder]    = useState(pageProps.sort_order || 'desc');
  const [showSortCard, setShowSortCard] = useState(false);
  const debounceTimer = useRef(null);

  const breadcrumbs = [
    { title: 'Home',                 href: route('dashboard') },
    { title: 'Inventory Management', href: route('inventory-management.index') },
    { title: 'Archived Items' },
  ];

  const columns = [
    { header: 'Item Code',   width: '12%' },
    { header: 'Item Name',   width: '20%' },
    { header: 'Category',    width: '13%' },
    { header: 'Unit',        width: '8%'  },
    { header: 'Last Stock',  width: '12%' },
    { header: 'Unit Price',  width: '11%' },
    { header: 'Archived On', width: '12%' },
    { header: 'Action',      width: '8%'  },
  ];

  const formatNumber = (num) =>
    num != null
      ? parseFloat(num).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : '---';

  const formatDate = (date) =>
    date ? new Date(date).toLocaleDateString('en-PH') : '---';

  const capitalizeText = (text) => {
    if (!text) return '';
    return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  };

  const buildParams = (overrides = {}) => ({
    ...(searchInput?.trim() && { search: searchInput }),
    sort_by: sortBy,
    sort_order: sortOrder,
    ...overrides,
  });

  // Debounced search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      router.get(route('inventory-management.archived'), buildParams(), {
        preserveState: true, preserveScroll: true, replace: true,
      });
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchInput]);

  const applySort = () => {
    router.get(route('inventory-management.archived'), buildParams(), {
      preserveState: true, preserveScroll: true, replace: true,
      onSuccess: () => setShowSortCard(false),
    });
  };

  const handleRestore = (item) => {
    router.put(route('inventory-management.restore', item.id), {}, {
      preserveScroll: true,
      onSuccess: (page) => {
        const flash = page.props.flash;
        if (flash?.error) toast.error(flash.error);
        else toast.success(`"${item.item_name}" restored to active inventory.`);
      },
      onError: () => toast.error('Failed to restore item.'),
    });
  };

  // Pagination helpers
  const pageLinks = Array.isArray(paginationLinks)
    ? paginationLinks.filter(link => link?.label && !isNaN(Number(link.label)))
    : [];
  const prevLink = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('previous')) ?? null;
  const nextLink = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('next')) ?? null;
  const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

  const handlePageClick = (url) => {
    if (!url) return;
    try {
      const page = new URL(url, window.location.origin).searchParams.get('page');
      router.get(route('inventory-management.archived'), buildParams({ page }), {
        preserveState: true, preserveScroll: true, replace: true,
      });
    } catch (e) { /* noop */ }
  };

  return (
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
      <Head title="Archived Inventory Items" />

      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden bg-white shadow-lg sm:rounded-lg p-4 sm:p-6 mt-2 border border-gray-100">

          {/* Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
            <Button variant="outline" size="sm"
              onClick={() => router.visit(route('inventory-management.index'))}
              className="flex items-center gap-1.5 text-gray-600 border-gray-300">
              <ArrowLeft size={14} /> Back
            </Button>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Archived Items</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Items removed from active inventory. All transaction history is preserved. Restore to make active again.
              </p>
            </div>
          </div>

          {/* Search + Sort */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search archived items..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-10 h-10 border-gray-300 rounded-lg"
              />
            </div>

            <DropdownMenu open={showSortCard} onOpenChange={setShowSortCard}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline"
                  className="h-10 w-10 p-0 border-2 rounded-lg flex items-center justify-center bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                  title="Sort">
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" sideOffset={6}
                className="w-72 p-0 rounded-xl shadow-xl border-2 border-gray-200 overflow-hidden flex flex-col bg-white"
                style={{ zIndex: 40 }}>
                <div className="bg-gradient-to-r from-zinc-700 to-zinc-800 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-white" />
                    <h3 className="text-sm font-semibold text-white">Sort</h3>
                  </div>
                  <button onClick={() => setShowSortCard(false)}
                    className="text-white hover:bg-zinc-900 rounded-lg p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Sort By</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                      <SelectContent style={{ zIndex: 50 }}>
                        <SelectItem value="archived_at">Archived Date</SelectItem>
                        <SelectItem value="item_code">Item Code</SelectItem>
                        <SelectItem value="item_name">Item Name</SelectItem>
                        <SelectItem value="category">Category</SelectItem>
                        <SelectItem value="current_stock">Last Stock</SelectItem>
                        <SelectItem value="unit_price">Unit Price</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-2 block">Order</Label>
                    <Select value={sortOrder} onValueChange={setSortOrder}>
                      <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                      <SelectContent style={{ zIndex: 50 }}>
                        <SelectItem value="desc">Newest first</SelectItem>
                        <SelectItem value="asc">Oldest first</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                  <Button type="button" onClick={applySort}
                    className="w-full bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white text-sm h-9">
                    Apply Sort
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <Table className="min-w-[900px] w-full">
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                  {columns.map((col, i) => (
                    <TableHead key={i} style={{ width: col.width }}
                      className="text-left font-bold px-4 py-3 text-xs text-gray-700 uppercase tracking-wider">
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? items.map((item, index) => (
                  <TableRow key={item.id}
                    className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <TableCell className="px-4 py-3 text-sm font-semibold text-gray-900">
                      <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                        {item.item_code || '---'}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-gray-900">
                      {capitalizeText(item.item_name)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                      {item.category
                        ? capitalizeText(item.category)
                        : <span className="text-gray-400 italic">No category</span>}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                      {item.unit_of_measure}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-700">
                      {formatNumber(item.current_stock)} {item.unit_of_measure}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm font-bold text-gray-900">
                      {item.unit_price
                        ? `₱${formatNumber(item.unit_price)}`
                        : <span className="text-gray-400 font-normal">---</span>}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(item.archived_at)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-sm">
                      {has('inventory.archive') && (
                        <button
                          onClick={() => handleRestore(item)}
                          className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 hover:text-green-700 transition-all border border-green-200 hover:border-green-300"
                          title="Restore item">
                          <ArchiveRestore size={14} />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="text-center py-12">
                      <div className="flex flex-col items-center justify-center">
                        <div className="bg-gray-100 rounded-full p-4 mb-3">
                          <Search className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-gray-500 font-medium">No archived items found</p>
                        <p className="text-gray-400 text-sm mt-1">Archive items from the main inventory list</p>
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
                Showing <span className="font-semibold">{items.length}</span> of{' '}
                <span className="font-semibold">{pagination?.total || 0}</span> archived items
              </p>
              <div className="flex items-center gap-1 order-1 sm:order-2 flex-wrap justify-center">
                <button disabled={!prevLink?.url} onClick={() => handlePageClick(prevLink?.url)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${!prevLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
                  Previous
                </button>
                {pageLinks.map((link, idx) => (
                  <button key={idx} disabled={!link?.url} onClick={() => handlePageClick(link?.url)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all min-w-[36px] ${link?.active ? 'bg-gradient-to-r from-zinc-700 to-zinc-800 text-white shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'} ${!link?.url ? 'cursor-not-allowed text-gray-400 bg-gray-50' : ''}`}>
                    {link?.label}
                  </button>
                ))}
                <button disabled={!nextLink?.url} onClick={() => handlePageClick(nextLink?.url)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${!nextLink?.url ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}>
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