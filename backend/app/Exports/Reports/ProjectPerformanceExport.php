<?php

namespace App\Exports\Reports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ProjectPerformanceExport implements FromArray, WithHeadings, WithTitle, WithColumnWidths, WithStyles
{
    protected $data;

    public function __construct($projectPerformance)
    {
        $this->data = $projectPerformance;
    }

    public function array(): array
    {
        $rows = [];
        
        // Add summary row
        $rows[] = [
            'Metric',
            'Value'
        ];
        $rows[] = [
            'Total Projects',
            $this->data['summary']['total'] ?? 0
        ];
        $rows[] = [
            'Completed Projects',
            $this->data['summary']['completed'] ?? 0
        ];
        $rows[] = [
            'Active Projects',
            $this->data['summary']['active'] ?? 0
        ];
        $rows[] = [
            'On Hold Projects',
            $this->data['summary']['on_hold'] ?? 0
        ];
        $rows[] = [
            'Cancelled Projects',
            $this->data['summary']['cancelled'] ?? 0
        ];
        $rows[] = [
            'Average Completion %',
            number_format($this->data['summary']['avg_completion'] ?? 0, 2) . '%'
        ];
        $rows[] = [
            'Total Contract Value',
            '₱' . number_format($this->data['summary']['total_contract_value'] ?? 0, 2)
        ];
        $rows[] = [
            'Overdue Projects',
            $this->data['overdue_count'] ?? 0
        ];
        $rows[] = []; // Empty row
        
        // Add projects by status
        $rows[] = ['Projects by Status'];
        $rows[] = ['Status', 'Count'];
        if (isset($this->data['by_status'])) {
            foreach ($this->data['by_status'] as $status => $count) {
                $rows[] = [
                    ucfirst(str_replace('_', ' ', $status)),
                    $count
                ];
            }
        }
        $rows[] = []; // Empty row
        
        // Add projects by type
        $rows[] = ['Projects by Type'];
        $rows[] = ['Type', 'Count'];
        if (isset($this->data['by_type'])) {
            foreach ($this->data['by_type'] as $type => $count) {
                $rows[] = [
                    $type,
                    $count
                ];
            }
        }
        $rows[] = []; // Empty row
        
        // Add top projects
        $rows[] = ['Top Projects'];
        $rows[] = ['Project Code', 'Project Name', 'Client', 'Status', 'Completion %', 'Contract Amount', 'Start Date', 'Planned End Date'];
        if (isset($this->data['top_projects'])) {
            foreach ($this->data['top_projects'] as $project) {
                $rows[] = [
                    $project->project_code ?? '',
                    $project->project_name ?? '',
                    $project->client->client_name ?? '',
                    ucfirst($project->status ?? ''),
                    number_format($project->completion_percentage ?? 0, 2) . '%',
                    '₱' . number_format($project->contract_amount ?? 0, 2),
                    $project->start_date ?? '',
                    $project->planned_end_date ?? ''
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
        return 'Project Performance';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 25,
            'B' => 30,
            'C' => 25,
            'D' => 15,
            'E' => 15,
            'F' => 20,
            'G' => 15,
            'H' => 18,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
