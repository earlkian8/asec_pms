import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import { Label } from '@/Components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
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

      <div className="w-full">
        <div className="bg-white shadow sm:rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.visit(route('user-management.roles-and-permissions.index'))
                }
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back
              </Button>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Edit Permissions
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Role: <span className="font-semibold">{role.name}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4">
            <form onSubmit={handleSubmit}>
              {/* Global Select All */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="select-all-global"
                    checked={allPermissionsSelected()}
                    onCheckedChange={handleSelectAllGlobal}
                  />
                  <Label
                    htmlFor="select-all-global"
                    className="text-base font-semibold text-gray-900 cursor-pointer"
                  >
                    Select All Permissions
                  </Label>
                </div>
                <span className="text-sm text-gray-600">
                  {selectedPermissions.length} of{' '}
                  {Object.values(groupedPermissions)
                    .flat()
                    .length}{' '}
                  permissions selected
                </span>
              </div>
            </div>

            {/* Permissions by Module */}
            <div className="space-y-6">
              {Object.keys(groupedPermissions)
                .sort()
                .map((module) => {
                  const modulePermissions = groupedPermissions[module] || [];
                  const isModuleSelected = isModuleFullySelected(module);

                  return (
                    <div
                      key={module}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      {/* Module Header */}
                      <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              id={`select-all-${module}`}
                              checked={isModuleSelected}
                              onCheckedChange={() => handleSelectAll(module)}
                            />
                            <Label
                              htmlFor={`select-all-${module}`}
                              className="text-base font-semibold text-gray-900 cursor-pointer"
                            >
                              {formatModuleName(module)}
                            </Label>
                          </div>
                          <span className="text-sm text-gray-600">
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
                              className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 transition"
                            >
                              <Checkbox
                                id={`permission-${permission.id}`}
                                checked={selectedPermissions.includes(
                                  permission.name
                                )}
                                onCheckedChange={() =>
                                  handlePermissionToggle(permission.name)
                                }
                              />
                              <Label
                                htmlFor={`permission-${permission.id}`}
                                className="text-sm text-gray-700 cursor-pointer flex-1"
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
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={processing}
                  className="bg-zinc-700 hover:bg-zinc-900 text-white"
                >
                  {processing ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
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

