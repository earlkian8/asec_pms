import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/Components/ui/table";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { ArchiveRestore, Search, ArrowLeft, ArrowUpDown, X, FolderOpen } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/Components/ui/dropdown-menu";
import { Label } from "@/Components/ui/label";
import { toast } from 'sonner';
import { usePermission } from '@/utils/permissions';

const DOCUMENT_FIELDS = [
    { key: 'building_permit',          label: 'Building Permit'          },
    { key: 'business_permit',          label: 'Business Permit'          },
    { key: 'environmental_compliance', label: 'Environmental Compliance' },
    { key: 'contractor_license',       label: 'Contractor License'       },
    { key: 'surety_bond',              label: 'Surety Bond'              },
    { key: 'signed_contract',          label: 'Signed Contract'          },
    { key: 'notice_to_proceed',        label: 'Notice to Proceed'        },
];

export default function ArchivedProjects() {
    const { has } = usePermission();
    const pageProps = usePage().props;

    const pagination      = pageProps.projects;
    const projects        = pagination?.data || [];
    const paginationLinks = pagination?.links || [];
    const initialSearch   = pageProps.search || '';

    const [searchInput,  setSearchInput]  = useState(initialSearch);
    const [sortBy,       setSortBy]       = useState(pageProps.sort_by    || 'archived_at');
    const [sortOrder,    setSortOrder]    = useState(pageProps.sort_order || 'desc');
    const [showSortCard, setShowSortCard] = useState(false);
    const debounceTimer = useRef(null);

    const breadcrumbs = [
        { title: 'Home',               href: route('dashboard')                  },
        { title: 'Project Management', href: route('project-management.index')   },
        { title: 'Archived Projects'                                              },
    ];

    const columns = [
        { header: 'Code',            width: '9%'  },
        { header: 'Project Name',    width: '18%' },
        { header: 'Client',          width: '13%' },
        { header: 'Type',            width: '10%' },
        { header: 'Contract Amount', width: '12%' },
        { header: 'Status',          width: '9%'  },
        { header: 'Documents',       width: '8%'  },
        { header: 'Archived On',     width: '12%' },
        { header: 'Action',          width: '9%'  },
    ];

    const statusColors = {
        active:    'bg-blue-100 text-blue-800 border border-blue-200',
        on_hold:   'bg-yellow-100 text-yellow-800 border border-yellow-200',
        completed: 'bg-green-100 text-green-800 border border-green-200',
        cancelled: 'bg-red-100 text-red-800 border border-red-200',
    };

    const capitalizeText = (text) => {
        if (!text) return '';
        return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };

    const formatDate = (date) =>
        date ? new Date(date).toLocaleDateString('en-PH') : '---';

    const docCount = (project) =>
        DOCUMENT_FIELDS.filter(d => project[d.key]).length;

    const buildParams = (overrides = {}) => ({
        ...(searchInput?.trim() && { search: searchInput }),
        sort_by:    sortBy,
        sort_order: sortOrder,
        ...overrides,
    });

    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            router.get(route('project-management.archived'), buildParams(), {
                preserveState: true, preserveScroll: true, replace: true,
            });
        }, 300);
        return () => clearTimeout(debounceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchInput]);

    const applySort = () => {
        router.get(route('project-management.archived'), buildParams(), {
            preserveState: true, preserveScroll: true, replace: true,
            onSuccess: () => setShowSortCard(false),
        });
    };

    const handleUnarchive = (project) => {
        router.post(route('project-management.unarchive', project.id), {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                const flash = page.props.flash;
                if (flash?.error) toast.error(flash.error);
                else toast.success(`Project "${project.project_name}" restored successfully.`);
            },
            onError: () => toast.error('Failed to restore project.'),
        });
    };

    const pageLinks  = Array.isArray(paginationLinks)
        ? paginationLinks.filter(link => link?.label && !isNaN(Number(link.label)))
        : [];
    const prevLink   = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('previous')) ?? null;
    const nextLink   = paginationLinks.find?.(l => l.label?.toLowerCase()?.includes('next'))     ?? null;
    const showPagination = pageLinks.length > 0 || prevLink?.url || nextLink?.url;

    const handlePageClick = (url) => {
        if (!url) return;
        try {
            const page = new URL(url, window.location.origin).searchParams.get('page');
            router.get(route('project-management.archived'), buildParams({ page }), {
                preserveState: true, preserveScroll: true, replace: true,
            });
        } catch (e) { /* noop */ }
    };

    return (
        <AuthenticatedLayout breadcrumbs={breadcrumbs}>
            <Head title="Archived Projects" />

            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="overflow-hidden bg-white shadow-lg sm:rounded-lg p-4 sm:p-6 mt-2 border border-gray-100">

                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                        <Button variant="outline" size="sm"
                            onClick={() => router.visit(route('project-management.index'))}
                            className="flex items-center gap-1.5 text-gray-600 border-gray-300">
                            <ArrowLeft size={14} /> Back
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                Archived Projects
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Archived projects are hidden from the main list. Restore them to make them active again.
                            </p>
                        </div>
                    </div>

                    {/* Search + Sort */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-6">
                        <div className="relative flex-1 sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Search archived projects..."
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
                                    <button onClick={() => setShowSortCard(false)} className="text-white hover:bg-zinc-900 rounded-lg p-1">
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
                                                <SelectItem value="project_name">Project Name</SelectItem>
                                                <SelectItem value="project_code">Project Code</SelectItem>
                                                <SelectItem value="status">Status</SelectItem>
                                                <SelectItem value="contract_amount">Contract Amount</SelectItem>
                                                <SelectItem value="start_date">Start Date</SelectItem>
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
                        <Table className="min-w-[1050px] w-full">
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
                                {projects.length > 0 ? projects.map((project, index) => {
                                    const uploadedDocs = docCount(project);
                                    return (
                                        <TableRow key={project.id}
                                            className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                                            <TableCell className="px-4 py-3 text-sm font-semibold text-gray-900">
                                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                                    {project.project_code || '---'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm font-medium text-gray-900">
                                                {capitalizeText(project.project_name)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm text-gray-700">
                                                {project.client?.client_name
                                                    ? capitalizeText(project.client.client_name)
                                                    : <span className="text-gray-400 italic">No client</span>}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm text-gray-700">
                                                {project.project_type?.name || '---'}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm font-bold text-gray-900">
                                                ₱{parseFloat(project.contract_amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[project.status] || 'bg-gray-100 text-gray-800 border border-gray-200'}`}>
                                                    {capitalizeText(project.status?.replace('_', ' ') || '')}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${
                                                    uploadedDocs === DOCUMENT_FIELDS.length
                                                        ? 'bg-green-100 text-green-800 border-green-200'
                                                        : uploadedDocs > 0
                                                        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                                                        : 'bg-gray-100 text-gray-500 border-gray-200'
                                                }`}>
                                                    <FolderOpen className="h-3 w-3" />
                                                    {uploadedDocs}/{DOCUMENT_FIELDS.length}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                                                {formatDate(project.archived_at)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-sm">
                                                {has('projects.update') && (
                                                    <button
                                                        onClick={() => handleUnarchive(project)}
                                                        className="p-1.5 rounded-lg hover:bg-green-100 text-green-600 hover:text-green-700 transition-all border border-green-200 hover:border-green-300"
                                                        title="Restore project">
                                                        <ArchiveRestore size={14} />
                                                    </button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                }) : (
                                    <TableRow>
                                        <TableCell colSpan={columns.length} className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="bg-gray-100 rounded-full p-4 mb-3">
                                                    <Search className="h-8 w-8 text-gray-400" />
                                                </div>
                                                <p className="text-gray-500 font-medium">No archived projects found</p>
                                                <p className="text-gray-400 text-sm mt-1">Archive projects from the main project list</p>
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
                                Showing <span className="font-semibold">{projects.length}</span> of{' '}
                                <span className="font-semibold">{pagination?.total || 0}</span> archived projects
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