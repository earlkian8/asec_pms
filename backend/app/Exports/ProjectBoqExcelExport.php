<?php

namespace App\Exports;

use App\Models\Project;
use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
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
        $project        = $this->project;
        $contractAmount = (float) ($project->contract_amount ?? 0);

        // ── Header block ──────────────────────────────────────────────────────
        $this->rows[] = [config('company.name', 'Abdurauf Sawadjaan Engineering Consultancy'), '', '', '', '', '', '', ''];
        $this->rows[] = [$project->project_name ?? '', '', '', '', '', '', '', ''];
        $this->rows[] = [
            'Client: ' . ($project->client?->client_name ?? '—'),
            '',
            'Location: ' . ($project->location ?? '—'),
            '',
            'Status: ' . ucfirst($project->status ?? '—'),
            '', '', '',
        ];
        $this->rows[] = [
            'Contract Amount: PHP ' . number_format($contractAmount, 2),
            '', '', '',
            'Generated: ' . now()->format('F d, Y'),
            '', '', '',
        ];
        $this->rows[] = ['', '', '', '', '', '', '', '']; // spacer

        // ── Column headers (row 6) ────────────────────────────────────────────
        $this->rows[] = ['Item Code', 'Description', 'Unit', 'Qty', 'Material Cost', 'Labor Cost', 'Unit Cost', 'Total Amount'];

        // ── Sections + items ──────────────────────────────────────────────────
        $grandMaterial = 0.0;
        $grandLabor    = 0.0;

        foreach ($project->boqSections as $section) {
            $sectionLabel = trim(($section->code ? $section->code . ' | ' : '') . $section->name);

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
                    round($unitCost, 2),
                    $total,
                ];
            }

            $grandMaterial += $sectionMaterial;
            $grandLabor    += $sectionLabor;

            $this->sectionSubtotalRows[] = count($this->rows) + 1;
            $this->rows[] = ['', 'Section Subtotal', '', '', $sectionMaterial, $sectionLabor, '', $sectionMaterial + $sectionLabor];
        }

        // ── Grand total ───────────────────────────────────────────────────────
        $grandTotal             = $grandMaterial + $grandLabor;
        $this->contractVariance = $contractAmount - $grandTotal;

        $this->grandTotalRow = count($this->rows) + 1;
        $this->rows[] = ['', 'GRAND TOTAL', '', '', $grandMaterial, $grandLabor, '', $grandTotal];

        $this->varianceRow = count($this->rows) + 1;
        $this->rows[] = ['', 'Contract Amount: PHP ' . number_format($contractAmount, 2) . '  |  Variance:', '', '', '', '', '', $this->contractVariance];

        return $this->rows;
    }

    public function columnWidths(): array
    {
        return ['A' => 14, 'B' => 44, 'C' => 9, 'D' => 9, 'E' => 18, 'F' => 18, 'G' => 18, 'H' => 20];
    }

    public function styles(Worksheet $sheet): array
    {
        $lastRow   = count($this->rows);
        $headerRow = 6;
        $dataStart = 7;

        // Merge header block
        $sheet->mergeCells('A1:H1');
        $sheet->mergeCells('A2:H2');
        $sheet->mergeCells('A3:H3');
        $sheet->mergeCells('A4:H4');

        // Merge section rows and subtotal labels
        foreach ($this->sectionHeaderRows as $r) {
            $sheet->mergeCells("A{$r}:H{$r}");
        }
        foreach ($this->sectionSubtotalRows as $r) {
            $sheet->mergeCells("A{$r}:D{$r}");
        }

        // Merge grand total and variance label
        $sheet->mergeCells("A{$this->grandTotalRow}:D{$this->grandTotalRow}");
        $sheet->mergeCells("A{$this->varianceRow}:G{$this->varianceRow}");

        // Number formats
        $currencyFmt = '#,##0.00';
        $qtyFmt      = '#,##0.####';
        foreach (range($dataStart, $lastRow) as $r) {
            $sheet->getStyle("D{$r}")->getNumberFormat()->setFormatCode($qtyFmt);
            foreach (['E', 'F', 'G', 'H'] as $col) {
                $sheet->getStyle("{$col}{$r}")->getNumberFormat()->setFormatCode($currencyFmt);
            }
        }

        // Right-align numeric columns in data rows
        foreach (range($dataStart, $lastRow) as $r) {
            foreach (['C', 'D', 'E', 'F', 'G', 'H'] as $col) {
                $sheet->getStyle("{$col}{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
            }
        }

        $styles = [];

        // Row 1 — company name
        $styles[1] = ['font' => ['bold' => true, 'size' => 14, 'color' => ['argb' => 'FF0D2640']]];

        // Row 2 — project name
        $styles[2] = ['font' => ['bold' => true, 'size' => 11, 'color' => ['argb' => 'FF0D2640']]];

        // Rows 3–4 — meta info
        $styles['3:4'] = ['font' => ['size' => 9, 'color' => ['argb' => 'FF5A6F84']]];

        // Row 6 — column headers
        $styles[$headerRow] = [
            'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FF1A3A5C']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFF7FAFE']],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FF9FB1C2']]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ];

        // Section header rows — dark bg, white bold
        foreach ($this->sectionHeaderRows as $r) {
            $styles[$r] = [
                'font'      => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FFFFFFFF']],
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1A3A5C']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT, 'indent' => 1],
            ];
        }

        // Section subtotal rows — light gray, bold, right-aligned
        foreach ($this->sectionSubtotalRows as $r) {
            $styles[$r] = [
                'font'    => ['bold' => true, 'size' => 8.5, 'color' => ['argb' => 'FF1A2332']],
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFF0F4F8']],
                'borders' => ['top' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => 'FFAABECF']]],
            ];
            $sheet->getStyle("A{$r}:D{$r}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
        }

        // Grand total row — dark bg, white bold
        $styles[$this->grandTotalRow] = [
            'font'    => ['bold' => true, 'size' => 10, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FF1A3A5C']],
            'borders' => [
                'top'    => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF1A3A5C']],
                'bottom' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => 'FF1A3A5C']],
            ],
        ];

        // Variance row
        $styles[$this->varianceRow] = [
            'font'      => ['bold' => true, 'size' => 9],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => 'FFFBFDFF']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_RIGHT],
        ];
        $varianceColor = $this->contractVariance >= 0 ? 'FF0F6E44' : 'FFA32D2D';
        $sheet->getStyle("H{$this->varianceRow}")->getFont()->getColor()->setARGB($varianceColor);

        // Data rows — thin bottom border
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
