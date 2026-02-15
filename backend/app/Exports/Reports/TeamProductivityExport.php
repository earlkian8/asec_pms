<?php

namespace App\Exports\Reports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TeamProductivityExport implements FromArray, WithColumnWidths, WithHeadings, WithStyles, WithTitle
{
    protected $data;

    public function __construct($teamProductivity)
    {
        $this->data = $teamProductivity;
    }

    public function array(): array
    {
        $rows = [];

        // Summary
        $rows[] = ['Summary'];
        $rows[] = ['Metric', 'Value'];
        $rows[] = [
            'Total Hours',
            number_format($this->data['summary']['total_hours'] ?? 0, 2),
        ];
        $rows[] = [
            'Total Cost',
            '₱'.number_format($this->data['summary']['total_cost'] ?? 0, 2),
        ];
        $rows[] = [
            'Average Hourly Rate',
            '₱'.number_format($this->data['summary']['avg_hourly_rate'] ?? 0, 2),
        ];
        $rows[] = []; // Empty row

        // By user
        $rows[] = ['Productivity by User'];
        $rows[] = ['User Name', 'Total Hours', 'Total Cost', 'Average Hourly Rate', 'Work Days'];
        if (isset($this->data['by_user'])) {
            foreach ($this->data['by_user'] as $user) {
                $rows[] = [
                    $user['user_name'] ?? '',
                    number_format($user['total_hours'] ?? 0, 2),
                    '₱'.number_format($user['total_cost'] ?? 0, 2),
                    '₱'.number_format($user['avg_hourly_rate'] ?? 0, 2),
                    $user['work_days'] ?? 0,
                ];
            }
        }
        $rows[] = []; // Empty row

        // By project
        $rows[] = ['Productivity by Project'];
        $rows[] = ['Project Name', 'Total Hours', 'Total Cost'];
        if (isset($this->data['by_project'])) {
            foreach ($this->data['by_project'] as $project) {
                $rows[] = [
                    $project['project_name'] ?? '',
                    number_format($project['total_hours'] ?? 0, 2),
                    '₱'.number_format($project['total_cost'] ?? 0, 2),
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
        return 'Team Productivity';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 25,
            'B' => 15,
            'C' => 15,
            'D' => 20,
            'E' => 12,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
