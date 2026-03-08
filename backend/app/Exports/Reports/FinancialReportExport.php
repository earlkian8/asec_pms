<?php

namespace App\Exports\Reports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class FinancialReportExport implements FromArray, WithHeadings, WithTitle, WithColumnWidths, WithStyles
{
    protected $data;

    public function __construct($financialReport)
    {
        $this->data = $financialReport;
    }

    public function array(): array
    {
        $rows = [];

        // ── Revenue ──────────────────────────────────────────────────────────
        $rows[] = ['REVENUE SUMMARY'];
        $rows[] = ['Metric', 'Amount'];
        $rows[] = ['Total Billed',    '₱' . number_format($this->data['revenue']['total_billed'] ?? 0, 2)];
        $rows[] = ['Total Received',  '₱' . number_format($this->data['revenue']['total_received'] ?? 0, 2)];
        $rows[] = ['Outstanding',     '₱' . number_format($this->data['revenue']['outstanding'] ?? 0, 2)];
        $rows[] = ['Collection Rate', number_format($this->data['revenue']['collection_rate'] ?? 0, 2) . '%'];
        $rows[] = [];

        // ── Expenses ─────────────────────────────────────────────────────────
        $rows[] = ['EXPENSES SUMMARY'];
        $rows[] = ['Metric', 'Amount'];
        $rows[] = ['Labor Costs',          '₱' . number_format($this->data['expenses']['labor'] ?? 0, 2)];
        $rows[] = ['Material Costs',       '₱' . number_format($this->data['expenses']['materials'] ?? 0, 2)];
        $rows[] = ['Miscellaneous Costs',  '₱' . number_format($this->data['expenses']['miscellaneous'] ?? 0, 2)];
        $rows[] = ['Total Expenses',       '₱' . number_format($this->data['expenses']['total'] ?? 0, 2)];
        $rows[] = [];

        // ── Miscellaneous by type ────────────────────────────────────────────
        if (!empty($this->data['expenses']['misc_by_type'])) {
            $rows[] = ['MISCELLANEOUS EXPENSES BY TYPE'];
            $rows[] = ['Expense Type', 'Count', 'Total Amount'];
            foreach ($this->data['expenses']['misc_by_type'] as $type => $item) {
                $rows[] = [
                    ucwords(str_replace('_', ' ', $type)),
                    $item->count ?? 0,
                    '₱' . number_format($item->total ?? 0, 2),
                ];
            }
            $rows[] = [];
        }

        // ── Profit ───────────────────────────────────────────────────────────
        $rows[] = ['PROFIT SUMMARY'];
        $rows[] = ['Metric', 'Amount'];
        $rows[] = ['Net Profit',    '₱' . number_format($this->data['profit']['net'] ?? 0, 2)];
        $rows[] = ['Profit Margin', number_format($this->data['profit']['margin'] ?? 0, 2) . '%'];
        $rows[] = [];

        // ── Billing status breakdown ─────────────────────────────────────────
        $rows[] = ['BILLING STATUS BREAKDOWN'];
        $rows[] = ['Status', 'Count', 'Total Amount'];
        if (isset($this->data['billing_status'])) {
            foreach ($this->data['billing_status'] as $status => $data) {
                $rows[] = [
                    ucfirst($status),
                    $data->count ?? 0,
                    '₱' . number_format($data->total ?? 0, 2),
                ];
            }
        }

        return $rows;
    }

    public function headings(): array
    {
        return [];
    }

    public function title(): string
    {
        return 'Financial Report';
    }

    public function columnWidths(): array
    {
        return ['A' => 30, 'B' => 12, 'C' => 22];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1  => ['font' => ['bold' => true, 'size' => 12]],
            8  => ['font' => ['bold' => true, 'size' => 12]],
            16 => ['font' => ['bold' => true, 'size' => 12]],
            22 => ['font' => ['bold' => true, 'size' => 12]],
        ];
    }
}