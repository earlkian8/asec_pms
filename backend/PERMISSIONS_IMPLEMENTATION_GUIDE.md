# Permissions Implementation Guide - Project Management Module

## ✅ Completed Implementation

### 1. **Backend Setup**
- ✅ Updated `HandleInertiaRequests` middleware to share user permissions
- ✅ Added permission middleware to all project routes
- ✅ Created permission utility functions in `resources/js/utils/permissions.js`

### 2. **Frontend Components Updated**
- ✅ **Projects Index** (`resources/js/Pages/ProjectManagement/index.jsx`)
  - Add Project button (requires `projects.create`)
  - View button (requires `projects.view`)
  - Edit button (requires `projects.update`)
  - Delete button (requires `projects.delete`)

- ✅ **Team Tab** (`resources/js/Pages/ProjectManagement/Tabs/Team/index.jsx`)
  - Add Team Member button (requires `project-teams.create`)
  - Unassign Selected button (requires `project-teams.delete`)
  - Edit button (requires `project-teams.update`)
  - Status toggle (requires `project-teams.update`)
  - Checkbox column (only shown if user has `project-teams.delete`)

---

## 📋 Pattern for Applying Permissions

### Step 1: Import Permission Hook
```jsx
import { usePermission } from '@/utils/permissions';

export default function YourComponent() {
  const { has } = usePermission();
  // ... rest of component
}
```

### Step 2: Protect Buttons/Actions
```jsx
// Before
<Button onClick={handleAdd}>Add Item</Button>

// After
{has('module.action') && (
  <Button onClick={handleAdd}>Add Item</Button>
)}
```

### Step 3: Protect Table Actions
```jsx
// Before
<TableCell>
  <button onClick={handleEdit}>Edit</button>
  <button onClick={handleDelete}>Delete</button>
</TableCell>

// After
<TableCell>
  {has('module.update') && (
    <button onClick={handleEdit}>Edit</button>
  )}
  {has('module.delete') && (
    <button onClick={handleDelete}>Delete</button>
  )}
</TableCell>
```

### Step 4: Conditional Rendering for Read-Only Views
```jsx
// If user can't edit, show read-only version
{has('module.update') ? (
  <Switch checked={value} onCheckedChange={handleChange} />
) : (
  <span className="badge">{value ? 'Active' : 'Inactive'}</span>
)}
```

---

## 🔧 Remaining Components to Update

### **Project Files Tab**
**File:** `resources/js/Pages/ProjectManagement/Tabs/Files/index.jsx`
**Permissions needed:**
- `project-files.upload` - Add/Upload button
- `project-files.update` - Edit button
- `project-files.delete` - Delete button
- `project-files.download` - Download button

**Example:**
```jsx
import { usePermission } from '@/utils/permissions';

export default function FilesTab({ project, fileData }) {
  const { has } = usePermission();
  
  return (
    <>
      {has('project-files.upload') && (
        <Button onClick={() => setShowAddModal(true)}>
          Upload File
        </Button>
      )}
      
      {/* In table */}
      {has('project-files.download') && (
        <button onClick={handleDownload}>Download</button>
      )}
      {has('project-files.update') && (
        <button onClick={handleEdit}>Edit</button>
      )}
      {has('project-files.delete') && (
        <button onClick={handleDelete}>Delete</button>
      )}
    </>
  );
}
```

### **Project Milestones Tab**
**File:** `resources/js/Pages/ProjectManagement/Tabs/Milestones/index.jsx`
**Permissions needed:**
- `project-milestones.create` - Add Milestone button
- `project-milestones.update` - Edit Milestone button
- `project-milestones.delete` - Delete Milestone button
- `project-tasks.create` - Add Task button
- `project-tasks.update` - Edit Task button
- `project-tasks.delete` - Delete Task button
- `project-tasks.update-status` - Task status toggle
- `progress-updates.create` - Add Progress Update button
- `progress-updates.update` - Edit Progress Update button
- `progress-updates.delete` - Delete Progress Update button
- `project-issues.create` - Add Issue button
- `project-issues.update` - Edit Issue button
- `project-issues.delete` - Delete Issue button

### **Material Allocation Tab**
**File:** `resources/js/Pages/ProjectManagement/Tabs/MaterialAllocation/index.jsx`
**Permissions needed:**
- `material-allocations.create` - Add Allocation button
- `material-allocations.update` - Edit Allocation button
- `material-allocations.delete` - Delete Allocation button
- `material-allocations.receiving-report` - Create Receiving Report button

### **Labor Cost Tab**
**File:** `resources/js/Pages/ProjectManagement/Tabs/LaborCost/index.jsx`
**Permissions needed:**
- `labor-costs.create` - Add Labor Cost button
- `labor-costs.update` - Edit Labor Cost button
- `labor-costs.delete` - Delete Labor Cost button

### **Project Issues Tab** (if exists)
**File:** `resources/js/Pages/ProjectManagement/Tabs/Issues/index.jsx`
**Permissions needed:**
- `project-issues.create` - Add Issue button
- `project-issues.update` - Edit Issue button
- `project-issues.delete` - Delete Issue button

---

## 🛠️ Quick Update Script Pattern

For each component, follow this pattern:

1. **Add import:**
```jsx
import { usePermission } from '@/utils/permissions';
```

2. **Add hook:**
```jsx
const { has } = usePermission();
```

3. **Wrap actions:**
```jsx
{has('permission.name') && (
  <YourActionComponent />
)}
```

---

## 📝 Route Protection (Already Done)

All project routes are already protected with middleware:
- `projects.view` - GET routes
- `projects.create` - POST routes
- `projects.update` - PUT routes
- `projects.delete` - DELETE routes
- And all submodule routes...

---

## 🧪 Testing Checklist

For each component, test:
- [ ] Button appears only if user has permission
- [ ] Button is hidden if user doesn't have permission
- [ ] Action works when clicked (if visible)
- [ ] Route protection prevents unauthorized access
- [ ] Read-only views show appropriate UI when user can't edit

---

## 🎯 Permission Mapping Reference

| Component | Permission | Action |
|-----------|-----------|--------|
| Projects | `projects.view` | View projects list |
| Projects | `projects.create` | Add new project |
| Projects | `projects.update` | Edit project |
| Projects | `projects.delete` | Delete project |
| Teams | `project-teams.create` | Add team member |
| Teams | `project-teams.update` | Edit/update team member |
| Teams | `project-teams.delete` | Remove team member |
| Files | `project-files.upload` | Upload file |
| Files | `project-files.update` | Edit file |
| Files | `project-files.delete` | Delete file |
| Files | `project-files.download` | Download file |
| Milestones | `project-milestones.create` | Add milestone |
| Milestones | `project-milestones.update` | Edit milestone |
| Milestones | `project-milestones.delete` | Delete milestone |
| Tasks | `project-tasks.create` | Add task |
| Tasks | `project-tasks.update` | Edit task |
| Tasks | `project-tasks.delete` | Delete task |
| Tasks | `project-tasks.update-status` | Update task status |
| Progress Updates | `progress-updates.create` | Add progress update |
| Progress Updates | `progress-updates.update` | Edit progress update |
| Progress Updates | `progress-updates.delete` | Delete progress update |
| Issues | `project-issues.create` | Add issue |
| Issues | `project-issues.update` | Edit issue |
| Issues | `project-issues.delete` | Delete issue |
| Material Allocations | `material-allocations.create` | Add allocation |
| Material Allocations | `material-allocations.update` | Edit allocation |
| Material Allocations | `material-allocations.delete` | Delete allocation |
| Material Allocations | `material-allocations.receiving-report` | Create receiving report |
| Labor Costs | `labor-costs.create` | Add labor cost |
| Labor Costs | `labor-costs.update` | Edit labor cost |
| Labor Costs | `labor-costs.delete` | Delete labor cost |

---

## 🚀 Next Steps

1. Update remaining tab components using the pattern above
2. Test with different user roles
3. Apply same pattern to other modules (Clients, Employees, Inventory, Billing, etc.)

---

**Note:** All route protection is already in place. You only need to update the frontend components to hide/show UI elements based on permissions.

