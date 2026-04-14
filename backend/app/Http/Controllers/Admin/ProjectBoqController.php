<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Models\ProjectBoqItemResource;
use App\Models\ProjectBoqSection;
use App\Models\ProjectMaterialAllocation;
use App\Models\ProjectMilestone;
use App\Models\ProjectTeam;
use App\Traits\ActivityLogsTrait;
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
    use ActivityLogsTrait;

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

        $plannedTotal = $this->calculatePlannedTotal($validated['sections'] ?? []);
        $contractAmount = (float) ($project->contract_amount ?? 0);

        if ($contractAmount > 0 && $plannedTotal > $contractAmount) {
            throw ValidationException::withMessages([
                'sections' => [
                    'BOQ total (' . number_format($plannedTotal, 2) . ') exceeds contract amount (' . number_format($contractAmount, 2) . ').',
                ],
            ]);
        }

        $milestoneSections    = collect($validated['sections'] ?? [])
            ->filter(fn($s) => (bool) ($s['create_milestone'] ?? true))
            ->values();
        $createdItemResources = []; // collected inside transaction for post-transaction provisioning

        DB::transaction(function () use ($project, $validated, &$createdItemResources) {
            // Replace-semantics: wipe existing BOQ for this project and rebuild.
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
                    // Items are always resource-based sub-sections (quantity=1, unit='lot').
                    [$quantity, $unitCost] = $this->resolveItemCostBasis($item);

                    $createdItem = ProjectBoqItem::create([
                        'project_id'             => $project->id,
                        'project_boq_section_id' => $created->id,
                        'item_code'              => $item['item_code'] ?? null,
                        'description'            => $item['description'],
                        'unit'                   => 'lot',
                        'quantity'               => 1,
                        'unit_cost'              => $unitCost,
                        'total_cost'             => round($unitCost, 2),
                        'resource_type'          => $item['resource_type'] ?? null,
                        'planned_inventory_item_id' => $item['planned_inventory_item_id'] ?? null,
                        'planned_direct_supply_id' => $item['planned_direct_supply_id'] ?? null,
                        'planned_user_id'        => $item['planned_user_id'] ?? null,
                        'planned_employee_id'    => $item['planned_employee_id'] ?? null,
                        'remarks'                => $item['remarks'] ?? null,
                        'sort_order'             => $item['sort_order'] ?? $itemIndex,
                    ]);

                    $this->syncItemResources($createdItem, $item['resources'] ?? []);

                    // Collect resources with their new BOQ item IDs for post-transaction provisioning.
                    foreach (($item['resources'] ?? []) as $resource) {
                        $createdItemResources[] = [
                            'boq_item_id' => $createdItem->id,
                            'resource'    => $resource,
                        ];
                    }
                }
            }
        });

        // Auto-create a milestone only for sections with create_milestone = true (idempotent).
        foreach ($milestoneSections as $sectionIndex => $section) {
            ProjectMilestone::firstOrCreate(
                ['project_id' => $project->id, 'name' => $section['name']],
                [
                    'description' => 'Auto-created from BOQ section.',
                    'status'      => 'pending',
                    'sort_order'  => $sectionIndex,
                ]
            );
        }

        // Auto-assign team members for labor resources (idempotent — skips existing assignments).
        $seenLaborKeys = [];
        foreach ($createdItemResources as $entry) {
            $resource = $entry['resource'];
            if (($resource['resource_category'] ?? '') !== 'labor') continue;

            $isEmployee = ($resource['source_type'] ?? '') === 'employee';
            $entityId   = $isEmployee ? ($resource['employee_id'] ?? null) : ($resource['user_id'] ?? null);
            if (empty($entityId)) continue;

            $key = ($isEmployee ? 'emp' : 'usr') . ':' . $entityId;
            if (in_array($key, $seenLaborKeys, true)) continue;
            $seenLaborKeys[] = $key;

            // Use the person's actual compensation profile, not the BOQ unit_price.
            $person = $isEmployee
                ? \App\Models\Employee::with('currentCompensationProfile')->find((int) $entityId)
                : \App\Models\User::with('currentCompensationProfile')->find((int) $entityId);
            $comp          = $person?->getResolvedCompensationAttribute() ?? [];
            $payType       = $comp['pay_type']       ?? 'salary';
            $hourlyRate    = $comp['hourly_rate']    ?? null;
            $monthlySalary = $comp['monthly_salary'] ?? null;

            $searchAttrs = ['project_id' => $project->id];
            $searchAttrs[$isEmployee ? 'employee_id' : 'user_id'] = (int) $entityId;

            ProjectTeam::firstOrCreate(
                $searchAttrs,
                [
                    'role'              => 'Labor',
                    'assignable_type'   => $resource['source_type'],
                    'pay_type'          => $payType,
                    'hourly_rate'       => $hourlyRate,
                    'monthly_salary'    => $monthlySalary,
                    'start_date'        => $project->start_date,
                    'end_date'          => $project->planned_end_date,
                    'is_active'         => true,
                    'assignment_status' => 'active',
                    $isEmployee ? 'user_id' : 'employee_id' => null,
                ]
            );
        }

        // Auto-create material allocations for material resources (idempotent).
        foreach ($createdItemResources as $entry) {
            $resource = $entry['resource'];
            if (($resource['resource_category'] ?? '') !== 'material') continue;

            $invId  = !empty($resource['inventory_item_id'])  ? (int) $resource['inventory_item_id']  : null;
            $suppId = !empty($resource['direct_supply_id'])   ? (int) $resource['direct_supply_id']   : null;
            if (!$invId && !$suppId) continue;

            $searchAttrs = ['project_id' => $project->id];
            if ($invId)  $searchAttrs['inventory_item_id'] = $invId;
            if ($suppId) $searchAttrs['direct_supply_id']  = $suppId;

            $allocation = ProjectMaterialAllocation::firstOrCreate(
                $searchAttrs,
                [
                    'boq_item_id'        => $entry['boq_item_id'],
                    'unit_price'         => (float) ($resource['unit_price'] ?? 0),
                    'quantity_allocated' => (float) ($resource['quantity'] ?? 0),
                    'quantity_received'  => 0,
                    'status'             => 'pending',
                    'allocated_by'       => auth()->id(),
                    'allocated_at'       => now(),
                ]
            );

            // Sync boq_item_id and quantity if BOQ was re-saved with different values.
            $syncFields = [];
            if ($allocation->boq_item_id !== $entry['boq_item_id']) {
                $syncFields['boq_item_id'] = $entry['boq_item_id'];
            }
            if ((float) $allocation->quantity_allocated !== (float) ($resource['quantity'] ?? 0)) {
                $syncFields['quantity_allocated'] = (float) ($resource['quantity'] ?? 0);
            }
            if ($syncFields) {
                $allocation->update($syncFields);
            }
        }

        $this->adminActivityLogs('Project BOQ', 'Update', "Updated BOQ for project {$project->project_name}");

        return redirect()->back()->with('success', 'BOQ saved successfully.');
    }

    private function calculatePlannedTotal(array $sections): float
    {
        $total = 0.0;

        foreach ($sections as $section) {
            foreach (($section['items'] ?? []) as $item) {
                [$quantity, $unitCost] = $this->resolveItemCostBasis($item);
                $total += ($quantity * $unitCost);
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

        [$quantity, $unitCost] = $this->resolveItemCostBasis($validated);

        $created = ProjectBoqItem::create(array_merge($validated, [
            'project_id'             => $project->id,
            'project_boq_section_id' => $section->id,
            'quantity'               => $quantity,
            'unit_cost'              => $unitCost,
            'total_cost'             => round($quantity * $unitCost, 2),
        ]));

        $this->syncItemResources($created, $validated['resources'] ?? []);

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

        [$quantity, $unitCost] = $this->resolveItemCostBasis($validated);
        $validated['quantity'] = $quantity;
        $validated['unit_cost'] = $unitCost;
        $validated['total_cost'] = round($quantity * $unitCost, 2);

        $item->update($validated);
        $this->syncItemResources($item, $validated['resources'] ?? []);

        return redirect()->back()->with('success', 'BOQ item updated.');
    }

    public function destroyItem(Project $project, ProjectBoqItem $item)
    {
        abort_unless($item->project_id === $project->id, 404);
        $item->delete();

        return redirect()->back()->with('success', 'BOQ item removed.');
    }

    private function resolveItemCostBasis(array $item): array
    {
        $resources = $item['resources'] ?? [];

        if (!empty($resources)) {
            $resourceTotal = collect($resources)->sum(function ($resource) {
                return (float) ($resource['quantity'] ?? 0) * (float) ($resource['unit_price'] ?? 0);
            });

            return [1.0, round((float) $resourceTotal, 2)];
        }

        $quantity = (float) ($item['quantity'] ?? 0);
        $unitCost = (float) ($item['unit_cost'] ?? 0);

        return [$quantity, $unitCost];
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
