<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLogs;
use App\Models\Billing;
use App\Models\Client;
use App\Models\ClientNotification;
use App\Models\ClientType;
use App\Models\Chat;
use App\Models\Employee;
use App\Models\InventoryItem;
use App\Models\InventoryTransaction;
use App\Models\Message;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\ProjectIssue;
use App\Models\ProjectLaborCost;
use App\Models\ProjectMaterialAllocation;
use App\Models\ProjectMilestone;
use App\Models\ProjectMiscellaneousExpense;
use App\Models\ProjectTask;
use App\Models\ProgressUpdate;
use App\Models\ProjectType;
use App\Models\User;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class TrashBinController extends Controller
{
    use ActivityLogsTrait;

    /**
     * Map of trash item types to their model configuration.
     */
    protected function modelMap(): array
    {
        return [
            'project' => [
                'label' => 'project_name',
                'class' => Project::class,
                'details' => ['project_code'],
            ],
            'project_type' => [
                'label' => 'name',
                'class' => ProjectType::class,
                'details' => [],
            ],
            'client' => [
                'label' => 'client_name',
                'class' => Client::class,
                'details' => ['client_code', 'email'],
            ],
            'client_type' => [
                'label' => 'name',
                'class' => ClientType::class,
                'details' => [],
            ],
            'employee' => [
                'label' => 'full_name',
                'class' => Employee::class,
                'details' => ['email'],
            ],
            'user' => [
                'label' => 'name',
                'class' => User::class,
                'details' => ['email'],
            ],
            'inventory_item' => [
                'label' => 'item_name',
                'class' => InventoryItem::class,
                'details' => ['item_code', 'category'],
            ],
            'billing' => [
                'label' => 'billing_code',
                'class' => Billing::class,
                'details' => ['billing_amount'],
            ],
            'project_task' => [
                'label' => 'title',
                'class' => ProjectTask::class,
                'details' => [],
            ],
            'project_issue' => [
                'label' => 'title',
                'class' => ProjectIssue::class,
                'details' => ['status', 'priority'],
            ],
            'project_team' => [
                'label' => 'id',
                'class' => ProjectMaterialAllocation::class, // grouped under material allocation instead of separate team entry
                'details' => [],
            ],
            'project_labor_cost' => [
                'label' => 'id',
                'class' => ProjectLaborCost::class,
                'details' => [],
            ],
            'project_milestone' => [
                'label' => 'name',
                'class' => ProjectMilestone::class,
                'details' => [],
            ],
            'project_material_allocation' => [
                'label' => 'id',
                'class' => ProjectMaterialAllocation::class,
                'details' => [],
            ],
            'project_misc_expense' => [
                'label' => 'expense_name',
                'class' => ProjectMiscellaneousExpense::class,
                'details' => ['expense_type'],
            ],
            'project_file' => [
                'label' => 'original_name',
                'class' => ProjectFile::class,
                'details' => ['file_type'],
            ],
            'progress_update' => [
                'label' => 'description',
                'class' => ProgressUpdate::class,
                'details' => [],
            ],
            'notification' => [
                'label' => 'title',
                'class' => \App\Models\Notification::class,
                'details' => ['type'],
            ],
            'client_notification' => [
                'label' => 'title',
                'class' => ClientNotification::class,
                'details' => ['type'],
            ],
            'message' => [
                'label' => 'message',
                'class' => Message::class,
                'details' => [],
            ],
            'chat' => [
                'label' => 'id',
                'class' => Chat::class,
                'details' => [],
            ],
            'activity_log' => [
                'label' => 'description',
                'class' => ActivityLogs::class,
                'details' => ['module', 'action'],
            ],
            'inventory_transaction' => [
                'label' => 'id',
                'class' => InventoryTransaction::class,
                'details' => ['transaction_type', 'stock_out_type'],
            ],
        ];
    }

    public function index(Request $request)
    {
        $search = $request->input('search');
        $typeFilter = $request->input('type');
        $page = (int) $request->input('page', 1);
        $perPage = 15;

        $modelMap = $this->modelMap();
        $items = new Collection();

        foreach ($modelMap as $type => $config) {
            if ($typeFilter && $typeFilter !== $type) {
                continue;
            }

            $modelClass = $config['class'];
            if (!class_exists($modelClass)) {
                continue;
            }

            $query = $modelClass::onlyTrashed();

            if ($search) {
                $query->where(function ($q) use ($search, $config) {
                    $q->where($config['label'], 'like', "%{$search}%");

                    foreach ($config['details'] as $column) {
                        $q->orWhere($column, 'like', "%{$search}%");
                    }
                });
            }

            $results = $query->get();

            foreach ($results as $model) {
                $label = (string) data_get($model, $config['label']);
                $detailsParts = [];
                foreach ($config['details'] as $column) {
                    $value = data_get($model, $column);
                    if ($value !== null && $value !== '') {
                        $detailsParts[] = "{$column}: {$value}";
                    }
                }

                $items->push([
                    'id' => $model->id,
                    'type' => $type,
                    'label' => $label !== '' ? $label : "{$type} #{$model->id}",
                    'details' => implode(' | ', $detailsParts),
                    'deleted_at' => $model->deleted_at,
                ]);
            }
        }

        $items = $items->sortByDesc('deleted_at')->values();

        $total = $items->count();
        $paginatedItems = $items->forPage($page, $perPage)->values();

        $paginator = new LengthAwarePaginator(
            $paginatedItems,
            $total,
            $perPage,
            $page,
            [
                'path' => $request->url(),
                'query' => $request->query(),
            ]
        );

        $stats = [
            'total_items' => $total,
            'auto_purge_days' => 30,
        ];

        $availableTypes = collect(array_keys($modelMap))->values();

        return Inertia::render('UserManagement/TrashBin/index', [
            'items' => $paginator,
            'filters' => [
                'search' => $search,
                'type' => $typeFilter,
            ],
            'availableTypes' => $availableTypes,
            'stats' => $stats,
        ]);
    }

    public function restore(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|string',
            'id' => 'required|integer',
        ]);

        $modelMap = $this->modelMap();
        $type = $data['type'];

        if (!isset($modelMap[$type])) {
            return back()->with('error', 'Invalid trash item type.');
        }

        $modelClass = $modelMap[$type]['class'];

        /** @var \Illuminate\Database\Eloquent\Model|\Illuminate\Database\Eloquent\SoftDeletes $model */
        $model = $modelClass::withTrashed()->findOrFail($data['id']);
        $model->restore();

        $this->adminActivityLogs(
            'Trash Bin',
            'Restore',
            "Restored {$type} item #{$model->id} from trash"
        );

        return back()->with('success', 'Item restored successfully.');
    }

    public function forceDelete(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|string',
            'id' => 'required|integer',
        ]);

        $modelMap = $this->modelMap();
        $type = $data['type'];

        if (!isset($modelMap[$type])) {
            return back()->with('error', 'Invalid trash item type.');
        }

        $modelClass = $modelMap[$type]['class'];

        /** @var \Illuminate\Database\Eloquent\Model|\Illuminate\Database\Eloquent\SoftDeletes $model */
        $model = $modelClass::withTrashed()->findOrFail($data['id']);

        // Model-specific cleanup before permanent deletion
        if ($model instanceof ProjectFile && $model->file_path) {
            $disk = env('FILESYSTEM_DISK', 'public');
            Storage::disk($disk)->delete($model->file_path);
        }

        if ($model instanceof ProgressUpdate && $model->file_path) {
            $disk = env('FILESYSTEM_DISK', 'public');
            Storage::disk($disk)->delete($model->file_path);
        }

        $modelId = $model->id;
        $model->forceDelete();

        $this->adminActivityLogs(
            'Trash Bin',
            'Force Delete',
            "Permanently deleted {$type} item #{$modelId} from trash"
        );

        return back()->with('success', 'Item permanently deleted.');
    }
}

