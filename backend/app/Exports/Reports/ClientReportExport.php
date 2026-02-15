<?php

namespace App\Exports\Reports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ClientReportExport implements FromArray, WithColumnWidths, WithHeadings, WithStyles, WithTitle
{
    protected $data;

    public function __construct($clientReport)
    {
        $this->data = $clientReport;
    }

    public function array(): array
    {
        $rows = [];

        // Summary
        $rows[] = ['Summary'];
        $rows[] = ['Metric', 'Value'];
        $rows[] = [
            'Total Clients',
            $this->data['total_clients'] ?? 0,
        ];
        $rows[] = [
            'Active Clients',
            $this->data['active_clients'] ?? 0,
        ];
        $rows[] = []; // Empty row

        // Top clients
        $rows[] = ['Top Clients'];
        $rows[] = ['Client Code', 'Client Name', 'Client Type', 'Total Projects', 'Active Projects', 'Completed Projects', 'Total Contract Value'];
        if (isset($this->data['top_clients'])) {
            foreach ($this->data['top_clients'] as $client) {
                $rows[] = [
                    $client['client_code'] ?? '',
                    $client['client_name'] ?? '',
                    $client['client_type'] ?? '',
                    $client['total_projects'] ?? 0,
                    $client['active_projects'] ?? 0,
                    $client['completed_projects'] ?? 0,
                    '₱'.number_format($client['total_contract_value'] ?? 0, 2),
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
        return 'Client Report';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 15,
            'B' => 30,
            'C' => 15,
            'D' => 15,
            'E' => 15,
            'F' => 18,
            'G' => 20,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
