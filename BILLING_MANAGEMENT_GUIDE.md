# Billing Management System - Implementation Guide

## Overview
This guide outlines the structure needed to implement a billing management system that handles fixed-price and milestone-based billing for projects.

---

## 1. MIGRATIONS

### Migration 1: `create_billings_table`
**File:** `database/migrations/YYYY_MM_DD_HHMMSS_create_billings_table.php`

**Fields:**
- `id` (primary key)
- `project_id` (foreign key to projects)
- `billing_code` (string, unique) - Auto-generated code like "BIL-000001"
- `billing_type` (enum: 'fixed_price', 'milestone') - References project's billing_type
- `milestone_id` (nullable foreign key to project_milestones) - Only for milestone-based billing
- `billing_amount` (decimal 15,2) - The amount to be billed
- `billing_date` (date) - When the billing was created/issued
- `due_date` (nullable date) - Payment due date
- `status` (enum: 'unpaid', 'partial', 'paid') - Payment status
- `description` (nullable text) - Additional notes
- `created_by` (foreign key to users) - Who created the billing
- `timestamps`

**Relationships:**
- `project_id` → `projects.id` (onDelete: cascade)
- `milestone_id` → `project_milestones.id` (onDelete: set null)
- `created_by` → `users.id` (onDelete: set null)

---

### Migration 2: `create_billing_payments_table`
**File:** `database/migrations/YYYY_MM_DD_HHMMSS_create_billing_payments_table.php`

**Fields:**
- `id` (primary key)
- `billing_id` (foreign key to billings)
- `payment_code` (string, unique) - Auto-generated code like "PAY-000001"
- `payment_amount` (decimal 15,2) - Amount paid
- `payment_date` (date) - When payment was received
- `payment_method` (enum: 'cash', 'check', 'bank_transfer', 'credit_card', 'other')
- `reference_number` (nullable string) - Check number, transaction ID, etc.
- `notes` (nullable text) - Additional payment notes
- `created_by` (foreign key to users) - Who recorded the payment
- `timestamps`

**Relationships:**
- `billing_id` → `billings.id` (onDelete: cascade)
- `created_by` → `users.id` (onDelete: set null)

**Indexes:**
- Index on `billing_id` for faster queries

---

## 2. MODELS

### Model 1: `Billing`
**File:** `app/Models/Billing.php`

**Fillable fields:**
- `project_id`
- `billing_code`
- `billing_type`
- `milestone_id`
- `billing_amount`
- `billing_date`
- `due_date`
- `status`
- `description`
- `created_by`

**Relationships:**
- `project()` → belongsTo(Project::class)
- `milestone()` → belongsTo(ProjectMilestone::class) - nullable
- `payments()` → hasMany(BillingPayment::class)
- `createdBy()` → belongsTo(User::class, 'created_by')

**Computed Properties/Methods:**
- `totalPaid()` → Sum of all payments
- `remainingAmount()` → billing_amount - totalPaid()
- `updateStatus()` → Auto-update status based on payments (unpaid/partial/paid)

---

### Model 2: `BillingPayment`
**File:** `app/Models/BillingPayment.php`

**Fillable fields:**
- `billing_id`
- `payment_code`
- `payment_amount`
- `payment_date`
- `payment_method`
- `reference_number`
- `notes`
- `created_by`

**Relationships:**
- `billing()` → belongsTo(Billing::class)
- `createdBy()` → belongsTo(User::class, 'created_by')

---

## 3. CONTROLLERS

### Controller: `BillingsController`
**File:** `app/Http/Controllers/Admin/BillingsController.php`

**Methods:**
1. `index(Request $request)` - List all billings with search/filter
   - Show: billing_code, project, billing_amount, total_paid, remaining, status, progress bar
   - Filter by: project, status, billing_type
   - Search by: billing_code, project_name

2. `store(Request $request)` - Create new billing
   - Validate: project_id, billing_type, billing_amount, billing_date, due_date, milestone_id (if milestone-based)
   - Auto-generate billing_code
   - Set status to 'unpaid'
   - Log activity

3. `update(Request $request, Billing $billing)` - Update billing
   - Validate: billing_amount, billing_date, due_date, description
   - Cannot update if status is 'paid'
   - Log activity

4. `destroy(Billing $billing)` - Delete billing
   - Only if no payments exist
   - Log activity

5. `addPayment(Request $request, Billing $billing)` - Record payment
   - Validate: payment_amount, payment_date, payment_method, reference_number, notes
   - Check: payment_amount <= remaining_amount
   - Auto-update billing status after payment
   - Auto-generate payment_code
   - Log activity

6. `show(Billing $billing)` - View billing details with payment history

**Traits:**
- Use `ActivityLogsTrait` for activity logging

---

## 4. SERVICES

### Service: `BillingService`
**File:** `app/Services/BillingService.php`

**Methods:**
1. `getBillingsData(Request $request)` - Get paginated billings with filters
   - Include: project, milestone, payments summary
   - Calculate: total_paid, remaining_amount, payment_percentage
   - Return paginated data with search/filter support

2. `calculateBillingStatus(Billing $billing)` - Calculate and update billing status
   - If total_paid == 0 → 'unpaid'
   - If total_paid < billing_amount → 'partial'
   - If total_paid >= billing_amount → 'paid'
   - Auto-update billing status

3. `generateBillingCode()` - Generate unique billing code
   - Format: "BIL-" + 6-digit random number

4. `generatePaymentCode()` - Generate unique payment code
   - Format: "PAY-" + 6-digit random number

5. `getBillingDetails(Billing $billing)` - Get full billing details
   - Include: project, milestone, all payments, payment summary

---

## 5. ROUTES

**File:** `routes/admin.php`

Add under a new prefix group:
```php
// Billing Management
Route::prefix('billing-management')->name('billing-management.')->group(function(){
    Route::get('/', [BillingsController::class, 'index'])->name('index');
    Route::post('/store', [BillingsController::class, 'store'])->name('store');
    Route::put('/update/{billing}', [BillingsController::class, 'update'])->name('update');
    Route::delete('/destroy/{billing}', [BillingsController::class, 'destroy'])->name('destroy');
    Route::get('/view/{billing}', [BillingsController::class, 'show'])->name('show');
    Route::post('/payment/{billing}', [BillingsController::class, 'addPayment'])->name('add-payment');
});
```

---

## 6. FRONTEND COMPONENTS (React/Inertia)

### Pages Needed:
1. `resources/js/Pages/BillingManagement/index.jsx` - Main billing list page
   - Table with columns: Billing Code, Project, Amount, Paid, Remaining, Status, Progress Bar, Actions
   - Add Billing button
   - Search and filter functionality
   - Actions: Payment, Edit, Delete (Payment action hidden if status is 'paid')

2. `resources/js/Pages/BillingManagement/AddBilling.jsx` - Create billing form
   - Project dropdown (only billable projects)
   - Billing type (fixed_price/milestone) - auto-filled from project
   - Milestone dropdown (if milestone-based)
   - Billing amount, billing date, due date, description

3. `resources/js/Pages/BillingManagement/EditBilling.jsx` - Edit billing form
   - Similar to AddBilling but pre-filled

4. `resources/js/Pages/BillingManagement/AddPayment.jsx` - Payment form (modal or page)
   - Payment amount (max: remaining amount)
   - Payment date, payment method, reference number, notes

5. `resources/js/Pages/BillingManagement/ViewBilling.jsx` - View billing details
   - Billing information
   - Payment history table
   - Payment summary

---

## 7. BUSINESS LOGIC RULES

1. **Billing Creation:**
   - Only projects with `is_billable = true` can have billings
   - For milestone-based: must select a milestone
   - Billing amount cannot exceed project's contract_amount (for fixed_price)
   - For milestone-based: billing amount should match milestone billing amount (if stored in milestones table)

2. **Payment Recording:**
   - Payment amount cannot exceed remaining amount
   - After payment, automatically update billing status
   - If payment makes total_paid >= billing_amount, status becomes 'paid' and payment action is hidden

3. **Status Management:**
   - `unpaid`: total_paid = 0
   - `partial`: 0 < total_paid < billing_amount
   - `paid`: total_paid >= billing_amount

4. **Deletion Rules:**
   - Cannot delete billing if it has payments
   - Cannot edit billing if status is 'paid' (or allow with restrictions)

---

## 8. ADDITIONAL CONSIDERATIONS

1. **Project Model Updates:**
   - Add relationship: `billings()` → hasMany(Billing::class)

2. **ProjectMilestone Model Updates:**
   - Add relationship: `billings()` → hasMany(Billing::class) - if milestone-based billing

3. **Progress Bar UI:**
   - Calculate: (total_paid / billing_amount) * 100
   - Display as progress bar in table
   - Color coding: red (unpaid), yellow (partial), green (paid)

4. **Validation:**
   - Ensure billing amounts are positive
   - Payment dates should not be in the future (or allow with admin override)
   - Reference numbers should be unique per payment method

---

## 9. IMPLEMENTATION ORDER

1. Create migrations (billings, billing_payments)
2. Create models (Billing, BillingPayment)
3. Update Project and ProjectMilestone models with relationships
4. Create BillingService
5. Create BillingsController
6. Add routes
7. Create frontend components
8. Test all functionality

---

## 10. EXAMPLE DATA STRUCTURE

**Billing Record:**
```php
{
    id: 1,
    project_id: 5,
    billing_code: "BIL-000001",
    billing_type: "fixed_price",
    milestone_id: null,
    billing_amount: 50000.00,
    billing_date: "2025-01-15",
    due_date: "2025-02-15",
    status: "partial",
    description: "Initial project billing",
    total_paid: 25000.00,
    remaining_amount: 25000.00,
    payment_percentage: 50.00
}
```

**Payment Record:**
```php
{
    id: 1,
    billing_id: 1,
    payment_code: "PAY-000001",
    payment_amount: 25000.00,
    payment_date: "2025-01-20",
    payment_method: "bank_transfer",
    reference_number: "TXN-123456",
    notes: "First payment installment"
}
```

---

This guide provides the complete structure needed to implement the billing management system. Once you confirm this structure, I can proceed with creating all the files.

