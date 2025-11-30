import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { useState, useEffect, useMemo } from 'react';
import { usePermission } from '@/utils/permissions';
import { 
    Menu,
    LayoutDashboard,
    FolderOpen,
    Users,
    UserCheck,
    Boxes,
    BadgeDollarSign,
    TrendingUp,
    User,
    FileText,
    ChevronRight,
    ChevronDown,
    X
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/Components/ui/collapsible';
import { Toaster } from '@/Components/ui/sonner';
export default function AuthenticatedLayout({ header, children, breadcrumbs = [] }) {
    const user = usePage().props.auth.user;
    const { has, hasAny } = usePermission();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    
    // Only keep states needed for the navigation collapsibles
    const [projectModulesOpen, setProjectModulesOpen] = useState(false);
    const [clientVendorOpen, setClientVendorOpen] = useState(false);
    const [inventoryOpen, setInventoryOpen] = useState(false);
    const [billingOpen, setBillingOpen] = useState(false);
    const [reportsOpen, setReportsOpen] = useState(false);
    const [userManagementOpen, setUserManagementOpen] = useState(false);
    
    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sidebarOpen && !event.target.closest('.sidebar') && !event.target.closest('.menu-button')) {
                setSidebarOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [sidebarOpen]);

    // Get current route for active state
    const currentRoute = route().current();

    // Helper function to check if user has any permission for a module
    const hasModuleAccess = (permissionPrefixes) => {
        return hasAny(permissionPrefixes);
    };

    const allNavigationModules = [
        {
            title: 'Dashboard',
            href: route('dashboard'),
            routeName: 'dashboard',
            icon: LayoutDashboard,
            type: 'single'
        },
        {
            title: 'Project Management',
            href: route('project-management.index'),
            routeName: 'project-management.*',
            icon: FolderOpen,
            type: 'single'
        },
        {
            title: 'Client Management',
            href: route('client-management.index'),
            routeName: 'client-management.*',
            icon: Users,
            type: 'single'
        },
        // {
        //     title: 'Employee Management',
        //     href: route('employee-management.index'),
        //     routeName: 'employee-management.*',
        //     icon: UserCheck,
        //     type: 'single'
        // },
        {
            title: 'Inventory Management',
            href: route('inventory-management.index'),
            routeName: 'inventory-management.*',
            icon: Boxes,
            type: 'single'
        },
        {
            title: 'Billing Management',
            href: route('billing-management.index'),
            routeName: 'billing-management.*',
            icon: BadgeDollarSign,
            type: 'single'
        },
        {
            title: 'Reports & Analytics',
            href: route('reports.index'),
            routeName: 'reports.*',
            icon: TrendingUp,
            type: 'single'
        },
        {
            title: 'User Management',
            type: 'collapsible',
            icon: Users,
            isOpen: userManagementOpen,
            setIsOpen: setUserManagementOpen,
            items: [
                {
                    title: 'Roles & Permissions',
                    href: route('user-management.roles-and-permissions.index'),
                    routeName: 'user-management.roles-and-permissions.*',
                    icon: BadgeDollarSign
                },
                {
                    title: 'Users',
                    href: route('user-management.users.index'),
                    routeName: 'user-management.users.*',
                    icon: User
                },
                {
                    title: 'Activity Logs',
                    href: route('user-management.activity-logs.index'),
                    routeName: 'user-management.activity-logs.*',
                    icon: FileText
                }
            ]
        }
    ];

    // Filter navigation modules based on permissions
    const navigationModules = useMemo(() => {
        return allNavigationModules.map(module => {
            if (module.title === 'Dashboard') {
                return has('dashboard.view') ? module : null;
            }
            if (module.title === 'Project Management') {
                return hasModuleAccess([
                    'projects.view', 'projects.create', 'projects.update', 'projects.delete',
                    'project-teams.view', 'project-teams.create', 'project-teams.update', 'project-teams.delete',
                    'project-files.view', 'project-files.upload', 'project-files.update', 'project-files.delete', 'project-files.download',
                    'project-milestones.view', 'project-milestones.create', 'project-milestones.update', 'project-milestones.delete',
                    'project-tasks.view', 'project-tasks.create', 'project-tasks.update', 'project-tasks.delete', 'project-tasks.update-status',
                    'progress-updates.view', 'progress-updates.create', 'progress-updates.update', 'progress-updates.delete',
                    'project-issues.view', 'project-issues.create', 'project-issues.update', 'project-issues.delete',
                    'material-allocations.view', 'material-allocations.create', 'material-allocations.update', 'material-allocations.delete', 'material-allocations.receiving-report',
                    'labor-costs.view', 'labor-costs.create', 'labor-costs.update', 'labor-costs.delete'
                ]) ? module : null;
            }
            if (module.title === 'Client Management') {
                return hasModuleAccess([
                    'clients.view', 'clients.create', 'clients.update', 'clients.delete', 'clients.update-status'
                ]) ? module : null;
            }
            if (module.title === 'Inventory Management') {
                return hasModuleAccess([
                    'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.stock-in', 'inventory.stock-out', 'inventory.allocate'
                ]) ? module : null;
            }
            if (module.title === 'Billing Management') {
                return hasModuleAccess([
                    'billing.view', 'billing.create', 'billing.update', 'billing.delete', 'billing.add-payment', 'billing.view-payments'
                ]) ? module : null;
            }
            if (module.title === 'Reports & Analytics') {
                return hasModuleAccess([
                    'reports.view', 'reports.project-performance', 'reports.financial', 'reports.client', 'reports.inventory', 'reports.team-productivity', 'reports.budget'
                ]) ? module : null;
            }
            if (module.title === 'User Management') {
                // For collapsible items, check if user has access to any sub-item
                const filteredItems = module.items.filter(item => {
                    if (item.title === 'Roles & Permissions') {
                        return hasModuleAccess(['roles.view', 'roles.create', 'roles.update', 'roles.delete', 'roles.assign']);
                    }
                    if (item.title === 'Users') {
                        return hasModuleAccess(['users.view', 'users.create', 'users.update', 'users.delete', 'users.reset-password']);
                    }
                    if (item.title === 'Activity Logs') {
                        return hasModuleAccess(['activity-logs.view', 'activity-logs.export']);
                    }
                    return false;
                });
                
                // If user has access to any sub-item, return module with filtered items
                if (filteredItems.length > 0) {
                    return { ...module, items: filteredItems };
                }
                
                return null;
            }
            return module; // Default to showing if no permission check is defined
        }).filter(module => module !== null);
    }, [has, hasAny]);

    const renderNavigationItem = (item) => {
    if (item.type === 'single') {
        const isActive = Array.isArray(item.routeName) 
            ? item.routeName.some(routeName => route().current(routeName))
            : route().current(item.routeName);
        const Icon = item.icon;
        
        return (
            <Link
                key={item.title}
                href={item.href}
                className={`
                    group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                    ${isActive 
                        ? 'bg-black/70 text-white shadow-lg' 
                        : 'text-black hover:text-white hover:bg-black/70'
                    }
                    ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}
                `}
                title={sidebarCollapsed ? item.title : undefined}
            >
                <Icon className={`flex-shrink-0 h-5 w-5 ${sidebarCollapsed ? 'lg:mr-0' : 'mr-3'}`} />
                <span className={`truncate transition-opacity duration-200 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                    {item.title}
                </span>
            </Link>
        );
    }

    if (item.type === 'collapsible') {
        const Icon = item.icon;
        const hasActiveChild = item.items.some(subItem => {
            if (Array.isArray(subItem.routeName)) {
                return subItem.routeName.some(routeName => route().current(routeName));
            } else {
                return route().current(subItem.routeName);
            }
        });
        
        return (
            <Collapsible
                key={item.title}
                open={item.isOpen}
                onOpenChange={item.setIsOpen}
                className="group/collapsible"
            >
                <CollapsibleTrigger asChild>
                    <button 
                        className={`
                            group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200
                            ${hasActiveChild
                                ? 'bg-black/70 text-white' 
                                : 'text-black hover:text-white hover:bg-black/70'
                            }
                            ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}
                        `}
                        title={sidebarCollapsed ? item.title : undefined}
                    >
                        <Icon className={`flex-shrink-0 h-5 w-5 ${sidebarCollapsed ? 'lg:mr-0' : 'mr-3'}`} />
                        <span className={`truncate transition-opacity duration-200 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                            {item.title}
                        </span>
                        {!sidebarCollapsed && (
                            <ChevronRight className={`ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90`} />
                        )}
                    </button>
                </CollapsibleTrigger>
                
                {!sidebarCollapsed && (
                    <CollapsibleContent className="space-y-1">
                        <div className="ml-6 mt-1 space-y-1 border-l border-zinc-600/50 pl-4">
                            {item.items.map((subItem) => {
                                const isActive = Array.isArray(subItem.routeName) 
                                    ? subItem.routeName.some(routeName => route().current(routeName))
                                    : route().current(subItem.routeName);
                                const SubIcon = subItem.icon;
                                
                                return (
                                    <Link
                                        key={subItem.title}
                                        href={subItem.href}
                                        className={`
                                            group flex items-center px-3 py-2 text-xs font-medium rounded-md transition-all duration-200
                                            ${isActive
                                                ? 'bg-black/70 text-white shadow-sm'
                                                : 'text-black hover:text-white hover:bg-black/70'
                                            }
                                        `}
                                    >
                                        <SubIcon className="flex-shrink-0 h-4 w-4 mr-2" />
                                        <span className="truncate">{subItem.title}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </CollapsibleContent>
                )}
            </Collapsible>
        );
    }
};

    return (
        <div className="h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 p-4 flex items-center justify-between relative z-50">
                <div className="flex items-center space-x-4">
                    {/* Desktop collapse button - clickable Menu icon */}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="hidden lg:block p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none transition-colors duration-200"
                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <Menu className='h-6 w-6' />
                    </button>
                    
                    {/* Mobile menu button */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="menu-button lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    >
                        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    
                    {/* Logo */}
                    <div className="flex items-center">
                        <img src='/logo.svg' className="h-8" />
                        <span className="ml-2 text-xl font-semibold text-gray-900 hidden sm:block">
                        </span>
                    </div>
                    <svg width="157" height="40" viewBox="0 0 157 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0.449951 25.9855L3.06846 8.24829H6.12062L8.72246 25.9855H6.17066L5.68698 22.0877H3.55214L3.03511 25.9855H0.449951ZM3.80232 19.876H5.42013L4.60288 12.7154L3.80232 19.876ZM10.0915 25.9855V8.24829H13.5106C14.0999 8.24829 14.6448 8.31398 15.1451 8.44537C15.6455 8.57676 16.0847 8.81034 16.4627 9.1461C16.8519 9.48187 17.1465 9.94902 17.3467 10.5476C17.5579 11.1315 17.6636 11.8979 17.6636 12.8468C17.6636 13.5622 17.5857 14.1753 17.4301 14.6862C17.2744 15.1826 17.052 15.5768 16.7629 15.8687C16.4738 16.1607 16.118 16.3578 15.6955 16.46C16.2181 16.5622 16.6573 16.7957 17.0131 17.1607C17.3689 17.5257 17.6358 18.0074 17.8137 18.606C17.9916 19.2045 18.0805 19.9271 18.0805 20.7738C18.0805 21.6644 17.9916 22.4381 17.8137 23.095C17.6469 23.7519 17.3967 24.2921 17.0631 24.7154C16.7296 25.1388 16.3182 25.46 15.8289 25.6789C15.3397 25.8833 14.7726 25.9855 14.1277 25.9855H10.0915ZM12.8435 23.4454H13.6107C14.3001 23.4454 14.7726 23.2191 15.0284 22.7665C15.2952 22.314 15.4287 21.6352 15.4287 20.73C15.4287 20.0293 15.3675 19.4746 15.2452 19.0658C15.1229 18.6425 14.9227 18.3359 14.6448 18.1461C14.3779 17.9417 14.0165 17.8395 13.5607 17.8395H12.8435V23.4454ZM12.8435 15.4089H13.5273C14.0054 15.4089 14.3668 15.3213 14.6114 15.1461C14.856 14.9563 15.0228 14.6789 15.1118 14.314C15.2118 13.9344 15.2619 13.4746 15.2619 12.9344C15.2619 12.3943 15.1896 11.9636 15.045 11.6425C14.9116 11.3067 14.7004 11.0658 14.4113 10.9198C14.1333 10.7738 13.7775 10.7008 13.3438 10.7008H12.8435V15.4089ZM19.6686 25.9855V8.24829H22.9711C24.1163 8.24829 25.0058 8.44537 25.6396 8.83953C26.2845 9.21909 26.7404 9.82493 27.0072 10.6571C27.2741 11.4746 27.4075 12.5257 27.4075 13.8103V20.2702C27.4075 21.5841 27.2741 22.6644 27.0072 23.5111C26.7404 24.3578 26.2901 24.9855 25.6563 25.3943C25.0336 25.7884 24.1608 25.9855 23.0378 25.9855H19.6686ZM22.4207 23.4673H23.0044C23.5159 23.4673 23.8773 23.3651 24.0885 23.1607C24.3109 22.9417 24.4499 22.6279 24.5055 22.2191C24.5611 21.7957 24.5889 21.2775 24.5889 20.6644V13.3505C24.5889 12.7373 24.55 12.2483 24.4721 11.8833C24.4054 11.5038 24.2609 11.2264 24.0385 11.0512C23.8272 10.876 23.477 10.7884 22.9877 10.7884H22.4207V23.4673ZM33.0322 26.2264C32.0092 26.2264 31.2142 26.0001 30.6472 25.5476C30.0801 25.0804 29.6798 24.4162 29.4463 23.5549C29.2239 22.679 29.1127 21.6206 29.1127 20.3797V8.24829H31.8313V20.8833C31.8313 21.3213 31.8536 21.7519 31.898 22.1753C31.9536 22.5987 32.0648 22.9417 32.2316 23.2045C32.4095 23.4673 32.6764 23.5987 33.0322 23.5987C33.3991 23.5987 33.666 23.4673 33.8327 23.2045C34.0106 22.9417 34.1218 22.5987 34.1663 22.1753C34.2108 21.7519 34.233 21.3213 34.233 20.8833V8.24829H36.9516V20.3797C36.9516 21.6206 36.8349 22.679 36.6014 23.5549C36.379 24.4162 35.9843 25.0804 35.4172 25.5476C34.8501 26.0001 34.0551 26.2264 33.0322 26.2264ZM38.8716 25.9855V8.24829H42.3741C43.2859 8.24829 44.0642 8.38698 44.7091 8.66435C45.3651 8.92712 45.8655 9.40158 46.2102 10.0877C46.566 10.7738 46.7439 11.7227 46.7439 12.9344C46.7439 13.6644 46.6938 14.314 46.5938 14.8833C46.5048 15.4381 46.338 15.9271 46.0934 16.3505C45.8599 16.7592 45.5264 17.0877 45.0927 17.3359L46.9607 25.9855H44.142L42.5909 17.949H41.6236V25.9855H38.8716ZM41.6236 15.803H42.4242C42.8689 15.803 43.2192 15.7081 43.4749 15.5184C43.7306 15.3286 43.9085 15.0439 44.0086 14.6644C44.1198 14.2702 44.1754 13.7884 44.1754 13.2191C44.1754 12.4016 44.0586 11.7811 43.8251 11.3578C43.6028 10.9198 43.1802 10.7008 42.5576 10.7008H41.6236V15.803ZM47.9283 25.9855L50.5468 8.24829H53.599L56.2008 25.9855H53.649L53.1653 22.0877H51.0305L50.5134 25.9855H47.9283ZM51.2806 19.876H52.8985L52.0812 12.7154L51.2806 19.876ZM61.2584 26.2264C60.2354 26.2264 59.4404 26.0001 58.8734 25.5476C58.3063 25.0804 57.906 24.4162 57.6725 23.5549C57.4501 22.679 57.3389 21.6206 57.3389 20.3797V8.24829H60.0575V20.8833C60.0575 21.3213 60.0798 21.7519 60.1242 22.1753C60.1798 22.5987 60.291 22.9417 60.4578 23.2045C60.6357 23.4673 60.9026 23.5987 61.2584 23.5987C61.6253 23.5987 61.8922 23.4673 62.0589 23.2045C62.2368 22.9417 62.348 22.5987 62.3925 22.1753C62.437 21.7519 62.4592 21.3213 62.4592 20.8833V8.24829H65.1778V20.3797C65.1778 21.6206 65.0611 22.679 64.8276 23.5549C64.6052 24.4162 64.2105 25.0804 63.6434 25.5476C63.0763 26.0001 62.2813 26.2264 61.2584 26.2264ZM67.0981 25.9855V8.24829H72.8021V10.7008H69.85V15.4965H72.3518V18.0147H69.85V25.9855H67.0981Z" fill="#19191A"/>
                            <path d="M81.8553 26.2264C81.0214 26.2264 80.3265 26.0293 79.7705 25.6351C79.2146 25.2264 78.7921 24.6205 78.503 23.8176C78.225 23.0001 78.0638 21.9636 78.0193 20.7081L80.3876 20.1826C80.4099 20.9125 80.4655 21.5256 80.5544 22.022C80.6545 22.5037 80.799 22.8687 80.988 23.1169C81.1882 23.3505 81.4328 23.4673 81.7219 23.4673C82.0777 23.4673 82.3168 23.3213 82.4391 23.0293C82.5725 22.7373 82.6392 22.4016 82.6392 22.022C82.6392 21.2775 82.5002 20.657 82.2223 20.1607C81.9554 19.6497 81.5996 19.1388 81.1548 18.6278L79.7538 17.0293C79.2535 16.4746 78.8421 15.8468 78.5196 15.1461C78.2083 14.4454 78.0526 13.584 78.0526 12.5621C78.0526 11.1023 78.3751 9.9855 79.02 9.21178C79.676 8.42346 80.5711 8.0293 81.7052 8.0293C82.3835 8.0293 82.9394 8.17528 83.3731 8.46725C83.8067 8.75922 84.1403 9.15338 84.3738 9.64973C84.6184 10.1315 84.7852 10.6643 84.8741 11.2483C84.9742 11.8176 85.0354 12.387 85.0576 12.9563L82.7059 13.4162C82.6837 12.876 82.6448 12.4016 82.5892 11.9928C82.5447 11.584 82.4446 11.2629 82.289 11.0293C82.1444 10.7957 81.922 10.6789 81.6218 10.6789C81.2994 10.6789 81.0603 10.8395 80.9047 11.1607C80.749 11.4673 80.6712 11.8103 80.6712 12.1899C80.6712 12.8176 80.7768 13.3359 80.988 13.7446C81.2104 14.1388 81.5106 14.5548 81.8887 14.9928L83.2563 16.5694C83.8234 17.2118 84.3071 17.949 84.7074 18.7811C85.1188 19.5986 85.3245 20.6132 85.3245 21.8249C85.3245 22.657 85.1799 23.4089 84.8908 24.0804C84.6017 24.7519 84.1959 25.2775 83.6733 25.657C83.1618 26.0366 82.5558 26.2264 81.8553 26.2264ZM85.9925 25.9855L88.611 8.24827H91.6632L94.265 25.9855H91.7132L91.2295 22.0877H89.0947L88.5776 25.9855H85.9925ZM89.3449 19.876H90.9627L90.1454 12.7154L89.3449 19.876ZM96.4932 25.9855L94.742 8.24827H97.077L98.011 19.0877L99.1952 8.27017H101.046L102.281 19.0658L103.215 8.24827H105.516L103.782 25.9855H101.447L100.129 14.7519L98.8783 25.9855H96.4932ZM105.994 25.9855L108.612 8.24827H111.664L114.266 25.9855H111.714L111.231 22.0877H109.096L108.579 25.9855H105.994ZM109.346 19.876H110.964L110.146 12.7154L109.346 19.876ZM115.635 25.9855V8.24827H118.938C120.083 8.24827 120.972 8.44536 121.606 8.83952C122.251 9.21908 122.707 9.82492 122.974 10.657C123.241 11.4746 123.374 12.5256 123.374 13.8103V20.2702C123.374 21.584 123.241 22.6643 122.974 23.511C122.707 24.3578 122.257 24.9855 121.623 25.3943C121 25.7884 120.127 25.9855 119.004 25.9855H115.635ZM118.387 23.4673H118.971C119.482 23.4673 119.844 23.3651 120.055 23.1607C120.277 22.9417 120.416 22.6278 120.472 22.2191C120.528 21.7957 120.555 21.2775 120.555 20.6643V13.3505C120.555 12.7373 120.516 12.2483 120.439 11.8833C120.372 11.5037 120.227 11.2264 120.005 11.0512C119.794 10.876 119.443 10.7884 118.954 10.7884H118.387V23.4673ZM124.265 26.4454V23.9052C124.587 23.9052 124.86 23.8833 125.082 23.8395C125.304 23.7811 125.477 23.6862 125.599 23.5548C125.721 23.4089 125.81 23.2045 125.866 22.9417C125.921 22.6789 125.949 22.3359 125.949 21.9125V8.24827H128.701V22.0658C128.701 23.0439 128.612 23.8614 128.434 24.5183C128.256 25.1607 127.94 25.6424 127.484 25.9636C127.039 26.2848 126.411 26.4454 125.599 26.4454H124.265ZM130.067 25.9855L132.685 8.24827H135.737L138.339 25.9855H135.787L135.304 22.0877H133.169L132.652 25.9855H130.067ZM133.419 19.876H135.037L134.22 12.7154L133.419 19.876ZM139.041 25.9855L141.66 8.24827H144.712L147.314 25.9855H144.762L144.278 22.0877H142.143L141.626 25.9855H139.041ZM142.394 19.876H144.011L143.194 12.7154L142.394 19.876ZM148.683 25.9855V8.24827H150.601L153.603 17.4892V8.24827H155.871V25.9855H154.036L151.034 16.1753V25.9855H148.683Z" fill="#6B6B6B"/>
                            <path d="M7.18628 39.7081V32.1402H9.60577V33.1119H8.23947V35.2889H9.31401V36.2512H8.23947V38.7551H9.62V39.7081H7.18628ZM13.2189 39.7081V32.1402H13.9518L15.3537 36.4567V32.1402H16.2219V39.7081H15.5245L14.1155 35.1861V39.7081H13.2189ZM21.53 39.8109C21.1505 39.8109 20.8492 39.7049 20.6262 39.4932C20.4033 39.2816 20.242 38.9826 20.1423 38.5963C20.0475 38.2039 20 37.7429 20 37.2135V34.6722C20 34.1303 20.0475 33.6632 20.1423 33.2708C20.2372 32.8783 20.4033 32.5794 20.6405 32.3738C20.8824 32.1621 21.2145 32.0562 21.6367 32.0562C22.0305 32.0562 22.3436 32.1435 22.576 32.3178C22.8084 32.4921 22.9745 32.7443 23.0742 33.0745C23.1785 33.3983 23.2307 33.794 23.2307 34.2611V34.6535H22.2274V34.2237C22.2274 33.9808 22.2131 33.7721 22.1847 33.5978C22.161 33.4235 22.1088 33.2926 22.0281 33.2053C21.9522 33.1119 21.8265 33.0652 21.651 33.0652C21.4659 33.0652 21.3307 33.1245 21.2453 33.2427C21.1647 33.361 21.1125 33.5169 21.0888 33.7099C21.0698 33.9029 21.0603 34.1148 21.0603 34.3452V37.5125C21.0603 37.7741 21.0769 38.0016 21.1101 38.1945C21.1434 38.3875 21.205 38.537 21.2952 38.643C21.3853 38.7426 21.5134 38.7925 21.6794 38.7925C21.8502 38.7925 21.9807 38.7364 22.0708 38.6243C22.161 38.5122 22.2226 38.3566 22.2558 38.1572C22.2938 37.9578 22.3127 37.7213 22.3127 37.4471V36.737H21.6937V35.8681H23.2592V39.7081H22.5832L22.5049 38.9607C22.429 39.2097 22.3127 39.4153 22.1562 39.5773C22.0044 39.7329 21.7957 39.8109 21.53 39.8109ZM27.0777 39.7081V32.1402H28.1166V39.7081H27.0777ZM31.9978 39.7081V32.1402H32.7308L34.1327 36.4567V32.1402H35.0008V39.7081H34.3034L32.8945 35.1861V39.7081H31.9978ZM38.8642 39.7081V32.1402H41.2837V33.1119H39.9174V35.2889H40.992V36.2512H39.9174V38.7551H41.298V39.7081H38.8642ZM44.8969 39.7081V32.1402H47.3164V33.1119H45.9501V35.2889H47.0247V36.2512H45.9501V38.7551H47.3307V39.7081H44.8969ZM50.9294 39.7081V32.1402H52.31C52.6989 32.1402 53.0263 32.2024 53.292 32.3271C53.5624 32.4453 53.7663 32.6509 53.904 32.9437C54.0463 33.2366 54.1175 33.6351 54.1175 34.1397C54.1175 34.4448 54.0961 34.7189 54.0534 34.9618C54.0107 35.2048 53.9371 35.4135 53.8328 35.5878C53.7332 35.756 53.5933 35.8868 53.413 35.9802L54.2171 39.7081H53.1639L52.4665 36.2418H51.9826V39.7081H50.9294ZM51.9826 35.3729H52.31C52.5139 35.3729 52.6753 35.3356 52.7939 35.2608C52.9173 35.1799 53.0049 35.0553 53.0572 34.8871C53.1094 34.7128 53.1354 34.4915 53.1354 34.2237C53.1354 33.8439 53.081 33.5604 52.9718 33.3735C52.8675 33.1805 52.6658 33.0839 52.3669 33.0839H51.9826V35.3729ZM57.9357 39.7081V32.1402H58.9747V39.7081H57.9357ZM62.8557 39.7081V32.1402H63.5886L64.9905 36.4567V32.1402H65.8587V39.7081H65.1613L63.7523 35.1861V39.7081H62.8557ZM71.1669 39.8109C70.7873 39.8109 70.4859 39.7049 70.2631 39.4932C70.0401 39.2816 69.8788 38.9826 69.7792 38.5963C69.6843 38.2039 69.6369 37.7429 69.6369 37.2135V34.6722C69.6369 34.1303 69.6843 33.6632 69.7792 33.2708C69.874 32.8783 70.0401 32.5794 70.2774 32.3738C70.5193 32.1621 70.8513 32.0562 71.2736 32.0562C71.6672 32.0562 71.9803 32.1435 72.2129 32.3178C72.4453 32.4921 72.6115 32.7443 72.7111 33.0745C72.8154 33.3983 72.8676 33.794 72.8676 34.2611V34.6535H71.8643V34.2237C71.8643 33.9808 71.85 33.7721 71.8216 33.5978C71.7978 33.4235 71.7455 33.2926 71.665 33.2053C71.589 33.1119 71.4633 33.0652 71.2878 33.0652C71.1028 33.0652 70.9676 33.1245 70.8822 33.2427C70.8015 33.361 70.7492 33.5169 70.7257 33.7099C70.7066 33.9029 70.6972 34.1148 70.6972 34.3452V37.5125C70.6972 37.7741 70.7137 38.0016 70.747 38.1945C70.7802 38.3875 70.8418 38.537 70.932 38.643C71.0221 38.7426 71.1502 38.7925 71.3163 38.7925C71.4871 38.7925 71.6174 38.7364 71.7077 38.6243C71.7978 38.5122 71.8594 38.3566 71.8927 38.1572C71.9305 37.9578 71.9497 37.7213 71.9497 37.4471V36.737H71.3305V35.8681H72.8961V39.7081H72.2201L72.1418 38.9607C72.0657 39.2097 71.9496 39.4153 71.7931 39.5773C71.6412 39.7329 71.4324 39.8109 71.1669 39.8109ZM82.9566 39.8109C82.5343 39.8109 82.2022 39.702 81.9603 39.4839C81.723 39.2658 81.5571 38.97 81.4622 38.5963C81.3672 38.2164 81.3198 37.7802 81.3198 37.2883V34.5881C81.3198 34.071 81.3672 33.6226 81.4622 33.2427C81.5571 32.8629 81.723 32.57 81.9603 32.3645C82.2022 32.1589 82.5343 32.0562 82.9566 32.0562C83.3551 32.0562 83.6657 32.1464 83.8888 32.3271C84.1165 32.5014 84.2777 32.7537 84.3727 33.0839C84.4676 33.4141 84.515 33.7972 84.515 34.2331V34.8684H83.5045V34.2144C83.5045 34.0027 83.4949 33.8094 83.476 33.6351C83.4618 33.4608 83.4167 33.3236 83.3408 33.224C83.2697 33.1181 83.144 33.0652 82.9637 33.0652C82.7833 33.0652 82.6506 33.1213 82.5652 33.2334C82.4844 33.3394 82.4324 33.4856 82.4086 33.6725C82.3848 33.8532 82.373 34.0588 82.373 34.2891V37.5779C82.373 37.8521 82.3897 38.0792 82.4228 38.2599C82.456 38.4343 82.5154 38.5683 82.6007 38.6617C82.6908 38.749 82.8118 38.7925 82.9637 38.7925C83.1391 38.7925 83.2625 38.7397 83.3337 38.6337C83.4095 38.5216 83.4571 38.3753 83.476 38.1945C83.4949 38.0138 83.5045 37.8115 83.5045 37.5872V36.9052H84.515V37.5125C84.515 37.961 84.4698 38.3595 84.3798 38.7084C84.2897 39.0509 84.1307 39.3218 83.903 39.5213C83.6799 39.7143 83.3646 39.8109 82.9566 39.8109ZM89.8025 39.8109C89.3944 39.8109 89.0695 39.7113 88.8276 39.5119C88.5856 39.3125 88.4124 39.0261 88.3081 38.6524C88.2038 38.2786 88.1516 37.8363 88.1516 37.3256V34.4947C88.1516 33.984 88.2038 33.5478 88.3081 33.1867C88.4124 32.8191 88.5856 32.5388 88.8276 32.3458C89.0695 32.1528 89.3944 32.0562 89.8025 32.0562C90.2199 32.0562 90.5473 32.1528 90.7845 32.3458C91.0265 32.5388 91.1997 32.8191 91.304 33.1867C91.4132 33.5478 91.4677 33.984 91.4677 34.4947V37.335C91.4677 37.8395 91.4132 38.2786 91.304 38.6524C91.1997 39.0199 91.0265 39.3064 90.7845 39.5119C90.5473 39.7113 90.2199 39.8109 89.8025 39.8109ZM89.8025 38.7925C89.978 38.7925 90.1061 38.7426 90.1868 38.643C90.2722 38.5435 90.3291 38.4062 90.3576 38.2319C90.386 38.0576 90.4003 37.8675 90.4003 37.662V34.177C90.4003 33.9653 90.386 33.7753 90.3576 33.6071C90.3291 33.4389 90.2722 33.3081 90.1868 33.2147C90.1061 33.1151 89.978 33.0652 89.8025 33.0652C89.6364 33.0652 89.5107 33.1151 89.4254 33.2147C89.34 33.3081 89.283 33.4389 89.2546 33.6071C89.2261 33.7753 89.2119 33.9653 89.2119 34.177V37.662C89.2119 37.8675 89.2237 38.0576 89.2475 38.2319C89.2759 38.4062 89.3328 38.5435 89.4182 38.643C89.5036 38.7426 89.6317 38.7925 89.8025 38.7925ZM95.2355 39.7081V32.1402H95.9684L97.3703 36.4567V32.1402H98.2385V39.7081H97.5411L96.1321 35.1861V39.7081H95.2355ZM103.554 39.8109C103.208 39.8109 102.918 39.7236 102.686 39.5493C102.453 39.3686 102.278 39.107 102.159 38.7645C102.041 38.422 101.974 38.0016 101.96 37.5032L102.864 37.2696C102.873 37.5624 102.899 37.8208 102.942 38.0451C102.989 38.2693 103.058 38.4436 103.148 38.5683C103.243 38.6865 103.366 38.7458 103.518 38.7458C103.689 38.7458 103.81 38.6804 103.881 38.5496C103.952 38.4126 103.988 38.2413 103.988 38.0357C103.988 37.7055 103.931 37.4345 103.817 37.2229C103.703 37.0112 103.551 36.7992 103.362 36.5875L102.636 35.7467C102.432 35.5163 102.268 35.2608 102.145 34.9805C102.026 34.6941 101.967 34.342 101.967 33.9248C101.967 33.3268 102.1 32.8658 102.365 32.542C102.631 32.2182 102.994 32.0562 103.454 32.0562C103.725 32.0562 103.95 32.1122 104.13 32.2243C104.311 32.3303 104.453 32.4798 104.557 32.6728C104.666 32.8658 104.747 33.0871 104.799 33.3362C104.851 33.5791 104.885 33.8375 104.899 34.1116L104.002 34.3172C103.993 34.0804 103.971 33.8687 103.938 33.6818C103.91 33.495 103.855 33.3487 103.774 33.2427C103.699 33.1367 103.585 33.0839 103.433 33.0839C103.276 33.0839 103.155 33.1525 103.07 33.2894C102.989 33.4202 102.949 33.5852 102.949 33.7846C102.949 34.0401 102.989 34.2518 103.07 34.4199C103.151 34.582 103.267 34.7502 103.419 34.9245L104.137 35.756C104.375 36.0176 104.576 36.3259 104.742 36.681C104.913 37.0299 104.998 37.4532 104.998 37.9516C104.998 38.3128 104.937 38.6337 104.813 38.914C104.695 39.1943 104.526 39.4153 104.308 39.5773C104.095 39.7329 103.843 39.8109 103.554 39.8109ZM110.187 39.8109C109.76 39.8109 109.428 39.7081 109.191 39.5026C108.954 39.297 108.79 39.0042 108.7 38.6243C108.61 38.2445 108.564 37.7896 108.564 37.2602V32.1402H109.589V37.4191C109.589 37.6559 109.601 37.8801 109.625 38.0918C109.649 38.2973 109.703 38.4655 109.788 38.5963C109.879 38.721 110.011 38.7832 110.187 38.7832C110.372 38.7832 110.505 38.721 110.585 38.5963C110.671 38.4655 110.726 38.2973 110.749 38.0918C110.778 37.8801 110.792 37.6559 110.792 37.4191V32.1402H111.809V37.2602C111.809 37.7896 111.764 38.2445 111.674 38.6243C111.584 39.0042 111.42 39.297 111.183 39.5026C110.951 39.7081 110.619 39.8109 110.187 39.8109ZM115.627 39.7081V32.1402H116.68V38.7551H118.075V39.7081H115.627ZM121.666 39.7081V33.1586H120.748V32.1402H123.623V33.1586H122.719V39.7081H121.666ZM126.538 39.7081L127.691 32.1402H128.815L129.968 39.7081H128.993L128.766 37.961H127.762L127.527 39.7081H126.538ZM127.869 37.0827H128.652L128.26 33.9061L127.869 37.0827ZM133.537 39.7081V32.1402H134.27L135.672 36.4567V32.1402H136.54V39.7081H135.842L134.433 35.1861V39.7081H133.537ZM141.955 39.8109C141.532 39.8109 141.2 39.702 140.958 39.4839C140.721 39.2658 140.555 38.97 140.46 38.5963C140.365 38.2164 140.318 37.7802 140.318 37.2883V34.5881C140.318 34.071 140.365 33.6226 140.46 33.2427C140.555 32.8629 140.721 32.57 140.958 32.3645C141.2 32.1589 141.532 32.0562 141.955 32.0562C142.353 32.0562 142.664 32.1464 142.887 32.3271C143.115 32.5014 143.276 32.7537 143.371 33.0839C143.466 33.4141 143.513 33.7972 143.513 34.2331V34.8684H142.503V34.2144C142.503 34.0027 142.493 33.8094 142.474 33.6351C142.46 33.4608 142.415 33.3236 142.339 33.224C142.268 33.1181 142.142 33.0652 141.962 33.0652C141.782 33.0652 141.649 33.1213 141.563 33.2334C141.483 33.3394 141.43 33.4856 141.407 33.6725C141.383 33.8532 141.371 34.0588 141.371 34.2891V37.5779C141.371 37.8521 141.388 38.0792 141.421 38.2599C141.454 38.4343 141.514 38.5683 141.599 38.6617C141.689 38.749 141.81 38.7925 141.962 38.7925C142.137 38.7925 142.261 38.7397 142.332 38.6337C142.408 38.5216 142.455 38.3753 142.474 38.1945C142.493 38.0138 142.503 37.8115 142.503 37.5872V36.9052H143.513V37.5125C143.513 37.961 143.468 38.3595 143.378 38.7084C143.288 39.0509 143.129 39.3218 142.901 39.5213C142.678 39.7143 142.363 39.8109 141.955 39.8109ZM148.018 39.7081V36.8211L146.851 32.1402H147.833L148.545 35.1394L149.214 32.1402H150.175L149.022 36.8211V39.7081H148.018Z" fill="#050708"/>
                            </svg>
                </div>

                {/* Header content */}
                <div className="flex items-center space-x-4">
                    {/* User dropdown using shadcn */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none">
                                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                    <User size={16} />
                                </div>
                                <span className="hidden sm:block text-sm font-medium">{user.name}</span>
                                <ChevronDown size={16} />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={route('profile.edit')}>Profile</Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                                <Link href={route('logout')} method="post" as="button">
                                    Log Out
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>

            {/* Main content area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <aside className={`
                    sidebar bg-zinc-300 border-zinc-600 flex-shrink-0 py-2 
                    ${sidebarOpen ? 'fixed inset-y-0 left-0 z-40 w-64' : 'hidden'} 
                    ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}
                    lg:relative lg:flex lg:z-auto
                    transform transition-all duration-300 ease-in-out
                `}>
                    <div className="flex flex-col h-full w-full">
                        {/* Sidebar header - only show on mobile when open */}
                        <div className="lg:hidden flex items-center justify-between px-4 py-4 border-b border-zinc-600">
                            <span className="text-lg font-semibold text-white">Menu</span>
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="p-1 rounded-md text-zinc-300 hover:text-white hover:bg-zinc-600"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                            {navigationModules.map((item) => renderNavigationItem(item))}
                        </nav>

                        {/* Sidebar footer */}
                        <div className="py-2 flex justify-center items-center border-t border-zinc-500">
                            {!sidebarCollapsed ? (
                                <span>{user.email}</span>
                            ) : (
                                <span className='p-[11px]'></span>
                            )}
                        </div>
                    </div>
                </aside>

                {/* Mobile sidebar overlay */}
                {sidebarOpen && (
                    <div 
                        className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main content */}
                <main className="flex flex-col flex-1 overflow-hidden">
                    {/* Page header */}
                    {header && (
                        <div className="bg-white border-b border-gray-200 px-4 py-4 sm:px-6">
                            {header}
                        </div>
                    )}

                    {/* Content area */}
                    <div className="flex-1 overflow-auto p-4 sm:p-6">
                        <div className="mx-auto w-7xl">
                            {breadcrumbs.length > 0 && (
                                <div className='sm:mx-9 max-lg:mx-0'>
                                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                        {breadcrumbs[breadcrumbs.length - 1].title}
                                    </h1>
                                    <div className="text-sm text-gray-500">
                                        {breadcrumbs.map((item, index) => (
                                            <span key={index} className="inline-flex items-center">
                                                {index > 0 && (
                                                    <span className="mx-2 text-gray-400">/</span>
                                                )}
                                                {item.href ? (
                                                    <Link
                                                        href={item.href}
                                                        className="text-gray-500 hover:text-gray-700"
                                                    >
                                                        {item.title}
                                                    </Link>
                                                ) : (
                                                    <span className="text-gray-700">{item.title}</span>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {children}
                            <Toaster position="top-right"/>
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="bg-white border-t border-gray-200 px-4 py-[14px] sm:px-6">
                        <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-600">
                            <p>&copy; 2025 Abdurauf Sawadjaan Engineering Consultancy. All rights reserved.</p>
                        </div>
                    </footer>
                </main>
            </div>
        </div>
    );
}