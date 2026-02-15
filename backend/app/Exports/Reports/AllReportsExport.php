<?php

namespace App\Exports\Reports;

use Maatwebsite\Excel\Concerns\WithMultipleSheets;

class AllReportsExport implements WithMultipleSheets
{
    protected $projectPerformance;

    protected $financialReport;

    protected $clientReport;

    protected $inventoryReport;

    protected $teamProductivity;

    protected $budgetReport;

    public function __construct(
        $projectPerformance,
        $financialReport,
        $clientReport,
        $inventoryReport,
        $teamProductivity,
        $budgetReport
    ) {
        $this->projectPerformance = $projectPerformance;
        $this->financialReport = $financialReport;
        $this->clientReport = $clientReport;
        $this->inventoryReport = $inventoryReport;
        $this->teamProductivity = $teamProductivity;
        $this->budgetReport = $budgetReport;
    }

    public function sheets(): array
    {
        return [
            new ProjectPerformanceExport($this->projectPerformance),
            new FinancialReportExport($this->financialReport),
            new ClientReportExport($this->clientReport),
            new InventoryReportExport($this->inventoryReport),
            new TeamProductivityExport($this->teamProductivity),
            new BudgetReportExport($this->budgetReport),
        ];
    }
}
