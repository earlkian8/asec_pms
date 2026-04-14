<?php

namespace App\Exports;

use App\Models\Project;
use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\WithTitle;

class ProjectBoqExport implements FromView, WithTitle
{
    protected $project;

    public function __construct(Project $project)
    {
        $this->project = $project->load([
            'client',
            'projectType',
            'boqSections'              => fn ($q) => $q->orderBy('sort_order'),
            'boqSections.items'        => fn ($q) => $q->orderBy('sort_order'),
            'boqSections.items.resources' => fn ($q) => $q->orderBy('sort_order'),
        ]);
    }

    public function view(): View
    {
        $sections   = [];
        $grandTotal = 0.0;

        foreach ($this->project->boqSections as $section) {
            $sectionItems    = [];
            $sectionSubtotal = 0.0;

            foreach ($section->items as $item) {
                $resources = $item->resources;

                if ($resources->count() > 0) {
                    $itemTotal = (float) $resources->sum(
                        fn ($r) => (float) $r->quantity * (float) $r->unit_price
                    );
                    $quantity  = 1;
                    $unitCost  = round($itemTotal, 2);
                } else {
                    $quantity  = (float) $item->quantity;
                    $unitCost  = (float) $item->unit_cost;
                    $itemTotal = round($quantity * $unitCost, 2);
                }

                $sectionSubtotal += $itemTotal;

                $sectionItems[] = [
                    'item_code'   => $item->item_code,
                    'description' => $item->description,
                    'unit'        => $item->unit ?? 'lot',
                    'quantity'    => $quantity,
                    'unit_cost'   => $unitCost,
                    'total_cost'  => $itemTotal,
                    'remarks'     => $item->remarks,
                    'resources'   => $resources->map(fn ($r) => [
                        'resource_name'     => $r->resource_name,
                        'resource_category' => $r->resource_category,
                        'source_type'       => $r->source_type,
                        'unit'              => $r->unit,
                        'quantity'          => (float) $r->quantity,
                        'unit_price'        => (float) $r->unit_price,
                        'total_cost'        => round((float) $r->quantity * (float) $r->unit_price, 2),
                    ])->toArray(),
                ];
            }

            $grandTotal += $sectionSubtotal;

            $sections[] = [
                'code'        => $section->code,
                'name'        => $section->name,
                'description' => $section->description,
                'subtotal'    => round($sectionSubtotal, 2),
                'items'       => $sectionItems,
            ];
        }

        $contractAmount     = (float) ($this->project->contract_amount ?? 0);
        $contractVariance   = round($contractAmount - $grandTotal, 2);
        $grandTotal         = round($grandTotal, 2);

        return view('exports.project-boq', [
            'project' => [
                'code'             => $this->project->project_code,
                'name'             => $this->project->project_name,
                'description'      => $this->project->description,
                'status'           => $this->project->status,
                'contract_amount'  => $contractAmount,
                'start_date'       => $this->project->start_date,
                'planned_end_date' => $this->project->planned_end_date,
                'location'         => $this->project->location,
                'client'           => $this->project->client ? [
                    'name' => $this->project->client->client_name,
                    'code' => $this->project->client->client_code,
                ] : null,
                'project_type' => $this->project->projectType?->name,
            ],
            'sections'         => $sections,
            'grand_total'      => $grandTotal,
            'contract_amount'  => $contractAmount,
            'contract_variance'=> $contractVariance,
            'generated_at'     => now(),
        ]);
    }

    public function title(): string
    {
        return 'Bill of Quantities';
    }
}
