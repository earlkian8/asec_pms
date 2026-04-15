# BOQ: Quantity Warning + Native Excel Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inline quantity warning in the BOQ editor when resources are present and qty > 1, fix the frontend item-total display bug, and add a native `.xlsx` export alongside the existing PDF export.

**Architecture:** The frontend (`BOQ/index.jsx`) gets a bug fix to `getItemTotal` and a conditional warning banner below the quantity input in edit mode. The backend gets a new `ProjectBoqExcelExport` class using Maatwebsite/PhpSpreadsheet (`FromArray` + `WithStyles` + `WithColumnWidths`), a new controller method `exportExcel`, a new route, and a matching download button in the frontend.

**Tech Stack:** React/Inertia (frontend), Laravel + Maatwebsite Excel 3.x / PhpSpreadsheet (backend)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `resources/js/Pages/ProjectManagement/Tabs/BOQ/index.jsx` | Modify | Fix `getItemTotal`, add quantity warning |
| `app/Exports/ProjectBoqExcelExport.php` | Create | Native PhpSpreadsheet Excel export class |
| `app/Http/Controllers/Admin/ProjectBoqController.php` | Modify | Add `exportExcel` method |
| `routes/admin.php` | Modify | Add `export-excel` route |

---

## Task 1: Fix `getItemTotal` display bug + add quantity warning (Frontend)

**Files:**
- Modify: `resources/js/Pages/ProjectManagement/Tabs/BOQ/index.jsx:137-149`

### Context

`getItemTotal` at line 137 ignores `item.quantity` when resources are present, so the UI shows the per-unit cost as the total when qty > 1. The quantity input for each item in edit mode is at line 916–927 (the `<Input type="number" … placeholder="Unit Qty" …>` inside the item header row).

- [ ] **Step 1: Fix `getItemTotal` to multiply by quantity when resources exist**

Find this block at line 137:
```js
const getItemTotal = (item) => {
    if (Array.isArray(item?.resources) && item.resources.length > 0) {
        return getMaterialCost(item) + getLaborCost(item);
    }
    return toNumber(item?.quantity) * toNumber(item?.unit_cost);
};
```

Replace with:
```js
const getItemTotal = (item) => {
    if (Array.isArray(item?.resources) && item.resources.length > 0) {
        return (getMaterialCost(item) + getLaborCost(item)) * Math.max(toNumber(item?.quantity), 1);
    }
    return toNumber(item?.quantity) * toNumber(item?.unit_cost);
};
```

- [ ] **Step 2: Add the quantity warning below the quantity input in edit mode**

Find the quantity `<Input>` block in `renderEditMode` (around line 916):
```jsx
<Input
    type="number"
    min="0"
    step="0.0001"
    value={item.quantity ?? ''}
    onChange={(e) =>
        updateItem(sIndex, iIndex, { quantity: e.target.value })
    }
    placeholder="Unit Qty"
    className="w-20 text-right"
    title="BOQ unit quantity"
/>
```

The warning cannot go inline here because the item header is a flex row — it would break the layout. Instead, add it **inside `itemOpen && (...)` at the very top of the expanded resources panel** (around line 960, just after `<div className="px-6 py-3 space-y-4">`):

```jsx
{/* Quantity multiplier warning */}
{(item.resources || []).length > 0 && toNumber(item.quantity) > 1 && (
    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <span className="mt-0.5 flex-shrink-0">⚠</span>
        <span>
            Quantity is <strong>{toNumber(item.quantity)}</strong> — your resources will be multiplied by{' '}
            <strong>{toNumber(item.quantity)}</strong>, making the item total{' '}
            <strong>₱{formatCurrency(getItemTotal(item))}</strong>. If these resources represent the
            full cost of this item, set qty to <strong>1</strong>.
        </span>
    </div>
)}
```

- [ ] **Step 3: Verify the warning also shows in view mode when qty > 1 with resources**

In `renderViewMode`, inside the `itemOpen && (...)` expanded block (around line 734), add the same banner just before the resource tables:

```jsx
{(item.resources || []).length > 0 && toNumber(item.quantity) > 1 && (
    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 mb-2 text-xs text-amber-800">
        <span className="mt-0.5 flex-shrink-0">⚠</span>
        <span>
            Qty <strong>{toNumber(item.quantity)}</strong> — resources are multiplied. Total:{' '}
            <strong>₱{formatCurrency(getItemTotal(item))}</strong>. Set qty to 1 if resources represent the full cost.
        </span>
    </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/ProjectManagement/Tabs/BOQ/index.jsx
git commit -m "fix(boq): correct item total when resources present with qty > 1, add quantity multiplier warning"
```

---

## Task 2: Create native Excel export class (Backend)

**Files:**
- Create: `app/Exports/ProjectBoqExcelExport.php`

### Context

Maatwebsite Excel 3.x is already installed (`maatwebsite/excel: ^3.1` in `composer.json`). The existing `ProjectBoqExport` is used only for PDF rendering — do not touch it. This is a new class.

The export builds rows as a plain PHP array, then applies styles by cell coordinate in `WithStyles`. The sheet has:
- Rows 1–4: Project header block
- Row 5: blank spacer
- Row 6: Column headers (8 columns: A–H)
- Row 7+: Sections (header row → items → subtotal row)
- Last 2 rows: Grand total, contract variance

- [ ] **Step 1: Create `app/Exports/ProjectBoqExcelExport.php`**

```php
<?php

namespace App\Exports;

use App\Models\Project;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProjectBoqExcelExport implements FromArray, WithColumnWidths, WithStyles, WithTitle
{
    private Project $project;
    private array $rows = [];
    private array $sectionHeaderRows = [];
    private array $sectionSubtotalRows = [];
    private int $grandTotalRow = 0;
    private int $varianceRow = 0;
    private float $contractVariance = 0.0;

    public function __construct(Project $project)
    {
        $this->project = $project->load([
            'client',
            'projectType',
            'boqSections'                 => fn ($q) => $q->orderBy('sort_order'),
            'boqSections.items'           => fn ($q) => $q->orderBy('sort_order'),
            'boqSections.items.resources' => fn ($q) => $q->orderBy('sort_order'),
        ]);
    }

    public function array(): array
    {
        $project       = $this->project;
        $contractAmount = (float) ($project->contract_amount ?? 0);

        // ── Header block ──────────────────────────────────────────────────────
        $this->rows[] = [config('company.name', 'Company'), '', '', '', '', '', '', ''];
        $this->rows[] = [$project->project_name ?? '', '', '', '', '', '', '', ''];
        $this->rows[] = [
            'Client: ' . ($project->client?->client_name ?? '—'),
            '',
            'Location: ' . ($project->location ?? '—'),
            '',
            'Status: ' . ucfirst($project->status ?? '—'),
            '',
            '',
            '',
        ];
        $this->rows[] = [
            'Contract Amount: PHP ' . number_format($contractAmount, 2),
            '',
            '',
            '',
            'Generated: ' . now()->format('F d, Y'),
            '',
            '',
            '',
        ];
        $this->rows[] = ['', '', '', '', '', '', '', '']; // spacer

        // ── Column headers (row 6) ────────────────────────────────────────────
        $this->rows[] = [
            'Item Code',
            'Description',
            'Unit',
            'Qty',
            'Material Cost',
            'Labor Cost',
            'Unit Cost',
            'Total Amount',
        ];

        // ── Sections + items ──────────────────────────────────────────────────
        $grandMaterial = 0.0;
        $grandLabor    = 0.0;

        foreach ($project->boqSections as $section) {
            $sectionLabel = trim(($section->code ? $section->code . ' | ' : '') . $section->name);

            // Section header row (row index 1-based = count + 1)
            $this->sectionHeaderRows[] = count($this->rows) + 1;
            $this->rows[] = [$sectionLabel, '', '', '', '', '', '', ''];

            $sectionMaterial = 0.0;
            $sectionLabor    = 0.0;

            foreach ($section->items as $item) {
                $material = (float) $item->material_cost;
                $labor    = (float) $item->labor_cost;
                $total    = (float) $item->total_cost;
                $qty      = (float) $item->quantity;
                $unitCost = $qty > 0 ? $total / $qty : 0;

                $sectionMaterial += $material;
                $sectionLabor    += $labor;

                $this->rows[] = [
                    $item->item_code ?? '',
                    $item->description,
                    $item->unit ?? 'lot',
                    $qty,
                    $material,
                    $labor,
                    $unitCost,
                    $total,
                ];
            }

            $grandMaterial += $sectionMaterial;
            $grandLabor    += $sectionLabor;

            // Section subtotal row
            $this->sectionSubtotalRows[] = count($this->rows) + 1;
            $this->rows[] = [
                '',
                'Section Subtotal',
                '',
                '',
                $sectionMaterial,
                $sectionLabor,
                '',
                $sectionMaterial + $sectionLabor,
            ];
        }

        // ── Grand total ───────────────────────────────────────────────────────
        $grandTotal = $grandMaterial + $grandLabor;
        $this->contractVariance = $contractAmount - $grandTotal;

        $this->grandTotalRow = count($this->rows) + 1;
        $this->rows[] = [
            '',
            'GRAND TOTAL',
            '',
            '',
            $grandMaterial,
            $grandLabor,
            '',
            $grandTotal,
        ];

        $this->varianceRow = count($this->rows) + 1;
        $this->rows[] = [
            '',
            'Contract Amount: PHP ' . number_format($contractAmount, 2) . '  |  Variance:',
            '',
            '',
            '',
            '',
            '',
            $this->contractVariance,
        ];

        return $this->rows;
    }

    public function columnWidths(): array
    {
        return [
            'A' => 14,
            'B' => 44,
            'C' => 9,
            'D' => 9,
            'E' => 18,
            'F' => 18,
            'G' => 18,
            'H' => 20,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        $lastRow    = count($this->rows);
        $headerRow  = 6;
        $dataStart  = 7;

        // ── Merge header block cells ──────────────────────────────────────────
        $sheet->mergeCells('A1:H1');
        $sheet->mergeCells('A2:H2');
        $sheet->mergeCells('A3:H3');
        $sheet->mergeCells('A4:H4');

        // ── Merge section header and subtotal label cells ─────────────────────
        foreach ($this->sectionHeaderRows as $r) {
            $sheet->mergeCells("A{$r}:H{$r}");
        }
        foreach ($this->sectionSubtotalRows as $r) {
            $sheet->mergeCells("A{$r}:D{$r}");
        }

        // ── Merge grand total and variance label cells ────────────────────────
        $sheet->mergeCells("A{$this->grandTotalRow}:D{$this->grandTotalRow}");
        $sheet->mergeCells("A{$this->varianceRow}:G{$this->varianceRow}");

        // ── Number formats for currency columns ───────────────────────────────
        $currencyFmt = '#,##0.00';
        $qtyFmt      = '#,##0.####';
        foreach (range($dataStart, $lastRow) as $r) {
            $sheet->getStyle("D{$r}")->getNumberFormat()->setFormatCode($qtyFmt);
            foreach (['E', 'F', 'G', 'H'] as $col) {
                $sheet->getStyle("{$col}{$r}")->getNumberFormat()->setFormatCode($currencyFmt);
            }
        }

        // ── Alignment ─────────────────────────────────────────────────────────
        $sheet->getStyle("A{$headerRow}:H{$lastRow}")
            ->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

        foreach (range($dataStart, $lastRow) as $r) {
            foreach (['C', 'D', 'E', 'F', 'G', 'H'] as $col) {
                $sheet->getStyle("{$col}{$r}")
                    ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            }
        }

        $styles = [];

        // Row 1 — company name
        $styles[1] = [
            'font' => ['bold' => true, 'size' => 14, 'color' => ['argb' => 'FF0D2640']],
        ];

        // Row 2 — project name
        $styles[2] = [
            'font' => ['bold' => true, 'size' => 11, 'color' => ['argb' => 'FF0D2640']],
        ];

        // Rows 3–4 — meta
        $styles['3:4'] = [
            'font' => ['size' => 9, 'color' => ['argb' => 'FF5A6F84']],
        ];

        // Row 6 — column headers
        $styles[$headerRow] = [
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FF1A3A5C']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFF7FAFE']],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FF9FB1C2']]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ];

        // Section header rows — dark bg, white bold text
        foreach ($this->sectionHeaderRows as $r) {
            $styles[$r] = [
                'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FFFFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1A3A5C']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'indent' => 1],
            ];
        }

        // Section subtotal rows — light gray, bold
        foreach ($this->sectionSubtotalRows as $r) {
            $styles[$r] = [
                'font'      => ['bold' => true, 'size' => 8.5, 'color' => ['argb' => 'FF1A2332']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFF0F4F8']],
                'borders'   => ['top' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFAABECF']]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT, 'vertical' => Alignment::VERTICAL_CENTER],
            ];
            $sheet->getStyle("A{$r}:D{$r}")
                ->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        }

        // Grand total row — dark bg, white bold text
        $styles[$this->grandTotalRow] = [
            'font'    => ['bold' => true, 'size' => 10, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1A3A5C']],
            'borders' => [
                'top'    => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF1A3A5C']],
                'bottom' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF1A3A5C']],
            ],
        ];

        // Variance row — label merged A:G, value H colored by sign
        $styles[$this->varianceRow] = [
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FF1A2332']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFBFDFF']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
        ];
        $varianceColor = $this->contractVariance >= 0 ? 'FF0F6E44' : 'FFA32D2D';
        $sheet->getStyle("H{$this->varianceRow}")->getFont()
            ->getColor()->setARGB($varianceColor);

        // Data rows — thin bottom border, normal font
        $styles["{$dataStart}:{$lastRow}"] = [
            'font'    => ['size' => 9],
            'borders' => ['bottom' => ['borderStyle' => Border::BORDER_HAIR, 'color' => ['argb' => 'FFD2DCE6']]],
        ];

        return $styles;
    }

    public function title(): string
    {
        return 'BOQ';
    }
}
```

- [ ] **Step 2: Verify the class loads without errors**

```bash
cd "C:\Users\Earl Kian\Documents\UniSync Labs\asec_pms\backend"
php artisan tinker --execute="new App\Exports\ProjectBoqExcelExport(App\Models\Project::first()); echo 'OK';"
```

Expected output: `OK` (no exception)

- [ ] **Step 3: Commit**

```bash
git add app/Exports/ProjectBoqExcelExport.php
git commit -m "feat(boq): add native PhpSpreadsheet Excel export class"
```

---

## Task 3: Add `exportExcel` route and controller method (Backend)

**Files:**
- Modify: `app/Http/Controllers/Admin/ProjectBoqController.php`
- Modify: `routes/admin.php`

### Context

The existing `export` method (line 329) renders PDF via DomPDF — do not touch it. Add a sibling method `exportExcel` that uses Maatwebsite's `Excel::download()`. The route sits beside the existing export route in `routes/admin.php` at line 108.

- [ ] **Step 1: Add `exportExcel` method to `ProjectBoqController`**

Add after the closing brace of the `export` method (after line 350, before `private function syncItemResources`):

```php
public function exportExcel(Project $project)
{
    $fileName = 'BOQ_' . $project->project_code . '_' . now()->format('Ymd') . '.xlsx';

    return \Maatwebsite\Excel\Facades\Excel::download(
        new \App\Exports\ProjectBoqExcelExport($project),
        $fileName,
        \Maatwebsite\Excel\Excel::XLSX
    );
}
```

- [ ] **Step 2: Add the route in `routes/admin.php`**

Find line 108:
```php
Route::get('/export/{project}', [ProjectBoqController::class, 'export'])->middleware('permission:project-boq.view')->name('export');
```

Add directly after it:
```php
Route::get('/export-excel/{project}', [ProjectBoqController::class, 'exportExcel'])->middleware('permission:project-boq.view')->name('export-excel');
```

- [ ] **Step 3: Verify the route is registered**

```bash
php artisan route:list --name=project-boq
```

Expected: both `project-management.project-boq.export` and `project-management.project-boq.export-excel` appear.

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/Admin/ProjectBoqController.php routes/admin.php
git commit -m "feat(boq): add exportExcel controller method and route"
```

---

## Task 4: Add Excel download button in the frontend

**Files:**
- Modify: `resources/js/Pages/ProjectManagement/Tabs/BOQ/index.jsx`

### Context

The existing "Export PDF" button is an `<a>` tag at line 1090–1098. Add an "Export Excel" anchor tag right beside it, pointing to the new route `project-management.project-boq.export-excel`.

- [ ] **Step 1: Add the `FileSpreadsheet` icon import**

At the top of the file, the existing import from `lucide-react` (around line 8) includes `Download`. Add `FileSpreadsheet` to it:

```js
import {
    Plus,
    Trash2,
    Pencil,
    X,
    Save,
    ChevronDown,
    ChevronRight,
    Info,
    Package,
    Wrench,
    Download,
    FileSpreadsheet,
} from 'lucide-react';
```

- [ ] **Step 2: Add the Excel download button**

Find the existing PDF button block (around line 1089):
```jsx
{!editing && sections.length > 0 && (
    <a
        href={route('project-management.project-boq.export', project.id)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 text-sm font-medium"
    >
        <Download size={14} /> Export PDF
    </a>
)}
```

Add the Excel button directly after it (still inside the `{!editing && sections.length > 0 && (...)}` condition or as its own adjacent block):

```jsx
{!editing && sections.length > 0 && (
    <a
        href={route('project-management.project-boq.export-excel', project.id)}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 px-3 py-2 rounded border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm font-medium"
    >
        <FileSpreadsheet size={14} /> Export Excel
    </a>
)}
```

- [ ] **Step 3: Build and verify no JS errors**

```bash
npm run build 2>&1 | tail -20
```

Expected: build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add resources/js/Pages/ProjectManagement/Tabs/BOQ/index.jsx
git commit -m "feat(boq): add Export Excel button alongside PDF export"
```

---

## Self-Review

**Spec coverage:**
- ✅ `getItemTotal` display bug fixed (Task 1, Step 1)
- ✅ Inline quantity warning in edit mode (Task 1, Step 2)
- ✅ Inline quantity warning also visible in view mode (Task 1, Step 3)
- ✅ Native Excel export class with proper styling (Task 2)
- ✅ New route + controller method (Task 3)
- ✅ Excel download button in frontend (Task 4)
- ✅ PDF export untouched

**Placeholder scan:** No TBDs, all code blocks are complete.

**Type consistency:** `ProjectBoqExcelExport` is referenced consistently across Task 2 (class creation) and Task 3 (controller import). Route name `project-management.project-boq.export-excel` is consistent between Task 3 (route registration) and Task 4 (frontend `route()` call).
