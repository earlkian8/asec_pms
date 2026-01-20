<?php

namespace App\Exports\Reports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class BudgetReportExport implements FromArray, WithHeadings, WithTitle, WithColumnWidths, WithStyles
{
    protected $data;

    public function __construct($budgetReport)
    {
        $this->data = $budgetReport;
    }

    public function array(): array
    {
        $rows = [];
        
        // Summary
        $rows[] = ['Summary'];
        $rows[] = ['Metric', 'Amount'];
        $rows[] = [
            'Total Budget',
            '₱' . number_format($this->data['summary']['total_budget'] ?? 0, 2)
        ];
        $rows[] = [
            'Total Spent',
            '₱' . number_format($this->data['summary']['total_spent'] ?? 0, 2)
        ];
        $rows[] = [
            'Total Variance',
            '₱' . number_format($this->data['summary']['total_variance'] ?? 0, 2)
        ];
        $rows[] = [
            'Variance Percentage',
            number_format($this->data['summary']['variance_percentage'] ?? 0, 2) . '%'
        ];
        $rows[] = []; // Empty row
        
        // Projects
        $rows[] = ['Projects Budget Details'];
        $rows[] = ['Project Code', 'Project Name', 'Status', 'Budget', 'Labor Cost', 'Material Cost', 'Miscellaneous Expenses', 'Total Spent', 'Variance', 'Variance %'];
        if (isset($this->data['projects'])) {
            foreach ($this->data['projects'] as $project) {
                $rows[] = [
                    $project['project_code'] ?? '',
                    $project['project_name'] ?? '',
                    ucfirst($project['status'] ?? ''),
                    '₱' . number_format($project['budget'] ?? 0, 2),
                    '₱' . number_format($project['labor_cost'] ?? 0, 2),
                    '₱' . number_format($project['material_cost'] ?? 0, 2),
                    '₱' . number_format($project['miscellaneous_expenses'] ?? 0, 2),
                    '₱' . number_format($project['total_spent'] ?? 0, 2),
                    '₱' . number_format($project['variance'] ?? 0, 2),
                    number_format($project['variance_percentage'] ?? 0, 2) . '%'
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
        return 'Budget Report';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 15,
            'B' => 30,
            'C' => 12,
            'D' => 15,
            'E' => 15,
            'F' => 15,
            'G' => 22,
            'H' => 15,
            'I' => 15,
            'J' => 12,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
