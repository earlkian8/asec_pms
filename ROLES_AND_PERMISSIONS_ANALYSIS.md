# Roles & Permissions Analysis - ASEC PMS

## Overview
This document identifies all modules in the codebase and suggests possible roles that can be implemented for the roles & permissions system using Spatie Laravel Permission package.

---

## 📋 Modules Identified

### 1. **Dashboard**
- **Controller**: `DashboardController`
- **Route**: `/dashboard`
- **Features**: Overview, statistics, quick access

### 2. **Project Management**
- **Controller**: `ProjectsController`
- **Route**: `/project-management`
- **Sub-modules**:
  - Projects (CRUD)
  - Project Teams (`ProjectTeamsController`)
  - Project Files (`ProjectFilesController`)
  - Project Milestones (`ProjectMilestonesController`)
  - Project Tasks (`ProjectTasksController`)
  - Progress Updates (`ProgressUpdatesController`)
  - Project Issues (`ProjectIssuesController`)
  - Material Allocations (`ProjectMaterialAllocationsController`)
  - Labor Costs (`ProjectLaborCostsController`)

### 3. **Client Management**
- **Controller**: `ClientsController`
- **Route**: `/client-management`
- **Features**: Client CRUD, status management

### 4. **Employee Management**
- **Controller**: `EmployeesController`
- **Route**: `/employee-management`
- **Features**: Employee CRUD, status management

### 5. **Inventory Management**
- **Controller**: `InventoryItemsController`
- **Route**: `/inventory-management`
- **Features**:
  - Inventory Items (CRUD)
  - Stock In/Out operations
  - Inventory Transactions

### 6. **Billing Management**
- **Controller**: `BillingsController`
- **Route**: `/billing-management`
- **Features**:
  - Billing creation (fixed price/milestone-based)
  - Payment recording
  - Billing status tracking

### 7. **Reports & Analytics**
- **Controller**: `ReportsController`
- **Route**: `/reports`
- **Features**:
  - Project Performance Reports
  - Financial Reports
  - Client Reports
  - Inventory Reports
  - Team Productivity Reports
  - Budget vs Actual Reports
  - Time-based Trends

### 8. **User Management**
- **Controllers**: 
  - `UsersController`
  - `RolesController`
  - `ActivityLogsController`
- **Route**: `/user-management`
- **Features**:
  - User CRUD
  - Role & Permission management
  - Activity Logs viewing

---

## 👥 Suggested Roles

Based on the modules identified, here are the recommended roles for your PMS:

### 1. **Super Admin**
**Description**: Full system access with no restrictions
- ✅ All permissions across all modules
- ✅ User & Role management
- ✅ System configuration access

**Typical Permissions**:
- All permissions (wildcard or explicit)

---

### 2. **Admin / Administrator**
**Description**: Administrative access to most modules except sensitive user management
- ✅ Dashboard access
- ✅ Project Management (full)
- ✅ Client Management (full)
- ✅ Employee Management (full)
- ✅ Inventory Management (full)
- ✅ Billing Management (full)
- ✅ Reports & Analytics (full)
- ❌ User Management (limited - may view but not manage roles)
- ❌ Activity Logs (view only)

**Typical Permissions**:
- `dashboard.view`
- `projects.*`
- `clients.*`
- `employees.*`
- `inventory.*`
- `billing.*`
- `reports.*`
- `users.view`
- `activity-logs.view`

---

### 3. **Project Manager**
**Description**: Manages projects, teams, and project-related activities
- ✅ Dashboard access
- ✅ Project Management (full)
- ✅ View Clients (read-only)
- ✅ View Employees (read-only)
- ✅ Inventory Management (view & allocate materials)
- ✅ Billing Management (view & create billings)
- ✅ Reports & Analytics (project-related reports)
- ❌ Employee Management
- ❌ Client Management (CRUD)
- ❌ User Management
- ❌ Activity Logs

**Typical Permissions**:
- `dashboard.view`
- `projects.*`
- `clients.view`
- `employees.view`
- `inventory.view`
- `inventory.allocate`
- `billing.view`
- `billing.create`
- `billing.update`
- `reports.view`
- `reports.project-performance`

---

### 4. **Finance Manager / Accountant**
**Description**: Handles billing, payments, and financial reporting
- ✅ Dashboard access
- ✅ Billing Management (full)
- ✅ View Projects (read-only)
- ✅ View Clients (read-only)
- ✅ Reports & Analytics (financial reports)
- ❌ Project Management (modify)
- ❌ Inventory Management (modify)
- ❌ Employee Management
- ❌ User Management

**Typical Permissions**:
- `dashboard.view`
- `billing.*`
- `projects.view`
- `clients.view`
- `reports.view`
- `reports.financial`
- `reports.budget`

---

### 5. **Inventory Manager / Warehouse Manager**
**Description**: Manages inventory items and stock operations
- ✅ Dashboard access
- ✅ Inventory Management (full)
- ✅ View Projects (read-only - for material allocation context)
- ✅ Reports & Analytics (inventory reports)
- ❌ Project Management (modify)
- ❌ Billing Management
- ❌ Employee Management
- ❌ Client Management
- ❌ User Management

**Typical Permissions**:
- `dashboard.view`
- `inventory.*`
- `projects.view`
- `reports.view`
- `reports.inventory`

---

### 6. **Team Member / Project Team Member**
**Description**: Assigned to projects, can update tasks and progress
- ✅ Dashboard access
- ✅ View assigned Projects (read-only)
- ✅ Project Tasks (update own tasks)
- ✅ Progress Updates (create/update own progress)
- ✅ View Project Files (download)
- ❌ Project Management (create/edit/delete)
- ❌ Billing Management
- ❌ Inventory Management
- ❌ Employee Management
- ❌ Client Management
- ❌ Reports & Analytics
- ❌ User Management

**Typical Permissions**:
- `dashboard.view`
- `projects.view` (assigned only)
- `project-tasks.update` (own tasks)
- `project-tasks.view`
- `progress-updates.create`
- `progress-updates.update` (own updates)
- `project-files.view`
- `project-files.download`

---

### 7. **Client / Client Representative**
**Description**: External client access (if implementing client portal)
- ✅ Dashboard access (limited)
- ✅ View own Projects (read-only)
- ✅ View Project Progress
- ✅ View Project Files (download)
- ✅ View Billings (own projects)
- ❌ All other modules

**Typical Permissions**:
- `dashboard.view` (limited)
- `projects.view` (own projects only)
- `project-files.view` (own projects)
- `project-files.download` (own projects)
- `billing.view` (own projects)
- `reports.view` (own projects only)

---

### 8. **HR Manager / Personnel Manager**
**Description**: Manages employees and employee-related data
- ✅ Dashboard access
- ✅ Employee Management (full)
- ✅ View Projects (read-only - for team assignment context)
- ✅ Reports & Analytics (team productivity reports)
- ❌ Project Management (modify)
- ❌ Billing Management
- ❌ Inventory Management
- ❌ Client Management
- ❌ User Management

**Typical Permissions**:
- `dashboard.view`
- `employees.*`
- `projects.view`
- `reports.view`
- `reports.team-productivity`

---

### 9. **Sales Manager / Business Development**
**Description**: Manages clients and new project opportunities
- ✅ Dashboard access
- ✅ Client Management (full)
- ✅ View Projects (read-only)
- ✅ View Billing (read-only)
- ✅ Reports & Analytics (client reports)
- ❌ Project Management (modify)
- ❌ Employee Management
- ❌ Inventory Management
- ❌ User Management

**Typical Permissions**:
- `dashboard.view`
- `clients.*`
- `projects.view`
- `billing.view`
- `reports.view`
- `reports.client`

---

### 10. **Viewer / Read-Only User**
**Description**: Can view most data but cannot modify anything
- ✅ Dashboard access
- ✅ View Projects (read-only)
- ✅ View Clients (read-only)
- ✅ View Employees (read-only)
- ✅ View Inventory (read-only)
- ✅ View Billing (read-only)
- ✅ View Reports (read-only)
- ❌ All create/update/delete operations

**Typical Permissions**:
- `dashboard.view`
- `projects.view`
- `clients.view`
- `employees.view`
- `inventory.view`
- `billing.view`
- `reports.view`

---

## 🔐 Permission Structure Recommendation

### Permission Naming Convention
Use a consistent naming pattern: `{module}.{action}`

### Module Permissions Breakdown

#### **Dashboard**
- `dashboard.view`

#### **Projects**
- `projects.view`
- `projects.create`
- `projects.update`
- `projects.delete`
- `projects.view-all` (view all projects vs only assigned)

#### **Project Teams**
- `project-teams.view`
- `project-teams.create`
- `project-teams.update`
- `project-teams.delete`

#### **Project Files**
- `project-files.view`
- `project-files.upload`
- `project-files.update`
- `project-files.delete`
- `project-files.download`

#### **Project Milestones**
- `project-milestones.view`
- `project-milestones.create`
- `project-milestones.update`
- `project-milestones.delete`

#### **Project Tasks**
- `project-tasks.view`
- `project-tasks.create`
- `project-tasks.update`
- `project-tasks.delete`
- `project-tasks.update-status`

#### **Progress Updates**
- `progress-updates.view`
- `progress-updates.create`
- `progress-updates.update` (own only)
- `progress-updates.delete` (own only)

#### **Project Issues**
- `project-issues.view`
- `project-issues.create`
- `project-issues.update`
- `project-issues.delete`

#### **Material Allocations**
- `material-allocations.view`
- `material-allocations.create`
- `material-allocations.update`
- `material-allocations.delete`
- `material-allocations.receiving-report`

#### **Labor Costs**
- `labor-costs.view`
- `labor-costs.create`
- `labor-costs.update`
- `labor-costs.delete`

#### **Clients**
- `clients.view`
- `clients.create`
- `clients.update`
- `clients.delete`
- `clients.update-status`

#### **Employees**
- `employees.view`
- `employees.create`
- `employees.update`
- `employees.delete`
- `employees.update-status`

#### **Inventory**
- `inventory.view`
- `inventory.create`
- `inventory.update`
- `inventory.delete`
- `inventory.stock-in`
- `inventory.stock-out`
- `inventory.allocate`

#### **Billing**
- `billing.view`
- `billing.create`
- `billing.update`
- `billing.delete`
- `billing.add-payment`
- `billing.view-payments`

#### **Reports**
- `reports.view`
- `reports.project-performance`
- `reports.financial`
- `reports.client`
- `reports.inventory`
- `reports.team-productivity`
- `reports.budget`

#### **Users**
- `users.view`
- `users.create`
- `users.update`
- `users.delete`
- `users.reset-password`

#### **Roles & Permissions**
- `roles.view`
- `roles.create`
- `roles.update`
- `roles.delete`
- `roles.assign`

#### **Activity Logs**
- `activity-logs.view`
- `activity-logs.export`

---

## 🎯 Implementation Recommendations

### 1. **Start with Core Roles**
Begin with these essential roles:
- Super Admin
- Admin
- Project Manager
- Team Member
- Viewer

### 2. **Permission Granularity**
- Start with module-level permissions (e.g., `projects.*`)
- Gradually add action-level permissions as needed
- Use middleware to check permissions on routes

### 3. **Route Protection**
Protect routes using middleware:
```php
Route::middleware(['auth', 'permission:projects.view'])->group(function() {
    // Protected routes
});
```

### 4. **Frontend Permission Checks**
- Hide UI elements based on permissions
- Disable actions user cannot perform
- Show appropriate error messages

### 5. **Data Filtering**
- Implement scope-based filtering (e.g., team members see only assigned projects)
- Use policies for resource-level authorization

### 6. **Activity Logging**
- Log all permission-related actions
- Track role assignments/changes
- Monitor access attempts

---

## 📝 Next Steps

1. **Create Permission Seeder**
   - Generate all permissions based on the structure above
   - Run seeder to populate permissions table

2. **Create Role Seeder**
   - Define roles and assign permissions
   - Create default roles with appropriate permissions

3. **Implement Middleware**
   - Create permission middleware
   - Apply to routes in `routes/admin.php`

4. **Update Controllers**
   - Add permission checks in controllers
   - Implement resource-level authorization

5. **Update Frontend**
   - Add permission checks in React components
   - Hide/show UI elements based on permissions

6. **Testing**
   - Test each role's access
   - Verify permission restrictions work correctly
   - Test edge cases

---

## 🔄 Role Hierarchy (Optional)

If you want to implement role hierarchy:
1. Super Admin (highest)
2. Admin
3. Project Manager / Finance Manager / Inventory Manager / HR Manager / Sales Manager (same level)
4. Team Member
5. Client / Viewer (lowest)

---

## 📊 Summary

**Total Modules**: 8 main modules
**Suggested Roles**: 10 roles
**Permission Categories**: ~15 module categories
**Estimated Total Permissions**: ~60-80 permissions

This structure provides flexibility to:
- Add new roles easily
- Modify permissions without code changes
- Scale the permission system as the application grows
- Implement fine-grained access control

