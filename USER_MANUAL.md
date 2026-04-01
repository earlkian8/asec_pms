# ASEC PMS — User Manual

> **Version:** 1.0 | **Last Updated:** April 2026

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Getting Started](#2-getting-started)
3. [Admin Dashboard (Web)](#3-admin-dashboard-web)
   - 3.1 [Dashboard Home](#31-dashboard-home)
   - 3.2 [Project Management](#32-project-management)
   - 3.3 [Client Management](#33-client-management)
   - 3.4 [Employee Management](#34-employee-management)
   - 3.5 [Inventory Management](#35-inventory-management)
   - 3.6 [Direct Supply Management](#36-direct-supply-management)
   - 3.7 [Billing Management](#37-billing-management)
   - 3.8 [Reports & Analytics](#38-reports--analytics)
   - 3.9 [User Management](#39-user-management)
   - 3.10 [Chat](#310-chat)
   - 3.11 [Notifications](#311-notifications)
4. [Client Mobile App](#4-client-mobile-app)
   - 4.1 [Home / Dashboard](#41-home--dashboard)
   - 4.2 [Projects](#42-projects)
   - 4.3 [Project Detail](#43-project-detail)
   - 4.4 [Billings](#44-billings)
   - 4.5 [Billing Detail & Payment](#45-billing-detail--payment)
   - 4.6 [Chat](#46-chat)
   - 4.7 [Notifications](#47-notifications)
   - 4.8 [Profile & Account Settings](#48-profile--account-settings)
5. [Task Management Mobile App](#5-task-management-mobile-app)
   - 5.1 [Home / Dashboard](#51-home--dashboard)
   - 5.2 [Tasks](#52-tasks)
   - 5.3 [Task Detail](#53-task-detail)
   - 5.4 [Projects](#54-projects)
   - 5.5 [Milestone Tasks](#55-milestone-tasks)
   - 5.6 [History](#56-history)
   - 5.7 [Permission Delegation](#57-permission-delegation)
6. [Roles & Permissions Reference](#6-roles--permissions-reference)
7. [Common Workflows](#7-common-workflows)
8. [Troubleshooting & FAQ](#8-troubleshooting--faq)

---

## 1. System Overview

ASEC PMS is an integrated Project Management System designed for construction and engineering operations. It consists of three interconnected applications:

| Application | Platform | Audience |
|---|---|---|
| **Admin Dashboard** | Web browser | Administrators, Project Managers, Staff |
| **Client App** | iOS / Android | Clients (project owners) |
| **Task Management App** | iOS / Android | Field engineers, team members |

![System Overview Diagram](docs/images/system-overview.png)
<!-- PLACEHOLDER: Insert a diagram showing the three apps and how they connect to the backend -->

### Key Capabilities

- Full project lifecycle management — from creation through milestones to billing
- Real-time team task assignment, progress updates, and issue tracking
- Client-facing project visibility and online payment via PayMongo
- Inventory and material allocation tracking
- Granular role-based access control
- Exportable reports (financial, project performance, inventory, team productivity, etc.)

---

## 2. Getting Started

### Admin Dashboard

1. Open your web browser and navigate to the system URL provided by your administrator.
2. Enter your **email address** and **password**.
3. Click **Log In**.

![Admin Login Screen](docs/images/admin-login.png)
<!-- PLACEHOLDER: Screenshot of the admin login page -->

> First-time users receive their credentials via email. You will be prompted to change your password on first login.

### Client Mobile App

1. Install the **ASEC Client** app from the App Store or Google Play.
2. Open the app and tap **Log In**.
3. Enter your email and password provided by your project manager.

![Client App Login](docs/images/client-login.png)
<!-- PLACEHOLDER: Screenshot of the client app login screen -->

### Task Management Mobile App

1. Install the **ASEC Task Management** app from the App Store or Google Play.
2. Open the app and tap **Log In**.
3. Enter your credentials (provided by your system administrator).

![Task Management App Login](docs/images/task-login.png)
<!-- PLACEHOLDER: Screenshot of the task management app login screen -->

> If you cannot log in, contact your system administrator to verify your account status and permissions.

---

## 3. Admin Dashboard (Web)

### 3.1 Dashboard Home

After logging in, the Dashboard displays a high-level summary of the system.

![Admin Dashboard Home](docs/images/admin-dashboard-home.png)
<!-- PLACEHOLDER: Screenshot of the admin dashboard home page with charts and stat cards -->

**Key Metrics Displayed:**

| Metric | Description |
|---|---|
| Total Projects | Count of all non-archived projects |
| Active Projects | Projects currently in progress |
| Average Completion | Across all milestones system-wide |
| Total Contract Amount | Sum of all project contract values |
| Total Clients | All registered clients |
| Active Clients | Currently active client accounts |
| Total Billed | Total amount invoiced |
| Total Paid | Total payments received |
| Total Remaining | Outstanding balance across all billings |
| Billing Status Counts | Breakdown: unpaid / partial / paid |

The dashboard also shows:
- **Recent Projects** — the last 5 created projects with completion percentage
- **Recent Billings** — the last 5 billing records with status
- **Billing by Status** — pie/bar chart breakdown
- **Projects by Type** — distribution of project types

---

### 3.2 Project Management

Navigate to **Project Management** from the sidebar.

![Project Management List](docs/images/project-management-list.png)
<!-- PLACEHOLDER: Screenshot of the project list with filters and action buttons -->

#### Creating a New Project

1. Click **Add Project** (or the **+** button).
2. A multi-step wizard will open:

   **Step 1 — Basic Information**
   - Project Name
   - Client (select from registered clients)
   - Project Type
   - Status (`active`, `on-hold`, `completed`, `cancelled`)
   - Priority (`low`, `medium`, `high`, `critical`)
   - Contract Amount
   - Start Date / Planned End Date
   - Location
   - Description

   **Step 2 — Documents** _(optional)_
   Upload any of the following:
   - Building Permit
   - Business Permit
   - Environmental Compliance Certificate
   - Contractor's License
   - Surety Bond
   - Signed Contract
   - Notice to Proceed

3. Click **Save** to create the project.

![Project Creation Wizard](docs/images/project-wizard.png)
<!-- PLACEHOLDER: Screenshot of the project creation wizard steps -->

#### Viewing a Project

Click a project name or the **View** button to open the Project Detail page. It has the following tabs:

| Tab | Contents |
|---|---|
| **Overview** | Project info, status, dates, contract amount, progress |
| **Milestones** | Phases of the project with billing percentages |
| **Tasks** | Individual tasks scoped to milestones |
| **Team** | Project team members and their roles |
| **Files** | Uploaded documents and files |
| **Material Allocation** | Materials allocated from inventory |
| **Labor Cost** | Labor cost entries per employee |
| **Miscellaneous** | Other project expenses |
| **Progress Update** | Progress updates posted by the team |
| **Issues** | Reported problems or blockers |
| **Request Updates** | Update requests submitted by the client |

![Project Detail Tabs](docs/images/project-detail-tabs.png)
<!-- PLACEHOLDER: Screenshot of the project detail page showing all tabs -->

#### Milestones Tab

Milestones represent project phases (e.g., Foundation, Framing, Finishing).

- Click **Add Milestone** to create a new phase.
- Set the **Name**, **Description**, **Start Date**, **Due Date**, **Status**, and **Billing Percentage**.
- The billing percentage indicates what share of the contract amount is tied to this milestone.
- Milestones can be exported as a PDF.

![Milestones Tab](docs/images/project-milestones.png)
<!-- PLACEHOLDER: Screenshot of the milestones tab with milestone cards and add button -->

#### Tasks Tab

Tasks are work items belonging to a specific milestone.

- Click **Add Task** within a milestone.
- Assign a task to a user (team member with access to the Task Management app).
- Set a **Due Date** and **Status** (`pending`, `in_progress`, `completed`).
- Task statuses can be updated from the admin or directly from the Task Management app.

![Tasks Tab](docs/images/project-tasks.png)
<!-- PLACEHOLDER: Screenshot of the tasks tab showing tasks grouped by milestone -->

#### Team Tab

- Click **Add Member** to assign an employee to the project.
- Set their **Role** on this project (e.g., Project Manager, Engineer, Foreman).
- Members can be deactivated or force-removed.
- Use **Bulk Status Update** to activate or deactivate multiple members at once.

![Team Tab](docs/images/project-team.png)
<!-- PLACEHOLDER: Screenshot of the team tab showing team members and their roles -->

#### Material Allocation Tab

Materials from the inventory or from direct supplies can be allocated to a project.

- View all allocations with quantity, unit price, and status.
- Record **Receiving Reports** when materials arrive on-site.
- Use **Bulk Receiving Report** to confirm multiple deliveries at once.

![Material Allocation Tab](docs/images/project-materials.png)
<!-- PLACEHOLDER: Screenshot of the material allocation tab with receiving report entries -->

#### Labor Cost Tab

- Click **Add Labor Cost** to log an employee's labor entry.
- Fill in **Employee**, **Date**, **Hours**, **Rate**, and **Description**.
- Submit a labor cost entry to finalize it.

#### Miscellaneous Expenses Tab

- Record any other project-related expenses not covered by materials or labor.
- Fields: **Description**, **Amount**, **Date**, **Category**.

#### Progress Update Tab

Admin users can view all progress updates posted by team members via the Task Management app.
Each update may include text notes and attached files (photos, documents).

![Progress Updates Tab](docs/images/project-progress-updates.png)
<!-- PLACEHOLDER: Screenshot of the progress updates tab with update cards and file attachments -->

#### Issues Tab

View and manage reported issues across the project.

- Issues have a **Status** (`open`, `in_progress`, `resolved`, `closed`) and **Severity**.
- Admins can create, edit, or delete issues.

#### Request Updates Tab

Shows update requests submitted by clients via the Client App.

- Each request is marked as **viewed** when opened.
- Admins can delete resolved requests.

#### Archiving a Project

Projects can be archived to remove them from active views without permanent deletion.

- Click **Archive** on the project list or project detail.
- Archived projects are accessible via the **Archived** view.
- Click **Unarchive** to restore.

---

### 3.3 Client Management

Navigate to **Client Management** from the sidebar.

![Client Management List](docs/images/client-management-list.png)
<!-- PLACEHOLDER: Screenshot of the client list with search and filter controls -->

#### Adding a Client

1. Click **Add Client**.
2. Fill in:
   - **Client Name** (company or individual name)
   - **Client Type** (linked to a client type category)
   - **Contact Person**
   - **Email** and **Phone Number**
   - **Address**, **City**, **Province**, **Postal Code**, **Country**
   - **Tax ID** / **Business Permit**
   - **Credit Limit** and **Payment Terms**
3. Click **Save**. The system auto-generates a **Client Code**.

> The system will email the client their login credentials for the Client App.

#### Managing Clients

| Action | Description |
|---|---|
| **Edit** | Update client information |
| **Activate / Deactivate** | Toggle client's active status |
| **Reset Password** | Generate and send a new password to the client |
| **Delete** | Soft-delete the client (restorable from Trash Bin) |

#### Client Types

Navigate to **Client Type Management** to create categories for clients (e.g., Corporate, Government, Individual).

---

### 3.4 Employee Management

Navigate to **Employee Management** from the sidebar.

![Employee Management List](docs/images/employee-management-list.png)
<!-- PLACEHOLDER: Screenshot of the employee list with status badges -->

#### Adding an Employee

1. Click **Add Employee**.
2. Fill in personal information:
   - Name (first, middle, last)
   - Position, Email, Phone
   - Gender, Date of Birth, Civil Status, Nationality
   - Complete address
   - Emergency contact details
   - Government IDs: SSS, PhilHealth, Pag-IBIG, TIN (with ID image uploads)
3. The system auto-generates an **Employee ID** (e.g., `EMP-00001`).

#### Employee Status

- Employees can be set as **Active** or **Inactive**.
- Inactive employees cannot be assigned to new projects.

---

### 3.5 Inventory Management

Navigate to **Inventory Management** from the sidebar.

![Inventory Management List](docs/images/inventory-list.png)
<!-- PLACEHOLDER: Screenshot of the inventory item list with stock indicators -->

#### Adding an Item

1. Click **Add Item**.
2. Fill in:
   - **Item Name**, **Item Code**, **Category**, **Unit of Measure**
   - **Unit Price**, **Minimum Stock Level**
   - **Description**

#### Stock In

Record new stock arrivals:

1. Click **Stock In** on an inventory item.
2. Enter **Quantity**, **Reference/Notes**, and optionally a supplier or date.
3. Save. The item's current stock is updated.

#### Stock Out

Record materials removed from inventory:

1. Click **Stock Out** on an inventory item.
2. Enter **Quantity**, **Stock Out Type** (e.g., project use, disposal), and **Notes**.
3. Save. Stock is adjusted accordingly.

> For **project use** stock-outs, the quantity is only deducted from inventory once a Receiving Report is recorded against the project's material allocation.

#### Transactions

Click **Transactions** to view the full history of stock movements for all items.

#### Archiving Items

Items that are no longer in active use can be archived to keep the list clean.

---

### 3.6 Direct Supply Management

Navigate to **Direct Supply Management** from the sidebar.

Direct supplies are materials or items purchased directly from a supplier (not tracked in the main inventory).

![Direct Supply List](docs/images/direct-supply-list.png)
<!-- PLACEHOLDER: Screenshot of the direct supply list with allocation actions -->

#### Adding a Direct Supply

1. Click **Add Supply**.
2. Fill in:
   - **Supply Name**, **Supply Code**, **Category**, **Unit of Measure**
   - **Unit Price**
   - **Supplier Name** and **Supplier Contact**

#### Allocating a Direct Supply

1. Click **Allocate** on a supply item.
2. Select the **Project** and enter the **Quantity** to allocate.
3. The allocation is linked to the project's Material Allocation tab.

---

### 3.7 Billing Management

Navigate to **Billing Management** from the sidebar.

![Billing Management List](docs/images/billing-management-list.png)
<!-- PLACEHOLDER: Screenshot of the billing list with status pills (paid, unpaid, partial) -->

#### Creating a Billing Record

1. Click **Add Billing**.
2. Fill in:
   - **Project** — the project being billed
   - **Billing Type** — `milestone` (tied to a specific milestone) or `general`
   - **Milestone** — if billing type is milestone, select the associated milestone
   - **Billing Amount**
   - **Billing Date** and **Due Date**
   - **Description**
3. A **Billing Code** is auto-generated.
4. Save.

#### Recording a Payment

1. Open a billing record (click **View**).
2. Click **Add Payment**.
3. Enter **Payment Amount**, **Payment Date**, and **Payment Method**.
4. Save. The billing status auto-updates:
   - `unpaid` → `partial` → `paid` based on the total received vs. billed amount.

![Billing Detail with Payments](docs/images/billing-detail.png)
<!-- PLACEHOLDER: Screenshot of the billing detail page showing payment history -->

#### Client Portal Billing Display

Control whether billing information is visible to clients in the Client App:

- Go to **Billing Management** and find the **Client Portal Billing Display** toggle.
- When disabled, clients will not see the billing module in their app.

#### Archiving a Billing

Archived billings are hidden from active views but remain in records.

---

### 3.8 Reports & Analytics

Navigate to **Reports** from the sidebar.

![Reports Page](docs/images/reports-page.png)
<!-- PLACEHOLDER: Screenshot of the reports page showing charts and export buttons -->

The Reports module provides visual analytics and Excel exports for the following areas:

| Report | Contents |
|---|---|
| **Project Performance** | Milestone completion rates, timeline adherence, project status breakdown |
| **Financial Report** | Contract amounts, billed amounts, payments received, outstanding balances |
| **Client Report** | Client-level project counts, billing summaries |
| **Inventory Report** | Stock levels, stock movement history, low-stock alerts |
| **Team Productivity** | Task completion rates per team member, progress update frequency |
| **Budget Report** | Material, labor, and miscellaneous costs vs. contract amount |

#### Exporting Reports

- Click the **Export** button next to any report to download as an Excel file.
- Use **Export All** to download a single workbook containing all reports.
- Some reports support **date range filters** to narrow the data.

---

### 3.9 User Management

Navigate to **User Management** from the sidebar.

#### Users

![User Management List](docs/images/user-management-list.png)
<!-- PLACEHOLDER: Screenshot of the users list with role badges -->

- **Add User** — Create a system account. Fill in name, email, and assign a role.
- **Edit User** — Update user details and profile information.
- **Reset Password** — Send a new password to the user's email.
- **Delete User** — Soft-delete (user goes to Trash Bin).

User profiles include:
- Personal information (name, gender, date of birth, etc.)
- Address and emergency contact
- Government IDs (SSS, PhilHealth, Pag-IBIG, TIN) with image uploads
- Notes

#### Roles & Permissions

![Roles & Permissions](docs/images/roles-permissions.png)
<!-- PLACEHOLDER: Screenshot of the roles list and permission assignment grid -->

Roles control what each user can do in the system.

- **Add Role** — Create a custom role with a name.
- **Edit Role** — Assign or remove permissions from a role.
- **Delete Role** — Remove a role (cannot delete if users are assigned to it).

Permissions are organized by module (e.g., `projects.view`, `projects.create`, `billing.add-payment`). Each role can have any combination of permissions.

> The **Super Admin** role has all permissions and cannot be modified.

#### Activity Logs

A read-only audit trail of all significant actions performed in the system.

- Columns: **User**, **Action**, **Module**, **Description**, **Timestamp**
- Useful for accountability and troubleshooting.

![Activity Logs](docs/images/activity-logs.png)
<!-- PLACEHOLDER: Screenshot of the activity logs page with filter options -->

#### Trash Bin

Deleted users (and other soft-deleted records) are held here before permanent removal.

- **Restore** — Move a deleted record back to its active state.
- **Force Delete** — Permanently remove a record. This action is irreversible.

---

### 3.10 Chat

Navigate to **Chat** from the sidebar or top navigation.

![Admin Chat](docs/images/admin-chat.png)
<!-- PLACEHOLDER: Screenshot of the admin chat interface with a conversation open -->

- Each client has a dedicated chat thread.
- Messages are delivered in real-time.
- Admin staff can send and receive messages from clients.

---

### 3.11 Notifications

The **Bell** icon in the top navigation shows unread notification counts.

- Notifications are grouped by type.
- Click a notification to navigate to the relevant record.
- **Mark All as Read** clears the unread count.
- Individual notifications can be dismissed.

---

## 4. Client Mobile App

The Client App gives clients real-time visibility into their projects and billings.

### 4.1 Home / Dashboard

After logging in, the Home screen shows:

![Client App Home](docs/images/client-app-home.png)
<!-- PLACEHOLDER: Screenshot of the client app home screen with stat chips and project cards -->

**Stat Chips (top row):**

| Chip | Description |
|---|---|
| Active | Number of currently active projects |
| Completed | Number of completed projects |
| On Time | Projects that are on schedule |

**Billing Summary Card** _(if billing module is enabled by admin):_

- Count of Unpaid, Partial, and Paid bills
- Total outstanding amount
- Overdue indicator (if any bills are past due date)

**Recent Billings** — Up to 5 recent billing records with status pills.

**Active Projects** — Up to 3 active projects. Tap **See all** to view the full list.

Pull down to **refresh** the dashboard.

---

### 4.2 Projects

Tap the **Projects** tab at the bottom.

![Client App Projects](docs/images/client-app-projects.png)
<!-- PLACEHOLDER: Screenshot of the client app projects list with search and filter controls -->

- Search projects by name.
- Filter by status: All, Active, On Hold, Completed.
- Sort by: Name, Progress, Budget, Date, Status.
- Tap a project card to open its detail.

---

### 4.3 Project Detail

Tap a project to open its detail view. The detail page has three tabs:

![Client App Project Detail](docs/images/client-app-project-detail.png)
<!-- PLACEHOLDER: Screenshot of the project detail screen with tabs and milestone cards -->

#### Overview Tab

- Project name, status badge, location
- Start date and planned end date
- Project manager name
- Payment status (Paid / Partial / Unpaid) with remaining balance

#### Milestones Tab

- Lists all project milestones with name, status, and date range.
- Tap a milestone to expand details.

#### Materials Tab

- Lists materials allocated to the project.
- Shows each material's status: Pending, Partial, Received.

#### Requesting an Update

From the project detail screen, clients can **Request an Update** from the project team:

1. Tap the **Request Update** button.
2. Enter a message describing what information is needed.
3. Submit. The project manager is notified in the Admin Dashboard.

---

### 4.4 Billings

Tap the **Billings** tab at the bottom _(visible only if enabled by admin)._

![Client App Billings](docs/images/client-app-billings.png)
<!-- PLACEHOLDER: Screenshot of the billings tab with status filter pills and billing cards -->

- View all billing records linked to your projects.
- Filter by: All, Unpaid, Partial, Paid.
- Each card shows: billing amount, due date, remaining balance, and status.
- Tap a billing card to see the full detail.

---

### 4.5 Billing Detail & Payment

Tap a billing record to view its details.

![Client App Billing Detail](docs/images/client-app-billing-detail.png)
<!-- PLACEHOLDER: Screenshot of the billing detail screen with payment history and Pay Now button -->

**Detail Includes:**
- Billing code and description
- Associated project and milestone (if applicable)
- Amount, due date, amount paid, amount remaining
- Payment history list

#### Making a Payment

1. Tap **Pay Now** on a billing record.
2. You will be redirected to the **PayMongo** secure checkout.
3. Complete the payment using your preferred method (credit/debit card, e-wallet, etc.).
4. Upon success, you are returned to the app and the billing status updates automatically.

> Payments are processed securely by PayMongo. ASEC PMS does not store your card details.

---

### 4.6 Chat

Tap the **Chat** tab (or the chat icon from the home screen).

![Client App Chat](docs/images/client-app-chat.png)
<!-- PLACEHOLDER: Screenshot of the client chat screen with messages and input field -->

- Send and receive messages from your project team in real-time.
- Messages are delivered instantly.

---

### 4.7 Notifications

Tap the **Bell** icon on the home screen to open the Notification Center.

![Client App Notifications](docs/images/client-app-notifications.png)
<!-- PLACEHOLDER: Screenshot of the client notification center slide-over panel -->

- View all recent notifications.
- Tap a notification to go to the relevant screen.
- **Mark All as Read** clears the badge count.
- Swipe or tap the **Delete** button to remove a notification.

---

### 4.8 Profile & Account Settings

Tap the **Profile** tab at the bottom.

![Client App Profile](docs/images/client-app-profile.png)
<!-- PLACEHOLDER: Screenshot of the client profile screen with account options -->

**Options:**

| Option | Description |
|---|---|
| **Change Password** | Update your account password |
| **Help Center** | View frequently asked questions and support info |
| **About** | App version and company information |
| **Log Out** | Sign out of this device |
| **Log Out All Devices** | Revoke all active sessions |

#### Changing Your Password

1. Tap **Change Password**.
2. Enter your **Current Password**.
3. Enter and confirm your **New Password**.
4. Tap **Save**.

---

## 5. Task Management Mobile App

The Task Management App is used by engineers and field team members to manage their assigned tasks.

### 5.1 Home / Dashboard

After logging in, the Home screen shows:

![Task Management Home](docs/images/tm-app-home.png)
<!-- PLACEHOLDER: Screenshot of the task management app home screen with stat chips and upcoming tasks -->

**Stat Chips:**

| Chip | Description |
|---|---|
| Total | Total assigned tasks |
| In Progress | Tasks currently being worked on |
| Done | Completed tasks |

**Alert Banner** — Displays if there are overdue or critical tasks. Tap to go to the Tasks screen.

**Upcoming Tasks** — The next 5 tasks by due date. Each card shows:
- Task title and status
- Due date (highlighted red if overdue)
- Number of days remaining (if ≤3 days)
- Project name

**Quick Actions:**
- **All Tasks** — Jump directly to the Tasks screen
- **History** — View completed/past tasks

---

### 5.2 Tasks

Tap the **Tasks** tab at the bottom.

![Task Management Tasks Screen](docs/images/tm-app-tasks.png)
<!-- PLACEHOLDER: Screenshot of the tasks screen with search bar, filter pills, and task cards -->

**Features:**

- **Search** — Type to search tasks by title (real-time, debounced).
- **Filter by Status** — All / Pending / In Progress / Completed.
- **Sort** — Choose from: Due Date Earliest, Due Date Latest, Newest, Oldest, Title A→Z, Title Z→A.
- Each task card shows title, status, due date, and project name.
- Overdue tasks are highlighted in red.
- Tap a task to open the **Task Detail** screen.

---

### 5.3 Task Detail

Tap any task to view its full detail.

![Task Detail Screen](docs/images/tm-app-task-detail.png)
<!-- PLACEHOLDER: Screenshot of the task detail screen with tabs for progress updates and issues -->

**Task Information:**

| Field | Description |
|---|---|
| Title | Task name |
| Description | What needs to be done |
| Assigned To | The team member responsible |
| Due Date | Deadline (red if overdue) |
| Status | Current status (pending / in_progress / completed) |
| Priority | Task priority level |
| Milestone | Which project milestone this belongs to |
| Project | Parent project |

**Updating Task Status:**

1. Tap the **Status** pill or the status update button.
2. Select the new status: `Pending`, `In Progress`, or `Completed`.
3. Confirm.

#### Progress Updates Tab

Progress updates are notes and files added to show task progress.

![Progress Updates on Task](docs/images/tm-app-progress-updates.png)
<!-- PLACEHOLDER: Screenshot of the progress updates tab within a task detail -->

**Adding a Progress Update:**

1. Tap the **+** floating button and select **Progress Update**.
2. Enter your update notes.
3. Optionally attach a file (photo or document).
4. Tap **Submit**.

**Editing or Deleting Your Own Update:**
- Tap the edit icon on your update to modify it.
- Tap the delete icon to remove it.

**Downloading Attached Files:**
- Tap the **Download** icon next to a file attachment.

#### Issues Tab

Issues are problems or blockers that need attention.

![Issues on Task](docs/images/tm-app-issues.png)
<!-- PLACEHOLDER: Screenshot of the issues tab within a task detail showing open and resolved issues -->

**Reporting an Issue:**

1. Tap the **+** floating button and select **Report Issue**.
2. Fill in:
   - **Title** — Brief description of the problem
   - **Description** — Details
   - **Severity** — Low / Medium / High / Critical
3. Tap **Submit**.

**Editing or Resolving Your Own Issue:**
- Tap the edit icon to update the issue (e.g., change status to `resolved`).

#### Request Updates Tab

This tab shows update requests submitted by the client related to this task. It is read-only for team members.

---

### 5.4 Projects

Tap the **Projects** tab at the bottom.

![Task Management Projects](docs/images/tm-app-projects.png)
<!-- PLACEHOLDER: Screenshot of the projects screen listing assigned projects -->

- Shows all projects you are currently assigned to.
- Tap a project to view its detail (name, status, dates, team overview).

---

### 5.5 Milestone Tasks

From a Project Detail screen, tap a milestone to view its tasks.

![Milestone Tasks Screen](docs/images/tm-app-milestone-tasks.png)
<!-- PLACEHOLDER: Screenshot of the milestone tasks screen with task list and add button (if permission granted) -->

Users with the appropriate permissions can:
- **Add Milestone** — Create a new phase for the project.
- **Add Task** — Add a task to a milestone.
- **Edit / Delete** — Manage milestones and tasks.

---

### 5.6 History

Tap the **History** tab at the bottom.

![Task Management History](docs/images/tm-app-history.png)
<!-- PLACEHOLDER: Screenshot of the history screen with completed tasks grouped by date -->

- Lists all tasks that have been **completed**.
- Useful to review past work and reference progress update entries.
- Tap a task to view its full detail.

---

### 5.7 Permission Delegation

Users who have been granted delegation authority can manage which team members have access to management features (milestones, tasks, teams, etc.).

Navigate to **Profile → Permission Delegation** (visible only if you have delegate permissions).

![Permission Delegation](docs/images/tm-app-permission-delegation.png)
<!-- PLACEHOLDER: Screenshot of the permission delegation screen with grantee list and module toggles -->

**Grant Access:**

1. Tap **Grant Access**.
2. Search for and select an eligible user.
3. Choose the modules to grant (e.g., milestone management, task management).
4. Tap **Grant**.

**Update Modules:**
- Tap an existing grantee and adjust which modules they can access.

**Revoke Access:**
- Tap **Revoke** next to a grantee to remove all delegated permissions.

> Delegation is non-recursive: a delegated user cannot further delegate to others.

---

## 6. Roles & Permissions Reference

### Admin Dashboard Permissions

| Module | Permissions |
|---|---|
| Projects | `projects.view`, `projects.create`, `projects.update`, `projects.delete`, `projects.archive` |
| Project Teams | `project-teams.view`, `project-teams.create`, `project-teams.update`, `project-teams.delete` |
| Project Files | `project-files.upload`, `project-files.update`, `project-files.delete`, `project-files.download` |
| Milestones | `project-milestones.view`, `project-milestones.create`, `project-milestones.update`, `project-milestones.delete` |
| Tasks | `project-tasks.create`, `project-tasks.update`, `project-tasks.update-status`, `project-tasks.delete` |
| Progress Updates | `progress-updates.view`, `progress-updates.create`, `progress-updates.update`, `progress-updates.delete` |
| Issues | `project-issues.create`, `project-issues.update`, `project-issues.delete` |
| Material Allocations | `material-allocations.receiving-report`, `material-allocations.update`, `material-allocations.delete` |
| Milestone Material Usage | `milestone-material-usage.create`, `milestone-material-usage.update`, `milestone-material-usage.delete` |
| Labor Costs | `labor-costs.create`, `labor-costs.update`, `labor-costs.delete` |
| Misc. Expenses | `miscellaneous-expenses.create`, `miscellaneous-expenses.update`, `miscellaneous-expenses.delete` |
| Employees | `employees.view`, `employees.create`, `employees.update`, `employees.delete`, `employees.update-status` |
| Clients | `clients.view`, `clients.create`, `clients.update`, `clients.delete`, `clients.update-status` |
| Inventory | `inventory.view`, `inventory.create`, `inventory.update`, `inventory.delete`, `inventory.stock-in`, `inventory.stock-out`, `inventory.archive` |
| Direct Supply | `direct-supply.view`, `direct-supply.create`, `direct-supply.update`, `direct-supply.delete`, `direct-supply.allocate` |
| Billing | `billing.view`, `billing.create`, `billing.update`, `billing.delete`, `billing.add-payment`, `billing.archive` |
| Reports | `reports.view` |
| Users | `users.view`, `users.create`, `users.update`, `users.delete`, `users.reset-password` |
| Roles | `roles.view`, `roles.create`, `roles.update`, `roles.delete` |
| Activity Logs | `activity-logs.view` |
| Trash Bin | `trash-bin.view`, `trash-bin.restore`, `trash-bin.force-delete` |

### Task Management App Permissions

| Permission | Description |
|---|---|
| `tm.access` | Base access to the Task Management App |
| `tm.tasks.view` | View assigned tasks and dashboard stats |
| `tm.tasks.update-status` | Change a task's status |
| `tm.tasks.manage` | Create, edit, delete tasks in milestones |
| `tm.progress-updates.view` | View progress updates |
| `tm.progress-updates.create` | Add progress updates to tasks |
| `tm.progress-updates.update-own` | Edit your own progress updates |
| `tm.progress-updates.delete-own` | Delete your own progress updates |
| `tm.issues.view` | View issues on tasks |
| `tm.issues.create` | Report new issues |
| `tm.issues.update-own` | Edit issues you created |
| `tm.issues.delete-own` | Delete issues you created |
| `tm.projects.view-assigned` | View projects you are assigned to |
| `tm.milestones.manage` | Create, edit, delete project milestones |
| `tm.team.view` | View project team members |
| `tm.team.assign` | Assign team members to a project |
| `tm.team.reactivate` | Reactivate deactivated team members |
| `tm.team.release` | Release a team member from a project |
| `tm.team.force-remove` | Force remove a team member |
| `tm.permissions.delegate` | Grant/revoke task management permissions to others |
| `tm.files.download` | Download attached files |
| `material-allocations.receiving-report` | Record receiving reports for materials |
| `milestone-material-usage.create/update/delete` | Manage milestone material usage entries |

---

## 7. Common Workflows

### Workflow 1: Onboarding a New Project

```
1. Admin: Add the client (Client Management → Add Client)
2. Admin: Create the project (Project Management → Add Project)
3. Admin: Add milestones to define project phases
4. Admin: Add tasks under each milestone and assign to team members
5. Admin: Assign employees to the project (Team tab)
6. Admin: Allocate materials from inventory or direct supplies (Material Allocation tab)
7. Admin: Create billing records tied to milestones (Billing Management → Add Billing)
```

### Workflow 2: Field Team Task Execution

```
1. Engineer logs into the Task Management App
2. Views upcoming tasks on the Home screen
3. Opens a task → changes status to "In Progress"
4. Adds progress updates with photos as work proceeds
5. Reports any issues encountered (Issues tab)
6. When complete, changes status to "Completed"
```

### Workflow 3: Client Reviews Progress

```
1. Client opens the Client App
2. Views active project from the Home screen or Projects tab
3. Opens project detail → Milestones tab to see phase statuses
4. Sends a "Request Update" if they need more information
5. Admin is notified and responds via the project's Request Updates tab
```

### Workflow 4: Processing a Client Payment

```
1. Admin creates a billing record for a completed milestone
2. Client receives a push notification about the new bill
3. Client opens the Billings tab → taps the bill → taps "Pay Now"
4. Client completes payment via PayMongo checkout
5. System automatically updates billing status to "Paid" or "Partial"
6. Admin can also manually record a payment via Billing Management → Add Payment
```

### Workflow 5: Generating Reports

```
1. Admin navigates to Reports
2. Optionally sets date range filters
3. Reviews charts for relevant modules (Financial, Project Performance, etc.)
4. Clicks Export (individual) or Export All for Excel files
5. Shares exported file with stakeholders
```

---

## 8. Troubleshooting & FAQ

### General

**Q: I cannot log in. What should I do?**
- Verify your email and password are correct.
- Check that your account is active (contact your administrator).
- Use **Forgot Password** if available, or ask your administrator to reset your password.

**Q: I don't see certain menus or buttons.**
- Your user role may not have the required permission.
- Contact your administrator to review your role's permissions.

---

### Admin Dashboard

**Q: A project is not showing in the project list.**
- The project may be archived. Go to **Project Management → Archived** to find it.

**Q: An employee cannot be assigned to a project.**
- Ensure the employee's status is set to **Active** in Employee Management.

**Q: A billing record is not showing.**
- The billing may be archived. Check **Billing Management → Archived**.

**Q: Inventory stock appears incorrect.**
- For **project use** stock-outs, stock is only deducted once a Receiving Report is recorded.
- Review the item's transaction history under **Inventory Management → Transactions**.

---

### Client App

**Q: I cannot see any billings.**
- The billing module may be disabled by your project manager. Contact them to enable it.

**Q: My payment shows as pending but my card was charged.**
- PayMongo may take a few minutes to confirm. Pull down to refresh the billing screen.
- If the issue persists after 30 minutes, contact your project manager.

**Q: I am not receiving push notifications.**
- Ensure the app has notification permissions enabled in your phone's Settings.
- Log out and log back in to refresh your push token.

---

### Task Management App

**Q: I cannot see any tasks.**
- Ensure you have the `tm.tasks.view` permission. Contact your administrator.
- Confirm you are assigned to a project team in the Admin Dashboard.

**Q: I cannot update a task's status.**
- You need the `tm.tasks.update-status` permission. Contact your administrator or the person who delegated your access.

**Q: I cannot add a progress update.**
- You need the `tm.progress-updates.create` permission.

**Q: I do not see the milestone or team management options.**
- These features require elevated permissions (`tm.milestones.manage`, `tm.team.assign`, etc.). These are typically granted only to project leads or engineers-in-charge.

---

*For additional support, contact your system administrator or the UniSync Labs development team.*
