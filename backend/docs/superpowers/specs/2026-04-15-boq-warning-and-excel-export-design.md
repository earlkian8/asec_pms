# BOQ: Quantity Warning + Native Excel Export

**Date:** 2026-04-15
**Status:** Approved

---

## Overview

Two changes to the BOQ feature:

1. **Inline quantity warning** — warn engineers in the UI when a BOQ item has resources attached and quantity > 1, since this silently multiplies the resource costs.
2. **Native Excel export** — replace the current HTML-dumped-to-Excel output with a proper `.xlsx` file styled to match the Montenegro BOQ format (professional tabular layout with merged cells, styled headers, currency formatting).

A **frontend display bug** is fixed alongside the warning: `getItemTotal()` currently ignores quantity when resources are present, causing the UI total to show the unit cost instead of `unit_cost × qty`.

---

## Part 1: Frontend — Inline Warning + Display Bug Fix

**File:** `resources/js/Pages/ProjectManagement/Tabs/BOQ/index.jsx`

### Display bug fix

`getItemTotal` must multiply by quantity even when resources are present:

```js
// BEFORE
const getItemTotal = (item) => {
    if (Array.isArray(item?.resources) && item.resources.length > 0) {
        return getMaterialCost(item) + getLaborCost(item); // ← ignores qty
    }
    return toNumber(item?.quantity) * toNumber(item?.unit_cost);
};

// AFTER
const getItemTotal = (item) => {
    if (Array.isArray(item?.resources) && item.resources.length > 0) {
        return (getMaterialCost(item) + getLaborCost(item)) * Math.max(toNumber(item?.quantity), 1);
    }
    return toNumber(item?.quantity) * toNumber(item?.unit_cost);
};
```

`getItemUnitCost` stays unchanged — it correctly returns the per-unit cost (sum of resources, no qty multiplier).

### Inline warning

**Trigger condition:** `item.resources.length > 0 && item.quantity > 1`

**Placement:** Directly below the quantity input field inside the item edit form.

**Content:**
```
⚠ Resources are multiplied by {qty}. Item total: ₱{formatted total}.
  If your resources represent the full cost of this item, set qty to 1.
```

**Styling:** Yellow/amber inline alert (`bg-amber-50 border border-amber-300 text-amber-800`), small font, no blocking — engineer can still save.

---

## Part 2: Backend — Native Excel Export

### What changes

Replace `ProjectBoqExport` (`app/Exports/ProjectBoqExport.php`) with a native PhpSpreadsheet implementation using Maatwebsite concerns. The Blade view (`resources/views/exports/project-boq.blade.php`) remains untouched — it is used by the PDF export only.

A new export class is built for Excel specifically.

### Maatwebsite concerns used

- `FromArray` — feed row data directly
- `WithStyles` — cell styling (bold, background colors, borders, alignment)
- `WithColumnWidths` — explicit column widths
- `WithTitle` — sheet tab name
- `WithCustomStartCell` — start writing from A1

### Sheet layout

```
Row 1:  [Company Name]                              (bold, large)
Row 2:  [Project Name]                              (bold)
Row 3:  Project Code | Client | Location | Status
Row 4:  Contract Amount | Date Generated
Row 5:  (blank spacer)
Row 6:  COLUMN HEADERS (Item Code | Description | Unit | Qty | Material Cost | Labor Cost | Unit Cost | Total Amount)
Row 7+: For each section:
          - Section header row  (merged A:H, dark bg, white bold text)
          - Item rows           (alternating light bg)
          - Section subtotal    (right-aligned label merged A:D, material, labor, blank, total)
Row N:  Grand Total row         (dark top/bottom border, bold)
Row N+1: Contract variance row  (right-aligned, green if positive, red if negative)
```

### Column widths

| Col | Field | Width |
|-----|-------|-------|
| A | Item Code | 12 |
| B | Description | 42 |
| C | Unit | 8 |
| D | Qty | 8 |
| E | Material Cost | 16 |
| F | Labor Cost | 16 |
| G | Unit Cost | 16 |
| H | Total Amount | 18 |

### Styling rules

- **Section header rows:** `#1a3a5c` background, white bold text, merged A:H
- **Section subtotal rows:** `#f0f4f8` background, bold, right-aligned
- **Grand total row:** `#1a3a5c` background, white bold text
- **Contract variance row:** green text (`#0f6e44`) if variance ≥ 0, red (`#a32d2d`) if negative
- **Column headers (row 6):** `#f7fafe` background, `#1a3a5c` text, bold, centered, thin border
- **Currency columns (E, F, G, H):** PHP number format `#,##0.00`
- **Qty column (D):** number format `#,##0.####` (up to 4 decimal places, trailing zeros stripped)
- **All cells:** `DejaVu Sans` font not available in Excel natively — use `Calibri 9pt`

### Controller

`ProjectBoqController@export` already calls `Excel::download(new ProjectBoqExport($project), ...)`. Change the filename extension to `.xlsx` and content type to `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`. No route changes needed.

---

## Out of Scope

- PDF export is not changed
- Indirect costs (profit %, OCM %) are not added — these are part of the contract amount, not the BOQ
- No nested sections (divisions within divisions)
- No import from Excel
