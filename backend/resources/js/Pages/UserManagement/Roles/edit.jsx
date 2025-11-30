import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import { Label } from '@/Components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditRolePermissions() {
  const { role, groupedPermissions, rolePermissions } = usePage().props;

  const [selectedPermissions, setSelectedPermissions] = useState(
    rolePermissions || []
  );

  const { data, setData, put, processing, errors } = useForm({
    permissions: selectedPermissions,
  });

  // Update form data when selectedPermissions changes
  useEffect(() => {
    setData('permissions', selectedPermissions);
  }, [selectedPermissions]);

  const handlePermissionToggle = (permissionName) => {
    setSelectedPermissions((prev) => {
      if (prev.includes(permissionName)) {
        return prev.filter((p) => p !== permissionName);
      } else {
        return [...prev, permissionName];
      }
    });
  };

  const handleSelectAll = (module) => {
    const modulePermissions = groupedPermissions[module] || [];
    const modulePermissionNames = modulePermissions.map((p) => p.name);
    const allSelected = modulePermissionNames.every((name) =>
      selectedPermissions.includes(name)
    );

    if (allSelected) {
      // Deselect all in module
      setSelectedPermissions((prev) =>
        prev.filter((p) => !modulePermissionNames.includes(p))
      );
    } else {
      // Select all in module
      setSelectedPermissions((prev) => {
        const newPerms = [...prev];
        modulePermissionNames.forEach((name) => {
          if (!newPerms.includes(name)) {
            newPerms.push(name);
          }
        });
        return newPerms;
      });
    }
  };

  const handleSelectAllGlobal = () => {
    const allPermissionNames = Object.values(groupedPermissions)
      .flat()
      .map((p) => p.name);
    const allSelected = allPermissionNames.every((name) =>
      selectedPermissions.includes(name)
    );

    if (allSelected) {
      setSelectedPermissions([]);
    } else {
      setSelectedPermissions(allPermissionNames);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    put(route('user-management.roles-and-permissions.update', role.id), {
      onSuccess: () => {
        toast.success('Role permissions updated successfully!');
      },
      onError: () => {
        toast.error('Failed to update permissions. Please try again.');
      },
    });
  };

  const formatModuleName = (module) => {
    return module
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatPermissionName = (permission) => {
    const parts = permission.split('.');
    if (parts.length > 1) {
      return parts
        .slice(1)
        .join(' ')
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return permission;
  };

  const breadcrumbs = [
    { title: 'Home', href: route('dashboard') },
    {
      title: 'User Management',
      href: route('user-management.roles-and-permissions.index'),
    },
    { title: 'Edit Role Permissions' },
  ];

  // Check if all permissions in a module are selected
  const isModuleFullySelected = (module) => {
    const modulePermissions = groupedPermissions[module] || [];
    if (modulePermissions.length === 0) return false;
    return modulePermissions.every((p) =>
      selectedPermissions.includes(p.name)
    );
  };

  // Check if all permissions are selected globally
  const allPermissionsSelected = () => {
    const allPermissionNames = Object.values(groupedPermissions)
      .flat()
      .map((p) => p.name);
    if (allPermissionNames.length === 0) return false;
    return allPermissionNames.every((name) =>
      selectedPermissions.includes(name)
    );
  };

  return (
    <AuthenticatedLayout breadcrumbs={breadcrumbs}>
      <Head title={`Edit Permissions - ${role.name}`} />

      <div className="w-full sm:px-6 lg:px-8">
        <div className="overflow-hidden bg-white shadow-lg sm:rounded-lg p-6 mt-2 border border-gray-100">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.visit(route('user-management.roles-and-permissions.index'))
                }
                className="flex items-center gap-2 border-gray-300 hover:bg-gray-50 transition-all duration-200"
              >
                <ArrowLeft size={16} />
                Back
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit Permissions
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Role: <span className="font-semibold text-zinc-700">{role.name}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div>
            <form onSubmit={handleSubmit}>
              {/* Global Select All */}
              <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border-2 border-gray-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="select-all-global"
                      checked={allPermissionsSelected()}
                      onCheckedChange={handleSelectAllGlobal}
                      className="border-gray-400"
                    />
                    <Label
                      htmlFor="select-all-global"
                      className="text-base font-semibold text-gray-900 cursor-pointer"
                    >
                      Select All Permissions
                    </Label>
                  </div>
                  <span className="text-sm font-medium text-gray-700 bg-white px-3 py-1.5 rounded-lg border border-gray-300">
                    {selectedPermissions.length} of{' '}
                    {Object.values(groupedPermissions)
                      .flat()
                      .length}{' '}
                    permissions selected
                  </span>
                </div>
              </div>

              {/* Permissions by Module */}
              <div className="space-y-4">
                {Object.keys(groupedPermissions)
                  .sort()
                  .map((module) => {
                    const modulePermissions = groupedPermissions[module] || [];
                    const isModuleSelected = isModuleFullySelected(module);

                    return (
                      <div
                        key={module}
                        className="border-2 border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                      >
                        {/* Module Header */}
                        <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-3 border-b-2 border-gray-300">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`select-all-${module}`}
                                checked={isModuleSelected}
                                onCheckedChange={() => handleSelectAll(module)}
                                className="border-gray-500"
                              />
                              <Label
                                htmlFor={`select-all-${module}`}
                                className="text-base font-semibold text-gray-900 cursor-pointer"
                              >
                                {formatModuleName(module)}
                              </Label>
                            </div>
                            <span className="text-sm font-medium text-gray-700 bg-white px-3 py-1 rounded-lg border border-gray-300">
                              {
                                modulePermissions.filter((p) =>
                                  selectedPermissions.includes(p.name)
                                ).length
                              }{' '}
                              / {modulePermissions.length} selected
                            </span>
                          </div>
                        </div>

                        {/* Module Permissions */}
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {modulePermissions.map((permission) => (
                              <div
                                key={permission.id}
                                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 transition-all duration-150 border border-transparent hover:border-blue-200"
                              >
                                <Checkbox
                                  id={`permission-${permission.id}`}
                                  checked={selectedPermissions.includes(
                                    permission.name
                                  )}
                                  onCheckedChange={() =>
                                    handlePermissionToggle(permission.name)
                                  }
                                  className="border-gray-400"
                                />
                                <Label
                                  htmlFor={`permission-${permission.id}`}
                                  className="text-sm text-gray-700 cursor-pointer flex-1 font-medium"
                                >
                                  {formatPermissionName(permission.name)}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Form Actions */}
              <div className="mt-8 flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.visit(
                      route('user-management.roles-and-permissions.index')
                    )
                  }
                  disabled={processing}
                  className="border-gray-300 hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={processing}
                  className="bg-gradient-to-r from-zinc-700 to-zinc-800 hover:from-zinc-800 hover:to-zinc-900 text-white shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Save Permissions
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}

