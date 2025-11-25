# Roles & Permissions Implementation Guide

## ✅ What Has Been Implemented

### 1. **Seeders Created**

#### `PermissionSeeder.php`
- Creates all 80+ permissions based on the analysis
- Permissions are organized by module (projects, clients, inventory, billing, etc.)
- Run with: `php artisan db:seed --class=PermissionSeeder`

#### `RoleSeeder.php`
- Creates 9 predefined roles with their permissions:
  - **Super Admin** - All permissions
  - **Admin** - Most permissions (except sensitive user management)
  - **Project Manager** - Full project management access
  - **Finance Manager** - Billing and financial reports
  - **Inventory Manager** - Inventory management
  - **Team Member** - Limited to assigned projects
  - **HR Manager** - Employee management
  - **Sales Manager** - Client management
  - **Viewer** - Read-only access
- Run with: `php artisan db:seed --class=RoleSeeder`

### 2. **Backend Implementation**

#### `RolesController.php` - Updated
- **`edit(Role $role)`** - Shows edit permissions page
  - Groups permissions by module
  - Returns role's current permissions
- **`update(Request $request, Role $role)`** - Updates role permissions
  - Validates permissions array
  - Syncs permissions to role using Spatie's `syncPermissions()`
  - Logs activity

#### Routes Updated (`routes/admin.php`)
- Added `GET /user-management/roles-and-permissions/edit/{role}` - Edit page
- Added `PUT /user-management/roles-and-permissions/update/{role}` - Update permissions

### 3. **Frontend Implementation**

#### `resources/js/Pages/UserManagement/Roles/index.jsx` - Updated
- Added **Edit button** (pencil icon) next to Delete button
- Clicking Edit navigates to the permissions edit page

#### `resources/js/Pages/UserManagement/Roles/edit.jsx` - New File
- **Features:**
  - ✅ Permissions grouped by module (Dashboard, Projects, Clients, etc.)
  - ✅ Checkboxes for each permission
  - ✅ "Select All" for each module
  - ✅ Global "Select All" for all permissions
  - ✅ Shows count of selected permissions
  - ✅ Form validation and error handling
  - ✅ Success/error toast notifications
  - ✅ Back button to return to roles list

### 4. **Database Seeder Updated**
- `DatabaseSeeder.php` now includes PermissionSeeder and RoleSeeder
- Run all seeders: `php artisan db:seed`

---

## 🚀 How to Use

### Step 1: Run the Seeders

```bash
# Option 1: Run all seeders (including permissions and roles)
php artisan db:seed

# Option 2: Run seeders individually
php artisan db:seed --class=PermissionSeeder
php artisan db:seed --class=RoleSeeder
```

### Step 2: Access Roles & Permissions

1. Navigate to **User Management → Roles & Permissions**
2. You'll see a list of all roles with:
   - Role Name
   - Users Count (how many users have this role)
   - Created At
   - Actions (Edit and Delete buttons)

### Step 3: Edit Role Permissions

1. Click the **Edit button** (pencil icon) next to any role
2. You'll be taken to the permissions edit page
3. **Features available:**
   - **Global Select All** - Check/uncheck all permissions at once
   - **Module Select All** - Check/uncheck all permissions in a module
   - **Individual Checkboxes** - Select specific permissions
   - **Permission Counter** - See how many permissions are selected
4. Select/deselect permissions as needed
5. Click **Save Permissions** to update
6. You'll be redirected back to the roles list with a success message

---

## 📋 Permission Structure

Permissions are organized by module:

- **Dashboard** - `dashboard.view`
- **Projects** - `projects.*`, `project-teams.*`, `project-files.*`, etc.
- **Clients** - `clients.*`
- **Employees** - `employees.*`
- **Inventory** - `inventory.*`
- **Billing** - `billing.*`
- **Reports** - `reports.*`
- **Users** - `users.*`
- **Roles** - `roles.*`
- **Activity Logs** - `activity-logs.*`

Each module has specific actions:
- `view` - View/read access
- `create` - Create new records
- `update` - Edit existing records
- `delete` - Delete records
- Module-specific actions (e.g., `billing.add-payment`, `inventory.stock-in`)

---

## 🎯 Next Steps (Optional Enhancements)

1. **Add Permission Middleware**
   - Protect routes with permission checks
   - Example: `Route::middleware(['permission:projects.view'])->group(...)`

2. **Frontend Permission Checks**
   - Hide UI elements based on user permissions
   - Example: Only show "Add Project" button if user has `projects.create`

3. **Scope-Based Filtering**
   - Team members see only assigned projects
   - Implement in controllers using `auth()->user()->can()`

4. **Permission Policies**
   - Create Laravel policies for resource-level authorization
   - More granular control over access

5. **Role Assignment UI**
   - Add UI to assign roles to users
   - Currently done in Users management, but could be enhanced

---

## 🔍 Testing

### Test the Implementation:

1. **Run seeders:**
   ```bash
   php artisan db:seed
   ```

2. **Check database:**
   - Verify permissions are created: `SELECT * FROM permissions;`
   - Verify roles are created: `SELECT * FROM roles;`
   - Verify role permissions: `SELECT * FROM role_has_permissions;`

3. **Test UI:**
   - Navigate to Roles & Permissions
   - Click Edit on any role
   - Select/deselect permissions
   - Save and verify changes

4. **Test Backend:**
   - Check activity logs for permission updates
   - Verify permissions are synced correctly

---

## 📝 Notes

- **Spatie Permission Package** is already installed and configured
- Permissions use `guard_name = 'web'` by default
- Role names are case-sensitive
- Permission names follow the pattern: `{module}.{action}`
- The UI automatically groups permissions by module for better organization
- All changes are logged in the activity logs

---

## 🐛 Troubleshooting

### Permissions not showing?
- Run `php artisan permission:cache-reset`
- Clear application cache: `php artisan cache:clear`

### Roles not appearing?
- Verify seeders ran successfully
- Check database tables: `roles`, `permissions`, `role_has_permissions`

### UI not loading?
- Check browser console for errors
- Verify Inertia.js is properly configured
- Check route names match in frontend and backend

---

## 📚 Files Created/Modified

### Created:
- `database/seeders/PermissionSeeder.php`
- `database/seeders/RoleSeeder.php`
- `resources/js/Pages/UserManagement/Roles/edit.jsx`

### Modified:
- `app/Http/Controllers/Admin/RolesController.php`
- `routes/admin.php`
- `resources/js/Pages/UserManagement/Roles/index.jsx`
- `database/seeders/DatabaseSeeder.php`

---

**Implementation Complete!** 🎉

You can now manage roles and permissions through the UI. Users can be assigned roles, and roles can have their permissions customized through the intuitive checkbox interface.

