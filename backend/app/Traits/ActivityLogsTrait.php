<?php

namespace App\Traits;

use App\Models\ActivityLogs;
use Illuminate\Support\Facades\Auth;

trait ActivityLogsTrait
{
    public function adminActivityLogs($module, $action, $description, $ip_address = null)
    {
        $ipAddress = $ip_address ?? request()->ip();

        ActivityLogs::create([
            'user_id' => Auth::id() ?? null,
            'module' => $module,
            'action' => $action,
            'description' => $description,
            'ip_address' => $ipAddress,
        ]);
    }
}
