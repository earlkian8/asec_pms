# Construction PMS — Architecture Audit

**Auditor's verdict:** the system you built is a **generic project-management tool dressed in construction clothing**. It follows the *Asana / Trello / Jira* mental model (Project → Milestone → Task → Update) rather than the real **construction engineering workflow** (Contract → BOQ/WBS → Schedule → Daily Site Ops → Progress Billing → Closeout). That is why the panel said the workflow and architecture are wrong — they're not wrong in code quality, they're wrong in **domain modeling**. Below is the honest breakdown.

---

## 1. What your system currently is

Looking at the migrations and `ProjectsController`:

```
Project
├── ProjectTeam (users/employees + role string)
├── ProjectMilestone
│   └── ProjectTask
│       └── ProgressUpdate (photo/file)
├── ProjectMaterialAllocation  →  MaterialReceivingReport
│                              →  MilestoneMaterialUsage
├── ProjectLaborCost (period + attendance JSON)
├── ProjectMiscellaneousExpense
├── ProjectIssue
├── ProjectFile (documents: building_permit, NTP, surety_bond…)
├── Billing  →  BillingPayment (Paymongo)
└── ClientUpdateRequest (client portal)
```

This is a **task tracker + expense ledger + billing module**. It is **not a construction monitoring system.**

---

## 2. Critical architectural problems (ranked)

### 2.1 Progress = `completedTasks / totalTasks * 100` is fundamentally wrong

`ProjectsController::index()` computes progress by counting completed tasks. In real construction, progress is **physical accomplishment** — % of work-in-place measured against BOQ quantities (e.g., "40 m³ of 120 m³ of concrete poured = 33%"). A task being "done" says nothing about whether 3 floors of rebar got tied. **The panel noticed this immediately.**

### 2.2 No Bill of Quantities (BOQ) / Work Breakdown Structure (WBS)

There is no table for:

- BOQ line items (item code, description, unit, quantity, unit rate, amount)
- Cost codes (CSI / Masterformat or Philippine DPWH item codes: 803(1)a Clearing, 804(4) Embankment, 900(1)c Structural Concrete, etc.)
- WBS hierarchy beyond one milestone level

Without BOQ, you cannot do **Progress Billing**, **Earned Value**, or **Cost-to-Complete** — the three things a construction PM actually uses daily.

### 2.3 No Earned Value Management (EVM)

Missing: **Planned Value (PV)**, **Earned Value (EV)**, **Actual Cost (AC)**, **CPI**, **SPI**, **Estimate-at-Completion (EAC)**, **Variance-at-Completion (VAC)**. These are the metrics the owner's PM and the client's PM both require. `contract_amount` alone (revenue side) gives you nothing on cost performance.

### 2.4 No project budget / no planned-vs-actual

`projects.contract_amount` is the *contract price* (revenue). There is **no baseline budget** by category (Labor, Materials, Equipment, Subcontract, Overhead, Contingency). So even though you track actual labor and actual material cost, you have **nothing to compare against** — defeating the whole point of monitoring.

### 2.5 Billing model is wrong for construction

Your `billings` table links to ONE milestone (`milestone_id`) with one amount. Real Philippine construction billing is a **Statement of Work Accomplished (SWA)** / **Progress Billing** with:

- Previous accomplishment %
- Current accomplishment %
- To-date accomplishment %
- Materials-on-site (if allowed)
- **Less:** down payment recoupment (usually 15%)
- **Less:** retention / retainage (usually 10%)
- **Less:** EWT (2% creditable withholding for contractors)
- **Plus/Less:** approved change orders
- Net amount due

None of this is in the schema. `billing_amount` is a single scalar.

### 2.6 No Change Order / Variation Order module

In `update()`, you actively **block editing `contract_amount` once billings exist**. That is the *opposite* of what a construction ERP must do. Contracts change constantly via **Change Orders** (additive / deductive / time extension). You need a `change_orders` table approved by the owner that amends the contract sum and schedule.

### 2.7 Materials module is warehouse-only, and the stock model is unsafe

- `inventory_items.current_stock` is a **stored column** — this drifts from `inventory_transactions`. Stock must be **derived** from the transaction ledger (sum of IN − OUT) or kept in sync via a trigger/service with idempotency checks. Right now two concurrent receipts will corrupt stock.
- No **Purchase Requisition → Canvass/RFQ → Purchase Order → Delivery Receipt → Material Receiving Report → Material Issuance (MIR) → Return to Warehouse** lifecycle.
- No **Supplier / Vendor** master table.
- `DirectSupply` exists as a parallel item catalog with nullable polymorphic FKs on `project_material_allocations.inventory_item_id` / `direct_supply_id`. This is a **workaround, not a design**. Direct-to-site supply is a **procurement route**, not a second item catalog. Unify under one `items` table + a `procurement_type` (stock/direct).

### 2.8 Labor / payroll model conflates attendance with cost

`project_labor_costs.attendance` is a **JSON** map of `date → P|A|HD`. That means:

- You cannot query "total man-days on this project in March" without decoding JSON for every row.
- No overtime, night differential, holiday premium, rest-day pay, Sunday premium.
- No government deductions (SSS, PhilHealth, Pag-IBIG, BIR).
- Attendance belongs in its own table, labor cost is the **computed output**, not the source of truth.

Real flow: **Daily Time Record (DTR) → Timekeeper validation → Payroll period cutoff → Payroll computation → Payroll approval → Disbursement**.

### 2.9 ProgressUpdate is tied to Task, not to BOQ / activity

A photo of "30% of column formwork" has nowhere meaningful to live. It gets stapled to a generic task. No QA/QC inspector can later ask "show me all pours for item 900(1)c" — the data model doesn't support it.

### 2.10 No Daily Site Report (DSR / Daily Accomplishment Report)

The single most important document on a construction site is missing. A DSR captures per calendar day:

- Weather (AM/PM)
- Manpower count by trade
- Equipment on site + hours utilized / idle / breakdown
- Activities performed (linked to BOQ items + % accomplished)
- Materials delivered
- Visitors / inspections
- Incidents / safety events
- Photos

Your `ProgressUpdate` is a weak task-attachment, not a DSR.

### 2.11 No Equipment / Plant module

Construction runs on heavy equipment (backhoe, crane, concrete mixer, generator). You need: equipment master, rental contracts, fuel log, maintenance log, equipment time sheet, chargeback to project. **Zero coverage.**

### 2.12 No Quality (QA/QC) module

Missing: Inspection checklists, Punch List, **NCR (Non-Conformance Report)**, **RFI (Request for Information)**, **Submittals / Shop Drawings register**, **Material Test Reports** (cylinder tests, rebar tests, soil compaction). `ProjectIssue` is a catch-all that cannot substitute.

### 2.13 No Safety / HSE module

No toolbox talks, PPE issuance log, incident/accident reports, near-miss reports, JSA/JHA. Required by DOLE DO-13 on Philippine sites.

### 2.14 No Subcontractor / Scope Package module

Large projects award **subcontracts** (earthworks, MEP, finishes). Each has its own contract value, retention, progress billing, and insurance. Not modeled.

### 2.15 Project statuses are too coarse

Current: `planning | active | on_hold | completed | cancelled`. Real construction lifecycle: `pre-construction → mobilization → in-progress → substantial-completion → punch-list → final-acceptance → defects-liability-period (DLP) → closed`.

### 2.16 Role is a free-string on `project_teams`

`role` is `string(50)`. There's no structured role model (Project Manager, Site Engineer, Foreman, Safety Officer, QA/QC Engineer, Surveyor, Materials Engineer, Timekeeper, Storekeeper). This prevents any **Responsibility Assignment Matrix (RACI)** or role-based permissions per project.

### 2.17 No approval workflows

Billings, labor payrolls, material requests, change orders all need multi-level approval (Site Engineer → Project Manager → Accounting → Owner). Nothing in the schema models states `draft → submitted → reviewed → approved → posted`. You have a `status` on labor costs but no reviewer/approver columns, no audit trail per state.

### 2.18 `project.project_type` is duplicated

You have both a legacy ENUM column (`project_type`) and a FK (`project_type_id`) after migration `2025_12_10`. The enum should have been dropped — keeping both is a trap.

### 2.19 Documents-as-columns anti-pattern

`projects` has `building_permit`, `business_permit`, `environmental_compliance`, `contractor_license`, `surety_bond`, `signed_contract`, `notice_to_proceed` — each as a string column. Adding a new required doc (e.g., ECC, tax clearance, PhilGEPS posting) means a migration. Use a single `project_documents` table keyed by `document_type`.

### 2.20 `contract_amount` stored as scalar, never versioned

When a change order is approved the contract changes. History is lost. Need `project_contract_revisions` table.

---

## 3. Correct Construction Project Monitoring workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. PRE-CONSTRUCTION                                          │
│   Award → Contract → NTP → Permits → Mobilization            │
│   Upload: Contract, NTP, Permits, Surety/Perf Bond, Insurance│
├─────────────────────────────────────────────────────────────┤
│ 2. PLANNING                                                  │
│   BOQ load (from estimator) →  WBS →  Schedule (Gantt)      │
│   Baseline set: PV curve, S-curve, cashflow, manpower histo │
│   Project Budget: split contract into Labor/Mat/Equip/Sub/OH│
├─────────────────────────────────────────────────────────────┤
│ 3. EXECUTION (daily loop)                                    │
│   DTR in  →  DSR (manpower/equip/weather/activities)         │
│   Material Request → PO → Delivery → Receiving → Issuance    │
│   Accomplishment % per BOQ item updated                      │
│   Photos attached to BOQ item + date                          │
│   RFIs, NCRs, Punch list, Safety incidents                   │
├─────────────────────────────────────────────────────────────┤
│ 4. MONITORING (weekly / monthly)                             │
│   EV, PV, AC →  CPI, SPI, EAC, VAC                           │
│   S-curve actual vs planned                                   │
│   Variance report + Look-ahead schedule                      │
├─────────────────────────────────────────────────────────────┤
│ 5. BILLING (monthly)                                          │
│   Accomplishment report (per BOQ item %)                      │
│   SWA / Progress Billing:                                    │
│     Gross accomplishment this period                         │
│     + Materials on site                                       │
│     − Previous accomplishment                                 │
│     − 15% DP recoupment                                       │
│     − 10% retention                                           │
│     − 2% EWT                                                  │
│     + approved Change Orders                                  │
│     = Net amount due                                          │
│   Owner review → payment → OR issued                          │
├─────────────────────────────────────────────────────────────┤
│ 6. CHANGE MANAGEMENT (anytime)                                │
│   VO / Change Order → owner approval → contract revision     │
│   Schedule re-baseline (if time extension)                    │
├─────────────────────────────────────────────────────────────┤
│ 7. CLOSEOUT                                                   │
│   Punch list cleared → Substantial completion                 │
│   As-built drawings, O&M manuals, warranties                  │
│   Final billing → Retention release (after DLP)               │
│   Project archive                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Recommended modules (Construction ERP)

**Core (must-have):**

1. **Contracts** (with revisions / change orders)
2. **BOQ & Cost Codes** (the backbone)
3. **WBS & Schedule** (activities with baseline/actual dates & dependencies)
4. **Daily Site Report (DSR)**
5. **Progress Accomplishment** (per BOQ item, per date)
6. **Progress Billing / SWA** (with retention, DP recoupment, EWT, VAT)
7. **Procurement** (Requisition → Canvass → PO → DR → Receiving → Issuance → Return)
8. **Inventory** (stock derived from ledger)
9. **Suppliers / Vendors**
10. **Subcontractors & Scope Packages**
11. **Equipment / Plant** (with fuel + maintenance logs)
12. **Manpower / Attendance / Payroll** (DTR-driven, with OT/ND/Holiday/Deductions)
13. **QA/QC** (Inspection, Punch list, NCR, RFI, Submittals, Material tests)
14. **HSE / Safety** (Toolbox, PPE, Incidents)
15. **Documents** (register-style, not column-style)
16. **Project Budget & Cost Control** (BAC / AC / EAC / CPI / SPI)
17. **Change Orders / Variation Orders**
18. **Approvals engine** (generic workflow service)
19. **Client Portal** (accomplishment view, billing view, change-order approvals)
20. **Reports** (S-curve, cashflow, manpower, EVM, cost-to-complete)

**Supporting (nice-to-have):**

- Chat / Notifications (you have these — keep)
- Activity Logs (keep)
- Permissions / Roles (keep, but add **project-scoped** roles)

---

## 5. Correct data flow (high level)

```
Contract ──► BOQ Items ──► WBS Activities ──► Schedule (baseline)
                 │                    │
                 │                    ├─► Daily Accomplishment (date, qty_done, %)
                 │                    └─► Progress Photos (geo + date)
                 │
                 ├─► Budget Lines (by cost code & category)
                 │       │
                 │       ├─◄── Labor Actuals  (from Payroll)
                 │       ├─◄── Material Actuals (from MIR)
                 │       ├─◄── Equipment Actuals (from equipment timesheet)
                 │       ├─◄── Subcontract Actuals (from sub-billings)
                 │       └─◄── Misc Actuals
                 │
                 └─► Progress Billing ──► Payment (less retention/DP/EWT)

Requisition ─► Canvass ─► PO ─► DR + MRR ─► Stock ledger ─► MIR (to BOQ item) ─► Cost
```

---

## 6. Suggested database entities (target schema)

Keep what is reusable. Replace or add:

**Contracts & Commercial**

- `contracts` (project_id, contract_no, amount, date, status)
- `contract_revisions` / `change_orders` (contract_id, co_no, additive/deductive, amount, days_added, approved_by, approved_at, status)
- `project_budgets` (project_id, cost_code, category, amount) — baseline
- `project_budget_revisions`

**BOQ & Schedule**

- `cost_codes` (code, description, parent_id) — tree
- `boq_items` (project_id, item_no, cost_code_id, description, unit, quantity, unit_rate, amount)
- `wbs_activities` (project_id, parent_id, code, name, boq_item_id, baseline_start, baseline_finish, actual_start, actual_finish, planned_qty, unit, weight)
- `activity_dependencies` (predecessor_id, successor_id, type, lag)
- `activity_progress` (activity_id, date, qty_done, pct_complete, reported_by)

**Daily Site Ops**

- `daily_site_reports` (project_id, date, weather_am, weather_pm, prepared_by, approved_by, status)
- `dsr_manpower` (dsr_id, trade, count)
- `dsr_equipment` (dsr_id, equipment_id, hours_used, hours_idle, hours_breakdown)
- `dsr_activities` (dsr_id, activity_id, qty_done, remarks)
- `dsr_visitors`, `dsr_incidents`
- `progress_photos` (project_id, boq_item_id, activity_id, date, path, caption, gps)

**Procurement & Inventory**

- `suppliers`
- `items` (unified — replaces DirectSupply + InventoryItem split)
- `purchase_requisitions` → `request_items`
- `rfqs`, `rfq_responses`
- `purchase_orders` → `po_items`
- `delivery_receipts`, `material_receiving_reports`
- `material_issuances` (MIR — to a BOQ item / activity, not a milestone)
- `inventory_transactions` (the **only** source of truth for stock)
- `stock_adjustments`, `returns_to_warehouse`

**Manpower & Payroll**

- `employees` (you have this — add SSS/PhilHealth/Pag-IBIG/TIN, rate history)
- `project_assignments` (project_id, employee_id, role_id, start, end, pay_type, rate)
- `roles_catalog` (PM, SE, Foreman, QA, Safety, Surveyor, Timekeeper, Storekeeper, Skilled, Unskilled…)
- `daily_time_records` (employee_id, project_id, date, time_in, time_out, status, ot_hours, nd_hours, rd/holiday flags)
- `payroll_periods` (project_id, period_start, period_end, status, approved_by)
- `payroll_entries` (period_id, employee_id, days, ot, nd, gross, sss, phic, hdmf, wtax, net)

**Equipment**

- `equipment`, `equipment_rentals`, `equipment_timesheets`, `fuel_logs`, `maintenance_logs`

**Quality & Safety**

- `rfis`, `rfi_responses`
- `ncrs` (Non-Conformance)
- `inspection_requests`, `inspection_checklists`
- `punch_list_items`
- `submittals`, `submittal_revisions`
- `material_tests` (concrete cylinder, rebar, aggregate, soil)
- `safety_toolbox_meetings`, `safety_incidents`, `ppe_issuances`

**Subcontracts**

- `subcontracts` (project_id, subcontractor_id, scope, amount, retention_pct)
- `subcontract_billings`, `subcontract_payments`

**Billing (revised)**

- `progress_billings` (project_id, billing_no, period_from, period_to, prepared_by, status)
- `progress_billing_lines` (billing_id, boq_item_id, prev_qty, this_qty, to_date_qty, amount)
- `billing_deductions` (billing_id, type [DP-recoup|retention|EWT|VAT|penalty], amount)
- `billing_payments` (keep, extend with OR number)
- `retention_releases`

**Documents**

- `project_documents` (project_id, document_type, file_path, expiry_date, version)

**Approvals (generic)**

- `approval_flows` (module, flow_name, steps JSON)
- `approval_requests` (module, record_id, current_step, status)
- `approval_actions` (request_id, step, actor_id, action, remarks, acted_at)

---

## 7. What to keep from your current codebase

- `users`, `employees`, `clients`, `client_types`, `project_types` — **keep as-is**
- `activity_logs`, `notifications`, `chats`, `messages` — **keep**
- `permissions` / `permission_delegations` — **keep**, add **project-scoped** variant
- `project_files` — **keep**, but migrate `projects.*_permit` columns into it
- `project_issues` — **split** into RFI / NCR / Punch-list / Safety-incident
- `project_milestones` — **redefine as Payment Milestones** (billing checkpoints), separate from WBS activities
- `project_tasks` / `progress_updates` — **retire** in favor of `wbs_activities` + `activity_progress` + `progress_photos`
- `inventory_items` + `direct_supplies` — **merge** into `items`; `current_stock` becomes a VIEW over `inventory_transactions`
- `project_labor_costs` with JSON attendance — **replace** with `daily_time_records` + `payroll_entries`
- `billings` — **rebuild** as `progress_billings` + `progress_billing_lines` + `billing_deductions`

---

## 8. Migration strategy (pragmatic)

You don't need to throw everything away. Do it in phases:

**Phase 1 (defensible MVP):** Add BOQ + WBS + Activity Progress + DSR + Change Orders. Re-wire project `progress_percentage` to come from BOQ-weighted accomplishment instead of task-count. This alone answers 70% of the panel's objection.

**Phase 2:** Replace labor JSON with DTR + Payroll tables. Add Budget vs Actual report. Add EVM metrics (CPI, SPI).

**Phase 3:** Procurement lifecycle (PR → PO → DR → MIR). Unify items. Derive stock from ledger.

**Phase 4:** QA/QC (RFI, NCR, Punch list) and Safety.

**Phase 5:** Subcontracts, Equipment, Submittals, Approvals engine.

---

## 9. One-sentence summary for your panel

> "The system currently models a *project* the way Asana does — as milestones and tasks — whereas a **construction** project is modeled as a **contract broken into a BOQ**, executed through **WBS activities** tracked **daily on site**, measured against a **baseline schedule and budget** via **Earned Value**, and paid via **progress billing with retention and recoupment**. I will refactor the schema along those lines in phases."

That is the honest, defensible answer.
