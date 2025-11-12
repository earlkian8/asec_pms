import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Dashboard() {

    const breadcrumbs = [
        {
            title: "Home",
            href: "/dashboard",
        },
        {
            title: "Dashboard",
            href: '/dashboard'
        }
    ];
    return (
        <AuthenticatedLayout
            breadcrumbs={breadcrumbs}
        >
            <Head title="Dashboard" />

            <div className="py-2">
                <div className="w-full sm:px-6 lg:px-8">
                    <div className="overflow-hidden bg-white shadow-sm sm:rounded-lg">
                        <div className="p-6 text-gray-900">
                            You're logged in!
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
