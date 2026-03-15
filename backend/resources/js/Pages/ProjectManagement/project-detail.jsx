import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useState, useMemo, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { usePermission } from '@/utils/permissions';

// Future Tab Imports
import OverviewTab from './Tabs/Overview';
import MilestonesTab from './Tabs/Milestones';
import TeamTab from './Tabs/Team/index';
import MaterialAllocationTab from './Tabs/MaterialAllocation';
import LaborCostTab from './Tabs/LaborCost';
import MiscellaneousExpenseTab from './Tabs/Miscellaneous';
import RequestUpdatesTab from './Tabs/RequestUpdates';
// import BudgetTab from './Tabs/Budget';
// import IssuesTab from './Tabs/Issues';

export default function ProjectDetail() {
    const { project, teamData, milestoneData, materialAllocationData, laborCostData, miscellaneousExpenseData, overviewData, requestUpdatesData } = usePage().props;
    const { has } = usePermission();

    const breadcrumbs = [
        { title: "Home", href: route("dashboard") },
        { title: "Project Management", href: route("project-management.index") },
        { title: "Project Details" },
    ];

    // All possible tabs with their required permissions
    const allTabs = [
        { 
            key: "overview", 
            label: "Overview", 
            component: <OverviewTab project={project} overviewData={overviewData} />,
            permission: 'projects.view'
        },
        { 
            key: "team", 
            label: "Team", 
            component: <TeamTab project={project} teamData={teamData} />,
            permission: 'project-teams.view'
        },
        { 
            key: "material-allocation", 
            label: "Material Allocation", 
            component: <MaterialAllocationTab project={project} materialAllocationData={materialAllocationData} />,
            permission: 'material-allocations.view'
        },
        { 
            key: "labor-cost", 
            label: "Labor Cost", 
            component: <LaborCostTab project={project} laborCostData={laborCostData} />,
            permission: 'labor-costs.view'
        },
        { 
            key: "miscellaneous", 
            label: "Miscellaneous", 
            component: <MiscellaneousExpenseTab project={project} miscellaneousExpenseData={miscellaneousExpenseData} />,
            permission: 'miscellaneous-expenses.view'
        },
                { 
            key: "milestones", 
            label: "Milestones", 
            component: <MilestonesTab project={project} milestoneData={milestoneData}/>,
            permission: 'project-milestones.view'
        },
        // { 
        //     key: "request-updates", 
        //     label: "Request Updates", 
        //     component: <RequestUpdatesTab project={project} requestUpdatesData={requestUpdatesData} />,
        //     permission: 'projects.view'
        // },
    ];

    // Filter tabs based on user permissions
    const tabs = useMemo(() => {
        return allTabs.filter(tab => has(tab.permission));
    }, [has]);

    // Set active tab to first available tab
    const [activeTab, setActiveTab] = useState(null);

    // Update active tab when tabs change or on initial load
    useEffect(() => {
        if (tabs.length > 0) {
            // If no active tab or current tab is not in available tabs, set to first available
            if (!activeTab || !tabs.some(tab => tab.key === activeTab)) {
                setActiveTab(tabs[0].key);
            }
        } else {
            setActiveTab(null);
        }
    }, [tabs, activeTab]);

    const currentTab = tabs.find(t => t.key === activeTab);

    return (
        <AuthenticatedLayout breadcrumbs={breadcrumbs}>
            <Head title={`Project: ${project.project_name}`} />

            <div className="w-full sm:px-6 lg:px-8">
                <div className="overflow-hidden bg-white shadow sm:rounded-lg p-4 mt-2">

                    {/* ----------------------------- */}
                    {/* Back Button + Title */}
                    {/* ----------------------------- */}
                    <div className="flex items-center gap-3 mb-6">

                        {/* Back Button (left side) */}
                        <button
                            onClick={() => router.get(route('project-management.index'))}
                            className="flex items-center gap-1 text-zinc-700 hover:text-zinc-900 transition"
                        >
                            <ArrowLeft size={20} />
                            <span className="text-sm font-medium">Back to Projects</span>
                        </button>

                        {/* Divider */}
                        <span className="text-gray-300">|</span>

                        {/* Project Name */}
                        <h1 className="text-xl font-semibold">{project.project_name}</h1>
                    </div>

                    {/* ----------------------------- */}
                    {/* TAB HEADERS */}
                    {/* ----------------------------- */}
                    {tabs.length > 0 ? (
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
                    ) : (
                        <div className="border-b border-gray-200 mb-4">
                            <p className="text-sm text-gray-500 py-2">You don't have permission to view any tabs for this project.</p>
                        </div>
                    )}

                    {/* ----------------------------- */}
                    {/* TAB CONTENT AREA */}
                    {/* ----------------------------- */}
                    <div className="mt-4">
                        {currentTab?.component || (
                            <div className="text-gray-500 text-sm">
                                No content available.
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </AuthenticatedLayout>
    );
}
