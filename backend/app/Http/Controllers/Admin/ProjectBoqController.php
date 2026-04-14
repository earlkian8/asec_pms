<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectBoqItem;
use App\Models\ProjectBoqSection;
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
            'sections.*.items'                     => ['nullable', 'array'],
            'sections.*.items.*.item_code'         => ['nullable', 'string', 'max:50'],
            'sections.*.items.*.description'       => ['required', 'string', 'max:500'],
            'sections.*.items.*.unit'              => ['nullable', 'string', 'max:30'],
            'sections.*.items.*.quantity'          => ['nullable', 'numeric', 'min:0'],
            'sections.*.items.*.unit_cost'         => ['nullable', 'numeric', 'min:0'],
            'sections.*.items.*.remarks'           => ['nullable', 'string'],
            'sections.*.items.*.sort_order'        => ['nullable', 'integer', 'min:0'],
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

        DB::transaction(function () use ($project, $validated) {
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
                    $quantity = (float) ($item['quantity'] ?? 0);
                    $unitCost = (float) ($item['unit_cost'] ?? 0);

                    ProjectBoqItem::create([
                        'project_id'             => $project->id,
                        'project_boq_section_id' => $created->id,
                        'item_code'              => $item['item_code'] ?? null,
                        'description'            => $item['description'],
                        'unit'                   => $item['unit'] ?? null,
                        'quantity'               => $quantity,
                        'unit_cost'              => $unitCost,
                        'total_cost'             => round($quantity * $unitCost, 2),
                        'remarks'                => $item['remarks'] ?? null,
                        'sort_order'             => $item['sort_order'] ?? $itemIndex,
                    ]);
                }
            }
        });

        $this->adminActivityLogs('Project BOQ', 'Update', "Updated BOQ for project {$project->project_name}");

        return redirect()->back()->with('success', 'BOQ saved successfully.');
    }

    private function calculatePlannedTotal(array $sections): float
    {
        $total = 0.0;

        foreach ($sections as $section) {
            foreach (($section['items'] ?? []) as $item) {
                $quantity = (float) ($item['quantity'] ?? 0);
                $unitCost = (float) ($item['unit_cost'] ?? 0);
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
            'remarks'     => ['nullable', 'string'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
        ]);

        ProjectBoqItem::create(array_merge($validated, [
            'project_id'             => $project->id,
            'project_boq_section_id' => $section->id,
        ]));

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
            'remarks'                => ['nullable', 'string'],
            'sort_order'             => ['nullable', 'integer', 'min:0'],
            'project_boq_section_id' => ['nullable', 'exists:project_boq_sections,id'],
        ]);

        $item->update($validated);

        return redirect()->back()->with('success', 'BOQ item updated.');
    }

    public function destroyItem(Project $project, ProjectBoqItem $item)
    {
        abort_unless($item->project_id === $project->id, 404);
        $item->delete();

        return redirect()->back()->with('success', 'BOQ item removed.');
    }
}
