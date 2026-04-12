<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'permissions' => $user
                    ? Cache::remember("user_permissions_{$user->id}", now()->addMinutes(5), function () use ($user) {
                        return $user->getAllPermissions()->pluck('name')->toArray();
                    })
                    : [],
                'unread_notifications_count' => $user
                    ? Cache::remember("user_unread_notifications_{$user->id}", now()->addMinutes(2), function () use ($user) {
                        return $user->unreadNotifications()->count();
                    })
                    : 0,
            ],
            'flash' => [
                'success' => $request->session()->get('success'),
                'error'   => $request->session()->get('error'),
                'warning' => $request->session()->get('warning'),
                'info'    => $request->session()->get('info'),
            ],
        ];
    }
}