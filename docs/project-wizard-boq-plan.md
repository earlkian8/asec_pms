# Project Wizard and BOQ Implementation Plan

## Goal
Build a project creation flow that feels natural for engineers and project managers while reducing spreadsheet-style manual work. The new flow should let the user create a project, define scope, estimate costs, allocate materials, and track execution from one place.

## Current Problem
The current milestone-task-centric flow is too execution-heavy for the planning stage. For an engineer, the mental model is usually:

1. Define the project and contract value.
2. Break the work into scope items or BOQ line items.
3. Estimate quantities, materials, and labor.
4. Convert planned scope into milestones / work packages.
5. Track allocations, receiving, labor, and progress during execution.

That means milestones and tasks should support the BOQ, not replace it.

## Recommended Product Direction
Use a BOQ-first structure with milestones as optional grouping layers.

### Core Concept
- Project = the container for contract, dates, team, budget, and execution.
- BOQ / scope items = the planning layer for quantities, rates, categories, and totals.
- Milestones / work packages = grouped BOQ items for scheduling and execution.
- Tasks / progress updates = day-to-day site execution detail, not the main planning surface.

## Proposed Wizard Flow

### Step 1. Project Info
Collect the most important project data up front.
- Project name
- Client
- Contract amount
- Start date
- Planned end date
- Project type
- Location
- Description

UX note:
- Show contract amount immediately because engineers need it to anchor the estimate.
- Auto-suggest project code.
- Keep this step short and highly readable.

### Step 2. Team Members
Assign people who will work on the project.
- Users = engineers with system access
- Employees = non-system field staff like plumber, mason, carpenter

UX note:
- Present this as two tabs or two side-by-side selectors:
  - Users
  - Employees
- Allow multi-select with roles or assignment type.
- Show a summary of assigned people before moving to the next step.

### Step 3. BOQ / Scope Setup
Replace the current milestone-only setup with a hierarchical BOQ builder.

The BOQ should support two layers:
- Category / major work division
  - Examples: Earthworks, Structural Works, Finishing, Plumbing, Electrical
- Breakdown line items under each category
  - Examples: A.1 clearing, A.2 excavation, A.3 backfilling

Each BOQ row should support:
- Code / item number
- Category or section label
- Breakdown description
- Unit of measure
- Quantity
- Unit cost
- Total cost
- Optional remarks
- Optional schedule window

Minimum viable version:
- Category is required as a parent grouping.
- Breakdown item name or description is required.
- Code is optional but should be easy to auto-generate or edit.
- Quantity, unit, and cost can be entered progressively.

UX note:
- This should feel like a smart construction estimate sheet, not a generic form.
- Support expandable categories with nested line items.
- Allow inline row editing, add-row shortcuts, duplication, bulk paste, and drag reordering.
- Let users create category headers and then add breakdown lines below them.
- Support templates for common construction scopes so the user can start from Earthworks, Structural, Finishing, MEP, and similar groups.

PDF note:
- BOQ export should render the same grouped structure in table form.
- The PDF should show category rows as section headers, with breakdown rows underneath.
- The table should preserve the code, description, unit, quantity, unit cost, and amount columns.
- Totals should be shown per category and for the whole project.
- The output should look like a standard construction BOQ sheet, similar to the provided reference image.

### Step 4. Material Planning and Allocation
Plan materials from either inventory or direct supply.
- Inventory-based allocation
- Direct supply allocation from supplier
- Link each allocation to a BOQ item or work package where possible

Important rule:
- Allocation does not mean the material is already fully on site.
- Use receiving reports to confirm actual delivery to the project.
- Track partial receipt and remaining balance.

UX note:
- Show allocation status and receiving status separately.
- Display allocated, received, and remaining quantities.
- Make partial receiving very visible.

## Project Details Page Structure
The project details page should be a dashboard, not just a record view.

### Suggested Sections
- Overview
  - contract amount
  - dates
  - status
  - progress summary
- Team Members
  - users and employees in one view, but visually separated
- BOQ / Scope
  - grouped items, quantities, costs, totals
- Material Allocation
  - allocated vs received vs remaining
- Labor Cost
  - manual payroll entries per employee / user
- Miscellaneous Expenses
  - non-labor, non-material project costs
- Execution / Progress
  - milestones, tasks, and progress updates

## How to Reframe Milestones and Tasks
Do not make milestones the primary planning tool.

### Better hierarchy
- BOQ item or scope package
- Milestone or phase
- Task
- Progress update

### Why this is better
- Engineers think in scope, quantities, and deliverables first.
- Milestones become useful as schedule checkpoints.
- Tasks become execution detail attached to a milestone or BOQ item.
- Progress updates become the evidence trail for site work.

## BOQ UX Ideas to Make It Easier Than a Spreadsheet

### 1. Spreadsheet-like grid editor
- Editable table with keyboard navigation
- Tab / Enter to move across cells
- Add new line on the last row automatically
- Copy-paste from Excel into the grid

### 2. Smart defaults
- Auto-fill unit of measure based on category
- Auto-suggest common scope items
- Auto-calculate totals from quantity and rate
- Default dates from project dates

### 3. Template-based setup
- Prebuilt BOQ templates for common project types
- Duplicate a previous project’s BOQ
- Save custom templates per company or project type

### 4. Grouping and collapsing
- Section headers for major work divisions
- Collapse long sections to reduce visual clutter
- Show section subtotal at a glance

### 5. Progress-aware BOQ
- Each BOQ item can later become a work package or milestone
- Show planned vs actual cost
- Show allocated materials vs received materials
- Show labor consumed against the planned scope
- Preserve category totals and breakdown numbering in reports and exports

### 6. Low-friction creation flow
- Start with name-only lines
- Expand optional fields only when needed
- Do not force the user to complete every quantity/rate upfront
- Save drafts automatically

## Suggested Data Model Direction
If the current schema is not enough, introduce or formalize these concepts:

- project_boq_sections
- project_boq_items
- boq_item_material_allocations
- boq_item_labor_allocations
- boq_item_progress_updates

If the existing milestone structure stays, it should reference BOQ items or sections instead of replacing them.

## Backend Implementation Notes

### Project creation
- Extend the project store flow to accept contract amount and dates immediately.
- Save the project first, then attach team members and BOQ data in the same transaction or a controlled sequence.

### BOQ persistence
- Add CRUD endpoints for BOQ sections and BOQ items.
- Support bulk insert for rows pasted from the UI.
- Keep validation lenient on draft save and stricter on final submit.

### Material allocation
- Keep inventory allocation and direct supply allocation in the same project surface.
- Track receiving report status at the allocation level.
- Prevent deleting allocations once receiving exists.

### Progress tracking
- Keep milestone/task creation, but position it under execution.
- Progress updates should map back to a BOQ item, milestone, or task depending on the module.

## Frontend Implementation Notes

### Wizard UI
- Use a stepper with autosave.
- Allow users to skip optional detail and come back later.
- Show a project summary sidebar at all times.

### BOQ editor UI
- Use a table/grid instead of a modal-heavy form.
- Inline edit rows.
- Batch add multiple items.
- Import from Excel later if needed.

### Project dashboard UI
- Use cards and tables for quick status scanning.
- Separate planning data from execution data.
- Make receiving status and allocation status impossible to confuse.

## Rollout Phases

### Phase 1. Project wizard restructure
- Add contract amount and dates in step 1.
- Add team selection in step 2.
- Replace milestone-first step with BOQ-first step.

### Phase 2. BOQ storage and editing
- Add BOQ data tables and endpoints.
- Build grid-based editor.
- Support draft save and bulk entry.

### Phase 3. Allocation and receiving integration
- Link materials to BOQ items or work packages.
- Show received vs remaining quantities.
- Keep receiving reports as the source of truth for actual site consumption.

### Phase 4. Execution tracking
- Connect milestones and tasks to BOQ items.
- Improve progress update UX.
- Add summary dashboards for planned vs actual.

## Acceptance Criteria
- User can create a project with contract amount and dates from the start.
- User can add users and employees separately during project setup.
- User can create BOQ items quickly without thinking in milestone-task terms first.
- User can allocate materials from inventory or direct supply.
- User can confirm received quantities through receiving reports.
- Project details page shows planning, allocation, labor, miscellaneous, and execution in one place.
- Milestones and tasks remain available, but they are no longer the main planning entry point.

## Open Questions
- Should BOQ items be linked directly to milestones, or should milestones be generated from BOQ sections?
- Do we need a full Excel import on day one, or is bulk paste enough for the first release?
- Should labor cost be tied to BOQ items, milestones, or only to the project initially?
- Should direct supply allocations behave exactly like inventory allocations in the UI, aside from stock deduction?

## Recommended Decision
Make BOQ the primary planning surface and keep milestones/tasks as execution tools. That will align better with how engineers actually think and will avoid forcing the user into a tracker model too early.
