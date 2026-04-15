<?php

namespace App\Http\Controllers\Admin;

use App\Exports\ProjectBoqExport;
use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Models\ProjectBoqItemResource;
use App\Models\ProjectBoqSection;
use App\Services\InventoryAvailabilityService;
use App\Traits\ActivityLogsTrait;
use App\Traits\BoqCostBasisTrait;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Thin CRUD for BOQ sections and items.
 *
 * Wizard-time BOQ creation happens inside ProjectsController@store so the
 * whole project is atomic. This controller is for post-creation edits on
 * the project details page (rollout Phase 2+). Methods kept minimal until
 * the UI lands; signatures are stable so the frontend can target them.
 */
class ProjectBoqController extends Controller
{
    use ActivityLogsTrait, BoqCostBasisTrait;

    public function storeBulk(Request $request, Project $project)
    {
        $validated = $request->validate([
            'sections'                             => ['nullable', 'array'],
            'sections.*.code'                      => ['nullable', 'string', 'max:50'],
            'sections.*.name'                      => ['required', 'string', 'max:255'],
            'sections.*.description'               => ['nullable', 'string'],
            'sections.*.sort_order'                => ['nullable', 'integer', 'min:0'],
            'sections.*.create_milestone'          => ['nullable', 'boolean'],
            'sections.*.items'                     => ['nullable', 'array'],
            'sections.*.items.*.item_code'         => ['nullable', 'string', 'max:50'],
            'sections.*.items.*.description'       => ['required', 'string', 'max:500'],
            'sections.*.items.*.unit'              => ['nullable', 'string', 'max:30'],
            'sections.*.items.*.quantity'          => ['nullable', 'numeric', 'min:0'],
            'sections.*.items.*.unit_cost'         => ['nullable', 'numeric', 'min:0'],
            'sections.*.items.*.resource_type'     => ['nullable', 'in:material,labor'],
            'sections.*.items.*.planned_inventory_item_id' => ['nullable', 'exists:inventory_items,id'],
            'sections.*.items.*.planned_direct_supply_id'  => ['nullable', 'exists:direct_supplies,id'],
            'sections.*.items.*.planned_user_id'    => ['nullable', 'exists:users,id'],
            'sections.*.items.*.planned_employee_id' => ['nullable', 'exists:employees,id'],
            'sections.*.items.*.remarks'           => ['nullable', 'string'],
            'sections.*.items.*.sort_order'        => ['nullable', 'integer', 'min:0'],
            'sections.*.items.*.resources'         => ['nullable', 'array'],
            'sections.*.items.*.resources.*.resource_category' => ['required_with:sections.*.items.*.resources', 'in:material,labor'],
            'sections.*.items.*.resources.*.source_type' => ['required_with:sections.*.items.*.resources', 'in:inventory,direct_supply,user,employee'],
            'sections.*.items.*.resources.*.inventory_item_id' => ['nullable', 'exists:inventory_items,id'],
            'sections.*.items.*.resources.*.direct_supply_id' => ['nullable', 'exists:direct_supplies,id'],
            'sections.*.items.*.resources.*.user_id' => ['nullable', 'exists:users,id'],
            'sections.*.items.*.resources.*.employee_id' => ['nullable', 'exists:employees,id'],
            'sections.*.items.*.resources.*.resource_name' => ['nullable', 'string', 'max:255'],
            'sections.*.items.*.resources.*.unit' => ['nullable', 'string', 'max:30'],
            'sections.*.items.*.resources.*.quantity' => ['nullable', 'numeric', 'min:0'],
            'sections.*.items.*.resources.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'sections.*.items.*.resources.*.remarks' => ['nullable', 'string'],
            'sections.*.items.*.resources.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        // Inventory stock guard (storeBulk replaces the project's BOQ, so
        // exclude the whole project from "committed elsewhere").
        $this->validateInventoryStockForSections(
            $validated['sections'] ?? [],
            $project->id
        );

        $plannedTotal = $this->calculatePlannedTotal($validated['sections'] ?? []);
        $contractAmount = (float) ($project->contract_amount ?? 0);

        if ($contractAmount > 0 && $plannedTotal > $contractAmount) {
            throw ValidationException::withMessages([
                'sections' => [
                    'BOQ total (' . number_format($plannedTotal, 2) . ') exceeds contract amount (' . number_format($contractAmount, 2) . ').',
                ],
            ]);
        }

        // Replace-semantics: wipe existing BOQ for this project and rebuild.
        // Milestones, team members, and material allocations are NOT touched here —
        // they were seeded at project-creation time and now live independently.
        DB::transaction(function () use ($project, $validated) {
            $project->boqSections()->delete();

            foreach (($validated['sections'] ?? []) as $sectionIndex => $section) {
                $created = ProjectBoqSection::create([
                    'project_id'  => $project->id,
                    'code'        => $section['code'] ?? null,
                    'name'        => $section['name'],
                    'description' => $section['description'] ?? null,
                    'sort_order'  => $section['sort_order'] ?? $sectionIndex,
                ]);

                foreach (($section['items'] ?? []) as $itemIndex => $item) {
                    $basis = $this->resolveItemCostBasis($item);

                    $createdItem = ProjectBoqItem::create([
                        'project_id'             => $project->id,
                        'project_boq_section_id' => $created->id,
                        'item_code'              => $item['item_code'] ?? null,
                        'description'            => $item['description'],
                        'unit'                   => $item['unit'] ?? 'lot',
                        'quantity'               => $basis['quantity'],
                        'unit_cost'              => $basis['unit_cost'],
                        'material_cost'          => $basis['material_cost'],
                        'labor_cost'             => $basis['labor_cost'],
                        'total_cost'             => $basis['total_cost'],
                        'resource_type'          => $item['resource_type'] ?? null,
                        'planned_inventory_item_id' => $item['planned_inventory_item_id'] ?? null,
                        'planned_direct_supply_id' => $item['planned_direct_supply_id'] ?? null,
                        'planned_user_id'        => $item['planned_user_id'] ?? null,
                        'planned_employee_id'    => $item['planned_employee_id'] ?? null,
                        'remarks'                => $item['remarks'] ?? null,
                        'sort_order'             => $item['sort_order'] ?? $itemIndex,
                    ]);

                    $this->syncItemResources($createdItem, $item['resources'] ?? []);
                    $createdItem->recomputeFromResources();
                }
            }
        });

        $this->adminActivityLogs('Project BOQ', 'Update', "Updated BOQ for project {$project->project_name}");

        return redirect()->back()->with('success', 'BOQ saved successfully.');
    }

    private function validateInventoryStockForSections(array $sections, ?int $excludeProjectId = null): void
    {
        $flat = [];
        $keyMap = [];
        foreach ($sections as $si => $section) {
            foreach (($section['items'] ?? []) as $ii => $item) {
                foreach (($item['resources'] ?? []) as $ri => $r) {
                    $flat[] = $r;
                    $keyMap[] = "sections.$si.items.$ii.resources.$ri.quantity";
                }
            }
        }
        if (empty($flat)) return;

        app(InventoryAvailabilityService::class)->validateResources(
            $flat,
            fn ($i) => $keyMap[$i] ?? "resources.$i.quantity",
            $excludeProjectId
        );
    }

    private function calculatePlannedTotal(array $sections): float
    {
        $total = 0.0;

        foreach ($sections as $section) {
            foreach (($section['items'] ?? []) as $item) {
                $basis = $this->resolveItemCostBasis($item);
                $total += $basis['total_cost'];
            }
        }

        return round($total, 2);
    }

    public function storeSection(Request $request, Project $project)
    {
        $validated = $request->validate([
            'code'        => ['nullable', 'string', 'max:50'],
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
        ]);

        $section = ProjectBoqSection::create(array_merge(
            $validated,
            ['project_id' => $project->id]
        ));

        return redirect()->back()->with('success', 'BOQ section added.');
    }

    public function updateSection(Request $request, Project $project, ProjectBoqSection $section)
    {
        abort_unless($section->project_id === $project->id, 404);

        $validated = $request->validate([
            'code'        => ['nullable', 'string', 'max:50'],
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
        ]);

        $section->update($validated);

        return redirect()->back()->with('success', 'BOQ section updated.');
    }

    public function destroySection(Project $project, ProjectBoqSection $section)
    {
        abort_unless($section->project_id === $project->id, 404);
        $section->delete();

        return redirect()->back()->with('success', 'BOQ section removed.');
    }

    public function storeItem(Request $request, Project $project, ProjectBoqSection $section)
    {
        abort_unless($section->project_id === $project->id, 404);

        $validated = $request->validate([
            'item_code'   => ['nullable', 'string', 'max:50'],
            'description' => ['required', 'string', 'max:500'],
            'unit'        => ['nullable', 'string', 'max:30'],
            'quantity'    => ['nullable', 'numeric', 'min:0'],
            'unit_cost'   => ['nullable', 'numeric', 'min:0'],
            'resource_type' => ['nullable', 'in:material,labor'],
            'planned_inventory_item_id' => ['nullable', 'exists:inventory_items,id'],
            'planned_direct_supply_id' => ['nullable', 'exists:direct_supplies,id'],
            'planned_user_id' => ['nullable', 'exists:users,id'],
            'planned_employee_id' => ['nullable', 'exists:employees,id'],
            'remarks'     => ['nullable', 'string'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
            'resources'   => ['nullable', 'array'],
            'resources.*.resource_category' => ['required_with:resources', 'in:material,labor'],
            'resources.*.source_type' => ['required_with:resources', 'in:inventory,direct_supply,user,employee'],
            'resources.*.inventory_item_id' => ['nullable', 'exists:inventory_items,id'],
            'resources.*.direct_supply_id' => ['nullable', 'exists:direct_supplies,id'],
            'resources.*.user_id' => ['nullable', 'exists:users,id'],
            'resources.*.employee_id' => ['nullable', 'exists:employees,id'],
            'resources.*.resource_name' => ['nullable', 'string', 'max:255'],
            'resources.*.unit' => ['nullable', 'string', 'max:30'],
            'resources.*.quantity' => ['nullable', 'numeric', 'min:0'],
            'resources.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'resources.*.remarks' => ['nullable', 'string'],
            'resources.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        app(InventoryAvailabilityService::class)->validateResources(
            $validated['resources'] ?? [],
            fn ($i) => "resources.$i.quantity"
        );

        $basis = $this->resolveItemCostBasis($validated);

        $created = ProjectBoqItem::create(array_merge($validated, [
            'project_id'             => $project->id,
            'project_boq_section_id' => $section->id,
            'quantity'               => $basis['quantity'],
            'unit_cost'              => $basis['unit_cost'],
            'material_cost'          => $basis['material_cost'],
            'labor_cost'             => $basis['labor_cost'],
            'total_cost'             => $basis['total_cost'],
        ]));

        $this->syncItemResources($created, $validated['resources'] ?? []);
        $created->recomputeFromResources();

        return redirect()->back()->with('success', 'BOQ item added.');
    }

    public function updateItem(Request $request, Project $project, ProjectBoqItem $item)
    {
        abort_unless($item->project_id === $project->id, 404);

        $validated = $request->validate([
            'item_code'              => ['nullable', 'string', 'max:50'],
            'description'            => ['required', 'string', 'max:500'],
            'unit'                   => ['nullable', 'string', 'max:30'],
            'quantity'               => ['nullable', 'numeric', 'min:0'],
            'unit_cost'              => ['nullable', 'numeric', 'min:0'],
            'resource_type'          => ['nullable', 'in:material,labor'],
            'planned_inventory_item_id' => ['nullable', 'exists:inventory_items,id'],
            'planned_direct_supply_id' => ['nullable', 'exists:direct_supplies,id'],
            'planned_user_id'        => ['nullable', 'exists:users,id'],
            'planned_employee_id'    => ['nullable', 'exists:employees,id'],
            'remarks'                => ['nullable', 'string'],
            'sort_order'             => ['nullable', 'integer', 'min:0'],
            'project_boq_section_id' => ['nullable', 'exists:project_boq_sections,id'],
            'resources'              => ['nullable', 'array'],
            'resources.*.resource_category' => ['required_with:resources', 'in:material,labor'],
            'resources.*.source_type' => ['required_with:resources', 'in:inventory,direct_supply,user,employee'],
            'resources.*.inventory_item_id' => ['nullable', 'exists:inventory_items,id'],
            'resources.*.direct_supply_id' => ['nullable', 'exists:direct_supplies,id'],
            'resources.*.user_id' => ['nullable', 'exists:users,id'],
            'resources.*.employee_id' => ['nullable', 'exists:employees,id'],
            'resources.*.resource_name' => ['nullable', 'string', 'max:255'],
            'resources.*.unit' => ['nullable', 'string', 'max:30'],
            'resources.*.quantity' => ['nullable', 'numeric', 'min:0'],
            'resources.*.unit_price' => ['nullable', 'numeric', 'min:0'],
            'resources.*.remarks' => ['nullable', 'string'],
            'resources.*.sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        app(InventoryAvailabilityService::class)->validateResources(
            $validated['resources'] ?? [],
            fn ($i) => "resources.$i.quantity",
            null,
            $item->id
        );

        $basis = $this->resolveItemCostBasis($validated);
        $validated['quantity']      = $basis['quantity'];
        $validated['unit_cost']     = $basis['unit_cost'];
        $validated['material_cost'] = $basis['material_cost'];
        $validated['labor_cost']    = $basis['labor_cost'];
        $validated['total_cost']    = $basis['total_cost'];

        $item->update($validated);
        $this->syncItemResources($item, $validated['resources'] ?? []);
        $item->recomputeFromResources();

        return redirect()->back()->with('success', 'BOQ item updated.');
    }

    public function destroyItem(Project $project, ProjectBoqItem $item)
    {
        abort_unless($item->project_id === $project->id, 404);
        $item->delete();

        return redirect()->back()->with('success', 'BOQ item removed.');
    }

    public function export(Project $project)
    {
        $export   = new ProjectBoqExport($project);
        $fileName = 'BOQ_' . $project->project_code . '_' . now()->format('Ymd') . '.pdf';

        $html = $export->view()->render();

        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', true);
        $options->setDefaultFont('DejaVu Sans');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');
        $dompdf->setPaper('A4', 'portrait');
        $dompdf->render();

        return response($dompdf->output(), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
        ]);
    }

    private function syncItemResources(ProjectBoqItem $item, array $resources): void
    {
        $item->resources()->delete();

        foreach ($resources as $index => $resource) {
            ProjectBoqItemResource::create([
                'project_boq_item_id' => $item->id,
                'resource_category' => $resource['resource_category'],
                'source_type' => $resource['source_type'],
                'inventory_item_id' => $resource['inventory_item_id'] ?? null,
                'direct_supply_id' => $resource['direct_supply_id'] ?? null,
                'user_id' => $resource['user_id'] ?? null,
                'employee_id' => $resource['employee_id'] ?? null,
                'resource_name' => $resource['resource_name'] ?? null,
                'unit' => $resource['unit'] ?? null,
                'quantity' => (float) ($resource['quantity'] ?? 0),
                'unit_price' => (float) ($resource['unit_price'] ?? 0),
                'total_cost' => round((float) ($resource['quantity'] ?? 0) * (float) ($resource['unit_price'] ?? 0), 2),
                'remarks' => $resource['remarks'] ?? null,
                'sort_order' => $resource['sort_order'] ?? $index,
            ]);
        }
    }
}
