<?php

namespace App\Exports\Reports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class InventoryReportExport implements FromArray, WithHeadings, WithTitle, WithColumnWidths, WithStyles
{
    protected $data;

    public function __construct($inventoryReport)
    {
        $this->data = $inventoryReport;
    }

    public function array(): array
    {
        $rows = [];
        
        // Summary
        $rows[] = ['Summary'];
        $rows[] = ['Metric', 'Value'];
        $rows[] = [
            'Total Items',
            $this->data['summary']['total_items'] ?? 0
        ];
        $rows[] = [
            'Active Items',
            $this->data['summary']['active_items'] ?? 0
        ];
        $rows[] = [
            'Low Stock Count',
            $this->data['summary']['low_stock_count'] ?? 0
        ];
        $rows[] = [
            'Total Inventory Value',
            '₱' . number_format($this->data['summary']['total_value'] ?? 0, 2)
        ];
        $rows[] = []; // Empty row
        
        // Items by category
        $rows[] = ['Items by Category'];
        $rows[] = ['Category', 'Count'];
        if (isset($this->data['by_category'])) {
            foreach ($this->data['by_category'] as $category => $count) {
                $rows[] = [
                    $category ?? 'Uncategorized',
                    $count
                ];
            }
        }
        $rows[] = []; // Empty row
        
        // Low stock items
        $rows[] = ['Low Stock Items'];
        $rows[] = ['Item Code', 'Item Name', 'Category', 'Current Stock', 'Unit of Measure', 'Unit Price', 'Reorder Level'];
        if (isset($this->data['low_stock_items'])) {
            foreach ($this->data['low_stock_items'] as $item) {
                $rows[] = [
                    $item->item_code ?? '',
                    $item->item_name ?? '',
                    $item->category ?? '',
                    $item->current_stock ?? 0,
                    $item->unit_of_measure ?? '',
                    '₱' . number_format($item->unit_price ?? 0, 2),
                    $item->reorder_level ?? 0
                ];
            }
        }
        $rows[] = []; // Empty row
        
        // Most used items
        $rows[] = ['Most Used Items'];
        $rows[] = ['Item Code', 'Item Name', 'Total Quantity Used'];
        if (isset($this->data['most_used'])) {
            foreach ($this->data['most_used'] as $item) {
                $rows[] = [
                    $item->inventoryItem->item_code ?? '',
                    $item->inventoryItem->item_name ?? '',
                    number_format($item->total_used ?? 0, 2)
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
        return 'Inventory Report';
    }

    public function columnWidths(): array
    {
        return [
            'A' => 15,
            'B' => 30,
            'C' => 15,
            'D' => 15,
            'E' => 15,
            'F' => 15,
            'G' => 15,
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
        ];
    }
}
