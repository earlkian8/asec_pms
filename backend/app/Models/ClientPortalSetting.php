<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientPortalSetting extends Model
{
    protected $fillable = ['display_billing_module'];

    protected $casts = [
        'display_billing_module' => 'boolean',
    ];

    /**
     * Get whether the billing module is displayed in the client app.
     */
    public static function displayBillingModule(): bool
    {
        $row = static::query()->first();

        return $row ? (bool) $row->display_billing_module : true;
    }

    /**
     * Set whether the billing module is displayed in the client app.
     */
    public static function setDisplayBillingModule(bool $value): void
    {
        $row = static::query()->first();

        if ($row) {
            $row->update(['display_billing_module' => $value]);
        } else {
            static::query()->create(['display_billing_module' => $value]);
        }
    }
}
