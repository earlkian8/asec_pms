import { usePage } from '@inertiajs/react';

/**
 * Get user permissions from Inertia page props
 * @returns {string[]} Array of permission names
 */
export function usePermissions() {
  const { auth } = usePage().props;
  return auth?.permissions || [];
}

/**
 * Check if user has a specific permission
 * @param {string} permission - Permission name to check
 * @returns {boolean}
 */
export function hasPermission(permission) {
  const { auth } = usePage().props;
  const permissions = auth?.permissions || [];
  return permissions.includes(permission);
}

/**
 * Check if user has any of the given permissions
 * @param {string[]} permissions - Array of permission names
 * @returns {boolean}
 */
export function hasAnyPermission(permissions) {
  const { auth } = usePage().props;
  const userPermissions = auth?.permissions || [];
  return permissions.some(permission => userPermissions.includes(permission));
}

/**
 * Check if user has all of the given permissions
 * @param {string[]} permissions - Array of permission names
 * @returns {boolean}
 */
export function hasAllPermissions(permissions) {
  const { auth } = usePage().props;
  const userPermissions = auth?.permissions || [];
  return permissions.every(permission => userPermissions.includes(permission));
}

/**
 * Hook to use permissions in React components
 * @returns {Object} Object with permission checking functions
 */
export function usePermission() {
  const permissions = usePermissions();
  
  return {
    permissions,
    has: (permission) => permissions.includes(permission),
    hasAny: (perms) => perms.some(p => permissions.includes(p)),
    hasAll: (perms) => perms.every(p => permissions.includes(p)),
  };
}

