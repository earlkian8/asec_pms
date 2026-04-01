<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLogs;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ActivityLogsController extends Controller
{
    use ActivityLogsTrait;

    public function index(Request $request)
    {
        $search = $request->input('search');

        $logs = ActivityLogs::with('user')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('module', 'ilike', "%{$search}%")
                      ->orWhere('action', 'ilike', "%{$search}%")
                      ->orWhere('description', 'ilike', "%{$search}%")
                      ->orWhere('ip_address', 'ilike', "%{$search}%")
                      ->orWhereHas('user', function ($uq) use ($search) {
                          $uq->where(function ($nameQuery) use ($search) {
                                $nameQuery->where('first_name', 'ilike', "%{$search}%")
                                            ->orWhere('middle_name', 'ilike', "%{$search}%")
                                            ->orWhere('last_name', 'ilike', "%{$search}%");
                            });
                      });
                });
            })
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        // Stats from ALL records (not paginated)
        $stats = [
            'total_logs'      => ActivityLogs::count(),
            'today_logs'      => ActivityLogs::whereDate('created_at', today())->count(),
            'active_modules'  => ActivityLogs::distinct('module')->count('module'),
        ];

        return Inertia::render('UserManagement/ActivityLogs/index', [
            'logs'   => $logs,
            'search' => $search,
            'stats'  => $stats,
        ]);
    }
}