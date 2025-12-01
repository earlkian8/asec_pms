<?php

/**
 * Quick script to add Miscellaneous Expenses permissions
 * Run this from the backend directory: php add_miscellaneous_permissions.php
 */

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Spatie\Permission\Models\Permission;

$permissions = [
    'miscellaneous-expenses.view',
    'miscellaneous-expenses.create',
    'miscellaneous-expenses.update',
    'miscellaneous-expenses.delete',
];

echo "Adding Miscellaneous Expenses permissions...\n";

foreach ($permissions as $permission) {
    $perm = Permission::firstOrCreate(
        ['name' => $permission, 'guard_name' => 'web'],
        ['name' => $permission, 'guard_name' => 'web']
    );
    echo "  ✓ {$permission}\n";
}

echo "\nPermissions added successfully!\n";
echo "You can now see them in Roles & Permissions management.\n";

