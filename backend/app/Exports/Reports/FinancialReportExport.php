<?php

namespace App\Exports\Reports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class FinancialReportExport implements FromArray, WithColumnWidths, WithHeadings, WithStyles, WithTitle
{
    protected $data;

    public function __construct($financialReport)
    {
        $this->data = $financialReport;
    }

    public function array(): array
    {
        $rows = [];

        // Revenue section
        $rows[] = ['Revenue Summary'];
        $rows[] = ['Metric', 'Amount'];
        $rows[] = [
            'Total Billed',
            '₱'.number_format($this->data['revenue']['total_billed'] ?? 0, 2),
        ];
        $rows[] = [
            'Total Received',
            '₱'.number_format($this->data['revenue']['total_received'] ?? 0, 2),
        ];
        $rows[] = [
            'Outstanding',
            '₱'.number_format($this->data['revenue']['outstanding'] ?? 0, 2),
        ];
        $rows[] = [
            'Collection Rate',
            number_format($this->data['revenue']['collection_rate'] ?? 0, 2).'%',
        ];
        $rows[] = []; // Empty row

        // Expenses section
        $rows[] = ['Expenses Summary'];
        $rows[] = ['Metric', 'Amount'];
        $rows[] = [
            'Labor Costs',
            '₱'.number_format($this->data['expenses']['labor'] ?? 0, 2),
        ];
        $rows[] = [
            'Material Costs',
            '₱'.number_format($this->data['expenses']['materials'] ?? 0, 2),
        ];
        $rows[] = [
            'Total Expenses',
            '₱'.number_format($this->data['expenses']['total'] ?? 0, 2),
        ];
        $rows[] = []; // Empty row

        // Profit section
        $rows[] = ['Profit Summary'];
        $rows[] = ['Metric', 'Amount'];
        $rows[] = [
            'Net Profit',
            '₱'.number_format($this->data['profit']['net'] ?? 0, 2),
        ];
        $rows[] = [
            'Profit Margin',
            number_format($this->data['profit']['margin'] ?? 0, 2).'%',
        ];
        $rows[] = []; // Empty row

        // Billing status breakdown
        $rows[] = ['Billing Status Breakdown'];
        $rows[] = ['Status', 'Count', 'Total Amount'];
        if (isset($this->data['billing_status'])) {
            foreach ($this->data['billing_status'] as $status => $data) {
                $rows[] = [
                    ucfirst($status),
                    $data->count ?? 0,
                    '₱'.number_format($data->total ?? 0, 2),
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
        return [
            'A' => 25,
            'B' => 20,
            'C' => 20,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
