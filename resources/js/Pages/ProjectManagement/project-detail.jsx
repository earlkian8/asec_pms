import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

// Future Tab Imports
// import OverviewTab from './Tabs/Overview';
// import MilestonesTab from './Tabs/Milestones';
// import TasksTab from './Tabs/Tasks';
import TeamTab from './Tabs/Team/index';
// import FilesTab from './Tabs/Files';
// import ProgressUpdatesTab from './Tabs/ProgressUpdates';
// import BudgetTab from './Tabs/Budget';
// import MaterialAllocationTab from './Tabs/MaterialAllocation';
// import LaborCostTab from './Tabs/LaborCost';
// import IssuesTab from './Tabs/Issues';

export default function ProjectDetail() {
    const { project, teamData } = usePage().props;

    const breadcrumbs = [
        { title: "Home", href: route("dashboard") },
        { title: "Project Management", href: route("project-management.index") },
        { title: "Project Details" },
    ];

    // Flexible Tab List
    const tabs = [
        // { key: "overview", label: "Overview", component: <OverviewTab project={project} /> },
        // { key: "milestones", label: "Milestones", component: <MilestonesTab project={project} /> },
        // { key: "tasks", label: "Tasks", component: <TasksTab project={project} /> },
        { key: "team", label: "Team", component: <TeamTab project={project} teamData={teamData} /> },
        // { key: "files", label: "Files", component: <FilesTab project={project} /> },
        // { key: "progress-update", label: "Progress Update", component: <ProgressUpdatesTab project={project} /> },
        // { key: "budget", label: "Budget", component: <BudgetTab project={project} /> },
        // { key: "material-allocation", label: "Material Allocation", component: <MaterialAllocationTab project={project} /> },
        // { key: "labor-cost", label: "Labor Cost", component: <LaborCostTab project={project} /> },
        // { key: "issues", label: "Issues", component: <IssuesTab project={project} /> },
    ];

    const [activeTab, setActiveTab] = useState("overview");
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
