# ASEC Project Management System — User Manual

**Abdurauf Sawadjaan Engineering Consultancy**
*Where Vision Meets Precision*

---

## Table of Contents

- [Part 1: Admin Portal (Web Application)](#part-1-admin-portal-web-application)
  - [1.1 Logging In](#11-logging-in)
  - [1.2 Dashboard](#12-dashboard)
  - [1.3 Roles & Permissions](#13-roles--permissions)
  - [1.4 User Management](#14-user-management)
  - [1.5 Activity Logs](#15-activity-logs)
  - [1.6 Trash Bin](#16-trash-bin)
  - [1.7 Project Management](#17-project-management)
    - [1.7.1 Project List](#171-project-list)
    - [1.7.2 Creating a Project](#172-creating-a-project)
    - [1.7.3 Project Detail View](#173-project-detail-view)
    - [1.7.4 Overview Tab](#174-overview-tab)
    - [1.7.5 Team Members Tab](#175-team-members-tab)
    - [1.7.6 Material Allocation Tab](#176-material-allocation-tab)
    - [1.7.7 Labor Cost Tab](#177-labor-cost-tab)
    - [1.7.8 Miscellaneous Expenses Tab](#178-miscellaneous-expenses-tab)
    - [1.7.9 Milestones Tab](#179-milestones-tab)
    - [1.7.10 Tasks (Inside Milestones)](#1710-tasks-inside-milestones)
    - [1.7.11 Progress Updates (Inside Tasks)](#1711-progress-updates-inside-tasks)
    - [1.7.12 Issues (Inside Projects)](#1712-issues-inside-projects)
    - [1.7.13 Client Request Updates](#1713-client-request-updates)
    - [1.7.14 Project Files](#1714-project-files)
    - [1.7.15 Archiving Projects](#1715-archiving-projects)
  - [1.8 Project Type Management](#18-project-type-management)
  - [1.9 Employee Management](#19-employee-management)
  - [1.10 Client Management](#110-client-management)
  - [1.11 Client Type Management](#111-client-type-management)
  - [1.12 Inventory Management](#112-inventory-management)
  - [1.13 Direct Supply Management](#113-direct-supply-management)
  - [1.14 Billing Management](#114-billing-management)
  - [1.15 Reports & Analytics](#115-reports--analytics)
  - [1.16 Chat](#116-chat)
  - [1.17 Notifications](#117-notifications)
- [Part 2: Client Portal (Mobile Application)](#part-2-client-portal-mobile-application)
  - [2.1 Logging In](#21-logging-in)
  - [2.2 Changing Your Password (First Login)](#22-changing-your-password-first-login)
  - [2.3 Home / Dashboard](#23-home--dashboard)
  - [2.4 Projects](#24-projects)
    - [2.4.1 Project Detail](#241-project-detail)
    - [2.4.2 Milestones](#242-milestones)
    - [2.4.3 Task Detail](#243-task-detail)
    - [2.4.4 Requesting an Update](#244-requesting-an-update)
  - [2.5 Billings](#25-billings)
    - [2.5.1 Viewing Invoices](#251-viewing-invoices)
    - [2.5.2 Making a Payment](#252-making-a-payment)
    - [2.5.3 Transactions History](#253-transactions-history)
  - [2.6 Notifications](#26-notifications)
  - [2.7 Account & Settings](#27-account--settings)
  - [2.8 Help Center](#28-help-center)
- [Part 3: Task Management (Mobile Application)](#part-3-task-management-mobile-application)
  - [3.1 Logging In](#31-logging-in)
  - [3.2 Home / Dashboard](#32-home--dashboard)
  - [3.3 Tasks](#33-tasks)
    - [3.3.1 Task List](#331-task-list)
    - [3.3.2 Task Detail](#332-task-detail)
    - [3.3.3 Updating Task Status](#333-updating-task-status)
    - [3.3.4 Adding a Progress Update](#334-adding-a-progress-update)
    - [3.3.5 Reporting an Issue](#335-reporting-an-issue)
  - [3.4 History](#34-history)
  - [3.5 Projects (Engineer Role)](#35-projects-engineer-role)
    - [3.5.1 Project Detail](#351-project-detail)
    - [3.5.2 Managing Milestones](#352-managing-milestones)
    - [3.5.3 Managing Tasks within Milestones](#353-managing-tasks-within-milestones)
    - [3.5.4 Managing Team Members](#354-managing-team-members)
    - [3.5.5 Material Allocations & Receiving Reports](#355-material-allocations--receiving-reports)
  - [3.6 Profile & Settings](#36-profile--settings)
    - [3.6.1 Editing Your Profile](#361-editing-your-profile)
    - [3.6.2 Permission Delegation (Engineer Role)](#362-permission-delegation-engineer-role)
  - [3.7 Help Center](#37-help-center)

---

# Part 1: Admin Portal (Web Application)

The Admin Portal is the central hub for managing all aspects of your construction projects, including projects, employees, clients, inventory, billing, and reports.

---

## 1.1 Logging In

To access the Admin Portal, open your web browser and navigate to the system URL provided by your administrator.

**Steps:**

1. On the **Sign In** page, you will see the ASEC branding on the left panel and the login form on the right.
2. Enter your **Email Address** in the email field.
3. Enter your **Password** in the password field. You can click the eye icon to show or hide your password.
4. Click the **Sign In** button.

<!-- ![Login Page](images/login.png) -->

> **Note:** If you do not have login credentials, contact your administrator to request access. All sessions are monitored and recorded.

If your credentials are incorrect, an error message will appear at the top of the form. Re-enter your correct email and password and try again.

---

## 1.2 Dashboard

After logging in, you will land on the **Dashboard** — a high-level overview of your organization's key metrics.

<!-- ![Dashboard](images/dashboard.png) -->

**What you will see:**

- **Key Metric Cards** (top row):
  - **Total Projects** — total number of projects with count of active ones
  - **Total Clients** — total number of clients with count of active ones
  - **Total Revenue** — total payments received with remaining amount
  - **Total Budget Used** — expenses across labor, materials, and miscellaneous

- **Charts and Visualizations:**
  - **Revenue vs. Expenses** — monthly trend line chart
  - **Project Status Distribution** — pie chart showing active, completed, on hold, and cancelled projects
  - **Billing Status Distribution** — pie chart showing unpaid, partial, and paid billings
  - **Project Type Distribution** — breakdown of projects by category

- **Recent Projects** — a quick list of recently updated projects with their status and progress
- **Recent Billings** — latest billing records with payment status
- **Alerts** — important system notifications (e.g., overdue projects, low inventory)

> **Tip:** Click on any project or billing item to navigate directly to its detail page.

---

## 1.3 Roles & Permissions

Before managing users, it is important to understand the **Roles & Permissions** system. Each user is assigned a role, and each role has a set of permissions that control what modules and actions the user can access.

**Navigate to:** Sidebar > **Roles & Permissions**

<!-- ![Roles & Permissions](images/roles-permissions.png) -->

**Pre-configured Roles:**

| Role | Description |
|------|-------------|
| **Super Admin** | Full access to all modules including user management and system settings |
| **Admin** | Full access to all modules except user management, roles, and activity logs |
| **Project Manager** | Manages projects, teams, milestones, tasks, materials, labor, and billing (create/view/update) |
| **Finance Manager** | Manages billing and payments; view-only access to projects and clients |
| **Inventory Manager** | Manages inventory and material allocations; view-only access to projects |
| **Foreman** | Field-level access to projects, tasks, progress updates, issues, labor costs, and material receiving |
| **Foreman (TM)** | Task Management app only — can view tasks, create progress updates, and report issues |
| **Engineer (TM)** | Task Management app with project scoping — can manage milestones, tasks, teams, and delegate permissions |

**Actions:**

- **Create a New Role:**
  1. Click the **Add Role** button.
  2. Enter a **Role Name**.
  3. Select the desired **Permissions** by checking the boxes for each module.
  4. Click **Save**.

<!-- ![Add Role](images/roles-add.png) -->

- **Edit a Role:**
  1. Click the **Edit** button next to the role you want to modify.
  2. Update the role name and/or permissions.
  3. Click **Save**.

<!-- ![Edit Role](images/roles-edit.png) -->

- **Delete a Role:**
  1. Click the **Delete** button next to the role.
  2. Confirm the deletion in the dialog.

> **Important:** Deleting a role will affect all users currently assigned to it. Reassign users to a different role first.

**Permission Categories:**

Permissions are grouped by module (e.g., Projects, Billing, Inventory). Each module typically has: `view`, `create`, `update`, `delete`, and sometimes specialized permissions like `archive`, `stock-in`, `stock-out`, `allocate`, etc.

---

## 1.4 User Management

Manage the internal users (administrators, project managers, foremen, etc.) who access the Admin Portal and/or the Task Management app.

**Navigate to:** Sidebar > **User Management**

<!-- ![User Management](images/users-list.png) -->

**What you will see:**

- A table listing all users with their name, email, role, and status.
- Search and filter options to find specific users.

**Actions:**

- **Create a New User:**
  1. Click the **Add User** button.
  2. Fill in the required fields: **Name**, **Email**, **Password**, and **Role**.
  3. Optionally fill in additional details such as address, emergency contact, and government IDs (SSS, PhilHealth, PagIBIG, TIN).
  4. Click **Save**.

<!-- ![Add User](images/users-add.png) -->

- **Edit a User:**
  1. Click the **Edit** button on the user's row.
  2. Update the user's information or change their role.
  3. Click **Save**.

<!-- ![Edit User](images/users-edit.png) -->

- **Reset a User's Password:**
  1. Click the **Reset Password** button on the user's row.
  2. Confirm the action. A new password will be generated or set.

- **Delete a User:**
  1. Click the **Delete** button.
  2. Confirm the deletion. The user will be soft-deleted and can be restored from the Trash Bin.

---

## 1.5 Activity Logs

View a record of all actions performed in the system for audit and tracking purposes.

**Navigate to:** Sidebar > **Activity Logs**

<!-- ![Activity Logs](images/activity-logs.png) -->

**What you will see:**

- A chronological list of all system actions.
- Each entry shows: **User** who performed the action, **Action** taken (e.g., created, updated, deleted), **Target** (what was affected), and **Timestamp**.
- Search and filter options to narrow down by user, action type, or date range.

> **Note:** Activity logs are read-only. They cannot be edited or deleted, ensuring a reliable audit trail.

---

## 1.6 Trash Bin

Recover accidentally deleted records or permanently remove them.

**Navigate to:** Sidebar > **Trash Bin**

<!-- ![Trash Bin](images/trash-bin.png) -->

**What you will see:**

- A list of all soft-deleted records across modules (projects, users, employees, clients, etc.).
- Each entry shows what was deleted, when, and by whom.

**Actions:**

- **Restore:** Click the **Restore** button to recover a deleted item back to its original location.
- **Permanently Delete:** Click the **Force Delete** button to permanently remove the record. This action cannot be undone.

---

## 1.7 Project Management

The core module of the system. Manage your construction projects from start to finish.

**Navigate to:** Sidebar > **Project Management**

### 1.7.1 Project List

<!-- ![Project List](images/projects-list.png) -->

**What you will see:**

- A table/card view of all projects.
- Each project shows: **Project Code**, **Project Name**, **Client**, **Status**, **Priority**, **Start Date**, **Planned End Date**, **Location**, and **Progress**.
- Filters for status (Active, On Hold, Completed, Cancelled) and search by project name/code.
- Pagination for navigating through large lists.

**Project Statuses:**

| Status | Color | Description |
|--------|-------|-------------|
| Active | Green | Currently in progress |
| On Hold | Yellow | Temporarily paused |
| Completed | Blue | Finished |
| Cancelled | Red | Terminated |

---

### 1.7.2 Creating a Project

1. From the Project List, click the **Create Project** button.
2. The project creation form is organized in steps (wizard):

<!-- ![Create Project - Step 1](images/projects-create-step1.png) -->

**Step 1: Project Information**
  - **Project Code** — a unique identifier (e.g., PRJ-001)
  - **Project Name** — descriptive name of the project
  - **Client** — select from existing clients
  - **Project Type** — select from configured project types
  - **Status** — initial status (usually "Active")
  - **Priority** — Low, Medium, High, or Critical
  - **Billing Type** — Fixed Price or Milestone-based
  - **Contract Amount** — total contract value
  - **Start Date** and **Planned End Date**
  - **Location** — project site address
  - **Description** — details about the project

<!-- ![Create Project - Step 2](images/projects-create-step2.png) -->

**Step 2: Documents** (Optional)
  - Upload key project documents such as:
    - Building Permit
    - Business Permit
    - Environmental Compliance
    - Contractor License
    - Surety Bond
    - Signed Contract
    - Notice to Proceed

<!-- ![Create Project - Step 3](images/projects-create-step3.png) -->

**Step 3: Milestones** (Optional)
  - Add initial milestones with name, description, start date, due date, billing percentage, and status.

**Step 4: Team Members** (Optional)
  - Assign team members with their role, pay type, and rate.

**Step 5: Labor Cost** (Optional)
  - Set up initial labor cost records.

3. Click **Save** to create the project.

---

### 1.7.3 Project Detail View

After creating a project or clicking on an existing project, you will see the **Project Detail** page with multiple tabs.

<!-- ![Project Detail](images/project-detail.png) -->

The tabs along the top are:
- **Overview** — project summary and key information
- **Team Members** — assigned personnel
- **Material Allocation** — materials allocated to this project
- **Labor Cost** — payroll and labor tracking
- **Miscellaneous** — other expenses
- **Milestones** — project milestones, tasks, progress updates, and issues

---

### 1.7.4 Overview Tab

<!-- ![Project Overview](images/project-overview.png) -->

**What you will see:**

- **Project Information** — code, name, client, type, status, priority, dates, location, description, billing type, and contract amount.
- **Financial Summary** — total billed, total paid, remaining balance.
- **Progress Indicator** — overall project completion percentage.
- **Recent Activity** — latest actions taken on this project.

**Actions:**

- **Edit Project:** Click the **Edit** button to modify project details.
- **Delete Project:** Click the **Delete** button to soft-delete the project.

---

### 1.7.5 Team Members Tab

<!-- ![Team Members](images/project-team.png) -->

Manage the people assigned to this project — both internal users and employees.

**What you will see:**

- A list of all team members with: **Name**, **Role** (e.g., Project Manager, Foreman, Engineer, Laborer), **Pay Type** (Hourly, Salary, or Fixed), **Rate/Salary**, **Assignment Status** (Active, Completed, Released), **Start Date**, and **End Date**.

**Actions:**

- **Add Team Member:**
  1. Click the **Add Member** button.
  2. Select a **User** or **Employee** from the dropdown.
  3. Assign a **Role** for the project.
  4. Set the **Pay Type** and corresponding rate (hourly rate or monthly salary).
  5. Set the **Start Date**.
  6. Click **Save**.

<!-- ![Add Team Member](images/project-team-add.png) -->

- **Edit Team Member:** Update the role, rate, or dates.
- **Update Status:** Change a team member's assignment status (e.g., mark as Completed or Released).
- **Release Member:** Remove a team member from the project (records are kept for history).
- **Force Remove:** Permanently remove a team member assignment.
- **Bulk Status Update:** Update the status of multiple team members at once.
- **View Assignment History:** See the full history of team assignments and changes.

---

### 1.7.6 Material Allocation Tab

<!-- ![Material Allocation](images/project-materials.png) -->

Track materials allocated to this project from inventory or direct supply.

**What you will see:**

- A list of allocated materials with: **Item Name**, **Source** (Inventory or Direct Supply), **Quantity Allocated**, **Quantity Received**, **Quantity Remaining**, **Unit Price**, **Total Cost**, **Status** (Pending, Partial, Received), **Allocated By**, and **Date**.

**Actions:**

- **Create Receiving Report:**
  1. Click the **Add Receiving Report** button on a material allocation.
  2. Enter the **Quantity Received** and **Condition** (e.g., Good, Damaged).
  3. Add any **Notes**.
  4. Click **Save**.

<!-- ![Receiving Report](images/project-materials-receiving.png) -->

  The system automatically updates the quantity received and remaining amounts.

- **Bulk Receiving Report:** Process multiple material receiving reports at once.
- **Edit Receiving Report:** Update the received quantity or condition.
- **Delete Receiving Report:** Remove a receiving report entry.
- **Delete Allocation:** Remove an entire material allocation from the project.

> **Note:** Materials are allocated to projects from the **Inventory** or **Direct Supply** modules. See sections [1.12](#112-inventory-management) and [1.13](#113-direct-supply-management).

---

### 1.7.7 Labor Cost Tab

<!-- ![Labor Cost](images/project-labor.png) -->

Track labor costs and payroll for project team members.

**What you will see:**

- A list of labor cost records with: **Team Member Name**, **Pay Period** (start to end date), **Pay Type**, **Days Present**, **Gross Pay**, **Status**, and **Notes**.

**Actions:**

- **Add Labor Cost:**
  1. Click the **Add Labor Cost** button.
  2. Select a **Team Member** (user or employee assigned to the project).
  3. Set the **Period Start** and **Period End** dates.
  4. Select the **Pay Type**:
     - **Hourly** — enter the daily rate and mark attendance per day.
     - **Salary** — enter the monthly salary; system computes based on days present.
     - **Fixed** — enter a fixed gross pay amount.
  5. Fill in the **Attendance** for each day in the period.
  6. Add optional **Description** and **Notes**.
  7. Click **Save**.

<!-- ![Add Labor Cost](images/project-labor-add.png) -->

- **Edit Labor Cost:** Update the attendance, rate, or notes.
- **Submit Labor Cost:** Finalize the labor cost record. The system computes the **Payroll Breakdown** (daily amounts based on attendance and rate) and the total **Gross Pay**.
- **Delete Labor Cost:** Remove a labor cost record.

---

### 1.7.8 Miscellaneous Expenses Tab

<!-- ![Miscellaneous](images/project-misc.png) -->

Track additional project expenses that are not labor or materials.

**What you will see:**

- A list of miscellaneous expenses with: **Expense Type**, **Expense Name**, **Date**, **Amount**, **Description**, **Notes**, and **Created By**.

**Actions:**

- **Add Expense:**
  1. Click the **Add Expense** button.
  2. Enter the **Expense Type** (e.g., Transportation, Equipment Rental, Permits).
  3. Enter the **Expense Name**, **Date**, and **Amount**.
  4. Add optional **Description** and **Notes**.
  5. Click **Save**.

<!-- ![Add Expense](images/project-misc-add.png) -->

- **Edit Expense:** Update any field.
- **Delete Expense:** Remove the expense record.

---

### 1.7.9 Milestones Tab

<!-- ![Milestones](images/project-milestones.png) -->

Milestones represent major phases or deliverables within a project. Each milestone can contain tasks, and each task can have progress updates and issues.

**What you will see:**

- A list of milestones with: **Name**, **Description**, **Start Date**, **Due Date**, **Billing Percentage**, **Status**, and the number of tasks.

**Actions:**

- **Add Milestone:**
  1. Click the **Add Milestone** button.
  2. Enter the **Name** and **Description**.
  3. Set the **Start Date** and **Due Date**.
  4. Enter the **Billing Percentage** (what percentage of the contract this milestone covers).
  5. Set the **Status** (e.g., Pending, In Progress, Completed).
  6. Click **Save**.

<!-- ![Add Milestone](images/project-milestones-add.png) -->

- **Edit Milestone:** Update any field.
- **Delete Milestone:** Remove the milestone and its associated tasks.
- **Export to PDF:** Download a PDF report of all milestones.
- **Material Usage:** Track materials used per milestone (see below).

**Milestone Material Usage:**

Within each milestone, you can record how much of the allocated materials were actually used.

- **Add Material Usage:**
  1. Click **Add Material Usage** on the milestone.
  2. Select the **Material Allocation** (from the project's allocated materials).
  3. Enter the **Quantity Used**.
  4. Add optional **Notes**.
  5. Click **Save**.

- **Edit/Delete Material Usage:** Update or remove usage records.

---

### 1.7.10 Tasks (Inside Milestones)

<!-- ![Tasks](images/project-tasks.png) -->

Tasks are specific work items within a milestone. They can be assigned to team members and tracked for completion.

**What you will see:**

- A list of tasks under each milestone with: **Title**, **Description**, **Assigned To**, **Due Date**, **Status** (Pending, In Progress, Completed), and counts of progress updates, issues, and client requests.

**Actions:**

- **Add Task:**
  1. Click the **Add Task** button within a milestone.
  2. Enter the **Title** and **Description**.
  3. Select **Assigned To** (a user from the project team).
  4. Set the **Due Date**.
  5. Set the initial **Status**.
  6. Click **Save**.

<!-- ![Add Task](images/project-tasks-add.png) -->

- **Edit Task:** Update the title, description, assignee, due date, or status.
- **Update Task Status:** Quickly change the task status without editing all fields.
- **Delete Task:** Remove the task.
- **View Task Detail:** Click on a task to see its progress updates, issues, and client request updates in a detail modal.

---

### 1.7.11 Progress Updates (Inside Tasks)

<!-- ![Progress Updates](images/project-progress.png) -->

Track the progress of each task with text descriptions and file attachments.

**What you will see:**

- A chronological list of progress updates for each task, showing: **Description**, **File Attachment** (if any — images, PDFs, documents), **Created By**, and **Date**.

**Actions:**

- **Add Progress Update:**
  1. Click the **Add Update** button.
  2. Enter a **Description** of the progress.
  3. Optionally attach a **File** (images, PDFs, documents, etc.).
  4. Click **Save**.

<!-- ![Add Progress Update](images/project-progress-add.png) -->

- **Edit Progress Update:** Update the description or replace the file.
- **Delete Progress Update:** Remove the update.
- **Download File:** Download the attached file.

> **Note:** Progress updates are visible to clients through the Client Portal, allowing them to track project progress in real-time.

---

### 1.7.12 Issues (Inside Projects)

<!-- ![Issues](images/project-issues.png) -->

Report and track problems or concerns that arise during the project.

**What you will see:**

- A list of issues with: **Title**, **Description**, **Priority** (Low, Medium, High, Critical), **Status** (Open, In Progress, Resolved, Closed), **Reported By**, **Assigned To**, **Due Date**, and **Resolved Date**.

**Actions:**

- **Add Issue:**
  1. Click the **Add Issue** button.
  2. Enter the **Title** and **Description**.
  3. Set the **Priority**.
  4. Optionally assign the issue to a team member.
  5. Set a **Due Date** for resolution.
  6. Click **Save**.

<!-- ![Add Issue](images/project-issues-add.png) -->

- **Edit Issue:** Update any field, including changing the status to mark progress.
- **Delete Issue:** Remove the issue.

---

### 1.7.13 Client Request Updates

<!-- ![Client Requests](images/project-requests.png) -->

View update requests submitted by clients through the Client Portal. These are messages from clients asking for information about specific tasks.

**What you will see:**

- A list of client requests with: **Subject**, **Message**, **Client Name**, and **Date Submitted**.

**Actions:**

- **Mark as Viewed:** Mark individual or bulk requests as viewed so you know which ones have been addressed.
- **Delete:** Remove a client request.

> **Note:** When a client submits a request update on a task, it appears here. Respond by updating the task's progress with a new progress update.

---

### 1.7.14 Project Files

<!-- ![Project Files](images/project-files.png) -->

Upload and manage documents related to the project.

**What you will see:**

- A list of uploaded files with: **File Name**, **Category**, **Description**, **File Size**, **Type**, and **Upload Date**.

**Actions:**

- **Upload File:** Click the **Upload** button, select a file, assign a category and description, then save.
- **Edit File:** Update the file's metadata (name, category, description).
- **Download File:** Download the file to your computer.
- **Delete File:** Remove the file from the project.

---

### 1.7.15 Archiving Projects

Completed or inactive projects can be archived to keep the active project list clean.

**Actions:**

- **Archive Project:** From the project detail or list, click the **Archive** button. Archived projects are moved to the archived view.
- **View Archived Projects:** Click the **Archived** tab on the project list page to see all archived projects.
- **Unarchive Project:** Click the **Unarchive** button on an archived project to move it back to the active list.

<!-- ![Archived Projects](images/projects-archived.png) -->

---

## 1.8 Project Type Management

Define and manage the categories/types of projects your company handles (e.g., Residential, Commercial, Industrial).

**Navigate to:** Sidebar > **Project Type Management**

<!-- ![Project Types](images/project-types.png) -->

**What you will see:**

- A table listing all project types with: **Name**, **Description**, and **Status** (Active/Inactive).

**Actions:**

- **Add Project Type:**
  1. Click the **Add Type** button.
  2. Enter the **Name** and **Description**.
  3. Click **Save**.

<!-- ![Add Project Type](images/project-types-add.png) -->

- **Edit Project Type:** Update the name or description.
- **Toggle Status:** Activate or deactivate a project type. Inactive types will not appear as options when creating new projects.
- **Delete Project Type:** Remove the project type.

---

## 1.9 Employee Management

Manage employees who work on projects but may not have system login accounts (e.g., laborers, skilled workers).

**Navigate to:** Sidebar > **Employee Management**

<!-- ![Employees](images/employees.png) -->

**What you will see:**

- A table listing all employees with: **Employee ID** (auto-generated, format: EMP-00001), **Name**, **Position**, **Contact Information**, and **Status**.

**Actions:**

- **Add Employee:**
  1. Click the **Add Employee** button.
  2. Enter the employee's **Name**, **Position**, **Contact Details**, **Address**, **Emergency Contact**, and **Government IDs** (SSS, PhilHealth, PagIBIG, TIN).
  3. Click **Save**.
  4. The system automatically generates a unique Employee ID.

<!-- ![Add Employee](images/employees-add.png) -->

- **Edit Employee:** Update any employee information.
- **Update Status:** Activate or deactivate an employee.
- **Delete Employee:** Soft-delete the employee record.

> **Note:** Employees can be assigned to project teams alongside system users. They are tracked separately from users who log into the system.

---

## 1.10 Client Management

Manage client accounts for companies or individuals who commission your projects. Clients can access the Client Portal mobile app to view their projects and make payments.

**Navigate to:** Sidebar > **Client Management**

<!-- ![Clients](images/clients.png) -->

**What you will see:**

- A table listing all clients with: **Client Code**, **Client Name**, **Client Type**, **Company**, **Email**, **Phone**, **Status**, and **Credit Limit**.

**Actions:**

- **Add Client:**
  1. Click the **Add Client** button.
  2. Enter the **Client Code**, **Client Name**, **Email**, and **Password** (for Client Portal login).
  3. Select the **Client Type**.
  4. Fill in business details: **Company**, **Phone Number**, **Tax ID**, **Business Permit**, **Credit Limit**, and **Payment Terms**.
  5. Click **Save**.

<!-- ![Add Client](images/clients-add.png) -->

- **Edit Client:** Update client information.
- **Update Status:** Activate or deactivate a client.
- **Reset Password:** Reset the client's Client Portal password.
- **Delete Client:** Soft-delete the client record.

> **Important:** The email and password you set here are what the client will use to log into the **Client Portal** mobile app. Always share the credentials securely.

---

## 1.11 Client Type Management

Define and manage the categories of clients (e.g., Individual, Corporation, Government Agency).

**Navigate to:** Sidebar > **Client Type Management**

<!-- ![Client Types](images/client-types.png) -->

**What you will see:**

- A table listing all client types with: **Name**, **Description**, and **Status** (Active/Inactive).

**Actions:**

- **Add Client Type:** Click the **Add Type** button, enter the name and description, then save.
- **Edit Client Type:** Update the name or description.
- **Toggle Status:** Activate or deactivate a client type.
- **Delete Client Type:** Remove the client type.

<!-- ![Add Client Type](images/client-types-add.png) -->

---

## 1.12 Inventory Management

Track materials and supplies in your warehouse/storage.

**Navigate to:** Sidebar > **Inventory Management**

<!-- ![Inventory](images/inventory.png) -->

**What you will see:**

- A table listing all inventory items with: **Item Code**, **Item Name**, **Category**, **Unit of Measure**, **Current Stock**, **Minimum Stock Level**, **Unit Price**, and **Status**.
- A **Transactions** tab showing the history of all stock movements.

**Actions:**

- **Add Inventory Item:**
  1. Click the **Add Item** button.
  2. Enter the **Item Code**, **Item Name**, **Description**, **Category**, **Unit of Measure**, **Unit Price**, and **Minimum Stock Level**.
  3. Click **Save**.

<!-- ![Add Inventory Item](images/inventory-add.png) -->

- **Edit Item:** Update item details.

- **Stock In:**
  1. Click the **Stock In** button on an item.
  2. Enter the **Quantity**, **Unit Price**, **Transaction Date**, and **Notes**.
  3. Click **Save**. The current stock is automatically updated.

<!-- ![Stock In](images/inventory-stock-in.png) -->

- **Stock Out:**
  1. Click the **Stock Out** button on an item.
  2. Enter the **Quantity** and select the **Stock Out Type**:
     - **Direct** — manual stock out
     - **Project Use** — linked to a project (select the project)
     - **Adjustment** — inventory correction
  3. Add **Notes** and click **Save**.

<!-- ![Stock Out](images/inventory-stock-out.png) -->

- **View Transactions:** Switch to the **Transactions** tab to see a full history of all stock-in and stock-out records with dates, quantities, and associated projects.

- **Archive/Restore:** Archive inactive items to keep the list clean. Restore them when needed.
- **Delete Item:** Remove an inventory item.

---

## 1.13 Direct Supply Management

Manage materials that are sourced directly from suppliers for specific projects (not from your inventory).

**Navigate to:** Sidebar > **Direct Supply Management**

<!-- ![Direct Supply](images/direct-supply.png) -->

**What you will see:**

- A table listing all direct supplies with: **Supply Code**, **Supply Name**, **Category**, **Unit of Measure**, **Unit Price**, **Supplier Name**, **Supplier Contact**, and **Status**.

**Actions:**

- **Add Direct Supply:**
  1. Click the **Add Supply** button.
  2. Enter the **Supply Code**, **Supply Name**, **Description**, **Category**, **Unit of Measure**, and **Unit Price**.
  3. Enter the **Supplier Name** and **Supplier Contact**.
  4. Click **Save**.

<!-- ![Add Direct Supply](images/direct-supply-add.png) -->

- **Edit Supply:** Update supply details.
- **Update Status:** Activate or deactivate a supply.
- **Allocate to Project:**
  1. Click the **Allocate** button on a supply.
  2. Select the **Project** to allocate to.
  3. Enter the **Quantity** and any **Notes**.
  4. Click **Save**. A material allocation record is created on the project.

<!-- ![Allocate Supply](images/direct-supply-allocate.png) -->

- **Archive/Restore:** Archive inactive supplies.
- **Delete Supply:** Remove the supply record.

---

## 1.14 Billing Management

Create and manage invoices for your projects. Track payments and integrate with PayMongo for online client payments.

**Navigate to:** Sidebar > **Billing Management**

<!-- ![Billing](images/billing.png) -->

**What you will see:**

- A table listing all billings with: **Billing Code**, **Project Name**, **Milestone** (if milestone-based), **Billing Type**, **Amount**, **Due Date**, **Status** (Unpaid, Partial, Paid), **Total Paid**, and **Remaining Amount**.

**Billing Statuses:**

| Status | Color | Description |
|--------|-------|-------------|
| Unpaid | Red | No payments received |
| Partial | Yellow | Some payments received, balance remaining |
| Paid | Green | Fully paid |

**Actions:**

- **Create Billing:**
  1. Click the **Add Billing** button.
  2. Select the **Project**.
  3. Choose the **Billing Type** (Fixed Price or Milestone).
  4. If milestone-based, select the **Milestone**.
  5. Enter the **Billing Amount**, **Billing Date**, **Due Date**, and **Description**.
  6. Click **Save**.

<!-- ![Create Billing](images/billing-add.png) -->

- **View Billing Detail:** Click on a billing to see full details including payment history.

- **Add Payment:**
  1. Click the **Add Payment** button on a billing.
  2. Enter the **Payment Amount**, **Payment Date**, **Payment Method** (e.g., Cash, Bank Transfer, Check, Online).
  3. Enter the **Reference Number** and **Notes**.
  4. Click **Save**. The billing status automatically updates based on the total paid.

<!-- ![Add Payment](images/billing-payment.png) -->

- **Edit Billing:** Update billing details.
- **Delete Billing:** Remove the billing record.
- **Archive/Unarchive:** Archive completed billings.
- **Client Portal Display:** Configure which billings are visible to clients in the Client Portal.

> **Note:** Clients can also make payments directly through the Client Portal using PayMongo (online payment gateway). These payments appear automatically in the payment history.

---

## 1.15 Reports & Analytics

Generate and export comprehensive reports for data-driven decision making.

**Navigate to:** Sidebar > **Reports & Analytics**

<!-- ![Reports](images/reports.png) -->

**Available Reports:**

| Report | Description |
|--------|-------------|
| **Project Performance** | Project completion rates, timelines, milestone progress |
| **Financial** | Revenue, expenses, profitability across all projects |
| **Client** | Client activity, project counts, payment history |
| **Inventory** | Stock levels, usage, transactions, and low-stock alerts |
| **Team Productivity** | Employee/user performance, task completion rates |
| **Budget** | Budget vs. actual spending per project |

**Actions:**

- **View Report:** Select a report type to view it on screen with charts and data tables.
- **Export Report:** Click the **Export** button to download the report as a file.
- **Export All:** Download all reports at once.

<!-- ![Export Report](images/reports-export.png) -->

---

## 1.16 Chat

Communicate directly with clients through the built-in chat system.

**Navigate to:** Sidebar > **Chat** (or access via notifications)

<!-- ![Chat](images/chat.png) -->

**What you will see:**

- A list of chat conversations with clients.
- Each conversation shows the client name and the last message timestamp.

**Actions:**

- **View Conversation:** Click on a chat to see the full message history.
- **Send Message:** Type your message in the input field and send it. Messages are delivered in real-time via Pusher.
- **Read Status:** Messages show read/unread status.

---

## 1.17 Notifications

Stay informed about important events across the system.

**Access:** Click the **bell icon** in the top navigation bar.

<!-- ![Notifications](images/notifications.png) -->

**Notification Types:**
- Project updates and status changes
- New client requests
- Billing and payment events
- Task completions and issue reports
- Team assignment changes
- Inventory alerts

**Actions:**

- **View Notifications:** Click the bell icon to see the notification panel.
- **Unread Count:** The badge on the bell shows the number of unread notifications.
- **Mark as Read:** Click on a notification to mark it as read.
- **Mark All as Read:** Click the "Mark all as read" button.
- **Mark by Type:** Mark all notifications of a specific type as read.
- **Delete:** Remove individual notifications.

---

# Part 2: Client Portal (Mobile Application)

The Client Portal is a mobile application for clients to view their project progress, track milestones, manage billings, and communicate with the project team.

---

## 2.1 Logging In

Open the **Client Portal** app on your mobile device.

<!-- ![Client Portal Login](images/client-login.png) -->

**Steps:**

1. On the login screen, you will see the ASEC logo, a welcome message, and the tagline "Access your construction projects and track progress in real time."
2. Enter the **Email Address** provided by your project administrator.
3. Enter the **Password** provided by your project administrator.
4. Tap the **Sign In** button.

If your credentials are incorrect, an error banner will appear. Re-enter your correct credentials and try again.

> **Note:** If you do not have login credentials, contact your project administrator.

---

## 2.2 Changing Your Password (First Login)

If this is your first time logging in with a default password, you will be prompted to change it.

<!-- ![Change Password](images/client-change-password.png) -->

**Steps:**

1. Enter your **Current Password** (the one you were given).
2. Enter a **New Password** (at least 8 characters; mix letters, numbers, and symbols).
3. Enter the new password again in **Confirm Password**.
4. Tap **Change Password**.

You will be signed out and redirected to the login screen. Log in again with your new password.

> **Tip:** You can also tap **Skip for Now** to change your password later, but it is recommended to change it immediately for security.

---

## 2.3 Home / Dashboard

After logging in, you land on the **Home** screen — a quick overview of your projects and billings.

<!-- ![Client Dashboard](images/client-dashboard.png) -->

**What you will see:**

- **Greeting** — "Good day, [Your Name]" with your company name.
- **Notification Bell** — tap to view notifications. A badge shows the number of unread notifications.
- **Project Statistics** — three cards showing:
  - Number of **Active** projects
  - Number of **Completed** projects
  - Number of **On-Time** projects
- **Billing Summary** (if enabled) — shows counts of Unpaid, Partial, and Paid invoices, total outstanding amount, and overdue indicator.
- **Recent Billings** — up to 5 of your most recent invoices with billing code, amount, due date, and status.
- **Active Projects** — up to 3 of your active projects showing name, location, progress bar, and status.

**Actions:**

- Tap a **billing card** to go to billing detail.
- Tap a **project card** to go to project detail.
- Tap **See All** to view the complete list.
- **Pull down** to refresh all data.

---

## 2.4 Projects

Tap the **Projects** tab at the bottom of the screen to browse all your projects.

<!-- ![Client Projects](images/client-projects.png) -->

**What you will see:**

- A list of project cards showing: **Project Name**, **Location**, **Status** (color-coded badge), **Progress** (percentage and bar), and **Due Date**.
- **Search bar** at the top to find projects by name.
- **Status filter chips**: All, Active, On Hold, Completed.

**Actions:**

- **Search** projects by name.
- **Filter** by status.
- **Sort** by name, progress, budget, date, or status (ascending or descending).
- Tap a project to view its details.
- **Pull down** to refresh.

---

### 2.4.1 Project Detail

<!-- ![Client Project Detail](images/client-project-detail.png) -->

After tapping on a project, you see the detail view with three tabs:

**Overview Tab:**
- **Stats Strip** — Contract Value, Payment Status, Started Date, Due Date.
- **Payment Chip** — shows remaining payment amount if applicable.
- **Project Details** — location and description.
- **Team** — list of assigned team members with their name, role, and email.

**Milestones Tab:**
- List of milestone cards showing: name, progress percentage, due date, status, and number of tasks.
- Tap a milestone to see its tasks.

**Materials Tab:**
- List of allocated materials showing: item name, code, quantities (allocated/received/remaining), unit price, total cost, status, and notes.

---

### 2.4.2 Milestones

<!-- ![Client Milestones](images/client-milestones.png) -->

After tapping a milestone, you see all tasks within it.

**What you will see:**

- **Milestone Name** and **Project Name** in the header.
- **Filter chips**: All, Pending, In Progress, Completed.
- **Task cards** showing: status icon, task name, due date, assigned person, and counts of progress updates, issues, and requests.

**Actions:**

- Filter tasks by status.
- Tap a task to view its detail.

---

### 2.4.3 Task Detail

<!-- ![Client Task Detail](images/client-task-detail.png) -->

View the full details of a specific task including progress updates, issues, and your requests.

**Three tabs:**

**Progress Tab:**
- List of progress updates from the project team.
- Each update shows: author name, date, description, and any attachments (images displayed inline, documents shown as downloadable).

**Issues Tab:**
- List of issues linked to this task.
- Each issue shows: priority badge, title, status, reported by, due date, and resolved date.

**Requests Tab:**
- History of update requests you have sent for this task.

---

### 2.4.4 Requesting an Update

If you want to ask the project team for a status update on a specific task:

<!-- ![Request Update](images/client-request-update.png) -->

1. On the **Task Detail** screen, tap the **Request Update** button (envelope icon in the header).
2. In the modal that appears, enter a **Subject** for your request.
3. Type your **Message** explaining what information you need.
4. Tap **Submit**.

The project team will receive a notification and can respond with a progress update.

---

## 2.5 Billings

Tap the **Billings** tab at the bottom of the screen to manage your invoices and payments.

### 2.5.1 Viewing Invoices

<!-- ![Client Billings](images/client-billings.png) -->

**What you will see:**

- **Billings Tab** — list of all your invoices.
- **Status filter chips**: All, Unpaid, Partial, Paid.
- Each billing card shows: **Billing Code**, **Project Name**, **Amount**, **Due Date**, **Status**, and **Payment Progress** percentage.
- **Search bar** to find invoices by billing code or project name.

**Actions:**

- Filter by status.
- Search for specific invoices.
- Sort by various fields.
- Tap an invoice to see its details.

---

### 2.5.2 Making a Payment

<!-- ![Client Payment](images/client-billing-detail.png) -->

1. Tap on an invoice to open the **Billing Detail** screen.
2. You will see:
   - **Invoice Card** with billing code, project name, and status badge.
   - **Invoice Amount** displayed prominently.
   - **Payment Progress** — bar showing how much has been paid with total paid and remaining amounts.
   - **Billing Information** — type, amount, billing date, due date, description, and milestone (if applicable).
   - **Payment History** — list of all payments made on this invoice.

3. If the invoice is **Unpaid** or **Partial**, you will see a **Pay Now** button at the bottom.
4. Tap **Pay Now**.
5. In the payment modal:
   - Optionally enter a **custom amount** (must be between 1 and the remaining amount, maximum PHP 9,999,999.99).
   - Or leave blank to pay the full remaining amount.
6. Tap **Send Payment**.
7. You will be redirected to the **PayMongo** payment gateway in your browser to complete the transaction.
8. After payment, return to the app. The payment status will update automatically.

<!-- ![Pay Now](images/client-pay-now.png) -->

---

### 2.5.3 Transactions History

<!-- ![Client Transactions](images/client-transactions.png) -->

Switch to the **Transactions** tab (next to Billings) to see a complete history of all your payments.

**What you will see:**

- List of transaction cards showing: **Transaction Date**, **Amount**, **Payment Method**, **Status** (Pending, Paid, Failed, Cancelled), and **Reference Number**.

---

## 2.6 Notifications

Tap the **bell icon** on the Home screen to view your notifications.

<!-- ![Client Notifications](images/client-notifications.png) -->

**Notification Types:**
- Project status changes
- Milestone completions
- New progress updates
- Issue updates
- Billing and payment confirmations

**Actions:**

- Tap a notification to mark it as read.
- **Mark All as Read** — mark all notifications as read at once.
- **Clear All** — delete all notifications.

> **Note:** The app also sends **push notifications** to your device so you can stay informed even when the app is closed.

---

## 2.7 Account & Settings

Tap the **About** tab (profile icon) at the bottom of the screen.

<!-- ![Client Account](images/client-account.png) -->

**What you will see:**

- **Profile Card** — your avatar (initials), name, company, and client code.
- **Account Section** — your full name, email, company, and phone number (read-only).
- **Support Section:**
  - **Help Center** — tap to view FAQs and documentation.
  - **Contact Support** — tap to send an email to the support team.
- **About Section** — app version and company information.
- **Sign Out** — tap to log out of the app.

---

## 2.8 Help Center

Tap **Help Center** from the Account screen to access self-service documentation.

<!-- ![Client Help Center](images/client-help-center.png) -->

**What you will see:**

- **Features Overview** — brief description of each app tab (Home, Projects, Billings, Notifications).
- **FAQ Section** — tap on questions to expand/collapse answers:
  - How do I view my projects?
  - How do I check project progress?
  - What are milestones?
  - How do I request a project update?
  - How do I contact my project manager?
  - What do the project statuses mean?
  - How do I view notifications?
  - How do I pay a billing invoice?

---

# Part 3: Task Management (Mobile Application)

The Task Management app is a mobile application for field personnel (foremen, engineers) to manage their assigned tasks, report progress, and track issues — all from their phone.

---

## 3.1 Logging In

Open the **Task Management** app on your mobile device.

<!-- ![TM Login](images/tm-login.png) -->

**Steps:**

1. On the login screen, enter your **Email Address** (same as your Admin Portal account).
2. Enter your **Password**.
3. Tap the **Sign In** button.

If your credentials are incorrect, an error banner will appear. Re-enter your correct credentials and try again.

> **Note:** You must have a role with `tm.access` permission (e.g., Foreman (TM) or Engineer (TM)) to log into this app. Contact your administrator if you cannot access it.

---

## 3.2 Home / Dashboard

After logging in, you land on the **Home** screen.

<!-- ![TM Dashboard](images/tm-dashboard.png) -->

**What you will see:**

- **Greeting** — "Hello, [Your Name]" with the ASEC logo.
- **Statistics Row** — three cards:
  - **Total Tasks** — all tasks assigned to you
  - **In Progress** — tasks you are currently working on
  - **Completed** — tasks you have finished
- **Alert Card** — appears if you have overdue or critical tasks requiring immediate attention.
- **Upcoming Tasks** — up to 5 of your nearest-due tasks showing title, status, due date, and project name.
- **Quick Action Cards:**
  - **All Tasks** — navigate to the full tasks list
  - **History** — navigate to completed tasks and progress updates

**Actions:**

- Tap a task card to go to task detail.
- Tap **See All** to view the full tasks list.
- Tap quick action cards to navigate.
- **Pull down** to refresh dashboard data.

---

## 3.3 Tasks

Tap the **Tasks** tab at the bottom of the screen to view all your assigned tasks.

### 3.3.1 Task List

<!-- ![TM Tasks](images/tm-tasks.png) -->

**What you will see:**

- **Header** showing the total task count and current filter/sort.
- **Search bar** — search tasks by title or description (live search with 300ms delay).
- **Status filter chips**: All, Pending, In Progress, Completed.
- **Task cards** — each card shows:
  - **Status-colored accent bar** on the left edge
  - **Title** and **description preview**
  - **Status pill** and **due date**
  - **Project name**
  - **Overdue indicator** (red) or **days remaining**

**Actions:**

- **Search** tasks by typing in the search bar.
- **Filter** by tapping status chips.
- **Sort** — tap the sort icon to choose from: due date (ascending/descending), creation date (ascending/descending), title (A-Z/Z-A).
- **Tap a task** to view its detail.
- **Pull down** to refresh.

---

### 3.3.2 Task Detail

<!-- ![TM Task Detail](images/tm-task-detail.png) -->

After tapping on a task, you see the full detail view.

**What you will see:**

- **Header** with the task title and an edit button.
- **Task Info Section:**
  - Status (with ability to change)
  - Priority (Low, Medium, High, Critical)
  - Due Date
  - Assigned To
- **Description** and **Project/Milestone** info.
- **Four sections:**
  1. **Progress Updates** — your updates and others' updates on this task
  2. **Issues** — reported issues linked to this task
  3. **Request Updates** — messages from the client
  4. **Team Comments** — (if available)

- **Floating Action Button (FAB)** at the bottom right — tap to expand and reveal:
  - **Add Progress Update**
  - **Report Issue**

---

### 3.3.3 Updating Task Status

<!-- ![TM Status Update](images/tm-task-status.png) -->

1. On the Task Detail screen, tap on the **Status** section.
2. A status selector modal will appear.
3. Select the new status: **Pending**, **In Progress**, or **Completed**.
4. The status updates immediately.

---

### 3.3.4 Adding a Progress Update

<!-- ![TM Progress Update](images/tm-progress-add.png) -->

1. On the Task Detail screen, tap the **FAB** (floating button at bottom right).
2. Tap **Add Progress Update**.
3. In the modal:
   - Enter a **Description** of what was accomplished.
   - Optionally attach a **File** (tap the attachment icon to pick a file from your device — images, PDFs, documents).
4. Tap **Submit**.

The progress update will appear in the task's progress updates list and will be visible to administrators and clients.

**Managing Existing Updates:**

- **Edit:** Tap on your own progress update to edit the description.
- **Delete:** Tap on your own progress update and confirm deletion.
- **Download:** Tap the file attachment to download it.

> **Note:** You can only edit and delete your own progress updates, not those created by others.

---

### 3.3.5 Reporting an Issue

<!-- ![TM Report Issue](images/tm-issue-add.png) -->

1. On the Task Detail screen, tap the **FAB** (floating button at bottom right).
2. Tap **Report Issue**.
3. In the modal:
   - Enter an **Issue Title**.
   - Enter a **Description** of the problem.
   - Select the **Priority**: Low, Medium, High, or Critical.
4. Tap **Submit**.

The issue will be logged and visible to administrators for resolution.

**Managing Existing Issues:**

- **Edit:** Tap on your own issue to update its status.
- **Delete:** Tap on your own issue and confirm deletion.

---

## 3.4 History

Tap the **History** tab at the bottom of the screen to review completed work.

<!-- ![TM History](images/tm-history.png) -->

**What you will see:**

- A mixed list of **Completed Tasks** and **Progress Updates**.
- **Search bar** to search across all history items.
- **Filter chips**: All, Completed Tasks, Progress Updates.
- Each card shows:
  - **Completed tasks** — green checkmark icon, title, project name, completion date.
  - **Progress updates** — blue update icon, description, project name, date, and file attachment preview (if any).

**Actions:**

- Search and filter to find specific completed items.
- Tap an item to view the task detail.
- **Pull down** to refresh.

---

## 3.5 Projects (Engineer Role)

If you have the **Engineer (TM)** role, you will see a **Projects** tab at the bottom of the screen. This gives you full visibility into your assigned projects.

> **Note:** This tab is only visible to users with the `tm.projects.view-assigned` permission. Foreman (TM) users will not see this tab.

<!-- ![TM Projects](images/tm-projects.png) -->

**What you will see:**

- A list of project cards showing: **Project Name**, **Project Code**, **Status** (color-coded), **Priority**, **Date Range**, **Location**, and counts of milestones and team members.
- **Search bar**, **status filters**, and **sort options** (same as other lists).

**Actions:**

- Search and filter projects.
- Sort by name, start date, or end date.
- Tap a project to view its detail.
- **Pull down** to refresh.

---

### 3.5.1 Project Detail

<!-- ![TM Project Detail](images/tm-project-detail.png) -->

After tapping a project, you see the full project information:

- **Header** — project name, code, status, priority.
- **Info Cards** — location, date range, description, team summary.
- **Milestones Section** — expandable milestones with progress bars, dates, and material usage.
- **Team Members Section** — list of assigned personnel with roles.
- **Material Allocations Section** — allocated materials and their status.

---

### 3.5.2 Managing Milestones

With Engineer (TM) permissions, you can manage milestones directly from the app.

<!-- ![TM Milestones](images/tm-milestones-manage.png) -->

**Actions:**

- **Add Milestone:** Tap the add button, fill in name, description, start date, due date, billing percentage, and status, then save.
- **Edit Milestone:** Tap an existing milestone to update its details.
- **Delete Milestone:** Confirm deletion.
- **Add Material Usage:** Record material usage per milestone.

---

### 3.5.3 Managing Tasks within Milestones

Navigate to a milestone's task list to manage tasks.

<!-- ![TM Milestone Tasks](images/tm-milestone-tasks.png) -->

**Actions:**

- **Add Task:** Tap the add button, enter title, description, assigned user, due date, and status.
- **Edit Task:** Update task details.
- **Delete Task:** Remove a task.
- **Filter and Sort:** Same controls as the main tasks list.

---

### 3.5.4 Managing Team Members

Engineers can manage the project team directly.

**Actions:**

- **View Team:** See all team members with their roles and status.
- **Add Team Member:** Select from available users/employees, assign a role, set rate and dates.
- **Update Member:** Change role, rate, or status.
- **Release Member:** Mark as released from the project.
- **Force Remove:** Permanently remove from the team.

---

### 3.5.5 Material Allocations & Receiving Reports

View and manage material allocations for your assigned projects.

**Actions:**

- **View Allocations:** See all materials allocated to the project with quantities and statuses.
- **Create Receiving Report:** When materials arrive on-site, create a receiving report to record the quantity received and condition.

---

## 3.6 Profile & Settings

Tap the **Profile** tab (last tab) at the bottom of the screen.

<!-- ![TM Profile](images/tm-profile.png) -->

**What you will see:**

- **Header** — your name, email, and an edit button.
- **Account Section** — your name and email.
- **Permissions Section** (Engineer role only) — manage permission delegation.
- **Support Section:**
  - **Help Center** — FAQs and documentation.
  - **Contact Support** — send email to support.
- **About Section** — app version and company info.
- **Sign Out** button.

---

### 3.6.1 Editing Your Profile

<!-- ![TM Edit Profile](images/tm-profile-edit.png) -->

1. Tap the **Edit** button on the profile screen header.
2. In the modal, you can update:
   - **Name**
   - **Email**
   - **Password** (enter current password, then new password and confirmation)
3. Tap **Save**.

---

### 3.6.2 Permission Delegation (Engineer Role)

If you have the `tm.permissions.delegate` permission (Engineer role), you can grant other users access to the Task Management app.

<!-- ![TM Permissions](images/tm-permissions.png) -->

**What you will see:**

- A list of users you have granted access to, with toggles for **Tasks** and **Projects** module access.
- A **Grant Access** button to add new users.

**Actions:**

- **Grant Access:**
  1. Tap **Grant Access**.
  2. Search for and select a user from the eligible users list.
  3. Toggle which modules they can access: **Tasks** and/or **Projects**.
  4. Tap **Grant**.

<!-- ![TM Grant Access](images/tm-permissions-grant.png) -->

- **Update Module Access:** Toggle the Tasks/Projects switches for a granted user to change what they can see.
- **Revoke Access:** Tap the trash/revoke icon on a granted user and confirm to remove their access.

---

## 3.7 Help Center

Tap **Help Center** from the Profile screen to access self-service documentation.

<!-- ![TM Help Center](images/tm-help-center.png) -->

**FAQ Topics:**

1. **How do I view my tasks?** — Navigate to the Tasks tab to see all assigned tasks.
2. **How do I update task progress?** — Open a task and use the FAB to add a progress update.
3. **What are task statuses?** — Pending (not started), In Progress (currently working), Completed (finished).
4. **How do I report an issue?** — Open a task and use the FAB to report an issue.
5. **Can I attach files to progress updates?** — Yes, tap the attachment icon when creating a progress update.
6. **How do I view my task history?** — Go to the History tab to see completed tasks and progress updates.
7. **What do priority levels mean?** — Low (minor), Medium (normal), High (important), Critical (urgent).
8. **How do I contact support?** — Go to Profile > Contact Support to send an email.

---

## Appendix: Quick Reference

### System Roles Summary

| Role | Admin Portal | Task Management App | Client Portal |
|------|:---:|:---:|:---:|
| Super Admin | Full Access | - | - |
| Admin | Full (except user mgmt) | - | - |
| Project Manager | Projects, Teams, Billing, Reports | - | - |
| Finance Manager | Billing, Reports | - | - |
| Inventory Manager | Inventory, Materials | - | - |
| Foreman | Projects (field-level) | - | - |
| Foreman (TM) | - | Tasks, Progress, Issues | - |
| Engineer (TM) | - | Tasks, Projects, Teams, Milestones | - |
| Client | - | - | Full Access |

### Status Reference

**Project Statuses:** Active, On Hold, Completed, Cancelled

**Task Statuses:** Pending, In Progress, Completed

**Issue Statuses:** Open, In Progress, Resolved, Closed

**Issue/Task Priorities:** Low, Medium, High, Critical

**Billing Statuses:** Unpaid, Partial, Paid

**Team Assignment Statuses:** Active, Completed, Released

**Material Allocation Statuses:** Pending, Partial, Received

---

*This user manual covers the complete ASEC Project Management System. For additional help, contact your system administrator or reach out to support.*
