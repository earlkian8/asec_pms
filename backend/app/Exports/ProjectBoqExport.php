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
        $sections          = [];
        $grandMaterial     = 0.0;
        $grandLabor        = 0.0;

        foreach ($this->project->boqSections as $section) {
            $sectionItems    = [];
            $sectionMaterial = 0.0;
            $sectionLabor    = 0.0;

            foreach ($section->items as $item) {
                $material = (float) $item->material_cost;
                $labor    = (float) $item->labor_cost;
                $total    = (float) $item->total_cost;
                $quantity = (float) $item->quantity;
                $unitCost = $quantity > 0 ? $total / $quantity : 0;

                $sectionMaterial += $material;
                $sectionLabor    += $labor;

                $sectionItems[] = [
                    'item_code'     => $item->item_code,
                    'description'   => $item->description,
                    'unit'          => $item->unit ?? 'lot',
                    'quantity'      => $quantity,
                    'material_cost' => round($material, 2),
                    'labor_cost'    => round($labor, 2),
                    'unit_cost'     => round($unitCost, 2),
                    'total_cost'    => round($total, 2),
                    'remarks'       => $item->remarks,
                ];
            }

            $grandMaterial += $sectionMaterial;
            $grandLabor    += $sectionLabor;

            $sections[] = [
                'code'             => $section->code,
                'name'             => $section->name,
                'description'      => $section->description,
                'subtotal_material'=> round($sectionMaterial, 2),
                'subtotal_labor'   => round($sectionLabor, 2),
                'subtotal'         => round($sectionMaterial + $sectionLabor, 2),
                'items'            => $sectionItems,
            ];
        }

        $grandTotal       = round($grandMaterial + $grandLabor, 2);
        $contractAmount   = (float) ($this->project->contract_amount ?? 0);
        $contractVariance = round($contractAmount - $grandTotal, 2);

        $logoPath = config('company.logo');
        $logoFs   = $logoPath ? public_path($logoPath) : null;
        $logoData = $logoFs && is_file($logoFs) ? $this->buildLogoSrc($logoFs) : null;

        return view('exports.project-boq', [
            'company' => [
                'name'     => config('company.name'),
                'tagline'  => config('company.tagline'),
                'address'  => config('company.address'),
                'phone'    => config('company.phone'),
                'email'    => config('company.email'),
                'website'  => config('company.website'),
                'tin'      => config('company.tin'),
                'logo_src' => $logoData,
            ],
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
                'project_type'     => $this->project->projectType?->name,
            ],
            'sections'          => $sections,
            'grand_material'    => round($grandMaterial, 2),
            'grand_labor'       => round($grandLabor, 2),
            'grand_total'       => $grandTotal,
            'contract_amount'   => $contractAmount,
            'contract_variance' => $contractVariance,
            'terms'             => config('company.boq_terms', []),
            'signatories'       => config('company.signatories', []),
            'generated_at'      => now(),
        ]);
    }

    private function buildLogoSrc(string $path): ?string
    {
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
        $mime = match ($ext) {
            'svg' => 'image/svg+xml',
            'png' => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            'gif' => 'image/gif',
            default => null,
        };
        if (!$mime) return null;

        $contents = @file_get_contents($path);
        if ($contents === false) return null;

        return 'data:' . $mime . ';base64,' . base64_encode($contents);
    }

    public function title(): string
    {
        return 'Bill of Quantities';
    }
}
