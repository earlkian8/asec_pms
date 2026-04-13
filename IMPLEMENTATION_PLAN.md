# Construction ERP — Implementation Plan (for GitHub Copilot to execute)

> **Read this first.** This plan converts the current *task-tracker* system into a real **Construction Project Monitoring / ERP** system, in 5 phases. It is written as a checklist so Copilot (or any engineer) can execute it module-by-module without having to re-derive design decisions.
>
> Goal: when the work described here is finished, a construction **Project Manager, Site Engineer, QA/QC, Storekeeper, Timekeeper, Accountant,** and **Client** can all do their real-world jobs inside the system — no spreadsheets, no side-channel paperwork, no "tribal knowledge."
>
> **Stack in scope:** Laravel 12 backend (`backend/`), Inertia + React pages (`backend/resources/js/Pages/`), MySQL database. Mobile/client app (`client-app/`) where referenced.
>
> **How to use this file:**
> 1. Do the phases **in order** (1 → 5). Each phase is independently shippable.
> 2. For each module inside a phase, follow the **module template**: Migration → Model → Service → Controller → Routes → Permissions → Frontend → Validation → Seed → Acceptance.
> 3. Tick every `- [ ]` checkbox as you finish.
> 4. Do not skip the **Acceptance** step — it is what makes the panel say "this is engineering."

---

## Table of Contents

- [0. Ground Rules for Copilot](#0-ground-rules-for-copilot)
- [1. Project Conventions](#1-project-conventions)
- [2. Phase 1 — BOQ, WBS, Daily Site Report, Change Orders, Real Progress](#2-phase-1)
- [3. Phase 2 — DTR, Payroll, Budget, EVM](#3-phase-2)
- [4. Phase 3 — Procurement & Unified Inventory](#4-phase-3)
- [5. Phase 4 — QA/QC, Safety, Equipment, Subcontracts](#5-phase-4)
- [6. Phase 5 — Progress Billing, Approvals Engine, Documents Register, Closeout](#6-phase-5)
- [7. UI/UX Principles](#7-uiux-principles)
- [8. Testing Strategy](#8-testing-strategy)
- [9. Data Migration Strategy for Existing Records](#9-data-migration)
- [10. Definition of Done (per module)](#10-definition-of-done)
- [11. Glossary (so Copilot speaks construction)](#11-glossary)

---

<a id="0-ground-rules-for-copilot"></a>

## 0. Ground Rules for Copilot

1. **Never drop user data.** Every destructive migration must be paired with a data-preservation step in `up()`.
2. **Follow existing layout.** New controllers go under `backend/app/Http/Controllers/Admin/` (admin) or `backend/app/Http/Controllers/API/` (client/mobile).
3. **Thin controllers, fat services.** Put business logic in `backend/app/Services/<Thing>Service.php`. Controllers orchestrate + validate + respond.
4. **Permissions first.** Every new route uses Spatie `permission:<slug>.<action>` middleware. Seed permissions in `database/seeders/PermissionSeeder.php` (or the existing permission seeder).
5. **Soft deletes everywhere** (`use SoftDeletes`) — already standard in this repo.
6. **Activity Logs + Notifications.** Use the existing `ActivityLogsTrait`, `NotificationTrait`, and `ClientNotificationTrait` traits from `ProjectsController` as templates.
7. **Inertia pages.** New React pages live at `backend/resources/js/Pages/<Module>/`. One `index.jsx`, one `show.jsx` (or tabbed component) per module.
8. **Validation.** Use Laravel `FormRequest` objects in `backend/app/Http/Requests/` for anything more than 5 fields. Keep one-liner inline validation only for small cases.
9. **Money columns** = `decimal(15,2)`. **Quantity columns** = `decimal(12,3)` (enough for m³, m², km, kg). **Percentages** = `decimal(5,2)`.
10. **Every monetary event is auditable.** It must have `created_by`, `updated_by`, `approved_by`, `approved_at`, `status`, and (where applicable) a link to an `approval_request`.
11. **Idempotent migrations.** Wrap with `Schema::hasTable` / `Schema::hasColumn` checks — the repo already does this.
12. **No N+1.** Eager-load via `with(...)` in every listing query. Run `php artisan telescope` locally to catch regressions (or log slow queries).
13. **Do not invent new status words.** Use the statuses given in this plan. Consistency is worth more than expressiveness.
14. **Every read-model (index / show) must accept search, filters, sort, and pagination** — mirror `ProjectsController::index` style.
15. **Every write must be wrapped in a DB transaction** — mirror `ProjectsController::store` style.
16. **Units of Measure** are stored on the item / BOQ item, never hard-coded ("pieces", "m", "m²", "m³", "kg", "bags", "L", "lot", "ls", "days", "hours").
17. **Dates:** use `date` for calendar dates, `timestamp` for event times. Always store in UTC; display in `Asia/Manila` (`config/app.php` → `timezone`).
18. **When unclear, prefer the construction industry norm** over the generic SaaS norm. E.g., "Accomplishment" not "Task completion"; "Statement of Work Accomplished (SWA)" not "Invoice"; "Variation Order" not "Change Request."

---

<a id="1-project-conventions"></a>

## 1. Project Conventions

### 1.1 File layout (new work)

```
backend/
├── app/
│   ├── Enums/                    (BoqStatus, DsrStatus, ChangeOrderType, …)
│   ├── Http/
│   │   ├── Controllers/Admin/    (desktop/admin UI)
│   │   ├── Controllers/API/      (mobile + client portal)
│   │   └── Requests/             (FormRequest classes)
│   ├── Models/                   (Eloquent models)
│   ├── Services/                 (business logic)
│   └── Traits/                   (shared behavior)
├── database/
│   ├── migrations/               (one migration per change)
│   └── seeders/                  (cost codes, roles, UOM, permissions)
└── resources/js/Pages/<Module>/  (Inertia React pages)
```

### 1.2 Naming

- **Tables** — snake_case plural (`boq_items`, `wbs_activities`)
- **Models** — StudlyCase singular (`BoqItem`, `WbsActivity`)
- **Controllers** — `<Thing>Controller` (plural noun for resources: `BoqItemsController`)
- **Services** — `<Thing>Service` (`BoqService`, `DsrService`)
- **Routes** — kebab-case (`/boq-items`, `/daily-site-reports`)
- **Permissions** — `<module>.<action>` (`boq.view`, `boq.create`, `dsr.approve`)
- **Route names** — `boq.index`, `boq.store`, `boq.update`, `boq.destroy`, `dsr.approve`

### 1.3 Standard columns on every domain table

```php
$table->id();
// ... domain columns ...
$table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
$table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
$table->timestamps();
$table->softDeletes();
```

Tables that undergo approval also carry:
```php
$table->enum('status', ['draft','submitted','approved','rejected','posted'])->default('draft');
$table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
$table->timestamp('submitted_at')->nullable();
$table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
$table->timestamp('approved_at')->nullable();
$table->text('rejection_reason')->nullable();
```

### 1.4 Module template (use this for every new module)

```
- [ ] Migration(s) created
- [ ] Model + relationships + casts + scopes
- [ ] FormRequest classes (Store + Update)
- [ ] Service class (all mutations go through here)
- [ ] Controller (index / store / show / update / destroy + custom)
- [ ] Route group added in routes/admin.php or routes/api.php
- [ ] Permissions seeded (view / create / update / delete + custom)
- [ ] Inertia page(s) built
- [ ] Sidebar / breadcrumb link
- [ ] Activity log + notification on key events
- [ ] Factory + seeder for dev data
- [ ] Feature test (happy path + permission denial)
- [ ] Acceptance walk-through documented in module's README
```

### 1.5 Shared enums (create once, reuse)

`app/Enums/`:

- `ApprovalStatus.php` — `Draft, Submitted, Approved, Rejected, Posted`
- `ProcurementRoute.php` — `Stock, Direct`
- `BillingDeductionType.php` — `DownPaymentRecoupment, Retention, EWT, VAT, Penalty, Other`
- `ChangeOrderType.php` — `Additive, Deductive, TimeExtension, Scope`
- `RfiStatus.php` — `Open, Answered, Closed`
- `NcrSeverity.php` — `Minor, Major, Critical`
- `PunchListStatus.php` — `Open, InProgress, Verified, Closed`
- `DsrStatus.php` — `Draft, Submitted, Approved`
- `AttendanceCode.php` — `P, A, HD, L, H, RD, OT` (Present, Absent, Half-day, Leave, Holiday, Rest Day, OT)

---

<a id="2-phase-1"></a>

## 2. Phase 1 — BOQ, WBS, Daily Site Report, Change Orders, Real Progress

**Why this first:** it answers **70% of the panel's objection** by itself. After Phase 1, progress reflects physical accomplishment, schedule has a baseline, the contract can change legally, and site work is recorded daily.

### 2.1 Cost Codes (the backbone)

**Business rule:** Cost codes are the common language for BOQ, budget, procurement, and reporting. Support 3-level hierarchy (Division → Section → Item). Seed with DPWH Blue Book item codes for Philippine projects.

- [ ] Migration: `create_cost_codes_table`

  ```php
  Schema::create('cost_codes', function (Blueprint $table) {
      $table->id();
      $table->string('code', 50)->unique();       // e.g. "900(1)c"
      $table->string('description', 255);
      $table->foreignId('parent_id')->nullable()->constrained('cost_codes')->nullOnDelete();
      $table->unsignedTinyInteger('level')->default(1); // 1=Division, 2=Section, 3=Item
      $table->boolean('is_active')->default(true);
      $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
      $table->timestamps();
      $table->softDeletes();
      $table->index(['level', 'is_active']);
  });
  ```

- [ ] Model `CostCode` with `parent()`, `children()`, `boqItems()`, `scopeActive()`.
- [ ] Seeder `CostCodesSeeder` with at least: 800 Earthwork, 900 Concrete, 1000 Rebar, 1100 Forms, 1200 Masonry, 1700 Finishes, 1800 MEP. (Copilot: load a JSON file `database/seeders/data/dpwh_cost_codes.json` and loop.)
- [ ] Controller + Inertia page at `/cost-codes` (admin only): tree view, add/edit/deactivate.
- [ ] Permissions: `cost-codes.view`, `.create`, `.update`, `.delete`.

**Acceptance:** admin can browse a tree, search by code or description, mark a code inactive without breaking historical BOQs.

---

### 2.2 BOQ — Bill of Quantities

**Business rule:** a BOQ is a project-scoped, ordered list of priced work items. It is the basis of contract amount, progress measurement, and progress billing. A BOQ can be imported from Excel (columns: Item No, Description, Unit, Qty, Unit Rate) or entered manually.

- [ ] Migration: `create_boq_items_table`

  ```php
  Schema::create('boq_items', function (Blueprint $table) {
      $table->id();
      $table->foreignId('project_id')->constrained()->cascadeOnDelete();
      $table->string('item_no', 20);                              // "A.1.1"
      $table->foreignId('cost_code_id')->nullable()->constrained('cost_codes')->nullOnDelete();
      $table->foreignId('parent_id')->nullable()->constrained('boq_items')->nullOnDelete(); // grouping
      $table->string('description', 500);
      $table->string('unit', 20);                                 // m, m², m³, kg, lot
      $table->decimal('quantity', 12, 3)->default(0);
      $table->decimal('unit_rate', 15, 2)->default(0);
      $table->decimal('amount', 15, 2)->default(0);               // qty * rate (stored; recomputed on save)
      $table->decimal('weight_pct', 7, 4)->default(0);            // % of contract – auto on finalize
      $table->unsignedInteger('sort_order')->default(0);
      $table->boolean('is_provisional')->default(false);          // provisional sum
      $table->text('remarks')->nullable();
      $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
      $table->timestamps();
      $table->softDeletes();
      $table->unique(['project_id', 'item_no']);
      $table->index(['project_id', 'sort_order']);
  });
  ```

- [ ] Model `BoqItem`:
  - Casts for decimals.
  - Relations: `project()`, `costCode()`, `parent()`, `children()`, `progressEntries()`, `billingLines()`, `materialIssuances()`.
  - Event `saving`: recompute `amount = quantity * unit_rate` and round to 2 decimals.
- [ ] Service `BoqService`:
  - `importFromExcel(Project $p, UploadedFile $xlsx)` — uses `maatwebsite/excel` (already installed based on `Exports/`); row-by-row validation, rollback on error.
  - `finalize(Project $p)` — locks BOQ editing, recomputes `weight_pct` per item as `amount / sum(amount)`, and writes the total to `projects.contract_amount` unless locked.
  - `rebalanceWeights(Project $p)` — re-runs weight calc after a Change Order.
- [ ] Controller `BoqItemsController`: index (by project), store (single row), bulk-store (import), update, destroy, `finalize`, `exportPdf`, `exportExcel`.
- [ ] Routes under `/project-management/{project}/boq/...`. Permissions: `boq.view`, `.create`, `.update`, `.delete`, `.import`, `.finalize`, `.export`.
- [ ] Inertia page `ProjectManagement/boq/index.jsx` inside the project detail tabs:
  - Tree/flat toggle.
  - Inline edit of qty / unit rate / unit / description (only when BOQ not finalized).
  - Import button → drag-drop Excel → preview → confirm.
  - Total contract amount card, total weight (should sum to 100%).
  - "Finalize BOQ" button (disabled if validation errors).
- [ ] Validation rules (StoreBoqItemRequest):
  - `item_no` unique per project, `unit` in allowed list, `quantity >= 0`, `unit_rate >= 0`.
- [ ] Activity log: `BOQ | Create/Update/Delete/Import/Finalize`.

**Acceptance:** PM uploads Excel BOQ → sees 120 items priced → total matches contract → finalizes → editing locked → `weight_pct` totals 100%.

---

### 2.3 WBS Activities & Schedule

**Business rule:** BOQ says *what costs how much*; WBS Activities say *when it gets built, in what order, by whom*. One BOQ item can be delivered by several activities (e.g. "Structural Concrete" BOQ = "Form Floor 1", "Pour Floor 1", "Strip Floor 1" activities).

- [ ] Migration: `create_wbs_activities_table`

  ```php
  Schema::create('wbs_activities', function (Blueprint $table) {
      $table->id();
      $table->foreignId('project_id')->constrained()->cascadeOnDelete();
      $table->foreignId('parent_id')->nullable()->constrained('wbs_activities')->nullOnDelete();
      $table->foreignId('boq_item_id')->nullable()->constrained('boq_items')->nullOnDelete();
      $table->string('code', 30);                      // "1.2.3"
      $table->string('name', 255);
      $table->text('description')->nullable();
      $table->date('baseline_start')->nullable();
      $table->date('baseline_finish')->nullable();
      $table->date('actual_start')->nullable();
      $table->date('actual_finish')->nullable();
      $table->decimal('planned_qty', 12, 3)->default(0);
      $table->decimal('actual_qty', 12, 3)->default(0);
      $table->string('unit', 20)->nullable();
      $table->decimal('weight_pct', 7, 4)->default(0); // contribution to project %
      $table->decimal('pct_complete', 5, 2)->default(0);
      $table->enum('status', ['not_started','in_progress','completed','on_hold','cancelled'])->default('not_started');
      $table->foreignId('responsible_user_id')->nullable()->constrained('users')->nullOnDelete();
      $table->unsignedInteger('sort_order')->default(0);
      $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
      $table->timestamps();
      $table->softDeletes();
      $table->unique(['project_id', 'code']);
      $table->index(['project_id', 'sort_order']);
  });
  ```

- [ ] Migration: `create_activity_dependencies_table`

  ```php
  Schema::create('activity_dependencies', function (Blueprint $table) {
      $table->id();
      $table->foreignId('predecessor_id')->constrained('wbs_activities')->cascadeOnDelete();
      $table->foreignId('successor_id')->constrained('wbs_activities')->cascadeOnDelete();
      $table->enum('type', ['FS','SS','FF','SF'])->default('FS');
      $table->integer('lag_days')->default(0);
      $table->timestamps();
      $table->unique(['predecessor_id','successor_id']);
  });
  ```

- [ ] Migration: `create_activity_progress_entries_table`

  ```php
  Schema::create('activity_progress_entries', function (Blueprint $table) {
      $table->id();
      $table->foreignId('wbs_activity_id')->constrained()->cascadeOnDelete();
      $table->foreignId('dsr_id')->nullable()->constrained('daily_site_reports')->nullOnDelete();
      $table->date('progress_date');
      $table->decimal('qty_today', 12, 3)->default(0);
      $table->decimal('qty_to_date', 12, 3)->default(0);
      $table->decimal('pct_to_date', 5, 2)->default(0);
      $table->text('remarks')->nullable();
      $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
      $table->timestamps();
      $table->index(['wbs_activity_id','progress_date']);
  });
  ```

- [ ] Model `WbsActivity` with `dependencies()`, `predecessors()`, `successors()`, `progressEntries()`, `boqItem()`, `children()`.
- [ ] Service `WbsService`:
  - `recalculatePercent(WbsActivity $a)` — `qty_to_date / planned_qty * 100` (bounded 0-100).
  - `cascadeStatus(WbsActivity $a)` — when all children completed → parent completed; when any child in_progress → parent in_progress.
  - `projectPercentComplete(Project $p)` — weighted sum: `Σ(activity.pct_complete * activity.weight_pct) / 100`. This replaces the `completedTasks/totalTasks` calculation in `ProjectsController::index()`.
  - `scheduleVariance(Project $p)` — SV = EV − PV in days (see EVM in Phase 2).
  - `criticalPath(Project $p)` — simple topological pass using dependencies (documented as best-effort; real CPM is Phase 2 follow-up).
- [ ] Controller `WbsActivitiesController` with Gantt export (JSON feed for the frontend Gantt).
- [ ] Frontend: `ProjectManagement/schedule/index.jsx` with a read-only Gantt first (use `frappe-gantt` or `dhtmlx-gantt`). Editing can come later.
- [ ] Permissions: `wbs.view`, `.create`, `.update`, `.delete`, `.report-progress`.

**Update `ProjectsController::index()`** (critical):

Replace the task-count loop (lines ~126–150) with:

```php
$project->progress_percentage = app(\App\Services\WbsService::class)
    ->projectPercentComplete($project);
```

If the project has no WBS yet, **fall back** to the old calc so nothing breaks mid-migration.

**Acceptance:** PM creates 3 parent activities with 10 child activities each → enters baseline dates → daily progress → project % reflects weighted accomplishment. Old milestone/task view still works for legacy projects.

---

### 2.4 Daily Site Report (DSR)

**Business rule:** one DSR per project per calendar day. Any site engineer can start it; the PM approves. Data from DSR feeds Activity Progress (automatically) and equipment/fuel logs (Phase 4). Without DSR, there is **no** construction system.

- [ ] Migration: `create_daily_site_reports_table`

  ```php
  Schema::create('daily_site_reports', function (Blueprint $table) {
      $table->id();
      $table->foreignId('project_id')->constrained()->cascadeOnDelete();
      $table->date('report_date');
      $table->string('weather_am', 40)->nullable();    // Sunny / Rainy / Overcast
      $table->string('weather_pm', 40)->nullable();
      $table->unsignedSmallInteger('temp_c')->nullable();
      $table->text('general_remarks')->nullable();
      $table->text('delays_encountered')->nullable();
      $table->text('safety_notes')->nullable();
      $table->enum('status', ['draft','submitted','approved','rejected'])->default('draft');
      $table->foreignId('prepared_by')->nullable()->constrained('users')->nullOnDelete();
      $table->timestamp('submitted_at')->nullable();
      $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
      $table->timestamp('approved_at')->nullable();
      $table->text('rejection_reason')->nullable();
      $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
      $table->timestamps();
      $table->softDeletes();
      $table->unique(['project_id','report_date'], 'dsr_project_date_unique');
  });
  ```

- [ ] Sub-tables (one migration each, or bundled):

  ```php
  // dsr_manpower
  Schema::create('dsr_manpower', function (Blueprint $t) {
      $t->id();
      $t->foreignId('dsr_id')->constrained('daily_site_reports')->cascadeOnDelete();
      $t->string('trade', 80);       // Mason, Carpenter, Steelman, Laborer, Electrician
      $t->unsignedInteger('head_count')->default(0);
      $t->text('notes')->nullable();
      $t->timestamps();
  });

  // dsr_equipment
  Schema::create('dsr_equipment', function (Blueprint $t) {
      $t->id();
      $t->foreignId('dsr_id')->constrained()->cascadeOnDelete();
      $t->foreignId('equipment_id')->nullable()->constrained('equipment')->nullOnDelete(); // Phase 4
      $t->string('equipment_name', 120);      // free-text fallback until Phase 4
      $t->decimal('hours_used', 6, 2)->default(0);
      $t->decimal('hours_idle', 6, 2)->default(0);
      $t->decimal('hours_breakdown', 6, 2)->default(0);
      $t->text('remarks')->nullable();
      $t->timestamps();
  });

  // dsr_activities (drives activity_progress_entries)
  Schema::create('dsr_activities', function (Blueprint $t) {
      $t->id();
      $t->foreignId('dsr_id')->constrained()->cascadeOnDelete();
      $t->foreignId('wbs_activity_id')->constrained()->cascadeOnDelete();
      $t->decimal('qty_today', 12, 3)->default(0);
      $t->text('remarks')->nullable();
      $t->timestamps();
  });

  // dsr_visitors
  Schema::create('dsr_visitors', function (Blueprint $t) {
      $t->id();
      $t->foreignId('dsr_id')->constrained()->cascadeOnDelete();
      $t->string('name', 150);
      $t->string('company', 150)->nullable();
      $t->string('purpose', 255)->nullable();
      $t->time('time_in')->nullable();
      $t->time('time_out')->nullable();
      $t->timestamps();
  });

  // dsr_photos
  Schema::create('dsr_photos', function (Blueprint $t) {
      $t->id();
      $t->foreignId('dsr_id')->constrained()->cascadeOnDelete();
      $t->foreignId('wbs_activity_id')->nullable()->constrained()->nullOnDelete();
      $t->foreignId('boq_item_id')->nullable()->constrained()->nullOnDelete();
      $t->string('file_path');
      $t->string('caption', 255)->nullable();
      $t->decimal('gps_lat', 10, 7)->nullable();
      $t->decimal('gps_lng', 10, 7)->nullable();
      $t->timestamp('taken_at')->nullable();
      $t->timestamps();
  });
  ```

- [ ] Model `DailySiteReport` + `DsrManpower`, `DsrEquipment`, `DsrActivity`, `DsrVisitor`, `DsrPhoto`.
- [ ] Service `DsrService`:
  - `createOrOpenDraft(Project $p, Carbon $date, User $user)` — one draft per date.
  - `submit(DailySiteReport $d)` — validates required sections.
  - `approve(DailySiteReport $d, User $approver)` — on approval: for each `dsr_activities` row, upsert `activity_progress_entries` and recalc `wbs_activities.pct_complete`, `actual_start` (first non-zero), `actual_finish` (when 100%).
  - `reject(DailySiteReport $d, string $reason)`.
- [ ] Controller `DailySiteReportsController`: index (calendar + list), show, store, update, submit, approve, reject, exportPdf (signed DSR with company header).
- [ ] Mobile (API) endpoints for site engineer to post DSR from phone with photos: `POST /api/projects/{id}/dsr` (draft autosave), `POST /api/dsr/{id}/submit`.
- [ ] Inertia page `ProjectManagement/dsr/index.jsx` (calendar heatmap), `.../dsr/show.jsx` (tabs: Summary | Manpower | Equipment | Activities | Visitors | Photos | Remarks).
- [ ] Permissions: `dsr.view`, `.create`, `.update`, `.submit`, `.approve`, `.reject`, `.export`.

**Acceptance:** site engineer opens app, adds manpower 25, equipment 2, 3 activities with qty → submits → PM approves → activity % auto-updates → project % reflects new accomplishment.

---

### 2.5 Change Orders / Variation Orders

**Business rule:** a CO may add items, delete items, revise quantities, revise rates, and/or extend time. A CO is effective only after the Owner signs. Upon approval, it amends the contract amount and re-baselines weights and (optionally) schedule.

- [ ] Migration: `create_change_orders_table`

  ```php
  Schema::create('change_orders', function (Blueprint $t) {
      $t->id();
      $t->foreignId('project_id')->constrained()->cascadeOnDelete();
      $t->string('co_no', 30);                     // CO-0001
      $t->enum('type', ['additive','deductive','time_extension','scope']);
      $t->date('issued_date');
      $t->date('effective_date')->nullable();
      $t->decimal('amount', 15, 2)->default(0);    // net effect on contract (signed)
      $t->integer('days_added')->default(0);
      $t->string('reason', 255);
      $t->text('description')->nullable();
      $t->enum('status', ['draft','submitted','approved','rejected'])->default('draft');
      $t->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamp('submitted_at')->nullable();
      $t->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamp('approved_at')->nullable();
      $t->text('rejection_reason')->nullable();
      $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $t->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamps();
      $t->softDeletes();
      $t->unique(['project_id','co_no']);
  });

  Schema::create('change_order_items', function (Blueprint $t) {
      $t->id();
      $t->foreignId('change_order_id')->constrained()->cascadeOnDelete();
      $t->foreignId('boq_item_id')->nullable()->constrained()->nullOnDelete();
      $t->enum('action', ['add','delete','revise_qty','revise_rate']);
      $t->string('description', 500)->nullable();
      $t->string('unit', 20)->nullable();
      $t->decimal('old_qty', 12, 3)->nullable();
      $t->decimal('new_qty', 12, 3)->nullable();
      $t->decimal('old_rate', 15, 2)->nullable();
      $t->decimal('new_rate', 15, 2)->nullable();
      $t->decimal('amount_delta', 15, 2)->default(0);
      $t->timestamps();
  });

  Schema::create('project_contract_revisions', function (Blueprint $t) {
      $t->id();
      $t->foreignId('project_id')->constrained()->cascadeOnDelete();
      $t->foreignId('change_order_id')->nullable()->constrained()->nullOnDelete();
      $t->integer('revision_no');
      $t->decimal('contract_amount_before', 15, 2);
      $t->decimal('contract_amount_after', 15, 2);
      $t->integer('days_added_cumulative')->default(0);
      $t->date('revised_end_date')->nullable();
      $t->timestamps();
  });
  ```

- [ ] Model `ChangeOrder`, `ChangeOrderItem`, `ProjectContractRevision`.
- [ ] Service `ChangeOrderService::approve(ChangeOrder $co)`:
  - Wrapped in a DB transaction.
  - Apply each `ChangeOrderItem` to `boq_items` (insert/update/soft-delete).
  - Update `projects.contract_amount` (`+= sum(amount_delta)`).
  - Add `days_added` to planned end date if any.
  - Create a `project_contract_revisions` snapshot.
  - Call `BoqService::rebalanceWeights($project)`.
  - Log activity + notify Client (via `ClientNotificationTrait`).
- [ ] Controller + routes under `/project-management/{project}/change-orders/...`
- [ ] Inertia page `ProjectManagement/change-orders/index.jsx` + drawer form.
- [ ] Permissions: `change-orders.view`, `.create`, `.update`, `.submit`, `.approve`, `.reject`, `.delete`.

**Remove the block on `contract_amount` editing in `ProjectsController::update()`** — once CO module exists, `contract_amount` changes **only** via approved COs. Drop the `sometimes` vs `required` switch and always keep the field read-only in the UI on the Project Edit form (the field is shown but managed by COs).

**Acceptance:** PM issues additive CO of ₱1.2M + 15 days → client approves → contract_amount increases, planned end date extends, new BOQ item appears weighted, dashboards update.

---

### 2.6 Replace `completedTasks` with BOQ/WBS-driven progress (cleanup)

- [ ] `ProjectsController::index()` — use `WbsService::projectPercentComplete`. Fallback to old calc for projects without BOQ.
- [ ] `ProjectOverviewService` — expose EV, PV (basic), CPI estimate (Phase 2 will harden).
- [ ] Remove the stored `progress_percentage` pattern; always compute on the fly. If performance demands caching, cache in Redis keyed by project id and invalidate on DSR approve / CO approve / BOQ finalize.

**End of Phase 1 acceptance checklist (for the panel):**

- [ ] Upload BOQ from Excel → finalize → contract amount derived.
- [ ] Create 30+ WBS activities with baseline dates and weights.
- [ ] Submit 1 week of DSRs → project % rises naturally.
- [ ] Issue a CO → contract amount changes → BOQ re-weighted.
- [ ] Project detail page shows S-curve stub (baseline line + actual line from DSR data).

---

<a id="3-phase-2"></a>

## 3. Phase 2 — DTR, Payroll, Budget, EVM

**Why second:** Phase 1 fixed *what* is being built; Phase 2 fixes *what it costs vs what was planned*.

### 3.1 Project Budget (baseline cost)

**Business rule:** contract amount is **revenue**. Budget is the PM's planned **cost** to deliver that revenue. Budget is broken down by cost code AND by category. It is the denominator for CPI/variance.

- [ ] Migration: `create_project_budgets_table`

  ```php
  Schema::create('project_budgets', function (Blueprint $t) {
      $t->id();
      $t->foreignId('project_id')->constrained()->cascadeOnDelete();
      $t->foreignId('cost_code_id')->nullable()->constrained()->nullOnDelete();
      $t->enum('category', ['labor','material','equipment','subcontract','overhead','contingency']);
      $t->string('description', 255)->nullable();
      $t->decimal('budget_amount', 15, 2);
      $t->integer('revision_no')->default(0);
      $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamps();
      $t->softDeletes();
      $t->index(['project_id','category']);
  });

  Schema::create('project_budget_revisions', function (Blueprint $t) {
      $t->id();
      $t->foreignId('project_id')->constrained()->cascadeOnDelete();
      $t->integer('revision_no');
      $t->foreignId('change_order_id')->nullable()->constrained()->nullOnDelete();
      $t->decimal('total_before', 15, 2);
      $t->decimal('total_after', 15, 2);
      $t->text('notes')->nullable();
      $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamps();
  });
  ```

- [ ] Service `BudgetService`: `importFromBoq()` (seed budget from BOQ * standard cost factors), `revise()` with approval audit.
- [ ] Page `ProjectManagement/budget/index.jsx` — matrix view (cost code × category), totals, variance vs actual.

### 3.2 Daily Time Records (DTR)

**Business rule:** the single source of truth for who worked where, when, and how long. Feeds payroll and EVM (labor actuals).

- [ ] Migration: `create_daily_time_records_table`

  ```php
  Schema::create('daily_time_records', function (Blueprint $t) {
      $t->id();
      $t->foreignId('project_id')->constrained()->cascadeOnDelete();
      $t->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
      $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();      // for contractor users
      $t->date('work_date');
      $t->time('time_in')->nullable();
      $t->time('time_out')->nullable();
      $t->decimal('hours_regular', 5, 2)->default(0);
      $t->decimal('hours_ot', 5, 2)->default(0);
      $t->decimal('hours_nd', 5, 2)->default(0);        // night differential
      $t->decimal('hours_rd', 5, 2)->default(0);        // rest day worked
      $t->boolean('is_holiday')->default(false);
      $t->enum('status', ['P','A','HD','L','H','RD'])->default('P');
      $t->enum('approval_status', ['draft','submitted','approved','rejected'])->default('draft');
      $t->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamp('approved_at')->nullable();
      $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamps();
      $t->softDeletes();
      $t->unique(['project_id','employee_id','work_date']);
      $t->unique(['project_id','user_id','work_date']);
      $t->index(['project_id','work_date']);
  });
  ```

- [ ] Service `DtrService`: `bulkEntryForDate()` (timekeeper enters whole crew at once); `submitWeek()`, `approveWeek()`.
- [ ] Page `ProjectManagement/dtr/index.jsx` — grid with employees × dates, inline P/A/HD/OT hours.
- [ ] Permissions: `dtr.view`, `.create`, `.update`, `.submit`, `.approve`, `.delete`.

### 3.3 Payroll Periods & Entries

- [ ] Migration: `create_payroll_periods_table` + `create_payroll_entries_table`

  ```php
  Schema::create('payroll_periods', function (Blueprint $t) {
      $t->id();
      $t->foreignId('project_id')->constrained()->cascadeOnDelete();
      $t->date('period_start');
      $t->date('period_end');
      $t->enum('frequency', ['weekly','semi_monthly','monthly'])->default('semi_monthly');
      $t->enum('status', ['open','computed','approved','paid'])->default('open');
      $t->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamp('approved_at')->nullable();
      $t->timestamps();
      $t->softDeletes();
      $t->unique(['project_id','period_start','period_end']);
  });

  Schema::create('payroll_entries', function (Blueprint $t) {
      $t->id();
      $t->foreignId('payroll_period_id')->constrained()->cascadeOnDelete();
      $t->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
      $t->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
      $t->decimal('days_worked', 6, 2)->default(0);
      $t->decimal('ot_hours', 6, 2)->default(0);
      $t->decimal('nd_hours', 6, 2)->default(0);
      $t->decimal('daily_rate', 12, 2)->default(0);
      $t->decimal('gross_pay', 15, 2)->default(0);
      $t->decimal('ot_pay', 15, 2)->default(0);
      $t->decimal('nd_pay', 15, 2)->default(0);
      $t->decimal('holiday_pay', 15, 2)->default(0);
      $t->decimal('allowance', 15, 2)->default(0);
      $t->decimal('sss', 15, 2)->default(0);
      $t->decimal('philhealth', 15, 2)->default(0);
      $t->decimal('pagibig', 15, 2)->default(0);
      $t->decimal('tax', 15, 2)->default(0);
      $t->decimal('other_deductions', 15, 2)->default(0);
      $t->decimal('net_pay', 15, 2)->default(0);
      $t->text('remarks')->nullable();
      $t->timestamps();
      $t->softDeletes();
  });
  ```

- [ ] Service `PayrollService::compute($periodId)` — pulls approved DTRs, computes each entry, applies gov contribution tables (seed from `database/seeders/data/sss_2026.json`, `philhealth_2026.json`, `pagibig_2026.json`, `bir_witholding_2026.json`). Safe default: flat % if tables absent.
- [ ] Payslip PDF generator (use existing Exports pattern).
- [ ] **Retire** `project_labor_costs.attendance` JSON — write a one-off migration to unpack existing rows into `daily_time_records` then drop the column. Keep the old table as aggregate "legacy labor cost" record for historical projects; new projects must use DTR + Payroll.
- [ ] Permissions: `payroll.view`, `.compute`, `.approve`, `.mark-paid`.

### 3.4 EVM (Earned Value Management)

- [ ] Service `EvmService`:
  - `plannedValueAsOf(Project, Carbon)` — sum of `boq_items.amount * weight_pct * planned_pct_at_date`.
  - `earnedValueAsOf(Project, Carbon)` — sum of `boq_items.amount * activity.pct_complete / 100` aggregated through weight.
  - `actualCostAsOf(Project, Carbon)` — sum of payroll_entries.net_pay + material issuances cost + equipment cost + subcontract billing + misc expenses, within date.
  - `cpi() = EV / AC`; `spi() = EV / PV`.
  - `eac() = BAC / CPI` (BAC = total budget).
  - `etc() = EAC − AC`; `vac() = BAC − EAC`.
- [ ] Dashboard widgets on project detail: S-curve (PV, EV, AC vs time), CPI gauge, SPI gauge, EAC vs BAC bar, cost variance table by cost code.

**End of Phase 2 acceptance:** an engineer opens a project on day 60 and sees: 42% PV, 38% EV, ₱14.2M AC, CPI 0.96, SPI 0.90, EAC ₱28.9M vs BAC ₱27.5M — and can drill down to the cost code that's over.

---

<a id="4-phase-3"></a>

## 4. Phase 3 — Procurement & Unified Inventory

**Why third:** materials are the biggest controllable cost. A proper procurement chain stops leaks, produces audit trails for BIR/COA, and gives the PM real "cost at risk" numbers via committed-but-not-yet-delivered POs.

### 4.1 Unified Items catalog (retire `DirectSupply` vs `InventoryItem` split)

**Business rule:** there is ONE item master. An item can be procured via the **Stock** route (stored in warehouse, then issued) or the **Direct** route (delivered straight to site, never enters warehouse stock).

- [ ] Migration: `create_items_table` (new) + data migration from `inventory_items` + `direct_supplies`:

  ```php
  Schema::create('items', function (Blueprint $t) {
      $t->id();
      $t->string('item_code', 40)->unique();
      $t->string('item_name', 255);
      $t->text('description')->nullable();
      $t->string('category', 80)->nullable();
      $t->string('unit_of_measure', 20);
      $t->decimal('standard_cost', 12, 2)->nullable();
      $t->decimal('min_stock_level', 12, 3)->nullable();
      $t->decimal('reorder_qty', 12, 3)->nullable();
      $t->boolean('is_stockable')->default(true);      // false = service / direct-only
      $t->boolean('is_active')->default(true);
      $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $t->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamps();
      $t->softDeletes();
  });
  ```

- [ ] Data migration: insert every row of `inventory_items` and `direct_supplies` into `items`, preserving IDs via a mapping table if needed. Update all foreign keys (`project_material_allocations.inventory_item_id`, `.direct_supply_id`) to point at `items.id`.
- [ ] **Deprecate** `inventory_items.current_stock` — do NOT drop yet; compute stock from the ledger and keep column read-only for now, with a backfill command.
- [ ] Permissions: `items.view`, `.create`, `.update`, `.delete`, `.import`.

### 4.2 Suppliers (vendor master)

- [ ] Migration: `create_suppliers_table`

  ```php
  Schema::create('suppliers', function (Blueprint $t) {
      $t->id();
      $t->string('supplier_code', 40)->unique();
      $t->string('name', 255);
      $t->string('tin', 40)->nullable();
      $t->string('address', 500)->nullable();
      $t->string('contact_person', 150)->nullable();
      $t->string('contact_number', 40)->nullable();
      $t->string('email', 150)->nullable();
      $t->string('payment_terms', 100)->nullable();    // e.g. Net 30
      $t->enum('category', ['materials','equipment','services','subcontractor'])->default('materials');
      $t->boolean('is_accredited')->default(false);
      $t->date('accreditation_expiry')->nullable();
      $t->boolean('is_active')->default(true);
      $t->timestamps();
      $t->softDeletes();
  });
  ```

- [ ] Page `Suppliers/index.jsx`.
- [ ] Permissions: `suppliers.view`, `.create`, `.update`, `.delete`, `.accredit`.

### 4.3 Procurement lifecycle: PR → RFQ → PO → DR → MRR → MIR

**End-to-end flow:**

```
Site Engineer needs material
  └─► Purchase Requisition (PR) — project-scoped, line items
        └─► Approval (PM → Procurement)
              └─► RFQ to 2-3 suppliers (Canvass Sheet)
                    └─► Supplier responses
                          └─► Award → Purchase Order (PO)
                                └─► Supplier delivers → Delivery Receipt (DR)
                                      └─► Material Receiving Report (MRR) by storekeeper
                                            └─► Inventory transaction (+IN)
                                                  └─► Material Issuance (MIR) to BOQ/activity
                                                        └─► Inventory transaction (−OUT), cost charged to project
```

Each step is its own table. Do not short-circuit.

#### 4.3.1 Purchase Requisitions

- [ ] Migration: `create_purchase_requisitions_table` + `create_purchase_requisition_items_table`

  ```php
  Schema::create('purchase_requisitions', function (Blueprint $t) {
      $t->id();
      $t->string('pr_no', 30)->unique();
      $t->foreignId('project_id')->constrained()->cascadeOnDelete();
      $t->date('requested_date');
      $t->date('required_date')->nullable();
      $t->enum('procurement_route', ['stock','direct'])->default('stock');
      $t->enum('status', ['draft','submitted','approved','rejected','partially_ordered','fully_ordered','cancelled'])->default('draft');
      $t->text('justification')->nullable();
      $t->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
      $t->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamp('approved_at')->nullable();
      $t->text('rejection_reason')->nullable();
      $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $t->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamps();
      $t->softDeletes();
  });

  Schema::create('purchase_requisition_items', function (Blueprint $t) {
      $t->id();
      $t->foreignId('purchase_requisition_id')->constrained()->cascadeOnDelete();
      $t->foreignId('item_id')->constrained()->cascadeOnDelete();
      $t->foreignId('boq_item_id')->nullable()->constrained()->nullOnDelete();
      $t->foreignId('wbs_activity_id')->nullable()->constrained()->nullOnDelete();
      $t->decimal('quantity_requested', 12, 3);
      $t->decimal('quantity_ordered', 12, 3)->default(0);
      $t->string('unit', 20);
      $t->decimal('estimated_unit_price', 12, 2)->nullable();
      $t->text('specs')->nullable();
      $t->text('remarks')->nullable();
      $t->timestamps();
  });
  ```

#### 4.3.2 RFQ / Canvass

- [ ] Migration: `create_rfqs_table` + `create_rfq_responses_table` + `create_rfq_response_items_table`
  - `rfqs(id, pr_id, rfq_no, issued_date, response_deadline, status)`
  - `rfq_responses(id, rfq_id, supplier_id, response_date, terms, validity_days, status[awarded/rejected])`
  - `rfq_response_items(id, rfq_response_id, pr_item_id, unit_price, lead_time_days, remarks)`

- [ ] Service `RfqService::award($rfqId, $supplierIds)` — creates one PO per awarded supplier using the winning line items.

#### 4.3.3 Purchase Orders

- [ ] Migration: `create_purchase_orders_table` + `create_purchase_order_items_table`

  ```php
  Schema::create('purchase_orders', function (Blueprint $t) {
      $t->id();
      $t->string('po_no', 30)->unique();
      $t->foreignId('project_id')->constrained()->cascadeOnDelete();
      $t->foreignId('supplier_id')->constrained()->cascadeOnDelete();
      $t->foreignId('purchase_requisition_id')->nullable()->constrained()->nullOnDelete();
      $t->foreignId('rfq_id')->nullable()->constrained()->nullOnDelete();
      $t->date('po_date');
      $t->date('expected_delivery')->nullable();
      $t->string('delivery_address', 500)->nullable();
      $t->string('payment_terms', 100)->nullable();
      $t->decimal('subtotal', 15, 2)->default(0);
      $t->decimal('vat_amount', 15, 2)->default(0);
      $t->decimal('other_charges', 15, 2)->default(0);
      $t->decimal('total', 15, 2)->default(0);
      $t->enum('status', ['draft','submitted','approved','issued','partially_received','fully_received','closed','cancelled'])->default('draft');
      $t->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamp('approved_at')->nullable();
      $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $t->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamps();
      $t->softDeletes();
  });

  Schema::create('purchase_order_items', function (Blueprint $t) {
      $t->id();
      $t->foreignId('purchase_order_id')->constrained()->cascadeOnDelete();
      $t->foreignId('item_id')->constrained()->cascadeOnDelete();
      $t->foreignId('pr_item_id')->nullable()->constrained('purchase_requisition_items')->nullOnDelete();
      $t->decimal('quantity', 12, 3);
      $t->decimal('quantity_received', 12, 3)->default(0);
      $t->string('unit', 20);
      $t->decimal('unit_price', 12, 2);
      $t->decimal('line_total', 15, 2);
      $t->text('remarks')->nullable();
      $t->timestamps();
  });
  ```

#### 4.3.4 Delivery Receipt + Material Receiving Report (MRR)

- [ ] Migration: `create_delivery_receipts_table` + `create_material_receiving_reports_v2_table`
  - Keep the existing `material_receiving_reports` but extend: add `po_id`, `delivery_receipt_id`, `received_by`, `condition`, `photos JSON`, `status`. Write a migration to retrofit.
  - An MRR creates an `inventory_transactions` row (type = `receipt`) if `procurement_route = stock`; for `direct` route, the MRR creates a direct **cost charge** straight to the project budget without touching stock.

#### 4.3.5 Material Issuance (MIR)

- [ ] Migration: `create_material_issuances_table` + `create_material_issuance_items_table`
  - `material_issuances(id, mir_no, project_id, issued_to_user_id, issued_date, purpose, status[draft/issued/returned])`
  - `material_issuance_items(id, mir_id, item_id, boq_item_id, wbs_activity_id, quantity_issued, quantity_returned, unit_cost, line_cost, notes)`
  - Creates `inventory_transactions` rows (type = `issue`).

#### 4.3.6 Returns to Warehouse

- [ ] Migration: `create_material_returns_table` (symmetric to MIR, type = `return`).

### 4.4 Inventory Transactions (ledger — source of truth)

- [ ] Extend `inventory_transactions` so types are: `receipt, issue, return, adjustment, transfer_in, transfer_out, opening_balance`.
- [ ] Add columns `reference_type`, `reference_id` polymorphic to MRR / MIR / ReturnSlip / Adjustment / OpeningBalance.
- [ ] **Stock view:** create a SQL view `v_item_stock` that computes `SUM(signed_qty) GROUP BY item_id`. Expose via an Eloquent attribute `Item::getCurrentStockAttribute()` that queries the view.
- [ ] Write an Artisan command `stock:reconcile` that compares `items.current_stock` (legacy) with the view and reports drift.

### 4.5 Warehouse / Store

- [ ] Optional: `warehouses(id, code, name, location, is_active)` if the client operates multiple stores. Add `warehouse_id` to `inventory_transactions`.

### 4.6 Permissions for Phase 3

`items.*`, `suppliers.*`, `pr.*` (view/create/update/submit/approve/reject/cancel), `rfq.*` (view/create/issue/award/cancel), `po.*` (view/create/update/approve/issue/close/cancel), `mrr.*`, `mir.*`, `stock.view`, `stock.adjust`.

### 4.7 UI

- [ ] Dedicated **Procurement** sidebar section: Requisitions, RFQs, Purchase Orders, Receiving, Issuances, Returns, Suppliers.
- [ ] Inside a project, a **Materials** tab showing: allocated (BOQ estimate), committed (open POs), delivered (MRR), issued (MIR), on-site balance, variance.

**End of Phase 3 acceptance:** storekeeper receives a 40-bag cement delivery, creates MRR linked to PO, stock rises by 40; site engineer issues 25 bags against BOQ item 900(1)c — stock drops, BOQ "material consumed" % rises, project AC increases.

---

<a id="5-phase-4"></a>

## 5. Phase 4 — QA/QC, Safety, Equipment, Subcontracts

**Why fourth:** with execution and cost wired, now add the controls that keep quality high, workers safe, equipment productive, and subcontracts honest.

### 5.1 Quality (QA/QC)

#### 5.1.1 RFI (Request for Information)

- [ ] Migration: `create_rfis_table`

  ```php
  Schema::create('rfis', function (Blueprint $t) {
      $t->id();
      $t->string('rfi_no', 30)->unique();
      $t->foreignId('project_id')->constrained()->cascadeOnDelete();
      $t->string('subject', 255);
      $t->text('question');
      $t->foreignId('wbs_activity_id')->nullable()->constrained()->nullOnDelete();
      $t->foreignId('boq_item_id')->nullable()->constrained()->nullOnDelete();
      $t->date('date_raised');
      $t->date('response_needed_by')->nullable();
      $t->text('answer')->nullable();
      $t->date('date_answered')->nullable();
      $t->enum('status', ['open','answered','closed'])->default('open');
      $t->foreignId('raised_by')->nullable()->constrained('users')->nullOnDelete();
      $t->foreignId('answered_by')->nullable()->constrained('users')->nullOnDelete();
      $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamps();
      $t->softDeletes();
  });
  ```

#### 5.1.2 NCR (Non-Conformance Report)

- [ ] Migration: `create_ncrs_table` with severity, corrective_action, verification, closeout.

  ```php
  Schema::create('ncrs', function (Blueprint $t) {
      $t->id();
      $t->string('ncr_no', 30)->unique();
      $t->foreignId('project_id')->constrained()->cascadeOnDelete();
      $t->foreignId('wbs_activity_id')->nullable()->constrained()->nullOnDelete();
      $t->foreignId('boq_item_id')->nullable()->constrained()->nullOnDelete();
      $t->enum('severity', ['minor','major','critical']);
      $t->text('description');
      $t->text('root_cause')->nullable();
      $t->text('corrective_action')->nullable();
      $t->text('preventive_action')->nullable();
      $t->enum('status', ['open','corrective_issued','verification_pending','closed'])->default('open');
      $t->date('date_raised');
      $t->date('target_close_date')->nullable();
      $t->date('actual_close_date')->nullable();
      $t->foreignId('raised_by')->nullable()->constrained('users')->nullOnDelete();
      $t->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
      $t->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamps();
      $t->softDeletes();
  });
  ```

#### 5.1.3 Punch List

- [ ] Migration: `create_punch_list_items_table` (per room/area/element, status: open → in_progress → verified → closed, target_date, photos).

#### 5.1.4 Submittals

- [ ] Migration: `create_submittals_table` (shop drawings, samples, specs) + `create_submittal_revisions_table` (rev_no, status=`approved/approved_as_noted/revise_resubmit/rejected`, reviewer, comments).

#### 5.1.5 Inspection Requests + Checklists

- [ ] Migration: `create_inspection_requests_table` (aka "IR" or "Request for Inspection"), `create_inspection_checklists_table`, `create_inspection_checklist_items_table` (pass/fail per item).

#### 5.1.6 Material Tests

- [ ] Migration: `create_material_tests_table` (concrete cylinder 7/14/28-day, rebar tensile, soil compaction, aggregate gradation) linked to `items` and `wbs_activities`.

### 5.2 Safety / HSE

- [ ] `create_safety_toolbox_meetings_table` (date, topic, attendees JSON, minutes, photo).
- [ ] `create_safety_incidents_table` (date, time, severity=`near_miss/first_aid/medical/lost_time/fatal`, description, root_cause, corrective_action, reported_to_DOLE bool).
- [ ] `create_ppe_issuances_table` (employee_id, item_id, qty, date, signature).
- [ ] Dashboard: days-without-LTI counter, leading/lagging indicators.

### 5.3 Equipment / Plant

- [ ] `create_equipment_table` (asset_code, name, type, make/model, year, ownership=`owned/rented`, rental_rate_day/hr, status=`available/deployed/maintenance/idle`).
- [ ] `create_equipment_deployments_table` (equipment_id, project_id, start_date, end_date, rate).
- [ ] `create_equipment_timesheets_table` (equipment_id, project_id, date, hours_used, hours_idle, hours_breakdown, operator_id).
- [ ] `create_fuel_logs_table` (equipment_id, date, liters, price_per_liter, odometer, logged_by).
- [ ] `create_maintenance_logs_table` (equipment_id, type=`preventive/corrective`, date, description, cost, downtime_hours).
- [ ] Link `dsr_equipment` to `equipment` FK (nullable kept for back-compat).

### 5.4 Subcontracts

- [ ] `create_subcontractors_table` (extends supplier with scope specialties).
- [ ] `create_subcontracts_table` (project_id, subcontractor_id, scope, amount, retention_pct, start, end, status).
- [ ] `create_subcontract_boq_items_table` (subcontract_id, boq_item_id, quantity, unit_rate).
- [ ] `create_subcontract_billings_table` + `create_subcontract_billing_lines_table` (mirror main billing structure).
- [ ] `create_subcontract_payments_table`.

### 5.5 Permissions for Phase 4

`rfi.*`, `ncr.*`, `punch.*`, `submittal.*`, `inspection.*`, `material-test.*`, `safety.*`, `equipment.*`, `fuel.*`, `maintenance.*`, `subcontract.*`.

**End of Phase 4 acceptance:** QA inspector raises NCR against a structural pour, issues are linked to BOQ item; safety officer logs toolbox meeting and PPE issuance; crane operator submits timesheet; subcontractor submits their own progress billing; all feeds the same EVM engine.

---

<a id="6-phase-5"></a>

## 6. Phase 5 — Progress Billing, Approvals Engine, Documents Register, Closeout

**Why fifth:** billing is what gets the company paid; approvals are what makes the workflow enterprise-grade; documents and closeout are what the owner's auditor will check.

### 6.1 Progress Billing (replaces scalar `billings` table)

**Business rule:** a progress billing = Statement of Work Accomplished (SWA) for a period, built from BOQ accomplishment, with standard deductions.

- [ ] Migration: `create_progress_billings_table`

  ```php
  Schema::create('progress_billings', function (Blueprint $t) {
      $t->id();
      $t->string('billing_no', 30)->unique();
      $t->foreignId('project_id')->constrained()->cascadeOnDelete();
      $t->unsignedInteger('billing_sequence');    // 1, 2, 3...
      $t->date('period_from');
      $t->date('period_to');
      $t->date('billing_date');
      $t->decimal('gross_accomplishment', 15, 2)->default(0);
      $t->decimal('previous_accomplishment', 15, 2)->default(0);
      $t->decimal('current_accomplishment', 15, 2)->default(0);
      $t->decimal('materials_on_site', 15, 2)->default(0);
      $t->decimal('change_orders_amount', 15, 2)->default(0);
      $t->decimal('subtotal', 15, 2)->default(0);
      $t->decimal('dp_recoupment_pct', 5, 2)->default(15.00);
      $t->decimal('dp_recoupment_amount', 15, 2)->default(0);
      $t->decimal('retention_pct', 5, 2)->default(10.00);
      $t->decimal('retention_amount', 15, 2)->default(0);
      $t->decimal('ewt_pct', 5, 2)->default(2.00);
      $t->decimal('ewt_amount', 15, 2)->default(0);
      $t->decimal('vat_amount', 15, 2)->default(0);
      $t->decimal('other_deductions', 15, 2)->default(0);
      $t->decimal('net_amount_due', 15, 2)->default(0);
      $t->enum('status', ['draft','submitted','approved','rejected','paid'])->default('draft');
      $t->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamp('submitted_at')->nullable();
      $t->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamp('approved_at')->nullable();
      $t->text('rejection_reason')->nullable();
      $t->text('remarks')->nullable();
      $t->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
      $t->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamps();
      $t->softDeletes();
      $t->unique(['project_id','billing_sequence']);
  });

  Schema::create('progress_billing_lines', function (Blueprint $t) {
      $t->id();
      $t->foreignId('progress_billing_id')->constrained()->cascadeOnDelete();
      $t->foreignId('boq_item_id')->constrained()->cascadeOnDelete();
      $t->decimal('contract_qty', 12, 3);
      $t->decimal('unit_rate', 15, 2);
      $t->decimal('contract_amount', 15, 2);
      $t->decimal('prev_qty', 12, 3)->default(0);
      $t->decimal('this_qty', 12, 3)->default(0);
      $t->decimal('to_date_qty', 12, 3)->default(0);
      $t->decimal('prev_amount', 15, 2)->default(0);
      $t->decimal('this_amount', 15, 2)->default(0);
      $t->decimal('to_date_amount', 15, 2)->default(0);
      $t->decimal('pct_to_date', 5, 2)->default(0);
      $t->timestamps();
  });

  Schema::create('progress_billing_deductions', function (Blueprint $t) {
      $t->id();
      $t->foreignId('progress_billing_id')->constrained()->cascadeOnDelete();
      $t->enum('type', ['dp_recoupment','retention','ewt','vat','penalty','other']);
      $t->string('description', 255)->nullable();
      $t->decimal('amount', 15, 2);
      $t->timestamps();
  });

  Schema::create('retention_releases', function (Blueprint $t) {
      $t->id();
      $t->foreignId('project_id')->constrained()->cascadeOnDelete();
      $t->date('release_date');
      $t->decimal('amount', 15, 2);
      $t->enum('type', ['partial','final']);
      $t->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamps();
      $t->softDeletes();
  });
  ```

- [ ] Service `ProgressBillingService`:
  - `prepare(Project, Carbon $cutoff)` — pulls each BOQ item, computes `to_date_qty` from approved DSRs, subtracts previous billings → this period amounts.
  - `recalculateDeductions(ProgressBilling $b)` — DP recoupment based on DP received and remaining; retention always `retention_pct * current_accomplishment`; EWT on service portion; VAT if project is VAT-registered.
  - `submit(ProgressBilling $b)`, `approve($b, $user)`, `reject($b, $reason)`.
  - `markPaid($b, paymentData)` — creates `billing_payments` row (reuse existing table, migrate FK to point at `progress_billing_id`).
- [ ] Retire legacy `billings` + `billing_payments` by adding a `progress_billing_id` column nullable and migrating old rows via a script.

### 6.2 Approvals Engine (generic)

**Business rule:** any module (CO, PR, PO, Payroll, Progress Billing, etc.) can submit a record for approval; the engine routes through configured steps and enforces audit trail.

- [ ] Migration: `create_approval_flows_table`, `create_approval_flow_steps_table`, `create_approval_requests_table`, `create_approval_actions_table`

  ```php
  Schema::create('approval_flows', function (Blueprint $t) {
      $t->id();
      $t->string('module', 60);       // 'change_order','progress_billing','purchase_order',...
      $t->string('name', 120);
      $t->boolean('is_active')->default(true);
      $t->timestamps();
  });

  Schema::create('approval_flow_steps', function (Blueprint $t) {
      $t->id();
      $t->foreignId('approval_flow_id')->constrained()->cascadeOnDelete();
      $t->unsignedInteger('step_no');
      $t->string('approver_role', 60)->nullable();      // role-based
      $t->foreignId('approver_user_id')->nullable()->constrained('users')->nullOnDelete(); // or specific user
      $t->boolean('any_of')->default(false);            // if step has multiple approvers, any_of or all_of
      $t->timestamps();
      $t->unique(['approval_flow_id','step_no']);
  });

  Schema::create('approval_requests', function (Blueprint $t) {
      $t->id();
      $t->string('module', 60);
      $t->string('record_type', 120);
      $t->unsignedBigInteger('record_id');
      $t->foreignId('approval_flow_id')->constrained()->cascadeOnDelete();
      $t->unsignedInteger('current_step');
      $t->enum('status', ['pending','approved','rejected','cancelled'])->default('pending');
      $t->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamp('submitted_at')->nullable();
      $t->timestamp('completed_at')->nullable();
      $t->timestamps();
      $t->index(['module','record_id']);
      $t->index(['record_type','record_id']);
  });

  Schema::create('approval_actions', function (Blueprint $t) {
      $t->id();
      $t->foreignId('approval_request_id')->constrained()->cascadeOnDelete();
      $t->unsignedInteger('step_no');
      $t->foreignId('actor_user_id')->constrained('users')->cascadeOnDelete();
      $t->enum('action', ['approved','rejected','delegated','commented']);
      $t->text('remarks')->nullable();
      $t->timestamp('acted_at');
      $t->timestamps();
  });
  ```

- [ ] Trait `HasApprovals` on approvable models: `submitForApproval()`, `currentApproval()`, `approvalHistory()`.
- [ ] Service `ApprovalService::submit($module, $record)`, `::act($requestId, $user, $action, $remarks)`.
- [ ] Page `Approvals/Inbox` — "Pending my approval" queue for the current user.

### 6.3 Project Documents register

- [ ] Migration: `create_project_documents_table`

  ```php
  Schema::create('project_documents', function (Blueprint $t) {
      $t->id();
      $t->foreignId('project_id')->constrained()->cascadeOnDelete();
      $t->string('document_type', 80);      // 'building_permit','ntp','surety_bond','ecc','insurance',...
      $t->string('file_path');
      $t->string('original_name');
      $t->string('mime_type', 100);
      $t->unsignedBigInteger('file_size')->default(0);
      $t->date('issued_date')->nullable();
      $t->date('expiry_date')->nullable();
      $t->string('issuing_body', 255)->nullable();
      $t->string('reference_number', 100)->nullable();
      $t->text('notes')->nullable();
      $t->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
      $t->timestamps();
      $t->softDeletes();
      $t->index(['project_id','document_type']);
  });
  ```

- [ ] **Data migration:** for every existing project with `building_permit`, `business_permit`, `environmental_compliance`, `contractor_license`, `surety_bond`, `signed_contract`, `notice_to_proceed` set → insert a row in `project_documents` with matching `document_type`. Then drop those columns.
- [ ] Update `ProjectsController::store/update/serveDocument` and the Project create/edit UI to use the register. The UI renders a list of required doc types (configurable) with upload/replace/expiry.
- [ ] Permissions: `project-documents.view`, `.upload`, `.update`, `.delete`.

### 6.4 Closeout

- [ ] Migration: add `substantial_completion_date`, `final_completion_date`, `dlp_end_date`, `closeout_status` to `projects` (or create a `project_closeouts` table for full detail).
- [ ] `create_project_handovers_table` (as-built drawings, O&M manuals, warranties, equipment certificates, keys/access, attended by JSON).
- [ ] `create_defect_liability_items_table` (reported during DLP, linked to punch list-style workflow).
- [ ] New project statuses: `pre_construction`, `mobilization`, `in_progress`, `substantial_completion`, `punch_list`, `final_acceptance`, `dlp`, `closed`. Migrate existing rows: `planning → pre_construction`, `active → in_progress`, `completed → closed`, `on_hold / cancelled` unchanged.

### 6.5 Project-scoped Roles & RACI

- [ ] Migration: `create_project_role_catalog_table` seed: PM, SE (Site Engineer), Foreman, QA/QC Engineer, Safety Officer, Surveyor, Materials Engineer, Timekeeper, Storekeeper, Cost Engineer, Admin/Secretary, Laborer, Skilled (Mason/Carpenter/etc.).
- [ ] Update `project_teams.role` from free string to `role_id` FK to `project_role_catalog`. Data migration maps existing strings to the seeded catalog; unmatched strings become "Other - " + original text and a ticket for admin cleanup.
- [ ] RACI matrix UI per project: rows = WBS activities, cols = roles, cells = R/A/C/I.

### 6.6 Reports — final pass

- [ ] Add: **S-Curve Report**, **EVM Dashboard**, **Cashflow (billing schedule vs payments)**, **Manpower Histogram**, **Material Consumption vs BOQ**, **Equipment Utilization**, **Subcontractor Performance**, **NCR Trend**, **Safety KPIs**, **Change Order Log**, **Document Expiry Alert**.

**End of Phase 5 acceptance:** engineer runs billing #5 → system pre-fills qty-to-date from DSRs, applies 15% DP recoupment, 10% retention, 2% EWT, produces a PDF SWA, routes to PM (approve) → Client (approve) → Accounting (post payment) with complete audit trail.

---

<a id="7-uiux-principles"></a>

## 7. UI/UX Principles (make engineers' lives easier)

These are non-negotiable for the "make their lives easier" goal.

1. **Project-centric navigation.** Once inside a project, never leave it for routine tasks. All modules (BOQ, WBS, DSR, Materials, Labor, Billing, QA/QC, Safety) are **tabs on the project detail page**. Global sidebar is for master data (Suppliers, Items, Cost Codes, Users, Reports).
2. **One action, one click.** A Site Engineer logging a DSR should reach "submit" within 4 clicks from opening the app.
3. **Auto-fill from last entry.** DSR, DTR, Progress Billing — default to last period/day's values, user just adjusts deltas.
4. **Mobile-first for DSR, DTR, MRR, MIR, Photos, RFI, NCR, PPE, Incidents.** These happen on site. Use the existing `client-app` Expo setup and add engineer-side screens.
5. **Offline-first for site ops.** DSR draft saves locally, syncs when connectivity returns. Photos queue upload with retry.
6. **Numeric keyboards, date pickers, dropdowns — never free text where a dropdown can serve.** Reduces bad data at source.
7. **Every list screen has: search, filter chips, sort, date range, export (Excel + PDF), column chooser.** Mirror `ProjectsController::index`.
8. **Every detail screen has: breadcrumbs, header action bar (Submit/Approve/Reject/Export/Print), tabs, audit trail drawer.**
9. **Status is always visible as a colored pill.** Draft = gray, Submitted = blue, Approved = green, Rejected = red, Posted = purple, Paid = teal.
10. **Dashboards on opening.** Admin dashboard = company portfolio. Project dashboard = S-curve, CPI, SPI, upcoming milestones, open NCRs, expired docs, overdue PRs. Role dashboard (SE, QA, Safety, Timekeeper, Storekeeper) = tasks for today.
11. **Notifications are actionable.** A "RFI assigned to you" notification opens the RFI form, not just the list.
12. **Print everything.** PDFs of DSR, BOQ, SWA, PO, DR, MRR, MIR, Payroll, NCR, Punch List — with company header, signatures block, page numbers.
13. **Keyboard shortcuts for power users** (`n` = new, `/` = search, `e` = edit, `s` = submit). Document in a `/shortcuts` modal.
14. **Red flags.** If AC trends above planned → CPI widget red. If DSR missing for 2+ days → banner. If a document expires within 30 days → banner.
15. **Never lose work.** Autosave every form every 10s to local draft. Warn on navigation-away with unsaved changes.

---

<a id="8-testing-strategy"></a>

## 8. Testing Strategy

### 8.1 Per-module tests (Feature tests, `backend/tests/Feature/`)

For each module, at minimum:

- **Happy path** — authenticated user with correct permission performs full CRUD.
- **Permission denial** — missing permission returns 403.
- **Validation failure** — invalid payload returns 422 with expected errors.
- **Workflow state machine** — draft → submitted → approved; reject; cannot re-submit from approved.
- **Cascade math** — submitting a DSR increments activity % and project %.
- **Transaction safety** — simulated exception inside service rolls back entire mutation.

### 8.2 Golden-path end-to-end test

One `tests/Feature/ConstructionLifecycleTest.php` that walks through:

1. Create client + project
2. Upload BOQ (Excel fixture) → finalize
3. Create WBS from BOQ
4. Seed DP (down payment) received
5. 30 DSRs (one per day) with progressive qty
6. Issue 1 additive CO, approve
7. Create Progress Billing #1 → approve → mark paid
8. Verify CPI, SPI, progress %, billing totals

### 8.3 Seed data for dev

`database/seeders/DemoProjectSeeder.php` creates:
- 2 clients, 1 project, 15 employees, 6 users with distinct roles
- Cost codes tree (DPWH baseline)
- BOQ with 40 items
- WBS with 25 activities
- 10 days of DSRs with realistic numbers
- 1 approved CO
- 1 draft progress billing

Run via `php artisan db:seed --class=DemoProjectSeeder` so the panel sees a live, populated system.

### 8.4 Performance budget

- Project index page must render in < 400ms with 500 projects.
- Project detail page (all tabs eager-loaded) < 800ms.
- DSR submit (with photo upload) < 2s round trip.

---

<a id="9-data-migration"></a>

## 9. Data Migration Strategy for Existing Records

**Principle:** never blow away pilot data — the panel may ask to see pre-refactor records. Migrate, don't delete.

### Per phase:

- **Phase 1:** existing `project_milestones` and `project_tasks` remain. Add BOQ/WBS alongside. If a legacy project has no BOQ, `ProjectsController::index()` falls back to task-count progress.
- **Phase 2:** keep `project_labor_costs` rows as read-only history; new entries go through DTR + Payroll. Write a one-time command `labor:migrate-to-dtr {project?}` to unpack JSON attendance into `daily_time_records`.
- **Phase 3:** unify `inventory_items` + `direct_supplies` → `items`. Keep old tables for 90 days with a deprecation notice; update all FKs; drop after verification.
- **Phase 4:** `project_issues` rows get classified (RFI vs NCR vs Punch vs Incident) by a one-shot command asking admin to label via a CLI prompt; default = RFI.
- **Phase 5:** `billings` + `billing_payments` are kept for history; new records go to `progress_billings`. Data migration copies scalar `billings` into a synthetic `progress_billings` with one line item carrying the total (so the module can display history consistently).
- **Documents:** move `projects.*_permit` column data into `project_documents` then drop the columns.

Each data-migration step is:
1. A dedicated migration file named `copy_<source>_to_<target>.php` — idempotent.
2. A reversible `down()` where feasible.
3. Wrapped in `DB::transaction()`.
4. Logged via `Log::info()` with row counts so there's evidence.

---

<a id="10-definition-of-done"></a>

## 10. Definition of Done (per module)

A module is "done" only when **all** of these are true:

- [ ] Migration applied clean on a fresh DB and on a copy of production.
- [ ] Model has factories + 1 feature test covering happy path + 1 for permission denial.
- [ ] Service class contains all mutations; controller is thin.
- [ ] All routes protected by `auth` + Spatie `permission:*` middleware.
- [ ] Inertia page works on desktop 1280px, 1440px, and 1920px; mobile-responsive if it's a site-ops module.
- [ ] Activity Log entry on create / update / delete / submit / approve / reject.
- [ ] Notification (system and, where applicable, client) on approval-relevant events.
- [ ] Excel + PDF export for every list and every "document" record (DSR, PO, MRR, MIR, SWA, Payroll).
- [ ] Dev seeder populates realistic data.
- [ ] README snippet in `docs/modules/<module>.md` explaining the business workflow (2–3 paragraphs) and the route list.
- [ ] Screenshot in `docs/screenshots/<module>/` for the panel demo.

---

<a id="11-glossary"></a>

## 11. Glossary (so Copilot speaks construction)

| Term | Meaning |
|---|---|
| **BOQ** | Bill of Quantities — priced list of all work items |
| **WBS** | Work Breakdown Structure — hierarchical decomposition of project scope |
| **DSR** | Daily Site Report / Daily Accomplishment Report |
| **DTR** | Daily Time Record — attendance source for payroll |
| **NTP** | Notice to Proceed — owner's greenlight to start work |
| **CO / VO** | Change Order / Variation Order — contract amendment |
| **SWA** | Statement of Work Accomplished — progress billing |
| **PR** | Purchase Requisition — site's request to buy |
| **RFQ** | Request for Quotation — canvass from suppliers |
| **PO** | Purchase Order — binding order to supplier |
| **DR** | Delivery Receipt — from supplier upon delivery |
| **MRR** | Material Receiving Report — storekeeper's acceptance |
| **MIR** | Material Issuance Request/Record — site draws from stock |
| **RFI** | Request for Information — question to designer/owner |
| **NCR** | Non-Conformance Report — quality defect |
| **Punch List** | Outstanding defect items before final acceptance |
| **DLP** | Defects Liability Period — post-completion warranty |
| **EVM** | Earned Value Management — project performance framework |
| **PV** | Planned Value — budgeted cost of scheduled work |
| **EV** | Earned Value — budgeted cost of completed work |
| **AC** | Actual Cost — real cost incurred |
| **CPI** | Cost Performance Index = EV/AC (≥1 = on budget) |
| **SPI** | Schedule Performance Index = EV/PV (≥1 = on schedule) |
| **BAC** | Budget at Completion — total approved budget |
| **EAC** | Estimate at Completion — forecast final cost |
| **ETC** | Estimate to Complete — forecast remaining cost |
| **VAC** | Variance at Completion = BAC − EAC |
| **EWT** | Expanded Withholding Tax (2% for contractors PH) |
| **DP Recoupment** | Gradual recovery of mobilization/down payment |
| **Retention** | 10% held back, released after DLP |
| **DPWH** | Department of Public Works and Highways (PH standards) |
| **DOLE DO-13** | PH construction safety standard |

---

## Appendix A — "If Copilot only has 1 day" minimum viable slice

If time is extremely short and only Phase 1 + partial 5 is possible for the panel re-defense:

- [ ] BOQ (2.2) — table + CRUD + Excel import
- [ ] WBS Activities (2.3) — table + CRUD + weight calc
- [ ] DSR skeleton (2.4) — table + manpower + activities + approval flow
- [ ] Change Orders (2.5) — table + approve flow that updates contract_amount
- [ ] Progress Billing lite (6.1) — just the header + lines, without deduction engine
- [ ] Update `ProjectsController::index` progress calc to BOQ/WBS-weighted

That alone demonstrates construction-literacy to any panel.

---

## Appendix B — Prompt Copilot should use when implementing each module

> "Implement `<Module>` from `IMPLEMENTATION_PLAN.md` §`<section>`. Follow the module template in §1.4. Use existing patterns from `ProjectsController` (thin controller, service, transaction, activity log, notification). Match naming in §1.2. Add permissions per §1.3 and seed them. Build Inertia page(s) consistent with `ProjectManagement/project-detail.jsx`. Write a feature test for happy path + permission denial. Do not modify unrelated files. Reply with a summary of files added/changed and the migration names."

---

*End of plan. Tick every box, ship every phase, and the system stops being a task tracker and becomes a real Construction ERP.*

